/**
 * Run: node dev/tools/verify-voice.mjs
 * No packages, microphone permission, network calls, or output files are needed.
 * These checks simulate browser/audio timing; real device acoustic QA is separate.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { StoryVoice, requestJSON } from '../voice.js';

const settle = async () => { for (let step = 0; step < 24; step++) await Promise.resolve(); };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

class Clock {
  now = 0;
  nextId = 0;
  timers = new Map();
  setTimeout = (callback, delay = 0, ...args) => {
    const id = ++this.nextId;
    this.timers.set(id, { callback, args, at: this.now + Math.max(0, Number(delay) || 0) });
    return id;
  };
  clearTimeout = id => this.timers.delete(id);
  async advance(duration) {
    const until = this.now + duration;
    for (let count = 0; count < 1000; count++) {
      const next = [...this.timers].filter(([, timer]) => timer.at <= until)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) { this.now = until; await settle(); return; }
      const [id, timer] = next;
      this.now = timer.at;
      this.timers.delete(id);
      timer.callback(...timer.args);
      await settle();
    }
    throw new Error('Timer loop did not settle');
  }
}

const makeTrack = () => ({
  enabled: true, readyState: 'live', stopped: false,
  stop() { this.stopped = true; this.readyState = 'ended'; },
});
const streamFor = track => ({ getTracks: () => [track], getAudioTracks: () => [track] });

function harness() {
  const clock = new Clock();
  const env = {
    clock, voices: [], sources: [], contexts: [], processors: [], states: [], errors: [], answers: [], constraints: [],
    duration: 30, tracks: [],
    fetch: async () => { throw new Error('Unexpected network request'); },
    addModule: async () => {},
    getUserMedia: async () => {
      const track = makeTrack(); env.tracks.push(track); return streamFor(track);
    },
  };
  class Context {
    constructor() {
      this.state = 'running'; this.sampleRate = 48000; this.currentTime = 0; this.destination = {};
      this.audioWorklet = { addModule: (...args) => env.addModule(...args) };
      env.contexts.push(this);
    }
    resume() { this.state = 'running'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    createMediaStreamSource() { return { connect() {}, disconnect() { this.disconnected = true; } }; }
    createGain() {
      return {
        gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {} },
        connect() {}, disconnect() { this.disconnected = true; },
      };
    }
    createBufferSource() {
      const source = {
        connect() {}, disconnect() { this.disconnected = true; },
        start() { this.started = true; }, stop() { this.stopped = true; },
      };
      env.sources.push(source); return source;
    }
    decodeAudioData() { return Promise.resolve({ duration: env.duration }); }
  }
  class Processor {
    constructor() {
      this.port = {
        messages: [], postMessage(message) { this.messages.push(message); },
        close() { this.closed = true; },
      };
      env.processors.push(this);
    }
    connect() {}
    disconnect() { this.disconnected = true; }
  }
  const overrides = {
    window: { AudioContext: Context, AudioWorkletNode: Processor },
    navigator: { mediaDevices: { getUserMedia: constraints => {
      env.constraints.push(constraints); return env.getUserMedia(constraints);
    } } },
    fetch: (...args) => env.fetch(...args),
    performance: { now: () => clock.now },
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
  };
  const original = new Map(Object.keys(overrides).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(overrides)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  env.voice = () => {
    const voice = new StoryVoice({
      onState: state => env.states.push(state), onLevel: () => {},
      onError: error => env.errors.push(error), onAnswer: answer => env.answers.push(answer),
    });
    env.voices.push(voice); return voice;
  };
  env.open = async () => {
    const voice = env.voice(); voice.listen(true); await voice.enable(); return voice;
  };
  env.ttsResponse = () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) });
  env.dispose = () => {
    for (const voice of env.voices) voice.stop();
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  };
  return env;
}

function check(name, run) {
  test(name, { concurrency: false }, async () => {
    const env = harness();
    try { await run(env); }
    finally { env.dispose(); }
  });
}

function speechFrames(voice) {
  for (let chunk = 0; chunk < 8; chunk++) {
    voice.capture({ token: voice.captureToken, samples: new Float32Array(2048).fill(.1) });
  }
}

check('01 permission: start once, mute/release on pause, expose denial fallback', async env => {
  const voice = await env.open();
  assert.equal(voice.recording, true);
  assert.equal(env.constraints[0].audio.echoCancellation, true);
  assert.equal(env.constraints[0].audio.noiseSuppression, true);
  assert.equal(env.processors[0].port.messages.at(-1).enabled, true);
  await voice.enable();
  assert.equal(env.constraints.length, 1, 'repeated enable reuses the live microphone');
  voice.pause();
  assert.equal(env.tracks[0].stopped, true);
  assert.equal(env.processors[0].port.closed, true);
  assert.equal(voice.recording, false);
  env.getUserMedia = async () => { throw new Error('NotAllowedError'); };
  await voice.enable();
  assert.equal(voice.enabled, false);
  assert.match(env.errors.at(-1), /点选或写下/);
});

check('02 late permission: paused request cannot revive capture or clear a newer opening', async env => {
  const first = deferred(), second = deferred(), oldTrack = makeTrack(), newTrack = makeTrack();
  let request = 0;
  env.getUserMedia = () => (++request === 1 ? first.promise : second.promise);
  const voice = env.voice(); voice.listen(true);
  const oldOpening = voice.enable(); await settle();
  voice.pause();
  const newOpening = voice.enable(); await settle();
  first.resolve(streamFor(oldTrack)); await oldOpening;
  assert.equal(oldTrack.stopped, true);
  assert.ok(voice.opening, 'old permission completion must not clear the new opening');
  assert.equal(voice.enabled, false);
  second.resolve(streamFor(newTrack)); await newOpening;
  assert.equal(voice.enabled, true);
  assert.equal(newTrack.stopped, false);
  assert.deepEqual(env.errors, []);
});

check('03 leave during worklet loading: stop tracks and context without late node creation', async env => {
  const module = deferred(); env.addModule = () => module.promise;
  const voice = env.voice(); voice.listen(true);
  const pending = voice.enable(); await settle();
  voice.stop(); module.resolve(); await pending;
  assert.equal(env.tracks[0].stopped, true);
  assert.equal(env.contexts[0].state, 'closed');
  assert.equal(env.processors.length, 0);
  assert.equal(voice.stream, null);
  assert.equal(voice.enabled, false);
  assert.deepEqual(env.errors, []);
});

check('04 ASR: cancel late answers on pause/leave, resume after a valid answer', async env => {
  for (const cancellation of ['pause', 'stop']) {
    const voice = await env.open(), network = deferred(); let signal;
    env.fetch = (_path, options) => { signal = options.signal; return network.promise; };
    speechFrames(voice);
    const pending = voice.submitRecording();
    assert.equal(voice.recording, false);
    voice[cancellation]();
    network.resolve({ ok: true, json: async () => ({ transcript: 'This stale answer must not advance the story' }) });
    await pending;
    assert.equal(signal.aborted, true);
    assert.equal(voice.recording, false);
    assert.deepEqual(env.answers, []);
  }
  const voice = await env.open(); let pcmBytes;
  env.fetch = async (_path, options) => {
    pcmBytes = Buffer.from(JSON.parse(options.body).pcm, 'base64');
    return { ok: true, json: async () => ({ transcript: '  我想搭一座桥  ' }) };
  };
  speechFrames(voice); await voice.submitRecording();
  assert.equal(pcmBytes.length, Math.floor(8 * 2048 / 3) * 2, '48 kHz float capture becomes 16 kHz PCM16');
  assert.deepEqual(env.answers, ['我想搭一座桥']);
  assert.equal(voice.recording, true);
});

check('05 skipped TTS: a late server response cannot start audio or system speech', async env => {
  const voice = await env.open(), network = deferred(); let signal;
  env.fetch = (_path, options) => { signal = options.signal; return network.promise; };
  const pending = voice.say('这句现在跳过');
  voice.skip(); await pending;
  network.resolve(env.ttsResponse()); await settle();
  assert.equal(signal.aborted, true);
  assert.equal(env.sources.length, 0);
  assert.equal(voice.utterance, null);
  assert.equal(voice.wanted, true);
  assert.equal(voice.recording, true);
});

check('06 24-second limit: stop the actual source, then wait through the acoustic tail', async env => {
  const voice = await env.open(); env.fetch = async () => env.ttsResponse();
  let completed = false;
  const pending = voice.say('这是一段超过播放上限的模拟音频').then(() => { completed = true; });
  await settle(); const source = env.sources.at(-1), session = voice.utterance;
  assert.equal(source.started, true);
  assert.equal(voice.stream.getAudioTracks()[0].enabled, false);
  await env.clock.advance(23999);
  assert.equal(completed, false);
  await env.clock.advance(1); await pending;
  assert.equal(completed, true);
  assert.equal(source.stopped, true);
  assert.equal(source.disconnected, true);
  assert.equal(session.gain.disconnected, true);
  assert.equal(session.controller.signal.aborted, true);
  assert.equal(voice.recording, false);
  await env.clock.advance(349);
  assert.equal(voice.recording, false, 'do not listen to the end of the speaker audio');
  await env.clock.advance(6);
  assert.equal(voice.recording, true);
});

check('07 dialogue queue: never reopen the microphone between consecutive utterances', async env => {
  const voice = await env.open(); env.fetch = async () => env.ttsResponse();
  const first = voice.say('第一句'); await settle();
  env.sources.at(-1).onended(); await first;
  const second = voice.say('第二句'); await settle();
  await env.clock.advance(355);
  assert.equal(voice.recording, false, 'the old resume timer must not interrupt the next line');
  assert.equal(voice.stream.getAudioTracks()[0].enabled, false);
  env.sources.at(-1).onended(); await second;
  await env.clock.advance(355);
  assert.equal(voice.recording, true);
  assert.equal(voice.wanted, true);
});

check('08 mobile fallback: system speech and silent fallback both remain skippable', async env => {
  const voice = env.voice(); let spoken = 0, cancelled = 0;
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  window.speechSynthesis = { speak() { spoken++; }, cancel() { cancelled++; } };
  env.fetch = async () => { throw new Error('Offline'); };
  const first = voice.say('网络失败时使用系统声音'); await settle();
  assert.equal(spoken, 1); assert.equal(voice.utterance.synthetic, true);
  voice.skip(); await first;
  assert.equal(cancelled, 1);
  window.speechSynthesis.speak = () => { throw new Error('Playback not allowed'); };
  const second = voice.say('系统声音失败时继续显示文字'); await settle();
  assert.ok(voice.utterance.fallback);
  voice.skip(); await second;
  assert.equal(voice.utterance, null);
  assert.equal(env.clock.timers.size, 0);
});

check('09 worklet: load real syntax, discard partial/stale frames, and transfer fresh PCM', async env => {
  const posted = []; let Processor;
  const sandbox = {
    Float32Array,
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (packet, transfer) => posted.push({ packet, transfer }) }; } },
    registerProcessor: (name, implementation) => { assert.equal(name, 'dev-pcm-capture'); Processor = implementation; },
  };
  vm.runInNewContext(readFileSync(new URL('../pcm-worklet.js', import.meta.url), 'utf8'), sandbox);
  const processor = new Processor();
  processor.port.onmessage({ data: { type: 'capture', enabled: true, token: 1 } });
  processor.process([[new Float32Array(1000).fill(.8)]]);
  processor.port.onmessage({ data: { type: 'capture', enabled: false, token: 2 } });
  processor.process([[new Float32Array(2048).fill(.9)]]);
  processor.port.onmessage({ data: { type: 'capture', enabled: true, token: 3 } });
  processor.process([[new Float32Array(2048).fill(.1)]]);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].packet.token, 3);
  assert.ok(posted[0].packet.samples.every(value => Math.abs(value - .1) < .001));
  assert.equal(posted[0].transfer[0], posted[0].packet.samples.buffer);
  const voice = await env.open();
  voice.capture({ token: voice.captureToken - 1, samples: new Float32Array(2048).fill(.8) });
  assert.equal(voice.samples, 0);
  voice.capture({ token: voice.captureToken, samples: new Float32Array(2048).fill(.1) });
  assert.equal(voice.samples, 2048);
});

check('10 legacy AbortSignal: timed requests, caller cancellation, and TTS all work', async env => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'AbortSignal');
  Object.defineProperty(globalThis, 'AbortSignal', { configurable: true, writable: true, value: class LegacyAbortSignal {} });
  try {
    assert.equal(AbortSignal.any, undefined); assert.equal(AbortSignal.timeout, undefined);
    env.fetch = (_path, { signal }) => new Promise((_resolve, reject) => {
      if (signal.aborted) reject(new Error('Aborted'));
      else signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
    });
    const timeout = requestJSON('/test', {}, 9000);
    const timeoutAssertion = assert.rejects(timeout, /Aborted/);
    await env.clock.advance(9000); await timeoutAssertion;
    const controller = new AbortController();
    const cancellation = requestJSON('/test', {}, 9000, controller.signal);
    const cancellationAssertion = assert.rejects(cancellation, /Aborted/);
    controller.abort(); await cancellationAssertion;
    const voice = env.voice(); env.fetch = async () => env.ttsResponse();
    const speech = voice.say('无需新的静态方法也可以播放'); await settle();
    assert.equal(env.sources.at(-1).started, true);
    voice.skip(); await speech;
    assert.equal(env.clock.timers.size, 0);
  } finally { Object.defineProperty(globalThis, 'AbortSignal', descriptor); }
});
