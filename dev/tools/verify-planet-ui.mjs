/**
 * Real-browser visual/interaction regression for the independent /dev planets.
 * Usage: node dev/tools/verify-planet-ui.mjs
 * Optional: DEV_QA_BASE, DEV_QA_SESSION, DEV_QA_BROWSER.
 *
 * A fresh isolated browser session is required. Only synthetic v1 story saves
 * are installed in that session; no microphone, backend mutation, or product
 * method is called. Camera/selection tests use real pointer controls. The
 * diagnostic status and a notice MutationObserver are read-only observations.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { STORIES } from '../stories.js';

const browser = process.env.DEV_QA_BROWSER || '/Users/jojo/.npm-global/bin/agent-browser';
const session = process.env.DEV_QA_SESSION || `dev-planet-qa-${process.pid}`;
const base = process.env.DEV_QA_BASE || 'http://127.0.0.1:8913/dev/';
const environment = ['localhost', '127.0.0.1'].includes(new URL(base).hostname) ? 'local' : 'production';
const artifacts = mkdtempSync(join(tmpdir(), `dev-planet-ui-${environment}-`));
const resultFile = new URL(`./verify-planet-ui-${environment}-results.json`, import.meta.url);
const worlds = ['orchard', 'bakery', 'bridge', 'home', 'observatory', 'reef', 'pocket', 'cloud', 'moon', 'meadow', 'cove'];
const rows = [];
const issues = [];
let complete = false, failure = null, closed = false;
const command = (...args) => execFileSync(browser, ['--session', session, ...args], { encoding: 'utf8', timeout: 30000 }).trim();
const evaluate = source => JSON.parse(execFileSync(browser, ['--session', session, 'eval', '--stdin'], { input: source, encoding: 'utf8', timeout: 30000 }).trim());
const status = () => evaluate('window.__DEV_STORY__.status');
function assert(condition, message) { if (!condition) throw Error(message); }
function record(event, detail) { const row = { event, ...detail }; rows.push(row); console.log(JSON.stringify(row)); }
function save() {
  writeFileSync(resultFile, `${JSON.stringify({ base, session, artifacts, checkedAt: new Date().toISOString(), complete, failure, closed, issues,
    method: 'real isolated browser; 11 worlds × 3 viewports; WebGL alpha silhouette + orthographic sphere bounds; read-only radial/pose diagnostics; real front/back pointer picking; synthetic v1 saves in QA-only session', rows }, null, 2)}\n`);
}
function ready() {
  return evaluate(`(async()=>{
    const start=Date.now();
    while(Date.now()-start<15000){
      const loading=document.querySelector('.stage-loading');
      if(window.__DEV_STORY__?.status?.stage?.planet&&(!loading||Number(getComputedStyle(loading).opacity)===0)){
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        return window.__DEV_STORY__.status;
      }
      await new Promise(r=>setTimeout(r,80));
    }
    throw Error('Planet or loading fade never became ready');
  })()`);
}
function click(selector) {
  evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'center',inline:'center',behavior:'instant'});true`);
  command('click', selector);
}
function top() { evaluate(`scrollTo({top:0,behavior:'instant'});true`); }
function capture(name) {
  ready(); top();
  const path = join(artifacts, `${name}.png`);
  command('screenshot', path);
  return path;
}
function rect() { return evaluate(`(()=>{const r=document.querySelector('#stage canvas').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})()`); }
function transform(matrix, p) { return [0, 1, 2, 3].map(row => matrix[row] * p[0] + matrix[row + 4] * p[1] + matrix[row + 8] * p[2] + matrix[row + 12] * p[3]); }
function project(p, stage, bounds) {
  const clip = transform(stage.frame.projection, transform(stage.frame.view, [...p, 1]));
  return { x: bounds.x + (clip[0] / clip[3] + 1) * bounds.width / 2, y: bounds.y + (1 - clip[1] / clip[3]) * bounds.height / 2 };
}
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const sub = (a, b) => a.map((value, i) => value - b[i]);
const unit = a => a.map(value => value / Math.hypot(...a));
function actorPoint(actor, height) { return actor.foot.map((v, i) => v + actor.normal[i] * height); }
function radial(stage) {
  assert(stage.planet.radius > 0 && stage.actorSurfaces.length, 'Missing surface diagnostics');
  return stage.actorSurfaces.map(actor => {
    const radialVector = sub(actor.foot, stage.planet.center);
    const distanceError = Math.abs(Math.hypot(...radialVector) - stage.planet.radius - actor.height);
    const upDot = dot(unit(actor.up), unit(actor.normal));
    const normalDot = dot(unit(radialVector), unit(actor.normal));
    assert(distanceError < 1e-5 && upDot > .99999 && normalDot > .99999, `Actor ${actor.id} detached or not radial`);
    return { id: actor.id, distanceError, upDot, normalDot, foot: actor.foot };
  });
}
function silhouette() {
  return evaluate(`(()=>{
    const source=document.querySelector('#stage canvas');
    const scratch=document.createElement('canvas');scratch.width=source.width;scratch.height=source.height;
    const context=scratch.getContext('2d',{willReadFrequently:true});context.drawImage(source,0,0);
    const rgba=context.getImageData(0,0,scratch.width,scratch.height).data;
    let left=scratch.width,top=scratch.height,right=-1,bottom=-1,opaque=0,edge=0;
    for(let y=0;y<scratch.height;y++)for(let x=0;x<scratch.width;x++){
      if(rgba[(y*scratch.width+x)*4+3]<245)continue;
      opaque++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      if(x===0||y===0||x===scratch.width-1||y===scratch.height-1)edge++;
    }
    return{width:scratch.width,height:scratch.height,opaque,edge,left,top,right,bottom};
  })()`);
}
function layout() {
  return evaluate(`({width:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,
    outliers:[...document.querySelectorAll('button,input,a,canvas')].filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect();return{id:n.id,text:n.textContent.trim().slice(0,30),left:r.left,right:r.right}}).filter(r=>r.left<-.5||r.right>innerWidth+.5)})`);
}
function checkView(label, { requireUnclipped = true, actors = null, invention = false } = {}) {
  const state = ready(); top(); const bounds = rect(); const stage = state.stage;
  const center = project(stage.planet.center, stage, bounds);
  const radiusX = stage.planet.radius * Math.abs(stage.frame.projection[0]) * bounds.width / 2;
  const radiusY = stage.planet.radius * Math.abs(stage.frame.projection[5]) * bounds.height / 2;
  const sphere = { left: center.x - radiusX - bounds.x, right: bounds.x + bounds.width - center.x - radiusX, top: center.y - radiusY - bounds.y, bottom: bounds.y + bounds.height - center.y - radiusY };
  const pixels = silhouette(); const overflow = layout();
  const standing = radial(stage);
  const readability = stage.actorSurfaces.map(actor => {
    const foot = project(actor.foot, stage, bounds), head = project(actorPoint(actor, state.phase === 'studio' ? 2.6 : 1.65), stage, bounds);
    return { id: actor.id, projectedHeight: Math.hypot(head.x - foot.x, head.y - foot.y) };
  });
  if (requireUnclipped) {
    assert(Object.values(sphere).every(margin => margin > 2), `${label}: sphere clipped ${JSON.stringify(sphere)}`);
    assert(pixels.opaque > 1500, `${label}: opaque content blank ${JSON.stringify(pixels)}`);
    if (pixels.edge > 0) issues.push({ label, reason: 'opaque scenery touches canvas edge', pixels });
    assert(readability.every(item => item.projectedHeight >= 24), `${label}: actors too small in default view`);
  }
  assert(overflow.document <= overflow.width && overflow.body <= overflow.width && !overflow.outliers.length, `${label}: horizontal overflow ${JSON.stringify(overflow)}`);
  if (actors) assert(stage.actors.length === actors, `${label}: wrong cast size`);
  if (invention) assert(stage.invention && stage.upgrades.length === 3, `${label}: invention/upgrades missing`);
  const screenshot = capture(label);
  record('view', { label, world: stage.world, orbit: stage.orbit, bounds, sphereMargins: sphere, pixels, standing, readability, overflow, actors: stage.actors, invention: stage.invention, upgrades: stage.upgrades, screenshot });
}
function drag(dx, dy) {
  top(); const bounds = rect();
  const count = Math.ceil(Math.max(Math.abs(dx) / (bounds.width * .55), Math.abs(dy) / (bounds.height * .55), 1));
  const moveX = dx / count, moveY = dy / count;
  for (let step = 0; step < count; step++) {
    const x = bounds.x + bounds.width / 2 - moveX / 2;
    const y = bounds.y + bounds.height / 2 - moveY / 2;
    command('mouse', 'move', String(Math.round(x)), String(Math.round(y)));command('mouse', 'down');
    for (let part = 1; part <= 4; part++) command('mouse', 'move', String(Math.round(x + moveX * part / 4)), String(Math.round(y + moveY * part / 4)));
    command('mouse', 'up');
  }
  return ready().stage;
}
function reset() {
  top(); click('#camera-reset'); const stage = ready().stage;
  assert(Math.abs(stage.orbit.yaw - .28) < 1e-6 && Math.abs(stage.orbit.pitch - .25) < 1e-6 && stage.orbit.zoom === 1, 'Reset did not restore default camera');
}
function observeNotices() {
  evaluate(`(()=>{window.__planetQANotices=[];window.__planetQAObserver?.disconnect();window.__planetQAObserver=new MutationObserver(records=>{for(const r of records)if(r.type==='childList')window.__planetQANotices.push(document.querySelector('#notice').textContent)});window.__planetQAObserver.observe(document.querySelector('#notice'),{childList:true});return true})()`);
}
function noticeCount() { return evaluate('window.__planetQANotices.length'); }
function pointClick(point) {
  command('mouse', 'move', String(Math.round(point.x)), String(Math.round(point.y)));command('mouse', 'down');command('mouse', 'up');
}
function checkOcclusion(world, viewport) {
  reset(); observeNotices(); let front = null;
  for (const height of [1.55, 1.9, 1.15, 2.2]) {
    const stage = status().stage, actor = stage.actorSurfaces[0], point = project(actorPoint(actor, height), stage, rect());
    const before = noticeCount(); pointClick(point);
    if (noticeCount() > before) { front = { height, point }; break; }
  }
  if (!front) {
    issues.push({ label: `${world}/${viewport}`, reason: 'default-view actor could not be hit at head/torso' });
    record('front-pick-missing', { world, viewport, screenshot: capture(`${viewport}-${world}-pick-missing`) });
    return;
  }
  const count = noticeCount();
  const behind = drag(-Math.PI / .007, (-1.03 - .25) / .004);
  assert(Math.abs(behind.orbit.yaw - (.28 + Math.PI)) < .03 && behind.orbit.pitch < -1, 'Backside drag failed');
  assert(noticeCount() === count, 'Dragging accidentally picked a character');
  const actor = behind.actorSurfaces[0], chest = actorPoint(actor, front.height);
  const point = project(chest, behind, rect());
  const toCamera = unit([behind.frame.view[2], behind.frame.view[6], behind.frame.view[10]]);
  const fromCenter = sub(chest, behind.planet.center), b = dot(fromCenter, toCamera);
  const discriminant = b * b - dot(fromCenter, fromCenter) + behind.planet.radius ** 2;
  const nearDistance = discriminant > 0 ? -b - Math.sqrt(discriminant) : -1;
  assert(nearDistance > .01, `${world}: negative control not mathematically blocked by sphere`);
  pointClick(point);
  assert(noticeCount() === count, `${world}/${viewport}: click passed through planet to hidden actor`);
  const screenshot = capture(`${viewport}-${world}-backside`);
  reset();
  record('occlusion-and-reset', { viewport, world, front, backside: { point, nearSphereDistance: nearDistance, orbit: behind.orbit }, notices: count, screenshot });
}

try {
  command('set', 'viewport', '1280', '900');command('open', `${base}?mode=studio`);ready();
  const initialStorage = evaluate('Object.keys(localStorage)');
  assert(!initialStorage.some(key => key.startsWith('jma.dev.clay.v1')), 'Use a fresh session: existing user data found');
  for (const [width, height] of [[1280, 900], [390, 844], [360, 800]]) {
    const viewport = `${width}x${height}`;
    command('set', 'viewport', String(width), String(height));command('open', `${base}?mode=studio`);ready();
    click('#tab-world');
    assert(evaluate(`document.querySelectorAll('[data-world]').length`) === 11, 'Expected exactly eleven worlds');
    for (const world of worlds) {
      click(`[data-world="${world}"]`);ready();assert(status().stage.world === world, `World selector failed: ${world}`);
      checkView(`${viewport}-${world}`);
      if (width === 1280 || ['orchard', 'reef'].includes(world)) checkOcclusion(world, viewport);
    }
    click('#tab-performance');click('[data-action="hop"]');
    checkView(`${viewport}-cove-hop`);
    click('[data-action="talk"]');checkView(`${viewport}-cove-talk`);
    click('[data-action="idle"]');
    // Real multitouch and wheel zoom belong to the separate pointer QA. This
    // matrix intentionally retains the default zoom for comparable framing.
    command('open', base);ready();checkView(`${viewport}-homepage`);
  }

  // Only this fresh QA browser owns these synthetic prior-version records.
  const fixture = (sceneIndex, name, extra = {}) => ({ sceneIndex, setupDone: true, companion: { type: 'rabbit', color: '#eee3d5', name }, inventory: [{ id: 'fixture-keepsake', name: '测试纪念', description: '仅测试会话' }], inventions: [], completed: false, ...extra });
  const fixtures = {
    doudou: fixture(1, '测试伙伴甲'),
    moon: fixture(2, '测试伙伴乙', { inventions: [{ input: '测试旧存档中的发明', visual: { kind: 'rocket', name: '测试月光火箭', primary: '#7b9aab', accent: '#e1b671', details: '原样保留', upgrades: ['navigation', 'float', 'rope'] } }] }),
    echo: fixture(5, '测试伙伴丙', { completed: true }),
  };
  evaluate(`(()=>{const fixtures=${JSON.stringify(fixtures)};for(const [id,value]of Object.entries(fixtures))localStorage.setItem('jma.dev.clay.v1.story.'+id,JSON.stringify(value));return true})()`);
  const fixtureBytes = evaluate(`Object.fromEntries(['doudou','moon','echo'].map(id=>[id,localStorage.getItem('jma.dev.clay.v1.story.'+id)]))`);
  for (const [width, height] of [[1280, 900], [390, 844], [360, 800]]) {
    command('set', 'viewport', String(width), String(height));
    for (const story of STORIES) {
      command('open', `${base}?story=${story.id}`);const state = ready();
      assert(state.sceneIndex === fixtures[story.id].sceneIndex && state.completed === fixtures[story.id].completed, 'Legacy saved progress was not loaded');
      assert(!state.voice.enabled && !state.voice.opening, 'Visual QA must never request microphone');
      checkView(`${width}x${height}-saved-${story.id}`, { actors: story.scenes[state.sceneIndex].cast.length + 1, invention: story.id === 'moon' });
      drag(90, 35);reset();command('reload');ready();
      const actual = evaluate(`localStorage.getItem('jma.dev.clay.v1.story.'+${JSON.stringify(story.id)})`);
      assert(actual === fixtureBytes[story.id], `Visual interactions changed the ${story.id} save`);
      record('legacy-save-unchanged', { viewport: `${width}x${height}`, story: story.id, sceneIndex: status().sceneIndex, completed: status().completed, byteIdentical: true, fixtureOnly: true });
    }
  }
  const errors = command('errors'), consoleText = command('console');
  record('browser-errors', { errors, console: consoleText });
  assert(!errors.trim(), 'Browser reported uncaught errors');
  assert(!/\[error\]|Shader Error|VALIDATE_STATUS.*false|shader.*failed|webgl.*context lost/i.test(consoleText), 'Shader/browser console error');
  complete = true;
  if (issues.length) { process.exitCode = 1; console.error(`${issues.length} visual issue(s) require review.`); }
} catch (error) {
  failure = error.stack || String(error);
  try { record('failure-evidence', { state: status(), screenshot: capture('failure'), errors: command('errors'), console: command('console') }); } catch {}
  process.exitCode = 1;
  console.error(failure);
} finally {
  try { command('close'); closed = true; } catch (error) { record('close-error', { message: String(error) }); }
  save();
}
