import assert from 'node:assert/strict';
import { WORD_PRAISES } from '../content/word-games.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8918';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try{
 const context=await browser.newContext({permissions:['microphone'],reducedMotion:'reduce'}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));let connection,audioChunks=0,sayCount=0;const readings=[];
 const send=(event,data={})=>connection.send(JSON.stringify({type:'event',event,data}));
 await page.routeWebSocket('**/api/word-realtime',ws=>{connection=ws;ws.onMessage(message=>{
   if(typeof message!=='string'){audioChunks++;return;}
   const data=JSON.parse(message);
   if(data.type==='start')ws.send(JSON.stringify({type:'ready'}));
   if(data.type==='say'){sayCount++;readings.push(data.text);send(350,{text:''});ws.send(Buffer.alloc(4800));send(351,{text:data.text});send(359);}
 });});
 await page.goto(`${origin}/dev/words?voice=realtime`);await page.locator('#choose-age').click();
 await page.waitForFunction(()=>window.__WORD_GAME__?.status.view==='play');await page.waitForTimeout(500);assert.ok(sayCount>0);
 await page.waitForFunction(()=>window.__WORD_GAME__.status.recording);await page.waitForTimeout(600);assert.ok(audioChunks>0,'Microphone frames stream before the end of a sentence');
 assert.equal(await page.locator('#answer-feedback').count(),0);
 assert.equal(await page.locator('#word-mic .voice-input-control__wave i').count(),6);
 send(450);await page.waitForFunction(()=>window.__WORD_GAME__.status.voiceState==='transcribing');
 assert.equal(await page.locator('#word-mic').getAttribute('data-voice-visual'),'wave');assert.equal(await page.locator('#word-mic').isEnabled(),true);
 send(451,{results:[{text:'DOMI',is_interim:true}]});await page.waitForFunction(()=>document.getElementById('word-transcript').textContent.includes('DOMI'));
 assert.equal(Object.values(await page.evaluate(()=>window.__WORD_GAME__.status.entities)).some(e=>e.asset==='npc:domi'),false,'Interim words must not execute');
 send(451,{results:[{text:'DOMI',is_interim:false}]});send(459);
 await page.waitForFunction(()=>Object.values(window.__WORD_GAME__.status.entities).some(e=>e.asset==='npc:domi'));
 send(459);await page.waitForTimeout(100);assert.equal(Object.values(await page.evaluate(()=>window.__WORD_GAME__.status.entities)).filter(e=>e.asset==='npc:domi').length,1);
 send(350,{text:'head'});connection.send(Buffer.alloc(4800));await page.waitForTimeout(100);assert.notEqual(await page.locator('#word-mic').getAttribute('data-state'),'speaking','unsolicited cloud word must stay silent');send(359);
 send(450);send(451,{results:[{text:'A big head.',is_interim:false}]});send(459);
 await page.waitForFunction(()=>window.__WORD_GAME__.status.canAdvance&&!window.__WORD_GAME__.status.busy&&window.__WORD_GAME__.status.recording);
 assert.ok(readings.some(text=>WORD_PRAISES.includes(text)),'A correct sentence is praised aloud');
 assert.equal(await page.locator('#transcript-loading').isVisible(),false);
 const before=await page.evaluate(()=>window.__WORD_GAME__.status.entities);
 send(450);send(451,{results:[{text:'让花长大',is_interim:false}]});send(459);await page.waitForTimeout(200);assert.deepEqual(await page.evaluate(()=>window.__WORD_GAME__.status.entities),before);
 await page.locator('#word-options-toggle').click();await page.locator('#voice-mode').click();await page.waitForURL('**voice=legacy');assert.equal(await page.evaluate(()=>localStorage.getItem('jma.word-voice-mode')),'legacy');assert.deepEqual(errors,[]);
 console.log('PASS realtime protocol fixture: live microphone streaming, interim captions, final-only scene actions, duplicate endings, English guard and classic rollback');
 const fresh=await browser.newContext({reducedMotion:'reduce'}),fallback=await fresh.newPage();
 await fallback.routeWebSocket('**/api/word-realtime',ws=>ws.close());
 await fallback.route('**/api/tts',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
 await fallback.goto(`${origin}/dev/words?voice=realtime`);await fallback.locator('#choose-age').click();
 await fallback.waitForFunction(()=>document.getElementById('voice-mode')?.textContent.includes('已回退经典'));
 assert.match(await fallback.locator('#mic-heading').innerText(),/实时语音|朗读暂时|跟着说|试着说出来/);console.log('PASS unavailable realtime keeps classic fallback status while preserving any TTS failure message');
}finally{await browser.close();}
