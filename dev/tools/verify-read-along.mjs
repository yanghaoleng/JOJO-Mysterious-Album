/**
 * Run: node dev/tools/verify-read-along.mjs
 * Real DOM/layout checks in an isolated agent-browser session against a local
 * ephemeral fixture server. No audio, production APIs, project builds or saves.
 * Optional READ_ALONG_QA_BROWSER points to the agent-browser executable.
 * READ_ALONG_QA_ARTIFACTS optionally saves day/night screenshots to that folder.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const browser = process.env.READ_ALONG_QA_BROWSER || 'agent-browser';
const session = `read-along-qa-${process.pid}`;
const artifacts = process.env.READ_ALONG_QA_ARTIFACTS;
if (artifacts) await mkdir(artifacts, { recursive: true });
const command = async (...args) => (await exec(browser, ['--session', session, ...args], {
  timeout: 30000, maxBuffer: 1024 * 1024,
})).stdout.trim();
const evaluate = async source => JSON.parse(await command('eval', source));
const fixture = `<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/immersive.css">
<style>body{padding:40px 20px;background:var(--sky-base,#f2efe2);color:var(--ink)}
.qa-line{display:block;width:min(340px,100%);margin:0 auto;padding:0;font-size:21px;line-height:1.65;letter-spacing:.005em;font-weight:600;text-wrap:pretty;overflow-wrap:anywhere}
.qa-label{font-size:12px;line-height:1.8;color:var(--muted);text-align:center;margin:0 0 28px}</style>
<body data-period="day"><p class="qa-label">朗读高亮验证</p>
<span class="speech-text qa-line" id="line" aria-live="polite"></span>
<script type="module">import{ReadAlong}from'/read-along.js';window.ReadAlong=ReadAlong;window.view=new ReadAlong(document.querySelector('#line'));window.qaReady=true;</script>`;
const resources = new Map([
  ['/app.css', new URL('../app.css', import.meta.url)],
  ['/immersive.css', new URL('../immersive.css', import.meta.url)],
  ['/read-along.js', new URL('../read-along.js', import.meta.url)],
]);
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://127.0.0.1').pathname;
    if (path === '/') { response.setHeader('content-type', 'text/html;charset=utf-8'); response.end(fixture); return; }
    if (path === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    const file = resources.get(path);
    if (!file) { response.writeHead(404); response.end(); return; }
    response.setHeader('content-type', path.endsWith('.css') ? 'text/css' : 'text/javascript');
    response.end(await readFile(file));
  } catch (error) { response.writeHead(500); response.end(error.message); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
const check = async (name, source, verify) => {
  verify(await evaluate(source));
  console.log(`PASS ${name}`);
};

try {
  await command('open', base);
  await command('set', 'viewport', '390', '844');
  await command('wait', '--fn', 'window.qaReady === true');

  await check('repeated characters and punctuation use offsets', `(()=>{
    view.setText('好好，好。');view.update({start:3,end:4,spokenEnd:3});
    return{segments:view.segments.map(s=>({text:s.node.textContent,start:s.start,end:s.end,read:s.node.classList.contains('is-read'),current:s.node.classList.contains('is-current')})),reading:document.querySelector('#line').dataset.reading};
  })()`, result => {
    assert.deepEqual(result.segments.map(s => [s.text, s.start, s.end]), [['好', 0, 1], ['好', 1, 2], ['，', 2, 3], ['好', 3, 4], ['。', 4, 5]]);
    assert.deepEqual(result.segments.filter(s => s.current).map(s => s.start), [3]);
    assert.deepEqual(result.segments.filter(s => s.read).map(s => s.start), [0, 1, 2]);
    assert.equal(result.reading, 'true');
  });

  await check('emoji, flags, combining marks and ZWJ families stay whole', `(()=>{
    const pieces=['你','👩🏽‍🚀','，','🇨🇳','e\u0301','👨‍👩‍👧‍👦','！'];view.setText(pieces.join(''));
    const astronaut=view.segments[1];view.update({start:astronaut.start+1,end:astronaut.start+2,spokenEnd:astronaut.start+1});
    return{pieces:view.segments.map(s=>s.node.textContent),offsets:view.segments.map(s=>[s.start,s.end]),active:[...document.querySelectorAll('.is-current')].map(s=>s.textContent),read:[...document.querySelectorAll('.is-read')].map(s=>s.textContent)};
  })()`, result => {
    const pieces = ['你', '👩🏽‍🚀', '，', '🇨🇳', 'e\u0301', '👨‍👩‍👧‍👦', '！'];
    let offset = 0;
    assert.deepEqual(result.pieces, pieces);
    assert.deepEqual(result.offsets, pieces.map(piece => { const start = offset; offset += piece.length; return [start, offset]; }));
    assert.deepEqual(result.active, ['👩🏽‍🚀']);
    assert.deepEqual(result.read, ['你']);
  });

  await check('pause, clear, finish and replacement preserve their states', `(()=>{
    const first=view.setText('你问一句，星球亮一格。');view.update({start:2,end:3,spokenEnd:2});
    view.update({start:-1,end:-1,spokenEnd:3});const paused={active:document.querySelectorAll('.is-current').length,read:document.querySelectorAll('.is-read').length,reading:document.querySelector('#line').hasAttribute('data-reading')};
    view.clear();const cleared={text:document.querySelector('.read-along__visual').textContent,active:document.querySelectorAll('.is-current').length,read:document.querySelectorAll('.is-read').length,reading:document.querySelector('#line').hasAttribute('data-reading')};
    view.finish();const finished={active:document.querySelectorAll('.is-current').length,read:document.querySelectorAll('.is-read').length,total:view.segments.length,reading:document.querySelector('#line').hasAttribute('data-reading')};
    const second=view.setText('新的话');return{first,second,version:view.version,paused,cleared,finished,replacement:{active:document.querySelectorAll('.is-current').length,read:document.querySelectorAll('.is-read').length,text:document.querySelector('.read-along__visual').textContent}};
  })()`, result => {
    assert.deepEqual(result.paused, { active: 0, read: 3, reading: false });
    assert.deepEqual(result.cleared, { text: '你问一句，星球亮一格。', active: 0, read: 0, reading: false });
    assert.equal(result.finished.read, result.finished.total);
    assert.equal(result.finished.active, 0); assert.equal(result.finished.reading, false);
    assert.equal(result.second, result.first + 1); assert.equal(result.version, result.second);
    assert.deepEqual(result.replacement, { active: 0, read: 0, text: '新的话' });
  });

  await check('empty, out-of-range and backward updates are safe', `(()=>{
    view.setText('好好，好。');view.update({start:99,end:100,spokenEnd:999});const beyond={read:document.querySelectorAll('.is-read').length,reading:document.querySelector('#line').hasAttribute('data-reading')};
    view.update({start:0,end:1,spokenEnd:0});const rewound={read:document.querySelectorAll('.is-read').length,current:document.querySelectorAll('.is-current').length};
    view.update({start:NaN,end:Infinity,spokenEnd:-9});const invalid={read:document.querySelectorAll('.is-read').length,current:document.querySelectorAll('.is-current').length,reading:document.querySelector('#line').hasAttribute('data-reading')};
    view.setText('');view.finish();view.clear();view.update({start:0,end:1,spokenEnd:9});return{beyond,rewound,invalid,empty:document.querySelector('.read-along__visual').textContent,emptyCount:view.segments.length};
  })()`, result => {
    assert.deepEqual(result.beyond, { read: 5, reading: false });
    assert.deepEqual(result.rewound, { read: 0, current: 1 });
    assert.deepEqual(result.invalid, { read: 0, current: 0, reading: false });
    assert.equal(result.empty, ''); assert.equal(result.emptyCount, 0);
  });

  await check('safe text and one stable accessible sentence', `(()=>{
    const text='<img src=x onerror=alert(1)>你问一句。';view.setText(text);
    const line=document.querySelector('#line');const accessible=line.querySelector('.read-along__accessible');
    const observer=new MutationObserver(()=>{});observer.observe(line,{subtree:true,childList:true,characterData:true});
    for(let start=0;start<text.length;start++)view.update({start,end:start+1,spokenEnd:start});view.finish();view.clear();
    const mutations=observer.takeRecords().length;observer.disconnect();
    return{accessible:accessible.textContent,visual:line.querySelector('.read-along__visual').textContent,accessibleCount:line.querySelectorAll('.read-along__accessible').length,hidden:line.querySelector('.read-along__visual').getAttribute('aria-hidden'),nestedLive:line.querySelectorAll('[aria-live]').length,live:line.getAttribute('aria-live'),markup:line.querySelectorAll('img,script').length,mutations,sameAccessible:accessible===line.querySelector('.read-along__accessible')};
  })()`, result => {
    assert.equal(result.accessible, '<img src=x onerror=alert(1)>你问一句。');
    assert.equal(result.visual, result.accessible); assert.equal(result.accessibleCount, 1);
    assert.equal(result.hidden, 'true'); assert.equal(result.nestedLive, 0); assert.equal(result.live, 'polite');
    assert.equal(result.markup, 0); assert.equal(result.mutations, 0); assert.equal(result.sameAccessible, true);
  });

  await check('identical timing frames do not rewrite DOM', `(()=>{
    view.setText('好好听。');view.update({start:1,end:2,spokenEnd:1});
    const observer=new MutationObserver(()=>{});observer.observe(document.querySelector('#line'),{subtree:true,attributes:true,childList:true,characterData:true});
    for(let i=0;i<50;i++)view.update({start:1,end:2,spokenEnd:1});
    const count=observer.takeRecords().length;observer.disconnect();return count;
  })()`, result => assert.equal(result, 0));

  for (const width of [320, 390, 1024]) {
    await command('set', 'viewport', String(width), '844');
    await check(`line breaks remain stable at ${width}px`, `(()=>{
      view.setText('好好，好。你问一句，星球亮一格。👩🏽‍🚀慢慢来，MOMO会认真听你说完。');
      const bounds=()=>view.segments.map(s=>{const r=s.node.getBoundingClientRect();return[r.x,r.y,r.width,r.height]});
      const before=bounds();let shifted=false;
      for(const segment of view.segments){view.update({start:segment.start,end:segment.end,spokenEnd:segment.start});if(JSON.stringify(bounds())!==JSON.stringify(before))shifted=true;}
      view.finish();if(JSON.stringify(bounds())!==JSON.stringify(before))shifted=true;view.clear();
      const line=document.querySelector('#line');return{shifted,document:document.documentElement.scrollWidth,width:innerWidth,opacity:getComputedStyle(line).opacity,display:getComputedStyle(view.segments[0].node).display};
    })()`, result => { assert.equal(result.shifted, false); assert.ok(result.document <= result.width); assert.equal(result.opacity, '1'); assert.equal(result.display, 'inline'); });
  }

  await command('set', 'viewport', '390', '844');
  for (const [period, ink, base] of [['day', '#343d30', '#f2efe2'], ['night', '#303950', '#e3e7f3']]) {
    await check(`${period} contrast and unread text remain clear`, `(()=>{
      document.body.dataset.period=${JSON.stringify(period)};document.body.style.setProperty('--ink',${JSON.stringify(ink)});document.body.style.setProperty('--sky-base',${JSON.stringify(base)});
      view.setText('你问一句，星球亮一格。');view.update({start:3,end:4,spokenEnd:3});
      const style=selector=>{const s=getComputedStyle(document.querySelector(selector));return{color:s.color,background:s.backgroundColor,opacity:s.opacity,weight:s.fontWeight,animation:s.animationName}};
      return{current:style('.is-current'),read:style('.is-read'),unread:style('.read-along__char:last-child'),line:style('#line')};
    })()`, result => {
      const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const a = luminance(result.current.color), b = luminance(result.current.background);
      assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5);
      assert.equal(result.unread.color, result.line.color);
      assert.equal(result.current.weight, result.unread.weight);
      for (const style of Object.values(result)) { assert.equal(style.opacity, '1'); assert.equal(style.animation, 'none'); }
    });
    if (artifacts) await command('screenshot', join(artifacts, `read-along-${period}.png`));
  }

  await check('legacy fallback preserves complete readable text', `(()=>{
    const original=Intl.Segmenter;try{Intl.Segmenter=undefined;const node=document.createElement('span');const legacy=new ReadAlong(node);legacy.setText('👩🏽‍🚀e\u0301');legacy.update({start:1,end:2,spokenEnd:1});return{text:node.querySelector('.read-along__visual').textContent,active:node.querySelectorAll('.is-current').length,reading:node.hasAttribute('data-reading')}}finally{Intl.Segmenter=original}
  })()`, result => { assert.equal(result.text, '👩🏽‍🚀e\u0301'); assert.equal(result.active, 0); assert.equal(result.reading, false); });

  console.log('ReadAlong verification passed. Audio-clock synchronization is tested by its integration owner.');
} finally {
  try { await command('close'); } finally { await new Promise(resolve => server.close(resolve)); }
}
