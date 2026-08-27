// A resilient client-side queue for Seed / Doubao conversational speech.
//
// The server keeps TTS credentials private.  This module starts synthesising
// as soon as a stable part of a streamed reply is available, rather than
// waiting for the complete reply.  Decoding into one unlocked AudioContext
// avoids the fragile "later Audio.play()" autoplay path on mobile browsers.

const MAX_SEGMENT = 46;
const MIN_SEGMENT = 9;

export function setConversationAudioSession(type = 'auto') {
  // Safari on iOS exposes this experimental bridge to AVAudioSession.  Using
  // play-and-record while the mic is open keeps input and Seed TTS in one
  // duplex session instead of letting microphone capture mute later output.
  const session = typeof navigator === 'undefined' ? null : navigator.audioSession;
  if (!session) return false;
  try {
    session.type = type;
    return true;
  } catch {
    return false;
  }
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function nextSpeechSegment(source, force = false) {
  const text = cleanText(source);
  if (!text) return { segment: '', rest: '' };
  const punctuation = /[。！？；]/g;
  let match;
  let end = 0;
  while ((match = punctuation.exec(text))) {
    if (match.index + 1 >= MIN_SEGMENT) end = match.index + 1;
  }
  if (!end) {
    const comma = /[，、】【、]/g;
    while ((match = comma.exec(text))) {
      if (match.index + 1 >= MIN_SEGMENT) end = match.index + 1;
    }
  }
  if (!end && text.length >= MAX_SEGMENT) {
    const windowEnd = Math.min(text.length, MAX_SEGMENT);
    const safeBreak = Math.max(
      text.lastIndexOf('，', windowEnd),
      text.lastIndexOf('、', windowEnd),
      text.lastIndexOf(' ', windowEnd),
    );
    end = safeBreak >= MIN_SEGMENT ? safeBreak + 1 : windowEnd;
  }
  if (!end && force) end = text.length;
  return end ? { segment: text.slice(0, end), rest: text.slice(end) } : { segment: '', rest: text };
}

export class SeedRealtimeSpeech {
  constructor({ onState = () => {}, onError = () => {} } = {}) {
    this.onState = onState;
    this.onError = onError;
    this.context = null;
    this.session = null;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.context?.state === 'interrupted') void this.unlock();
    });
  }

  async unlock() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    if (!this.context || this.context.state === 'closed') this.context = new AudioContextClass({ latencyHint: 'interactive' });
    try { await this.context.resume(); } catch { /* Safari may leave an interrupted context behind. */ }
    if (this.context.state === 'running') return true;
    // iOS Safari can leave Web Audio stuck in an "interrupted" state after a
    // microphone/audio-session transition.  A fresh context is the reliable
    // recovery path on the next deliberate tap.
    if (this.context.state === 'interrupted') {
      try { await this.context.close(); } catch { /* best effort */ }
      this.context = new AudioContextClass({ latencyHint: 'interactive' });
      try { await this.context.resume(); } catch { /* handled by the media fallback */ }
    }
    return this.context.state === 'running';
  }

  isActive() {
    return Boolean(this.session && !this.session.cancelled);
  }

  stop() {
    const session = this.session;
    if (!session) return;
    session.cancelled = true;
    session.controller?.abort();
    try { session.source?.stop(); } catch { /* source may already be finished */ }
    session.audio?.pause();
    if (session.objectUrl) URL.revokeObjectURL(session.objectUrl);
    this.session = null;
    this.onState('idle');
    session.resolve?.(false);
  }

  begin(voice, { onSegment = () => {} } = {}) {
    this.stop();
    const session = {
      voice,
      pending: '',
      queue: [],
      closed: false,
      draining: false,
      cancelled: false,
      controller: null,
      source: null,
      audio: null,
      objectUrl: '',
      played: 0,
      onSegment,
      resolve: null,
    };
    session.done = new Promise(resolve => { session.resolve = resolve; });
    this.session = session;
    return {
      push: text => this.push(session, text),
      close: () => this.close(session),
      done: session.done,
    };
  }

  speak(text, voice, options = {}) {
    const stream = this.begin(voice, options);
    stream.push(text);
    stream.close();
    return stream.done;
  }

  push(session, text) {
    if (session !== this.session || session.cancelled) return;
    session.pending += String(text || '');
    this.collect(session, false);
    void this.drain(session);
  }

  close(session) {
    if (session !== this.session || session.cancelled) return session?.done || Promise.resolve(false);
    session.closed = true;
    this.collect(session, true);
    void this.drain(session);
    return session.done;
  }

  collect(session, force) {
    while (session.pending) {
      const { segment, rest } = nextSpeechSegment(session.pending, force);
      if (!segment) break;
      session.queue.push(segment);
      session.pending = rest;
    }
  }

  async drain(session) {
    if (session.draining || session.cancelled || session !== this.session) return;
    session.draining = true;
    try {
      while (!session.cancelled && session === this.session && session.queue.length) {
        const text = session.queue.shift();
        await this.playSegment(session, text);
      }
      if (!session.cancelled && session === this.session && session.closed && !session.queue.length && !session.pending) {
        this.session = null;
        this.onState('idle');
        session.resolve(session.played > 0);
      }
    } finally {
      session.draining = false;
    }
  }

  async playSegment(session, text) {
    session.controller = new AbortController();
    let response;
    try {
      response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Conversation-Speech': 'seed-realtime' },
        body: JSON.stringify({ text, voice: session.voice, realtime: true }),
        signal: session.controller.signal,
      });
      if (!response.ok) throw new Error(`tts_${response.status}`);
      const data = await response.arrayBuffer();
      if (data.byteLength < 1000) throw new Error('tts_empty');
      if (session.cancelled || session !== this.session) return;
      const provider = response.headers.get('X-TTS-Provider') || 'seed';
      document.documentElement.dataset.conversationTts = provider;
      this.onState('speaking');
      await this.playBytes(session, data, text);
    } catch (error) {
      if (error?.name !== 'AbortError' && !session.cancelled) this.onError(error, text);
    } finally {
      if (session.controller?.signal.aborted || session === this.session) session.controller = null;
    }
  }

  async playBytes(session, data, text) {
    await this.unlock();
    if (this.context?.state === 'running') {
      try {
        const buffer = await this.context.decodeAudioData(data.slice(0));
        if (session.cancelled || session !== this.session) return;
        session.onSegment(text, Math.round(buffer.duration * 1000));
        await new Promise((resolve, reject) => {
          const source = this.context.createBufferSource();
          session.source = source;
          source.buffer = buffer;
          source.connect(this.context.destination);
          source.onended = () => resolve();
          try { source.start(); } catch (error) { reject(error); }
        });
        session.source = null;
        session.played += 1;
        return;
      } catch (error) {
        if (session.cancelled) return;
        this.onError(error, text);
      }
    }

    const objectUrl = URL.createObjectURL(new Blob([data], { type: 'audio/mpeg' }));
    session.objectUrl = objectUrl;
    const audio = new Audio(objectUrl);
    audio.playsInline = true;
    audio.preload = 'auto';
    session.audio = audio;
    session.onSegment(text, 0);
    await new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = () => reject(new Error('audio_failed'));
      audio.play().catch(reject);
    });
    if (session.objectUrl === objectUrl) {
      URL.revokeObjectURL(objectUrl);
      session.objectUrl = '';
    }
    session.audio = null;
    session.played += 1;
  }
}
