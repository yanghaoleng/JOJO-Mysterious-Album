import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {welcomeAnswer} from '../word-welcome.js';
import {createWordSuggestions,WORD_CHAPTERS,getChapterLessons} from '../content/word-games.js';
for(const [text,step,expected] of [['My name is Lily. I am seven.','name',{name:'Lily',age:7}],['I am five.','name',{name:'',age:5}],['8','age',{name:'',age:8}],['I am 20','age',{age:null,outOfRange:true}],['我五岁','age',{english:false}]]){const actual=welcomeAnswer(text,step);for(const [k,v] of Object.entries(expected))assert.equal(actual[k],v,text);}
for(const c of WORD_CHAPTERS)for(const age of [3,6,8])for(const lesson of getChapterLessons(c.id,age)){
 const suggestions=createWordSuggestions(lesson);
 for(let i=0;i<20;i++){const a=suggestions.text.match(/\S+/g),b=suggestions.change().match(/\S+/g);assert.equal(a.length,b.length);assert.equal(a.filter((w,j)=>w!==b[j]).length,1,lesson.id);}
}
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8918';
function wav(seconds,tone=false){const rate=16000,n=rate*seconds,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);if(tone)for(let i=0;i<n;i++)b.writeInt16LE(i/rate%4<1?Math.round(Math.sin(i/rate*440*Math.PI*2)*8000):0,44+i*2);return b;}
await writeFile('/tmp/jma-welcome-mic.wav',wav(8,true));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=/tmp/jma-welcome-mic.wav']});
const out='/tmp/jma-word-welcome';await mkdir(out,{recursive:true});
try{
 const context=await browser.newContext({permissions:['microphone'],reducedMotion:'reduce',viewport:{width:390,height:844}}),p=await context.newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));let connection,mode,chunks=0;
 const send=(event,data={})=>connection.send(JSON.stringify({type:'event',event,data}));
 await p.routeWebSocket('**/api/word-realtime',ws=>{connection=ws;ws.onMessage(message=>{if(typeof message!=='string'){chunks++;return;}const d=JSON.parse(message);if(d.type==='start'){mode=d.mode;ws.send(JSON.stringify({type:'ready'}));}if(d.type==='say'){send(350,{text:d.text});ws.send(Buffer.alloc(4800));send(359);}});});
 await p.route('**/api/tts',r=>r.fulfill({contentType:'audio/wav',body:wav(.25)}));
 await p.goto(`${origin}/dev/words`);await p.waitForFunction(()=>window.__WORD_GAME__?.status.view==='intro');
 assert.equal(await p.evaluate(()=>window.__WORD_GAME__.status.entities['welcome-domi'].asset),'npc:domi');
 await p.screenshot({path:`${out}/welcome-mobile.png`});
 await p.locator('#word-music').click();assert.equal(await p.locator('#word-music').getAttribute('aria-pressed'),'false');await p.locator('#word-music').click();
 await p.waitForFunction(()=>!window.__WORD_GAME__.status.music.paused);
 await p.locator('#word-mic').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.recording);assert.equal(mode,'onboarding');await p.waitForTimeout(500);assert.ok(chunks>0);assert.equal(await p.evaluate(()=>window.__WORD_GAME__.status.music.paused),true);
 send(450);send(451,{results:[{text:'My name is Lily.'}]});send(459);send(350,{text:'Hi Lily! How old are you?'});send(359);
 await p.waitForFunction(()=>window.__WORD_GAME__.status.introStep==='age');
 send(450);send(451,{results:[{text:'I am seven.'}]});send(459);
 await p.locator('#start-world').waitFor();assert.equal(await p.evaluate(()=>window.__WORD_GAME__.status.age),7);assert.equal(await p.evaluate(()=>window.__WORD_GAME__.status.recording),false);
 assert.equal(await p.evaluate(()=>JSON.stringify(localStorage).includes('Lily')),false);await p.screenshot({path:`${out}/ready-mobile.png`});
 await p.locator('#start-world').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.view==='play');
 await p.waitForFunction(()=>document.querySelectorAll('#lesson-sentence [role=button]').length>0);
 const before=await p.locator('#lesson-sentence').innerText();await p.locator('#lesson-sentence [role=button]').first().click();
 const after=await p.locator('#lesson-sentence').innerText();assert.equal(before.split(/\s+/).filter((w,i)=>w!==after.split(/\s+/)[i]).length,1);
 const clicked=await p.locator('#lesson-sentence').innerText();await p.waitForTimeout(6800);assert.equal(await p.locator('#lesson-sentence').innerText(),clicked,'slower than old 6.5s cadence');
 await p.waitForFunction(text=>document.getElementById('lesson-sentence').textContent!==text,clicked,{timeout:8000});const cycled=await p.locator('#lesson-sentence').innerText();assert.equal(clicked.split(/\s+/).filter((w,i)=>w!==cycled.split(/\s+/)[i]).length,1);
 await p.screenshot({path:`${out}/replace-mobile.png`});
 await p.locator('#change-age').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.view==='age');assert.equal(await p.locator('#age-number').count(),1);assert.equal(await p.evaluate(()=>localStorage.getItem('jma.word-play.v1')),null);
 await p.reload();await p.locator('#skip-intro').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.view==='age');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);
 const fallback=await context.newPage();let answers=0;const questions=[],voiceRequests=[];
 await fallback.routeWebSocket('**/api/word-realtime',ws=>ws.close());
 await fallback.route('**/api/tts',r=>{voiceRequests.push(r.request().postDataJSON());questions.push(r.request().postDataJSON().text);return r.fulfill({contentType:'audio/wav',body:wav(.25)});});
 await fallback.route('**/api/asr',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({transcript:answers++===0?'My name is Sam.':'I am six.'})}));
 await fallback.goto(`${origin}/dev/words`);await fallback.locator('#word-mic').click();
 await fallback.locator('#start-world').waitFor({timeout:30000});assert.equal(await fallback.evaluate(()=>window.__WORD_GAME__.status.age),6);assert.ok(questions.some(q=>q.includes('What is your name')));assert.ok(questions.some(q=>q.includes('How old are you')));assert.equal(await fallback.evaluate(()=>window.__WORD_GAME__.status.recording),false);
 assert.ok(voiceRequests.length>=2&&voiceRequests.every(r=>r.speechProfile==='wow-child'));await fallback.locator('#start-world').click();await fallback.waitForFunction(()=>window.__WORD_GAME__.status.view==='play');await fallback.waitForTimeout(500);assert.equal(voiceRequests.at(-1).voice,'gentle');assert.equal(voiceRequests.at(-1).speechProfile,undefined);
 console.log('PASS child welcome and gentle female lesson profiles remain isolated');
 console.log('PASS actual capture/worklet with classic fallback fixtures asks name then age without a second mic click');
 console.log('PASS welcome nickname/age via realtime fixture, small DOMI, start and skip, ephemeral nickname, music mute/voice pause, 12s one-token suggestions and click replacement');
}finally{await browser.close();}
