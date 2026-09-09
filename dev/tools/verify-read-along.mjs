/** Real browser checks for clause focus and shared Calligraph text entrance.
 * PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node dev/tools/verify-read-along.mjs
 * No microphone or speech API calls.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {phraseRanges} from '../speech-timing.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
assert.deepEqual(phraseRanges('他说：“你好！”星球亮了。').map(p=>p.text),['他说：','“你好！”','星球亮了。']);
for(const text of ['好好，好。','你👩🏽‍🚀，🇨🇳e\u0301👨‍👩‍👧‍👦！','长'.repeat(39),'Hello constellation!']) {
 const phrases=phraseRanges(text);assert.equal(phrases.map(p=>p.text).join(''),text);
 assert.ok(phrases.every(p=>text.slice(p.start,p.end)===p.text));
}
const js=await build({entryPoints:['dev/read-along.js'],bundle:true,format:'iife',globalName:'Reading',write:false});
const css=(await Promise.all(['dev/app.css','src/text-motion.css'].map(f=>readFile(f,'utf8')))).join('\n');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.setContent(`<style>${css}body{display:block;background:#23364b;color:white;padding:24px}#line{font:650 24px/1.8 system-ui;display:block;width:100%;overflow-wrap:anywhere}</style><span id="line" aria-live="polite"></span>`);
 await page.addScriptTag({content:js.outputFiles[0].text});
 await page.evaluate(()=>{window.view=new Reading.ReadAlong(document.querySelector('#line'));view.setText('你问一句，星球亮一格。好奇心让世界慢慢变亮。');});
 const initial=await page.locator('#line').boundingBox();
 await page.waitForTimeout(120);
 const entering=await page.locator('.read-along__visual').textContent();
 assert.ok(entering.length>0 && entering.length<25,'text enters sequentially');
 await page.waitForTimeout(1100);
 assert.deepEqual(await page.locator('#line').boundingBox(),initial,'entrance reserves full line layout');
 assert.equal(await page.locator('.read-along__visual').textContent(),'你问一句，星球亮一格。好奇心让世界慢慢变亮。');
 await page.evaluate(()=>view.update({start:2,end:3,spokenEnd:2}));
 assert.equal(await page.locator('.is-current').textContent(),'你问一句，');
 await page.evaluate(()=>view.update({spokenEnd:3}));
 assert.equal(await page.locator('.is-current').textContent(),'你问一句，','hold focus within a clause during a speech gap');
 const visual=await page.locator('.is-current').evaluate(el=>({weight:getComputedStyle(el).fontWeight,shadow:getComputedStyle(el).textShadow,bg:getComputedStyle(el).backgroundColor}));
 assert.equal(visual.weight,'850');assert.notEqual(visual.shadow,'none');assert.equal(visual.bg,'rgba(0, 0, 0, 0)');
 await page.waitForTimeout(400);await page.screenshot({path:'/tmp/lyric-focus.png'});
 for(const width of [320,390,844]){
  await page.setViewportSize({width,height:844});const before=await page.locator('#line').boundingBox();
  for(const start of [6,12,0]){await page.evaluate(start=>view.update({start,end:start+1,spokenEnd:start}),start);assert.deepEqual(await page.locator('#line').boundingBox(),before,'bold focus does not reflow text');}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 const idempotent=await page.evaluate(()=>{const o=new MutationObserver(()=>{});o.observe(view.element,{subtree:true,attributes:true,childList:true});view.update({start:0,end:1,spokenEnd:0});const n=o.takeRecords().length;o.disconnect();return n;});assert.equal(idempotent,0);
 await page.evaluate(()=>view.clear());assert.equal(await page.locator('.is-current').count(),0);
 await page.evaluate(()=>view.finish());assert.equal(await page.locator('.is-read').count(),3);
 await page.evaluate(()=>{view.setText('<img src=x>你问一句。');view.clear();});assert.equal(await page.locator('#line img').count(),0);assert.equal(await page.locator('.read-along__accessible').textContent(),'<img src=x>你问一句。');
 await page.evaluate(()=>{view.setText('旧的文字');view.setText('新的文字');});await page.waitForTimeout(1000);assert.equal(await page.locator('.read-along__visual').textContent(),'新的文字');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(50);await page.evaluate(()=>view.setText('减少动态时立即完整呈现。'));assert.equal(await page.locator('.read-along__visual').textContent(),'减少动态时立即完整呈现。');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,phraseFocus:true,entrance:true,stableLayout:true,unicode:true,clearAndReplace:true,reducedMotion:true,pageErrors:errors},null,2));
}finally{await browser.close();}
