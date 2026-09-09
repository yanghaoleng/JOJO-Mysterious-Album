/** Shared voice presentation in a real browser. No media devices or APIs. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const compiled=await build({entryPoints:['src/voice-input-control.js'],bundle:true,format:'iife',globalName:'VoiceInput',write:false});
const css=await readFile('src/voice-input-control.css','utf8');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try {
 await page.setContent(`<style>body{margin:0;background:#364d65}main{display:grid;justify-items:center;padding:18px;box-sizing:border-box;width:100%}${css}</style><main><div id="transcript"></div><button id="mic"></button><p id="status"></p></main>`);
 await page.addScriptTag({content:compiled.outputFiles[0].text});
 await page.evaluate(()=>{window.input=VoiceInput.createVoiceInput({button:document.querySelector('#mic'),transcript:document.querySelector('#transcript'),status:document.querySelector('#status'),sanitize:text=>text.replace(/13800138000/g,'[已遮蔽]')});});
 const cases=[['setup','permission',false,false,'开始对话'],['requesting','thinking',true,false],['listening','wave',false,true],['receiving','wave',false,true],['transcribing','thinking',true,false],['thinking','thinking',true,false],['speaking','thinking',true,false],['paused','permission',false,false,'继续对话'],['quiet','wave',false,true],['short','wave',false,true],['empty','wave',false,true],['error','permission',false,false,'再试一次'],['complete','permission',true,false,'对话已结束']];
 for(const [state,visual,disabled,pressed,label] of cases){
  await page.evaluate(state=>input.setState(state),state);
  const actual=await page.locator('#mic').evaluate(button=>({visual:button.dataset.voiceVisual,disabled:button.disabled,pressed:button.getAttribute('aria-pressed'),label:button.querySelector('.voice-input-control__label').textContent}));
  assert.equal(actual.visual,visual,state);assert.equal(actual.disabled,disabled,state);assert.equal(actual.pressed,String(pressed),state);if(label)assert.equal(actual.label,label,state);
 }
 await page.evaluate(()=>{input.setState('thinking',{disabled:false,pressed:true,label:'通话中，点一下暂停'});});
 assert.equal(await page.locator('#mic').isDisabled(),false,'call may stay interactive during an assistant turn');
 assert.equal(await page.locator('#mic').getAttribute('aria-pressed'),'true');
 await page.evaluate(()=>input.setState('listening').setLevel(0));await page.waitForTimeout(80);
 const measure=()=>page.locator('.voice-input-control__wave i').evaluateAll(bars=>bars.map(bar=>({transform:getComputedStyle(bar).transform,animation:getComputedStyle(bar).animationName,height:getComputedStyle(bar).height})));
 const quiet=await measure();await page.waitForTimeout(250);assert.deepEqual(await measure(),quiet,'silence has no animated fake volume');assert.ok(quiet.every(bar=>bar.animation==='none'));
 await page.evaluate(()=>input.setLevel(.8));await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('.voice-input-control__wave i')).transform.split(',')[3])>.2);const loud=await measure();assert.notDeepEqual(loud,quiet,'actual input level changes bars');
 await page.evaluate(()=>input.setActivity(true));await page.waitForTimeout(80);const activity=await measure();await page.waitForTimeout(200);assert.deepEqual(await measure(),activity,'WebSpeech activity stays steady and invents no volume');assert.equal(await page.locator('#mic').getAttribute('data-level-source'),'activity');
 await page.evaluate(()=>input.setActivity(false));await page.waitForTimeout(80);assert.deepEqual(await measure(),quiet);
 await page.evaluate(()=>input.setTranscript('我的电话是13800138000',{interim:true}));assert.match(await page.locator('#transcript').textContent(),/已遮蔽/);assert.equal(await page.locator('#transcript').getAttribute('aria-live'),'off');
 await page.evaluate(()=>input.setTranscript('我的电话是13800138000'));assert.equal(await page.locator('#transcript').getAttribute('aria-live'),'polite');
 const text=await page.locator('#transcript').textContent();for(const state of ['transcribing','thinking','speaking','listening','error']){await page.evaluate(state=>input.setState(state),state);assert.equal(await page.locator('#transcript').textContent(),text);assert.equal(await page.locator('#transcript').isVisible(),true);}
 await page.evaluate(()=>input.setState('error',{message:'暂时没有连上，请重试。'}));assert.equal(await page.locator('#status').textContent(),'暂时没有连上，请重试。');
 for(const width of [320,390,844]){
  await page.setViewportSize({width,height:844});
  await page.evaluate(()=>input.setTranscript('我想造一把有蓝色星星和弯弯月亮的钥匙，打开门看看朋友。'.repeat(6)));
  const size=await page.locator('.voice-input-transcript__text').evaluate(el=>({full:el.textContent,scroll:el.scrollHeight,client:el.clientHeight,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.ok(size.full.length>160);assert.ok(size.scroll>size.client);assert.equal(size.overflow,false,`no overflow at ${width}`);
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>input.setState('transcribing'));
 assert.ok((await page.locator('.voice-input-control__thinking i').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).animationName))).every(name=>name==='none'));
 await page.evaluate(()=>input.reset());assert.equal(await page.locator('#transcript').isVisible(),false);assert.equal(await page.locator('#status').isVisible(),false);
 const mounted=await page.evaluate(()=>VoiceInput.createVoiceInput({button:document.querySelector('#mic')})===input);assert.equal(mounted,true,'idempotent mount');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,states:cases.length,measuredVolume:true,quietIsStill:true,webSpeechActivity:true,finalTranscriptPersists:true,sanitized:true,fullTranscriptScroll:true,mobileWidths:[320,390,844],reducedMotion:true,pageErrors:errors},null,2));
}finally{await browser.close();}
