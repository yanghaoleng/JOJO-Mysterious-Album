import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8918';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try{
 const context=await browser.newContext({permissions:['microphone'],reducedMotion:'reduce'}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));let connection,audioChunks=0,sayCount=0;
 const send=(event,data={})=>connection.send(JSON.stringify({type:'event',event,data}));
 await page.routeWebSocket('**/api/word-realtime',ws=>{connection=ws;ws.onMessage(message=>{
   if(typeof message!=='string'){audioChunks++;return;}
   const data=JSON.parse(message);
   if(data.type==='start')ws.send(JSON.stringify({type:'ready'}));
   if(data.type==='say'){sayCount++;send(350,{text:data.text});ws.send(Buffer.alloc(4800));send(359);}
 });});
 await page.goto(`${origin}/dev/words?voice=realtime`);await page.locator('#choose-age').click();await page.locator('#continue-chapter').click();
 await page.waitForFunction(()=>window.__WORD_GAME__?.status.view==='play');await page.waitForTimeout(500);assert.ok(sayCount>0);
 await page.locator('#word-mic').click();await page.waitForTimeout(600);assert.ok(audioChunks>0,'Microphone frames stream before the end of a sentence');
 send(450);send(451,{results:[{text:'DOMI',is_interim:true}]});await page.waitForFunction(()=>document.getElementById('word-transcript').textContent.includes('DOMI'));
 assert.equal(Object.values(await page.evaluate(()=>window.__WORD_GAME__.status.entities)).some(e=>e.asset==='npc:domi'),false,'Interim words must not execute');
 send(451,{results:[{text:'DOMI',is_interim:false}]});send(459);
 await page.waitForFunction(()=>Object.values(window.__WORD_GAME__.status.entities).some(e=>e.asset==='npc:domi'));
 send(459);await page.waitForTimeout(100);assert.equal(Object.values(await page.evaluate(()=>window.__WORD_GAME__.status.entities)).filter(e=>e.asset==='npc:domi').length,1);
 const before=await page.evaluate(()=>window.__WORD_GAME__.status.entities);
 send(450);send(451,{results:[{text:'让花长大',is_interim:false}]});send(459);await page.waitForTimeout(200);assert.deepEqual(await page.evaluate(()=>window.__WORD_GAME__.status.entities),before);
 await page.locator('#word-options-toggle').click();await page.locator('#voice-mode').click();await page.waitForURL('**voice=legacy');assert.equal(await page.evaluate(()=>localStorage.getItem('jma.word-voice-mode')),'legacy');assert.deepEqual(errors,[]);
 console.log('PASS realtime protocol fixture: live microphone streaming, interim captions, final-only scene actions, duplicate endings, English guard and classic rollback');
 const fresh=await browser.newContext({reducedMotion:'reduce'}),fallback=await fresh.newPage();
 await fallback.routeWebSocket('**/api/word-realtime',ws=>ws.close());
 await fallback.route('**/api/tts',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
 await fallback.goto(`${origin}/dev/words?voice=realtime`);await fallback.locator('#choose-age').click();await fallback.locator('#continue-chapter').click();
 await fallback.waitForFunction(()=>document.getElementById('answer-feedback')?.textContent.includes('classic voice'));
 console.log('PASS unavailable realtime service displays classic fallback');
}finally{await browser.close();}
