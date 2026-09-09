import { getNpc } from '../src/story-npcs/catalog.js';

export async function requestJSON(path, body, timeout = 12000, signal) {
  // Avoid AbortSignal.any/timeout: older mobile Safari has AbortController only.
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeout);
  try {
    const response = await fetch(path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal,
    });
    if (!response.ok) throw new Error(`request_${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export class StoryVoice {
  constructor({ onState, onAnswer, onLevel, onError, speechProfile = '' }) {
    Object.assign(this, { onState, onAnswer, onLevel, onError, speechProfile });
    this.enabled = false;
    this.wanted = false;
    this.sequence = 0;
    this.lifecycle = 0;
    this.captureToken = 0;
    this.quietUntil = 0;
    this.chunks = [];
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
    } catch {
      if (lifecycle === this.lifecycle) {
        this.enabled = false;
        this.workletReady = null;
        this.releaseCapture();
        this.onState('off');
        this.onError('麦克风暂时用不了，可以点选或写下你的想法。');
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
  }

  cancelASR() {
    this.sequence++;
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
    if (voiced < .18) { this.refreshListening(); return; }
    const controller = new AbortController();
    this.asrController = controller;
    this.refreshListening();
    this.onState('thinking');
    const sequence = this.sequence;
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
      const text = String(result.transcript || '').trim().slice(0, 180);
      if (text) await this.onAnswer(text);
      else this.onError('刚才没听清，再说一次也可以。');
    } catch {
      if (sequence === this.sequence) this.onError('声音暂时没传过来，可以再试一次或点选。');
    } finally {
      if (this.asrController === controller) this.asrController = null;
      if (sequence === this.sequence) this.refreshListening();
    }
  }

  async say(text, voice = 'sprout', onStart = () => {}, npcId = '') {
    this.skip();
    this.cancelASR();
    const configuredProfile = typeof this.speechProfile === 'function' ? this.speechProfile() : this.speechProfile;
    const speechProfile = configuredProfile === 'wow-child' ? 'wow-child' : '';
    const session = { controller: new AbortController(), source: null, finish: null, settled: false, speechProfile };
    this.utterance = session;
    this.refreshListening();
    this.onState('speaking');
    const done = new Promise(resolve => { session.finish = resolve; });
    session.timeout = setTimeout(() => this.finish(session), speechProfile ? 36000 : 24000);
    onStart();
    void (async () => {
      try {
        session.requestTimeout = setTimeout(() => session.controller.abort(), speechProfile ? 15000 : 9000);
        const response = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Conversation-Speech': 'seed-realtime' }, body: JSON.stringify({ text, voice, npcId, realtime: true, ...(speechProfile ? { speechProfile } : {}) }), signal: session.controller.signal });
        if (!response.ok) {
          if (speechProfile) {
            const error = await response.json().catch(() => null);
            session.quotaExceeded = error?.error === 'tts_quota_exceeded';
          }
          throw new Error('tts_unavailable');
        }
        const bytes = await response.arrayBuffer();
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
        source.onended = () => this.finish(session);
        source.start(start);
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
          speech.onend = () => this.finish(session);
          speech.onerror = () => this.finish(session);
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

  finish(session) {
    if (session.settled) return;
    session.settled = true;
    clearTimeout(session.timeout); clearTimeout(session.fallback); clearTimeout(session.requestTimeout);
    session.controller.abort();
    if (session.source) {
      session.source.onended = null;
      try { session.source.stop(); } catch { /* completed audio */ }
      session.source.disconnect(); session.gain?.disconnect();
    }
    if (session.speech) session.speech.onend = session.speech.onerror = null;
    if (this.utterance === session && session.synthetic) {
      try { window.speechSynthesis?.cancel(); } catch { /* playback already unavailable */ }
    }
    session.finish?.();
    if (this.utterance !== session) return;
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
