import { getNpc } from '../src/story-npcs/catalog.js';
import { speechTimeline, readingAt } from './speech-timing.js';

export async function requestJSON(path, body, timeout = 12000, signal) {
  // Avoid AbortSignal.any/timeout: older mobile Safari has AbortController only.
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; abort(); }, timeout);
  try {
    const response = await fetch(path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error(`request_${response.status}`);
      error.status = response.status;
      error.code = (await response.json().catch(() => null))?.error;
      throw error;
    }
    return await response.json();
  } catch (error) {
    if (timedOut) error.code = 'request_timeout';
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export class StoryVoice {
  constructor({ onState, onAnswer, onLevel, onError, onCapture = () => {}, speechProfile = '' }) {
    Object.assign(this, { onState, onAnswer, onLevel, onError, onCapture, speechProfile });
    this.enabled = false;
    this.wanted = false;
    this.sequence = 0;
    this.lifecycle = 0;
    this.captureToken = 0;
    this.quietUntil = 0;
    this.chunks = [];
  }

  captureFeedback(state, message = '', text = '') {
    this.captureStatus = { state, message, text };
    this.onCapture(this.captureStatus);
  }

  async unlock() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error('audio_unavailable');
    if (!this.context || this.context.state === 'closed') {
      this.context = new Context();
      this.workletReady = null;
    }
    const context = this.context;
    if (context.state !== 'running') await context.resume();
    return context;
  }

  async enable() {
    if (this.opening) return;
    const opening = {};
    this.opening = opening;
    const lifecycle = this.lifecycle;
    let acquired;
    try {
      this.onState('requesting');
      const context = await this.unlock();
      if (lifecycle !== this.lifecycle) return;
      if (!context.audioWorklet || !window.AudioWorkletNode) throw new Error('capture_unavailable');
      if (this.stream?.getAudioTracks().some(track => track.readyState === 'ended')) this.releaseCapture();
      if (!this.stream) {
        acquired = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        acquired.getAudioTracks().forEach(track => { track.enabled = false; });
        if (lifecycle !== this.lifecycle) return;
        if (!this.workletReady) {
          this.workletReady = context.audioWorklet.addModule(new URL('./pcm-worklet.js', import.meta.url));
        }
        await this.workletReady;
        if (lifecycle !== this.lifecycle || context !== this.context) return;
        this.stream = acquired;
        acquired = null;
        this.input = context.createMediaStreamSource(this.stream);
        this.processor = new window.AudioWorkletNode(context, 'dev-pcm-capture');
        this.silent = context.createGain(); this.silent.gain.value = 0;
        this.input.connect(this.processor); this.processor.connect(this.silent); this.silent.connect(context.destination);
        this.processor.port.onmessage = event => this.capture(event.data);
      }
      this.enabled = true;
      this.listen(this.wanted);
    } catch (error) {
      if (lifecycle === this.lifecycle) {
        this.enabled = false;
        this.workletReady = null;
        this.releaseCapture();
        this.onState('off');
        const message = error?.name === 'NotAllowedError'
          ? '麦克风权限没有打开，请允许后再试；也可以点选或写下来。'
          : error?.name === 'NotFoundError' ? '没有找到可用的麦克风，可以点选或写下来。'
            : '麦克风没有成功打开。可以再试一次，也可以点选或写下来。';
        this.captureFeedback('error', message);
        this.onError(message);
      }
    } finally {
      acquired?.getTracks().forEach(track => track.stop());
      if (this.opening === opening) this.opening = null;
    }
  }

  listen(wanted) {
    const next = Boolean(wanted);
    // Repeated UI updates must not throw away the beginning of a quiet answer.
    if (next && this.wanted && this.recording) return;
    this.wanted = next;
    if (!this.wanted) this.cancelASR();
    this.refreshListening();
  }

  refreshListening() {
    clearTimeout(this.resumeTimer);
    clearTimeout(this.quietTimer);
    const allowed = this.enabled && this.wanted && !this.utterance && !this.asrController;
    const tail = this.quietUntil - performance.now();
    this.recording = Boolean(allowed && tail <= 0);
    this.stream?.getAudioTracks().forEach(track => { track.enabled = this.recording; });
    this.captureToken++;
    this.processor?.port.postMessage({ type: 'capture', enabled: this.recording, token: this.captureToken });
    this.chunks = []; this.samples = 0; this.voiced = 0; this.lastSound = performance.now();
    this.speechStarted = false; this.silentSeconds = 0; this.noiseFloor = .001;
    this.onLevel(0);
    if (allowed && tail > 0) this.resumeTimer = setTimeout(() => this.refreshListening(), tail + 5);
    if (!this.utterance && !this.asrController) this.onState(this.recording ? 'listening' : 'off');
    if (this.recording) {
      if (!['error', 'empty', 'short', 'quiet'].includes(this.captureStatus?.state)) this.captureFeedback('listening');
      this.quietTimer = setTimeout(() => {
        if (this.recording && !this.speechStarted && this.captureStatus?.state === 'listening') this.captureFeedback('quiet');
      }, 8000);
    }
  }

  cancelASR() {
    this.sequence++;
    if (this.asrController && this.captureStatus?.state === 'transcribing') {
      this.captureFeedback('paused', '这次转写已取消，可以继续说或点选。');
    }
    this.asrController?.abort();
    this.asrController = null;
  }

  releaseCapture() {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    if (this.processor) this.processor.port.onmessage = null;
    this.input?.disconnect(); this.processor?.disconnect(); this.silent?.disconnect();
    this.processor?.port.close();
    this.input = this.processor = this.silent = null;
  }

  pause() {
    this.lifecycle++;
    this.opening = null;
    this.enabled = false;
    this.cancelASR();
    this.refreshListening();
    this.releaseCapture();
    this.captureFeedback('paused');
  }

  capture(packet) {
    if (!this.recording || packet.token !== this.captureToken) return;
    const chunk = packet.samples;
    if (!chunk?.length) return;
    const rms = Math.sqrt(chunk.reduce((sum, value) => sum + value * value, 0) / chunk.length);
    this.onLevel(Math.min(1, rms * 15));
    this.chunks.push(chunk); this.samples += chunk.length;
    const seconds = chunk.length / this.context.sampleRate;
    // The previous fixed .014 gate discarded soft first words before ASR saw them.
    // Learn the quiet floor only from sub-threshold frames, never from the child.
    const threshold = Math.max(.0045, Math.min(.014, this.noiseFloor * 3));
    if (rms > threshold) {
      if (!this.speechStarted) { clearTimeout(this.quietTimer); this.captureFeedback('receiving'); }
      this.speechStarted = true; this.silentSeconds = 0;
      this.lastSound = performance.now(); this.voiced += seconds;
    } else {
      this.silentSeconds += seconds;
      if (!this.speechStarted) this.noiseFloor = this.noiseFloor * .95 + rms * .05;
    }
    if (!this.speechStarted) {
      // Keep a short lead-in, however long the child takes before speaking.
      const preRoll = this.context.sampleRate * .35;
      while (this.chunks.length > 1 && this.samples - this.chunks[0].length >= preRoll) this.samples -= this.chunks.shift().length;
      return;
    }
    const elapsed = this.samples / this.context.sampleRate;
    // Audio duration stays correct when message delivery is delayed or batched.
    if (this.silentSeconds >= 1.1 || elapsed >= 18) void this.submitRecording();
  }

  async submitRecording() {
    if (!this.recording) return;
    const captured = this.chunks;
    const total = this.samples;
    const voiced = this.voiced;
    if (voiced < .18) {
      this.captureFeedback('short', '收到的声音太短，还没有送去转写。再说完整一点吧。');
      this.refreshListening(); return;
    }
    const controller = new AbortController();
    this.asrController = controller;
    this.refreshListening();
    this.onState('thinking');
    this.captureFeedback('transcribing');
    const sequence = this.sequence;
    let transcript = '';
    try {
      const samples = new Float32Array(total);
      let offset = 0;
      captured.forEach(chunk => { samples.set(chunk, offset); offset += chunk.length; });
      const ratio = this.context.sampleRate / 16000;
      const pcm = new Int16Array(Math.floor(samples.length / ratio));
      for (let i = 0; i < pcm.length; i++) {
        const start = Math.floor(i * ratio), end = Math.min(samples.length, Math.floor((i + 1) * ratio));
        let sum = 0; for (let j = start; j < end; j++) sum += samples[j];
        const value = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
        pcm[i] = value < 0 ? value * 32768 : value * 32767;
      }
      const bytes = new Uint8Array(pcm.buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
      const result = await requestJSON('/api/asr', { pcm: btoa(binary) }, 18000, controller.signal);
      if (sequence !== this.sequence) return;
      transcript = String(result.transcript || '').trim().slice(0, 180);
      if (transcript) this.captureFeedback('transcript', '', transcript);
      else {
        const message = '声音已收到，但这次没有识别出文字。可以再说一次。';
        this.captureFeedback('empty', message); this.onError(message);
      }
    } catch (error) {
      if (sequence === this.sequence) {
        const message = error.code === 'asr_not_configured' ? '声音已收到，但语音识别服务尚未配置。可以先点选或写下来。'
          : error.status ? `声音已收到，但转写服务暂时出错（${error.status}）。请再试一次。`
            : error.code === 'request_timeout' || controller.signal.aborted || error.name === 'AbortError' ? '声音已收到，但转写等待超时了。请再试一次。'
              : '声音已收到，但未能连接转写服务。请检查网络后再试。';
        this.captureFeedback('error', message);
        this.onError(message);
      }
    } finally {
      if (this.asrController === controller) this.asrController = null;
      if (sequence === this.sequence && !transcript) this.refreshListening();
    }
    if (transcript && sequence === this.sequence) {
      // Story handling is separate from transcription: a later story error
      // must never relabel a successfully received transcript as an ASR failure.
      try { await this.onAnswer(transcript); }
      catch { this.onError('文字已经识别，故事回应暂时没跟上。可以再试一次。'); }
      finally { if (sequence === this.sequence) this.refreshListening(); }
    }
  }

  async say(text, voice = 'sprout', onStart = () => {}, npcId = '', onProgress) {
    this.skip();
    this.cancelASR();
    const configuredProfile = typeof this.speechProfile === 'function' ? this.speechProfile() : this.speechProfile;
    const speechProfile = configuredProfile === 'wow-child' ? 'wow-child' : '';
    const session = { controller: new AbortController(), source: null, finish: null, settled: false, speechProfile, onProgress, text };
    this.utterance = session;
    this.refreshListening();
    this.onState('speaking');
    const done = new Promise(resolve => { session.finish = resolve; });
    session.timeout = setTimeout(() => this.finish(session), speechProfile ? 36000 : 24000);
    onStart();
    onProgress?.({ status: 'loading', start: -1, end: -1, spokenEnd: 0 });
    void (async () => {
      try {
        session.requestTimeout = setTimeout(() => session.controller.abort(), speechProfile ? 15000 : 9000);
        const response = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Conversation-Speech': 'seed-realtime' }, body: JSON.stringify({ text, voice, npcId, realtime: true, ...(onProgress ? { responseFormat: 'json' } : {}), ...(speechProfile ? { speechProfile } : {}) }), signal: session.controller.signal });
        if (!response.ok) {
          if (speechProfile) {
            const error = await response.json().catch(() => null);
            session.quotaExceeded = error?.error === 'tts_quota_exceeded';
          }
          throw new Error('tts_unavailable');
        }
        let bytes, alignment;
        if (response.headers?.get('content-type')?.includes('application/json')) {
          const payload = await response.json();
          bytes = Uint8Array.from(atob(payload.audio), char => char.charCodeAt(0)).buffer;
          if (payload.alignmentUnit === 'seconds') alignment = payload.alignment;
        } else bytes = await response.arrayBuffer();
        clearTimeout(session.requestTimeout);
        if (this.utterance !== session) return;
        const context = await this.unlock();
        if (this.utterance !== session) return;
        const audio = await context.decodeAudioData(bytes);
        if (this.utterance !== session) return;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = audio; source.connect(gain); gain.connect(context.destination);
        const start = context.currentTime + .005;
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(1, start + .015);
        gain.gain.setValueAtTime(1, Math.max(start + .016, start + audio.duration - .02));
        gain.gain.linearRampToValueAtTime(0, start + audio.duration);
        session.source = source;
        session.gain = gain;
        session.audioStarted = true;
        session.timeline = speechTimeline(text, alignment, audio.duration);
        session.audioStart = start;
        source.onended = () => this.finish(session, true);
        source.start(start);
        if (onProgress && session.timeline.length) this.trackReading(session, context);
      } catch {
        clearTimeout(session.requestTimeout);
        if (this.utterance !== session) return;
        if (session.speechProfile === 'wow-child') {
          this.onError(session.quotaExceeded
            ? '豆包语音额度暂不可用，文字还在。点一下对话框可以继续。'
            : '豆包童声暂时没准备好，文字还在。点一下对话框可以继续。');
          session.fallback = setTimeout(() => this.finish(session), Math.max(2200, Math.min(12000, text.length * 170)));
          return;
        }
        try {
          if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) throw new Error('speech_unavailable');
          const speech = new window.SpeechSynthesisUtterance(text);
          speech.lang = 'zh-CN'; speech.rate = getNpc(npcId)?.speechRate || .92;
          speech.onend = () => this.finish(session, true);
          speech.onerror = () => this.finish(session);
          speech.onboundary = event => {
            if (this.utterance !== session || !Number.isInteger(event.charIndex)) return;
            const start = event.charIndex;
            const end = Math.min(text.length, start + (event.charLength || Array.from(text.slice(start))[0]?.length || 1));
            session.reading = { start, end, spokenEnd: start };
            onProgress?.({ status: 'playing', ...session.reading });
          };
          session.synthetic = true;
          session.audioStarted = true;
          session.speech = speech;
          window.speechSynthesis.speak(speech);
        } catch {
          session.fallback = setTimeout(() => this.finish(session), Math.max(1600, text.length * 170));
        }
      }
    })();
    await done;
  }

  trackReading(session, context) {
    const tick = () => {
      if (this.utterance !== session || session.settled) return;
      // AudioContext time freezes if the output is suspended. Wall-clock timers
      // alone would run ahead during device interruptions or backgrounding.
      const reading = readingAt(session.timeline, context.currentTime - session.audioStart);
      if (!session.reading || Object.keys(reading).some(key => reading[key] !== session.reading[key])) {
        session.reading = reading;
        session.onProgress?.({ status: 'playing', ...reading });
      }
      session.readingTimer = setTimeout(tick, 32);
    };
    tick();
  }

  finish(session, completed = false) {
    if (session.settled) return;
    session.settled = true;
    clearTimeout(session.timeout); clearTimeout(session.fallback); clearTimeout(session.requestTimeout); clearTimeout(session.readingTimer);
    session.controller.abort();
    if (session.source) {
      session.source.onended = null;
      try { session.source.stop(); } catch { /* completed audio */ }
      session.source.disconnect(); session.gain?.disconnect();
    }
    if (session.speech) session.speech.onend = session.speech.onerror = session.speech.onboundary = null;
    if (this.utterance === session && session.synthetic) {
      try { window.speechSynthesis?.cancel(); } catch { /* playback already unavailable */ }
    }
    session.finish?.();
    if (this.utterance !== session) return;
    session.onProgress?.({ status: completed ? 'ended' : 'cancelled', start: -1, end: -1,
      spokenEnd: completed && session.reading ? session.text.length : session.reading?.spokenEnd || 0 });
    this.utterance = null;
    // Let the speaker's acoustic tail clear before accepting microphone frames.
    if (session.audioStarted) this.quietUntil = performance.now() + 350;
    this.refreshListening();
  }

  skip() {
    const session = this.utterance;
    if (!session) return;
    this.finish(session);
  }

  stop() {
    this.wanted = false;
    this.pause();
    this.skip();
    const context = this.context;
    this.context = null;
    this.workletReady = null;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }
}
