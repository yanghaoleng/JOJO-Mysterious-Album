import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { WOW_DEV_STORY } from '../wow-story.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.DEV_QA_BASE || 'http://127.0.0.1:8156/dev/';
const output = process.env.VERIFY_OUTPUT || '/tmp/jma-exploration-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage(), errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
// Local deterministic text fallback; this does not claim live voice/API coverage.
await page.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"local verification"}' }));
const status = () => page.evaluate(() => window.__DEV_STORY__.status);
const explored = async () => (await status()).stage.exploration;
const movedDistance = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const idle = () => page.waitForFunction(() => !window.__DEV_STORY__.status.stage.exploration?.moving, {}, { timeout: 25000 });
async function destination(id) { await page.locator('.exploration-map-toggle').click(); await page.locator(`[data-zone="${id}"]`).click(); await idle(); }
async function decision() {
  for (let i = 0; i < 180; i++) {
    const s = await status(); if (['question','complete'].includes(s.phase) && !s.busy) return;
    if (await page.locator('#speech-card').isVisible()) await page.locator('#speech-card').click();
    await page.waitForTimeout(80);
  }
  throw new Error('Story did not reach question');
}
try {
  await page.goto(`${base}?story=wow`); await page.waitForFunction(() => window.__DEV_STORY__?.status.stage.exploration);
  await page.waitForTimeout(500);
  assert.equal((await explored()).zones.length, 5);
  await page.screenshot({ path: `${output}/desktop-home.png` });
  const initialScene = (await status()).sceneIndex;
  for (const [id, kind] of [['lake', 'fish'], ['flowers', 'flower'], ['mushrooms', 'mushroom'], ['bells', 'bell']]) {
    await destination(id);
    const state = await explored(); assert.ok(state.reactions.some(r => r.kind === kind && r.count > 0), `No reaction at ${id}`);
    assert.equal((await status()).sceneIndex, initialScene, 'Exploration changed story progress');
    await page.screenshot({ path: `${output}/desktop-${id}.png` });
  }
  checks.push('walk to all four neighborhoods; approach reactions; no story progression');
  await destination('home');
  let before = (await explored()).normal;
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(650); await page.keyboard.up('ArrowRight');
  assert.ok(movedDistance(before, (await explored()).normal) > .07, 'Arrow movement failed');
  before = (await explored()).normal; await page.waitForTimeout(200); assert.ok(movedDistance(before, (await explored()).normal) < .005);
  await page.keyboard.down('w'); await page.waitForTimeout(450); await page.keyboard.up('w');
  assert.ok(movedDistance(before, (await explored()).normal) > .04, 'WASD failed');
  before = (await explored()).normal;
  const avatar = (await explored()).avatar; await page.mouse.click(avatar.x + 100, avatar.y + 35); await idle();
  assert.ok(movedDistance(before, (await explored()).normal) > .04, 'Ground click failed');
  before = (await explored()).normal;
  await page.mouse.move(700, 380); await page.mouse.down(); await page.mouse.move(810, 400, { steps: 10 }); await page.mouse.up();
  await page.waitForTimeout(200); assert.ok(movedDistance(before, (await explored()).normal) < .005, 'Drag incorrectly started walking');
  checks.push('arrow and WASD walking; stop on keyup; floor click; camera drag does not walk');
  await page.reload(); await page.waitForFunction(() => window.__DEV_STORY__?.status.stage.exploration);
  assert.ok(movedDistance(before, (await explored()).normal) < .005, 'Position not restored');
  checks.push('position restored on refresh');
  await destination('home'); await page.locator('#start-story').click(); await decision();
  if (await page.locator('#reply-options').isHidden()) await page.locator('#reply-more').click(); await page.locator('#show-text').click();
  await page.locator('#answer-input').fill('小星星'); before = (await explored()).normal;
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(250); await page.keyboard.up('ArrowLeft');
  assert.ok(movedDistance(before, (await explored()).normal) < .001, 'Text cursor moved character');
  await page.locator('#text-form button').click(); await decision();
  assert.equal((await status()).sceneIndex, 1); assert.ok((await explored()).normal);
  checks.push('typing keeps avatar still; story answer advances normally and keeps exploration');
  // Complete the first chapter through actual choice controls; every chapter must retain exploration.
  for (let i = 1; i < 11; i++) {
    if (await page.locator('#reply-options').isHidden()) await page.locator('#reply-more').click();
    if (await page.locator('#choices').isHidden()) await page.locator('#show-choices').click();
    await page.locator('#choices button').first().click(); await decision();
  }
  assert.equal((await status()).sceneIndex, 11); assert.ok(await explored());
  assert.equal(await page.locator('.exploration-hud').count(), 1);
  for (let i = 11; i < WOW_DEV_STORY.scenes.length; i++) {
    if (await page.locator('#reply-options').isHidden()) await page.locator('#reply-more').click();
    if (await page.locator('#choices').isHidden()) await page.locator('#show-choices').click();
    await page.locator('#choices button').first().click(); await decision();
    assert.ok(await explored(), `Lost child in WOW scene ${i}`);
    assert.equal(await page.locator('.exploration-hud').count(), 1);
  }
  assert.equal((await status()).completed, true);
  checks.push('all WOW answers and six planets retain one explorer, with normal completion');
  // Restart uses a fresh position, and mobile keeps map/touch movement accessible.
  await page.locator('#open-story-menu').click(); await page.locator('#restart').click();
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  assert.equal((await status()).sceneIndex, 0); assert.equal((await explored()).area, '星星小屋');
  await destination('lake'); await page.screenshot({ path: `${output}/mobile-lake.png` });
  const point = (await explored()).avatar; assert.ok(point.x > 30 && point.x < 360 && point.y > 160 && point.y < 620);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('.exploration-map-toggle').click(); await page.screenshot({ path: `${output}/mobile-map.png` });
  await page.keyboard.press('Escape');
  checks.push('390px mobile map, camera framing, no horizontal overflow, restart resets position');
  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const touch = await touchContext.newPage(); await touch.goto(`${base}?story=wow`); await touch.waitForFunction(() => window.__DEV_STORY__?.status.stage.exploration);
  const touchBefore = await touch.evaluate(() => window.__DEV_STORY__.status.stage.exploration.normal);
  await touch.touchscreen.tap(260, 430); await touch.waitForTimeout(1200);
  assert.ok(movedDistance(touchBefore, await touch.evaluate(() => window.__DEV_STORY__.status.stage.exploration.normal)) > .015);
  await touchContext.close(); checks.push('real touch tap and reduced-motion movement');
  await page.goto(`${base}?story=doudou`); await page.waitForFunction(() => window.__DEV_STORY__?.status.storyId === 'doudou');
  assert.equal((await explored()), null); assert.equal(await page.locator('.exploration-hud').count(), 0);
  checks.push('other story remains independent');
  assert.deepEqual(errors, []);
  const report = { passed: true, base, checks, errors, note: 'UI and movement verified with local text fallback; no live microphone or speech service test.' };
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
