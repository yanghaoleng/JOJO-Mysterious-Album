// Exercise the Vercel HTTP contract with a real chunked SSE reader; no external API calls.
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { webcrypto } from 'node:crypto';
import handler from './api/tts.js';

const originalFetch = globalThis.fetch;
const originalEnvironment = { ...process.env };
globalThis.crypto ||= webcrypto;
Object.assign(process.env, {
  PET_TTS_PROVIDER: 'fish', VOLC_SPEECH_APP_ID: 'test-app',
  VOLC_SPEECH_ACCESS_TOKEN: 'test-token', VOLC_TTS_RESOURCE_ID: 'legacy-resource',
});
after(() => { globalThis.fetch = originalFetch; process.env = originalEnvironment; });

function response() {
  return { headers: {}, code: 0, body: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.code = code; return this; },
    send(body) { this.body = body; return this; },
    json(body) { this.body = body; return this; },
  };
}
function serveSse(events) {
  const bytes = new TextEncoder().encode(events.map(event => 'data: ' + JSON.stringify(event)).join('\r\n'));
  // Deliberately split UTF-8 Chinese characters and SSE lines across reads.
  return new Response(new ReadableStream({ start(controller) {
    for (let offset = 0; offset < bytes.length; offset += 7) controller.enqueue(bytes.slice(offset, offset + 7));
    controller.close();
  }}), { headers: { 'Content-Type': 'text/event-stream' } });
}

test('JSON returns exact audio with provider timings after audio and no final newline', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return serveSse([
      { code: 0, data: Buffer.from('exact-audio').toString('base64') },
      { code: 0, sentence: { words: [{ word: '星。', startTime: 2.6, endTime: 3.1 }] } },
      { code: 0, sentence: { words: [{ word: '你', startTime: .3, endTime: .6, confidence: .9 }] } },
      { code: 0, sentence: { words: [{ word: '你', startTime: .3, endTime: .6 }, { word: '无效', startTime: -1, endTime: 0 }] } },
      { code: 20000000 },
    ]);
  };
  const res = response();
  await handler({ method: 'POST', body: { text: '你，星。', speechProfile: 'wow-child', responseFormat: 'json' } }, res);
  assert.equal(res.code, 200);
  assert.equal(Buffer.from(res.body.audio, 'base64').toString(), 'exact-audio');
  assert.deepEqual(res.body.alignment, [{ text: '你', start: .3, end: .6, confidence: .9 }, { text: '星。', start: 2.6, end: 3.1 }]);
  assert.equal(res.body.alignmentUnit, 'seconds');
  assert.equal(res.body.alignmentSource, 'provider');
  assert.equal(res.body.provider, 'volc-seed-v3');
  assert.equal(res.body.voice, 'wow-child');
  assert.equal(request.body.req_params.audio_params.enable_subtitle, true);
  assert.equal(request.body.req_params.speaker, 'zh_male_naiqimengwa_uranus_bigtts');
  assert.equal(request.options.headers['X-Api-Resource-Id'], 'seed-tts-2.0');
});

test('raw audio callers retain their original response and no subtitle option', async () => {
  let params;
  globalThis.fetch = async (_, options) => {
    params = JSON.parse(options.body).req_params.audio_params;
    return serveSse([{ data: Buffer.from('raw-mp3').toString('base64') }, { code: 20000000 }]);
  };
  const res = response();
  await handler({ method: 'POST', body: { text: '星星', speechProfile: 'wow-child' } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.toString(), 'raw-mp3');
  assert.equal(res.headers['content-type'], 'audio/mpeg');
  assert.equal(res.headers['content-length'], '7');
  assert.equal(params.enable_subtitle, undefined);
  assert.equal(params.enable_timestamp, undefined);
});

test('missing metadata preserves playback and reports no alignment', async () => {
  globalThis.fetch = async () => serveSse([{ data: Buffer.from('mp3').toString('base64') }]);
  const res = response();
  await handler({ method: 'POST', body: { text: '星星', speechProfile: 'wow-child', responseFormat: 'json' } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.alignment, []);
  assert.equal(res.body.alignmentSource, 'none');
  assert.equal(res.body.audio, Buffer.from('mp3').toString('base64'));
});
