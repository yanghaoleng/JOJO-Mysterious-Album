/**
 * Run against a built /dev candidate, for example:
 * PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs \
 *   node dev/tools/verify-transcript-ui.mjs http://127.0.0.1:8914/dev/?story=wow
 *
 * Uses real Chrome DOM, AudioWorklet, VAD and PCM conversion with a synthetic
 * MediaStream. ASR/story responses and TTS audio are deliberately mocked.
 * This checks transcript/status UX; it does not certify real ASR or TTS APIs.
 * No physical microphone, production API call, saved user session or build.
 */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = new URL(process.argv[2] || 'http://127.0.0.1:8914/dev/?story=wow');
base.searchParams.set('story', 'wow');
const reports = [];
const modes = process.env.TRANSCRIPT_QA_CASES?.split(',') || ['success', 'empty', 'http-error', 'private', 'quiet', 'permission'];
const answer = '我想做一把蓝色的星星钥匙';
const privateAnswer = '我的手机号码是13800138000'; // Invented QA input only.
const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function snapshot(page) {
  return page.evaluate(() => {
    const visible = el => Boolean(el && !el.hidden && el.getClientRects().length);
    const withinViewport = el => { const rect = el.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth; };
    const heard = document.getElementById('heard'), feedback = document.getElementById('voice-feedback');
    const status = window.__DEV_STORY__.status;
    return {
      phase: status.phase, busy: status.busy, recording: status.voice.recording,
      entries: status.wow.entries, firstWords: status.wow.firstWords,
      heard: { visible: visible(heard), withinViewport: withinViewport(heard), text: heard.textContent },
      feedback: { visible: visible(feedback), withinViewport: withinViewport(feedback), state: feedback.dataset.state, text: feedback.textContent },
      choices: visible(document.getElementById('choices')),
      observed: window.__TRANSCRIPT_QA__.observed,
      transcriptsShown: window.__TRANSCRIPT_QA__.transcriptsShown,
    };
  });
}

try {
  for (const mode of modes) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const requests = [], pageErrors = [];
    let releaseStory;
    const storyGate = new Promise(resolve => { releaseStory = resolve; });
    page.on('pageerror', error => pageErrors.push(error.message));
    try {
      await page.route('**/api/asr', async route => {
        const body = route.request().postDataJSON();
        requests.push({ path: 'asr', pcmBytes: Buffer.from(body.pcm, 'base64').length });
        await delay(450); // Keep the real transcribing state observable.
        await route.fulfill({ status: mode === 'http-error' ? 503 : 200, contentType: 'application/json', body: JSON.stringify(
          mode === 'http-error' ? { error: 'asr_upstream_error' }
            : { transcript: mode === 'empty' ? '' : mode === 'private' ? privateAnswer : answer, provider: 'qa-mock' },
        ) });
      });
      await page.route('**/api/wow-turn', async route => {
        requests.push({ path: 'story', answer: route.request().postDataJSON().answer });
        await storyGate;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          source: 'local', reaction: '这把蓝色的星星钥匙，保留着你的想法。',
          visual: { shape: 'star', color: '#88b6d4' }, accepted: true,
        }) });
      });
      await page.addInitScript(({ mode }) => {
        localStorage.clear(); // Fresh disposable context only.
        const qa = window.__TRANSCRIPT_QA__ = { observed: [], transcriptsShown: [], streams: [] };
        // A valid 100ms silent WAV; no product speech service is contacted.
        const silent = new Uint8Array(3244), data = new DataView(silent.buffer);
        const string = (offset, text) => [...text].forEach((char, i) => { silent[offset + i] = char.charCodeAt(0); });
        string(0, 'RIFF'); data.setUint32(4, 3236, true); string(8, 'WAVEfmt '); data.setUint32(16, 16, true);
        data.setUint16(20, 1, true); data.setUint16(22, 1, true); data.setUint32(24, 16000, true);
        data.setUint32(28, 32000, true); data.setUint16(32, 2, true); data.setUint16(34, 16, true);
        string(36, 'data'); data.setUint32(40, 3200, true);
        const originalFetch = window.fetch.bind(window);
        window.fetch = (url, options) => new URL(typeof url === 'string' ? url : url.url, location.href).pathname === '/api/tts'
          ? Promise.resolve(new Response(silent, { headers: { 'Content-Type': 'audio/wav' } })) : originalFetch(url, options);
        navigator.mediaDevices.getUserMedia = async () => {
          if (mode === 'permission') throw new DOMException('QA denied microphone access', 'NotAllowedError');
          const audio = new AudioContext({ sampleRate: 48000 }); await audio.resume();
          const buffer = audio.createBuffer(1, 48000 * 3, 48000), samples = buffer.getChannelData(0);
          // 800ms tone followed by silence exercises actual VAD and the worklet.
          for (let i = 0; i < 38400; i++) samples[i] = .05 * Math.sin(2 * Math.PI * 220 * i / 48000);
          const source = audio.createBufferSource(), destination = audio.createMediaStreamDestination();
          source.buffer = buffer; source.connect(destination);
          qa.streams.push({ audio, source, destination });
          qa.play = () => source.start(audio.currentTime + .1);
          return destination.stream;
        };
        document.addEventListener('DOMContentLoaded', () => new MutationObserver(() => {
          const feedback = document.getElementById('voice-feedback'), heard = document.getElementById('heard');
          if (feedback && !feedback.hidden && feedback.getClientRects().length) {
            const value = { state: feedback.dataset.state, text: feedback.textContent };
            if (JSON.stringify(value) !== JSON.stringify(qa.observed.at(-1))) qa.observed.push(value);
          }
          if (heard && !heard.hidden && heard.getClientRects().length && heard.textContent && !qa.transcriptsShown.includes(heard.textContent)) qa.transcriptsShown.push(heard.textContent);
        }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'data-state'] }));
      }, { mode });
      await page.goto(base.href, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__DEV_STORY__?.status.storyId === 'wow');
      await page.locator('#start-story').click();
      await page.waitForFunction(() => __DEV_STORY__.status.phase === 'question' && !__DEV_STORY__.status.busy, null, { timeout: 20000 });
      await page.locator('#mic-button').click();
      if (mode === 'permission') {
        await page.waitForFunction(() => document.getElementById('voice-feedback').dataset.state === 'error');
      } else {
        await page.waitForFunction(() => __DEV_STORY__.status.voice.recording && __TRANSCRIPT_QA__.streams.length > 0);
        if (mode !== 'quiet') await page.evaluate(() => __TRANSCRIPT_QA__.play());
        const expected = mode === 'quiet' ? 'quiet' : mode === 'empty' ? 'empty' : mode === 'http-error' ? 'error' : 'transcript';
        await page.waitForFunction(expected => __TRANSCRIPT_QA__.observed.some(item => item.state === expected), expected, { timeout: 20000 });
      }
      if (mode === 'success') await page.waitForFunction(() => __DEV_STORY__.status.phase === 'responding');
      if (mode === 'private') await delay(150);
      if (['empty', 'http-error'].includes(mode)) {
        // A failure must outlive both the toast and the normal silence timer.
        await delay(8500);
        const feedback = await page.locator('#voice-feedback').getAttribute('data-state');
        assert.equal(feedback, mode === 'empty' ? 'empty' : 'error', `${mode}: the cause must remain visible until new speech or explicit retry`);
      }
      const result = await snapshot(page);
      assert.deepEqual(pageErrors, [], `${mode}: browser errors`);
      assert.equal(result.choices, false, `${mode}: choices must not open automatically`);
      assert.equal(result.feedback.visible, true, `${mode}: capture feedback remains visible`);
      assert.equal(result.feedback.withinViewport, true, `${mode}: capture feedback stays inside the mobile viewport`);
      if (['success', 'empty', 'http-error', 'private'].includes(mode)) {
        for (const state of ['listening', 'receiving', 'transcribing']) assert.ok(result.observed.some(item => item.state === state), `${mode}: missing ${state}`);
        assert.ok(requests.find(item => item.path === 'asr')?.pcmBytes > 10000, `${mode}: real worklet must produce PCM`);
      }
      if (mode === 'success') {
        assert.equal(result.heard.visible, true, 'safe transcript stays visible while story reply is pending');
        assert.equal(result.heard.withinViewport, true, 'safe transcript stays inside the mobile viewport');
        assert.ok(result.heard.text.includes(answer));
        assert.equal(requests.find(item => item.path === 'story')?.answer, answer);
        releaseStory();
        await page.waitForFunction(() => __DEV_STORY__.status.wow.entries === 1);
      } else {
        assert.equal(requests.some(item => item.path === 'story'), false, `${mode}: no story answer should be sent`);
        assert.equal(result.entries, 0);
        if (mode !== 'permission') assert.equal(result.recording, true, `${mode}: microphone recovers automatically`);
        if (mode === 'private') {
          assert.ok(result.transcriptsShown.every(text => !text.includes('13800138000')), 'private transcript must never be displayed');
          assert.ok(!result.heard.text.includes('13800138000'), 'private words must not remain in the transcript element');
        }
      }
      reports.push({ mode, ...result, requests, pageErrors });
      console.log(`PASS ${mode}: ${result.observed.map(item => item.state).join(' → ')}`);
    } finally {
      releaseStory();
      await page.evaluate(async () => {
        for (const stream of window.__TRANSCRIPT_QA__?.streams || []) {
          stream.destination.stream.getTracks().forEach(track => track.stop());
          try { stream.source.stop(); } catch { /* The quiet source never started. */ }
          await stream.audio.close();
        }
      }).catch(() => {});
      await context.close();
    }
  }
  if (process.env.TRANSCRIPT_QA_REPORT) await writeFile(process.env.TRANSCRIPT_QA_REPORT, JSON.stringify({
    method: 'Synthetic MediaStream and real Worklet/VAD; ASR, story and TTS mocked; no physical microphone', reports,
  }, null, 2));
  console.log(`PASS ${reports.length} transcript/status UI cases`);
} finally { await browser.close(); }
