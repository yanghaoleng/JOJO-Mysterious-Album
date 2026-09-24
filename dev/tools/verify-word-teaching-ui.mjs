import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {getChapterLessons,getAgeBand} from '../content/word-games.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8919';
const wav=Buffer.alloc(44+16000*2*4);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);await writeFile('/tmp/jma-teaching-silence.wav',wav);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=/tmp/jma-teaching-silence.wav']});
try{
 for(const age of [3,6,8]){
  const context=await browser.newContext({permissions:['microphone'],reducedMotion:'reduce',viewport:{width:age===8?1280:390,height:844}}),p=await context.newPage(),errors=[],readings=[];let socket;
  p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));
  await p.routeWebSocket('**/api/word-realtime',ws=>{socket=ws;ws.onMessage(raw=>{if(typeof raw!=='string')return;const d=JSON.parse(raw);if(d.type==='start')ws.send(JSON.stringify({type:'ready'}));if(d.type==='say'){readings.push(d);ws.send(JSON.stringify({type:'event',event:350,data:{text:d.text}}));ws.send(Buffer.alloc(4800));ws.send(JSON.stringify({type:'event',event:359,data:{}}));}});});
  const state=()=>p.evaluate(()=>window.__WORD_GAME__.status);
  const settle=()=>p.waitForFunction(()=>!window.__WORD_GAME__.status.busy&&!['speaking','thinking'].includes(window.__WORD_GAME__.status.voiceState)&&!document.querySelector('.word-layout').hasAttribute('aria-busy'));
  const answer=async text=>{if(!(await state()).recording){if(!(await state()).listening)await p.locator('#word-mic').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.recording);}for(const [event,data]of [[450,{}],[451,{results:[{text}]}],[459,{}]])socket.send(JSON.stringify({type:'event',event,data}));await settle();};
  await p.goto(origin+'/dev/words');await p.waitForFunction(()=>window.__WORD_GAME__?.status.view==='age');assert.equal(await p.locator('#skip-intro').count(),0);
  for(let n=5;n!==age;n+=age>5?1:-1)await p.locator(age>5?'#age-plus':'#age-minus').click();
  const expected=new Set(getAgeBand(age).recommended),seen=new Set();
  for(let theme=0;theme<5;theme++){
   await p.locator('#choose-age').click();await p.locator('#continue-chapter').click();await settle();await p.waitForFunction(()=>window.__WORD_GAME__.status.recording);
   const chapter=(await state()).chapter,lessons=getChapterLessons(chapter,age);seen.add(chapter);
   assert.equal(await p.locator('.scene-focus').count(),0);assert.equal(await p.evaluate(()=>getComputedStyle(document.querySelector('#word-stage')).filter),'none');
   assert.ok(!Object.keys((await state()).entities).some(id=>/^(demo-|wg-)/.test(id)),'No automatic opening object');
   assert.equal(readings.at(-1).wordPrompt,true);assert.match(readings.at(-1).text,/英文怎么说/);
   for(let i=0;i<6;i++){
    await p.waitForTimeout(250);await settle();assert.equal((await state()).lessonIndex,i);
    const replaceable=p.locator('#lesson-sentence .replaceable-word');
    if(i<2)assert.equal(await replaceable.count(),0);
    if(i===2){assert.ok(readings.some(r=>r.text===lessons[2].chineseGuide&&r.wordPrompt));assert.ok(await replaceable.count()>0);assert.equal(readings.at(-1).wordPauses,true);}
    if(i===0&&theme===0){await answer('妈妈说你再试一次');assert.equal((await state()).canAdvance,false);assert.equal(Object.keys((await state()).entities).filter(id=>id.startsWith('wg-')).length,0);}
    const text=i===0&&theme===0?'cat':lessons[i].example;
    await answer(text);await p.waitForFunction(()=>window.__WORD_GAME__.status.canAdvance&&!window.__WORD_GAME__.status.busy);await p.keyboard.press('Space');
    assert.ok(Object.keys((await state()).entities).some(id=>id.startsWith('wg-')));assert.ok(await p.locator('#lesson-sentence .is-matched-word').count()>0);
    if(i===0&&theme===0)assert.match(await p.locator('#lesson-sentence').innerText(),/cat/i);
    if(i===2&&theme===0){const before=await p.locator('#lesson-sentence').innerText();await p.locator('#lesson-sentence [role=button]').last().click();const after=await p.locator('#lesson-sentence').innerText();assert.equal(before.split(/\s+/).filter((w,n)=>w!==after.split(/\s+/)[n]).length,1);}
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    if(theme===0&&[0,2,4].includes(i))await p.screenshot({path:`/tmp/jma-teaching-${age}-${i}.png`});
    await p.locator('#next-lesson').click();
   }
   await p.waitForFunction(()=>window.__WORD_GAME__.status.view==='complete');await p.locator('#choose-age-again').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.view==='age');
   assert.equal(await p.evaluate(()=>localStorage.getItem('jma.word-play.v1')),null);assert.ok(!Object.keys((await state()).entities).some(id=>/^(demo-|wg-)/.test(id)));
   console.log(`PASS age ${age}, ${chapter}: Chinese noun intro, no blur, two-word warmup, rainbow tutorial, progressive six steps, ending/reset`);
  }
  assert.deepEqual(seen,expected);assert.deepEqual(errors,[]);await context.close();
 }
}finally{await browser.close();}
