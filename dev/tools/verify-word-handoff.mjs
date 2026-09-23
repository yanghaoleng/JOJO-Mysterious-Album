import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8918';
function wav(seconds,tone=false){const rate=16000,n=rate*seconds,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);if(tone)for(let i=0;i<n;i++)b.writeInt16LE(i/rate%4<1?Math.round(Math.sin(i/rate*440*Math.PI*2)*8000):0,44+i*2);return b;}
await writeFile('/tmp/jma-welcome-mic.wav',wav(8,true));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=/tmp/jma-welcome-mic.wav']});
try{
 const context=await browser.newContext({permissions:['microphone'],reducedMotion:'no-preference',viewport:{width:390,height:844}}),page=await context.newPage();let attempts=0;const readings=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
   const Native=window.AudioContext;window.__blockedContexts=0;
   window.AudioContext=class extends Native {constructor(...args){super(...args);if(window.__holdFreshContexts){window.__blockedContexts++;Object.defineProperty(this,'state',{get:()=> 'suspended'});this.resume=()=>new Promise(()=>{});}}};
 });
 await page.route('**/api/tts',async route=>{const data=route.request().postDataJSON();readings.push(data);if(data.text.startsWith("You're "))await page.evaluate(()=>{window.__holdFreshContexts=true;});await route.fulfill({contentType:'audio/wav',body:wav(.3)});});
 await page.route('**/api/asr',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({transcript:attempts++===0?'My name is Lily.':'I am seven.'})}));
 await page.goto(`${origin}/dev/words?voice=legacy`);await page.locator('#word-mic').click();
 await page.waitForFunction(()=>document.getElementById('intro-question')?.textContent.includes("You're 7!"),null,{timeout:20000});
 if(process.env.EXPECT_STALL){await page.waitForTimeout(2000);assert.equal(await page.evaluate(()=>window.__WORD_GAME__.status.view),'intro');assert.equal(await page.evaluate(()=>window.__blockedContexts),1);console.log('REPRODUCED: age reply finishes; a new AudioContext resume blocks scene transition.');}
 else {await page.waitForFunction(()=>window.__WORD_GAME__.status.view==='play',null,{timeout:8000});await page.waitForFunction(()=>window.__WORD_GAME__.status.recording);assert.equal(await page.evaluate(()=>window.__blockedContexts),0);assert.equal(await page.locator('#start-world').count(),0);assert.ok(readings.some(r=>r.voice==='gentle'));assert.equal(await page.evaluate(()=>window.__WORD_GAME__.status.age),7);assert.deepEqual(errors,[]);console.log('PASS mobile age confirmation transfers unlocked audio, automatically enters chapter, reads the full lesson and resumes capture even when new contexts would be blocked.');}
}finally{await browser.close();}
