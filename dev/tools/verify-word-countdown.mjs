import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.QA_ORIGIN||'http://127.0.0.1:8918';
const wav=Buffer.alloc(44+16000*2*8);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);await writeFile('/tmp/jma-countdown-silence.wav',wav);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=/tmp/jma-countdown-silence.wav']});
try{
 const context=await browser.newContext({permissions:['microphone'],viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(20000);
 let socket;const send=(event,data={})=>socket.send(JSON.stringify({type:'event',event,data}));
 await p.routeWebSocket('**/api/word-realtime',ws=>{socket=ws;ws.onMessage(m=>{if(typeof m!=='string')return;const d=JSON.parse(m);if(d.type==='start')ws.send(JSON.stringify({type:'ready'}));if(d.type==='say'){send(350,{text:''});ws.send(Buffer.alloc(4800));send(359);}});});
 await p.goto(`${base}/dev/words`);await p.locator('#skip-intro').click();await p.locator('#choose-age').click();await p.locator('#continue-chapter').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.view==='play'&&!window.__WORD_GAME__.status.opening);
 await p.locator('#word-mic').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.recording);
 send(450);send(451,{results:[{text:'A big head.'}]});send(459);
 await p.locator('#continue-countdown').waitFor({state:'visible'});await p.waitForFunction(()=>document.getElementById('continue-countdown').textContent.trim()==='2');
 send(450);send(451,{results:[{text:'妈妈说再试一次'}]});await p.waitForTimeout(3300);assert.equal(await p.evaluate(()=>window.__WORD_GAME__.status.lessonIndex),0,'Active speech suspends countdown');send(459);
 await p.waitForFunction(()=>!document.getElementById('continue-countdown').hidden&&document.getElementById('continue-countdown').textContent.trim()==='3');
 await p.keyboard.press('Space');await p.waitForTimeout(3300);assert.equal(await p.evaluate(()=>window.__WORD_GAME__.status.lessonIndex),0,'Paused capture never advances');
 await p.keyboard.press('Enter');await p.waitForFunction(()=>window.__WORD_GAME__.status.lessonIndex===1&&!window.__WORD_GAME__.status.opening);
 await p.locator('#word-mic').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.recording);
 send(450);send(451,{results:[{text:'Two hands.'}]});send(459);
 await p.locator('#continue-countdown').waitFor({state:'visible'});const start=Date.now();await p.waitForFunction(()=>window.__WORD_GAME__.status.lessonIndex===2);assert.ok(Date.now()-start>=2600,'Three seconds of quiet before advancing');await p.waitForFunction(()=>!window.__WORD_GAME__.status.opening);await p.keyboard.press('Space');
 // Presentation responds to amplitude through actual component API, preserving cap geometry.
 assert.equal(await p.locator('#word-mic .voice-input-control__wave i').count(),6);
 const bars=await p.evaluate(async()=>{const {mountVoiceInputControl,setVoiceInputControlLevel,setVoiceInputControlState}=await import('/src/voice-input-control.js');const b=document.getElementById('word-mic');mountVoiceInputControl(b,6);setVoiceInputControlState(b,'listening');setVoiceInputControlLevel(b,1);await new Promise(r=>setTimeout(r,120));return [...b.querySelectorAll('.voice-input-control__wave i')].map(i=>{const s=getComputedStyle(i);return {width:s.width,height:parseFloat(s.height),radius:s.borderRadius,transform:s.transform};});});
 assert.equal(bars.length,6);for(const b of bars){assert.equal(b.width,'4px');assert.equal(b.radius,'2px');assert.equal(b.transform,'none');assert.ok(b.height>6);}
 await p.screenshot({path:'/tmp/jma-voice-lines-mobile.png'});
 console.log('PASS 3-second quiet advancement, speech reset, pause hold, Enter continuation, six fixed-width round-capped audio lines.');
}finally{await browser.close();}
