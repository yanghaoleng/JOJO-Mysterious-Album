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
  env.voice = (options = {}) => {
    const voice = new StoryVoice({
      onState: state => env.states.push(state), onLevel: () => {},
      onError: error => env.errors.push(error), onAnswer: answer => env.answers.push(answer), ...options,
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

function frames(voice, seconds, level) {
  for (let index = 0; index < Math.ceil(seconds * voice.context.sampleRate / 2048); index++) {
    voice.capture({ token: voice.captureToken, samples: new Float32Array(2048).fill(level) });
  }
}

check('11 soft first answer: low-volume speech reaches ASR and listening resumes', async env => {
  const voice = await env.open(); const requests = [];
  env.fetch = async (path, options) => {
    requests.push({ path, body: JSON.parse(options.body), type: options.headers['Content-Type'] });
    return { ok: true, json: async () => ({ transcript: '我听见小小的鼓声' }) };
  };
  frames(voice, .3, 0); frames(voice, .8, .008); frames(voice, 1.2, 0); await settle();
  assert.equal(requests.length, 1, 'quiet speech must not be discarded by a fixed .014 gate');
  assert.equal(requests[0].path, '/api/asr');
  assert.equal(requests[0].type, 'application/json');
  assert.deepEqual(Object.keys(requests[0].body), ['pcm']);
  const pcm = Buffer.from(requests[0].body.pcm, 'base64');
  assert.ok(pcm.length / 32000 < 2.5);
  assert.ok([...new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2)].some(value => value > 200));
  assert.deepEqual(env.answers, ['我听见小小的鼓声']);
  assert.equal(voice.recording, true);
});

check('12 a long silent wait keeps bounded pre-roll and preserves the next first word', async env => {
  const voice = await env.open(); const requests = []; const token = voice.captureToken;
  env.fetch = async (_path, options) => {
    requests.push(Buffer.from(JSON.parse(options.body).pcm, 'base64').length);
    return { ok: true, json: async () => ({ transcript: '小灯你好' }) };
  };
  frames(voice, 120, 0);
  assert.equal(voice.recording, true);
  assert.equal(voice.captureToken, token, 'waiting does not continually reset the worklet');
  assert.equal(requests.length, 0);
  assert.ok(voice.samples <= voice.context.sampleRate * .4, 'do not send minutes of leading silence');
  frames(voice, .7, .007); frames(voice, 1.2, 0); await settle();
  assert.equal(requests.length, 1);
  assert.ok(requests[0] / 32000 < 2.5);
  assert.deepEqual(env.answers, ['小灯你好']);
});

check('13 repeated listen(true) cannot erase an answer that is already being captured', async env => {
  const voice = await env.open();
  frames(voice, .4, .008);
  const token = voice.captureToken, samples = voice.samples;
  voice.listen(true); voice.listen(true);
  assert.equal(voice.captureToken, token);
  assert.equal(voice.samples, samples);
});

check('14 steady quiet noise and short clicks never become child answers', async env => {
  const voice = await env.open(); let requests = 0;
  env.fetch = async () => { requests++; return { ok: true, json: async () => ({ transcript: 'noise' }) }; };
  frames(voice, 45, .002);
  assert.equal(voice.voiced, 0);
  frames(voice, .08, .03); frames(voice, 1.2, 0); await settle();
  assert.equal(requests, 0);
  assert.equal(voice.recording, true);
});

check('15 empty, failed, and timed-out ASR all restore listening without stale answers', async env => {
  const voice = await env.open();
  for (const mode of ['empty', 'failure', 'timeout']) {
    env.fetch = async (_path, { signal }) => {
      if (mode === 'failure') throw new Error('Offline');
      if (mode === 'timeout') return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true }));
      return { ok: true, json: async () => ({ transcript: '' }) };
    };
    speechFrames(voice); const pending = voice.submitRecording();
    if (mode === 'timeout') await env.clock.advance(18000);
    await pending;
    assert.equal(voice.asrController, null);
    assert.equal(voice.recording, true);
  }
  assert.equal(env.errors.length, 3);
  assert.deepEqual(env.answers, []);
});

check('16 a cancelled old ASR cannot clear a newer in-flight recording', async env => {
  const voice = await env.open(), oldRequest = deferred(), newRequest = deferred(); let count = 0;
  env.fetch = () => ++count === 1 ? oldRequest.promise : newRequest.promise;
  speechFrames(voice); const old = voice.submitRecording();
  voice.listen(false); voice.listen(true);
  speechFrames(voice); const current = voice.submitRecording(); const controller = voice.asrController;
  oldRequest.resolve({ ok: true, json: async () => ({ transcript: '旧回答' }) }); await old;
  assert.equal(voice.asrController, controller);
  assert.equal(voice.recording, false);
  assert.deepEqual(env.answers, []);
  newRequest.resolve({ ok: true, json: async () => ({ transcript: '新的首句' }) }); await current;
  assert.deepEqual(env.answers, ['新的首句']);
  assert.equal(voice.recording, true);
});

check('17 WOW alone requests the child profile and never substitutes system speech', async env => {
  let profile = 'wow-child'; const voice = env.voice({ speechProfile: () => profile }); const requests = [];
  let synthetic = 0;
  window.SpeechSynthesisUtterance = class {};
  window.speechSynthesis = { speak() { synthetic++; }, cancel() {} };
  env.fetch = async (_path, options) => { requests.push(options); throw new Error('TTS unavailable'); };
  const child = voice.say('你好，我是小小的星星。', 'bubble', () => {}, 'npc-test'); await settle();
  assert.equal(JSON.parse(requests[0].body).speechProfile, 'wow-child');
  assert.equal(JSON.parse(requests[0].body).realtime, true);
  assert.equal(requests[0].headers['X-Conversation-Speech'], 'seed-realtime');
  assert.equal(synthetic, 0);
  assert.match(env.errors.at(-1), /豆包童声.*点一下对话框/);
  assert.ok(voice.utterance.fallback);
  voice.skip(); await child;
  profile = '';
  const other = voice.say('其他故事保持原来的后备声音。'); await settle();
  assert.equal(Object.hasOwn(JSON.parse(requests[1].body), 'speechProfile'), false);
  assert.equal(synthetic, 1);
  voice.skip(); await other;
  assert.equal(env.clock.timers.size, 0);
});

check('18 WOW quota errors stay explicit, and slower child TTS gets fifteen seconds', async env => {
  const voice = env.voice({ speechProfile: 'wow-child' });
  env.fetch = async () => ({ ok: false, json: async () => ({ error: 'tts_quota_exceeded' }) });
  const quota = voice.say('当前语音额度暂不可用。'); await settle();
  assert.match(env.errors.at(-1), /豆包语音额度暂不可用/);
  voice.skip(); await quota;
  env.fetch = (_path, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true }));
  const pending = voice.say('慢一点也会等声音准备好。'); await settle();
  await env.clock.advance(14999);
  assert.equal(env.errors.length, 1);
  await env.clock.advance(1);
  assert.equal(env.errors.length, 2);
  assert.match(env.errors.at(-1), /豆包童声暂时没准备好/);
  assert.ok(voice.utterance.fallback);
  voice.skip(); await pending;
  assert.equal(env.clock.timers.size, 0);
});
