/** Real decoded TTS + provider subtitle replay against the compiled /dev UI.
 * Requires an actual /api/tts JSON response for the WOW opening line.
 * PLAYWRIGHT_MODULE=... READ_ALONG_FIXTURE=/path/response.json node dev/tools/verify-reading-ui.mjs <baseURL>
 * Does not call a speech API or access the microphone. Fresh browser storage only.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {phraseRanges,speechTimeline,readingAt} from '../speech-timing.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fixture = JSON.parse(await readFile(process.env.READ_ALONG_FIXTURE, 'utf8'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = []; page.on('pageerror', error => errors.push(error.message));
let requests = 0;
try {
  await page.addInitScript(() => {
    window.__READING_QA__ = { starts: [] };
    const original = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function(when, ...args) {
      window.__READING_QA__.starts.push({ context: this.context, when, duration: this.buffer.duration });
      return original.call(this, when, ...args);
    };
  });
  await page.route('**/api/tts', async route => {
    requests++;
    assert.equal(route.request().postDataJSON().responseFormat, 'json');
    if (route.request().postDataJSON().text !== fixture.text) return route.abort();
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)});
  });
  await page.goto(process.argv[2] || 'http://127.0.0.1:8937/dev/?story=wow');
  await page.waitForFunction(() => window.__DEV_STORY__?.status.phase === 'ready');
  await page.locator('#start-story').click();
  await page.waitForFunction(() => window.__READING_QA__.starts.length > 0);
  await page.waitForTimeout(1000);
  const samples = [];
  for (let i = 0; i < 34; i++) {
    samples.push(await page.evaluate(() => {
      const played = window.__READING_QA__.starts.at(-1);
      return { time: played.context.currentTime - played.when,
        text: [...document.querySelectorAll('#speech-text .is-current')].map(e => e.textContent).join(''),
        read: document.querySelectorAll('#speech-text .is-read').length,
        bounds: document.querySelector('#speech-text').getBoundingClientRect().toJSON() };
    }));
    await page.waitForTimeout(120);
  }
  const phrases=phraseRanges(fixture.text),timeline=speechTimeline(fixture.text,fixture.alignment);
  const expectedAt=time=>{const cue=readingAt(timeline,time);return (cue.start>=0 ? phrases.find(p=>p.start<cue.end && p.end>cue.start) : phrases.find(p=>p.start<cue.spokenEnd && p.end>cue.spokenEnd))?.text || '';};
  const checked = samples.filter(sample => !fixture.alignment.some(cue => Math.abs(sample.time - cue.start)<.09 || Math.abs(sample.time - cue.end)<.09));
  assert.ok(checked.length > 6);
  for (const sample of checked) {
    assert.equal(sample.text, expectedAt(sample.time), `playback ${sample.time.toFixed(3)}s`);
  }
  assert.ok(samples.some(sample => sample.text.length > 0));
  assert.ok(samples.some(sample => sample.read > 0));
  assert.equal(new Set(samples.map(sample => JSON.stringify(sample.bounds))).size, 1, 'highlight never changes line layout');
  // Actual output suspension must freeze progress, then resume from its audio time.
  await page.evaluate(() => window.__READING_QA__.starts.at(-1).context.suspend());
  await page.waitForTimeout(80);
  const before = await page.locator('#speech-text .read-along__visual').innerHTML();
  await page.waitForTimeout(450);
  assert.equal(await page.locator('#speech-text .read-along__visual').innerHTML(), before);
  await page.evaluate(() => window.__READING_QA__.starts.at(-1).context.resume());
  await page.waitForFunction(() => document.querySelector('#speech-text .is-current'));
  await page.screenshot({ path: '/tmp/dev-read-along-live-audio.png' });
  await page.locator('#speech-card').click();
  await page.waitForTimeout(120);
  assert.equal(await page.locator('#speech-text .is-current').count(), 0);
  await page.locator('#open-story-menu').click(); await page.locator('#restart').click();
  assert.equal(await page.locator('#speech-text .is-current').count(), 0);
  await page.locator('#start-story').click();
  await page.waitForFunction(() => window.__READING_QA__.starts.length === 2);
  await page.waitForFunction(() => document.querySelector('#speech-text .is-current'));
  await page.waitForTimeout(1000);
  assert.equal(await page.locator('#speech-text .is-current').first().textContent(), phrases[0].text);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed:true,actualAudioBytes:Buffer.from(fixture.audio,'base64').length,timedSamples:checked.length,
    providerTimeline: true, outputSuspension:true, skip:true,restart:true,mobileNoOverflow:true,requests,pageErrors:errors},null,2));
} finally { await browser.close(); }
