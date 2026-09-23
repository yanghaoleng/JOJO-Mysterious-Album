import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {WORD_CHAPTERS,getRecommendedWordChapter,getChapterLessons} from '../content/word-games.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8917',out='/tmp/jma-word-immersive';await mkdir(out,{recursive:true});
// Test sound goes through the real microphone/worklet/ASR path. Only server responses are fixtures.
function wav(seconds,tone=false){const rate=16000,n=rate*seconds,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);if(tone)for(let i=0;i<n;i++)b.writeInt16LE(i/rate%4<1?Math.round(Math.sin(i/rate*440*Math.PI*2)*8000):0,44+i*2);return b;}
await writeFile(`${out}/microphone.wav`,wav(8,true));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-features=WebShare','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-audio-capture=${out}/microphone.wav`]});
const errors=[],tts=[],asr=[],ai=[];let transcript='A big head.';
async function pageFor(viewport={width:1280,height:900},reducedMotion='reduce'){
 const context=await browser.newContext({viewport,reducedMotion,permissions:['microphone'],acceptDownloads:true});const page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/tts',r=>{tts.push(r.request().postDataJSON());return r.fulfill({contentType:'audio/wav',body:wav(.25)});});
 await page.route('**/api/asr',r=>{asr.push(transcript);return r.fulfill({contentType:'application/json',body:JSON.stringify({transcript})});});
 await page.route('**/api/scene-control',r=>{ai.push(r.request().postDataJSON());return r.fulfill({contentType:'application/json',body:JSON.stringify({commands:[{type:'entity.spawn',id:'unknown-object',asset:'prop:procedural',name:'flibberwock',position:[0,0]}]})});});
 return page;
}
const status=p=>p.evaluate(()=>window.__WORD_GAME__.status);
async function settle(p){await p.waitForFunction(()=>!document.querySelector('.word-layout').hasAttribute('aria-busy')&&window.__WORD_GAME__&&!window.__WORD_GAME__.status.busy&&!window.__WORD_GAME__.status.pendingWords);}
async function start(p,age,url=`${origin}/dev/words`){await p.goto(url);await p.locator('#skip-intro').click();await p.waitForFunction(()=>window.__WORD_GAME__?.status.view==='age');await settle(p);const now=(await status(p)).age;for(let i=0;i<Math.abs(age-now);i++)await p.locator(age>now?'#age-plus':'#age-minus').click();assert.equal((await status(p)).age,age);await p.locator('#choose-age').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.view==='chapters');await settle(p);assert.equal(await p.locator('[data-chapter]').count(),1);assert.equal(await p.locator('form,input:not([readonly]),[data-age]').count(),0);}
async function enter(p){await p.locator('#continue-chapter').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.view==='play');await settle(p);await p.waitForFunction(()=>document.getElementById('word-mic')?.dataset.state!=='speaking');assert.equal((await status(p)).webglFailed,false);}
async function word(p,w){if(await p.locator('#word-options-toggle').getAttribute('aria-expanded')!=='true')await p.locator('#word-options-toggle').click();await p.locator(`[data-word="${w}"]`).click();await settle(p);assert.equal(await p.locator('#word-menu').isVisible(),true);}

async function next(p){await p.locator('#next-lesson').click();await settle(p);await p.waitForFunction(()=>!document.getElementById('word-mic')||document.getElementById('word-mic').dataset.state!=='speaking');}
try{
 const p=await pageFor({width:1280,height:900},'no-preference');await start(p,5);await enter(p);
 const initial=(await status(p)).camera;transcript='a duck swims';await p.locator('#word-mic').click();
 await p.waitForFunction(()=>Object.values(window.__WORD_GAME__.status.entities).some(e=>!e.id.startsWith('demo-')&&e.asset==='prop:rword-duck'),null,{timeout:18000});
 await p.keyboard.press('Space');await settle(p);await p.waitForFunction(()=>window.__WORD_GAME__.status.behaviors.jobs.some(j=>j.action==='swim'&&j.progress>.4),null,{timeout:12000});assert.equal((await status(p)).behaviors.jobs.some(j=>j.action==='swim'),true);await p.screenshot({path:`${out}/duck-swimming.png`});
 assert.notDeepEqual((await status(p)).camera,initial,'new action changes camera');
 await p.waitForFunction(()=>window.__WORD_GAME__.status.behaviors.active===0,null,{timeout:12000});assert.ok(Object.values((await status(p)).entities).some(e=>e.asset==='prop:rword-duck'),'character remains after pool cleanup');
 for(const [w,preset] of [['sunny','clear'],['rainy','rain'],['snowy','snow']]){await word(p,w);assert.equal((await status(p)).ambience.weather,preset);}
 await p.keyboard.press('Escape');await p.waitForTimeout(1800);await p.screenshot({path:`${out}/snowy-world.png`});
 assert.deepEqual(errors,[]);console.log('PASS live swim cleanup, retained swimmer, gentle camera, weather word menu and snow rendering');
}finally{await browser.close();}
