import assert from 'node:assert/strict';
import {getChapterLessons} from '../content/word-games.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8918';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=/tmp/jma-countdown-silence.wav']});
const errors=[];
try{
 for(const age of [3,6,8]){
  const context=await browser.newContext({permissions:['microphone'],reducedMotion:'reduce',viewport:age===8?{width:1280,height:900}:{width:390,height:844}}),p=await context.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));let socket;
  await p.routeWebSocket('**/api/word-realtime',ws=>{socket=ws;ws.onMessage(m=>{if(typeof m!=='string')return;const d=JSON.parse(m);if(d.type==='start')ws.send(JSON.stringify({type:'ready'}));if(d.type==='say'){ws.send(JSON.stringify({type:'event',event:350,data:{text:d.text}}));ws.send(Buffer.alloc(4800));ws.send(JSON.stringify({type:'event',event:359,data:{}}));}});});
  const state=()=>p.evaluate(()=>window.__WORD_GAME__.status);
  const settle=()=>p.waitForFunction(()=>!document.querySelector('.word-layout').hasAttribute('aria-busy')&&!window.__WORD_GAME__.status.opening&&!window.__WORD_GAME__.status.busy&&!['speaking','thinking'].includes(window.__WORD_GAME__.status.voiceState));
  await p.goto(origin+'/dev/words');await p.locator('#skip-intro').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.view==='age');
  for(let n=5;n!==age;n+=age>5?1:-1)await p.locator(age>5?'#age-plus':'#age-minus').click();
  await p.locator('#choose-age').click();await p.locator('#continue-chapter').click();await settle();
  for(const theme of ['ocean','camp','polar']){
   await p.locator((await state()).view==='complete'?'#choose-age-again':'#change-age').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.view==='age');
   assert.equal(await p.evaluate(()=>localStorage.getItem('jma.word-play.v1')),null);
   await p.locator('#choose-age').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.view==='chapters');
   assert.equal(await p.locator('[data-chapter]').count(),1);assert.equal(await p.locator('[data-chapter]').getAttribute('data-chapter'),theme);
   await p.locator('#continue-chapter').click();await settle();assert.equal((await state()).chapter,theme);assert.equal((await state()).webglFailed,false);
   if(theme==='polar')assert.equal((await state()).ambience.weather,'snow');
   const lessons=getChapterLessons(theme,age);
   for(let i=0;i<6;i++){
    await settle();assert.equal((await state()).lessonIndex,i);
    if(!(await state()).recording){await p.locator('#word-mic').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.recording);}
    for(const [event,data]of [[450,{}],[451,{results:[{text:lessons[i].example}]}],[459,{}]])socket.send(JSON.stringify({type:'event',event,data}));
    await p.waitForFunction(()=>window.__WORD_GAME__.status.canAdvance&&!window.__WORD_GAME__.status.busy);await p.keyboard.press('Space');
    assert.ok((await state()).words.length>0);assert.ok(Object.keys((await state()).entities).some(id=>id.startsWith('wg-')));
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    if(i===0){await p.waitForTimeout(500);await p.screenshot({path:`/tmp/jma-expansion-${theme}-${age}.png`});}
    if(i<5)await p.locator('#next-lesson').click();
   }
   await p.locator('#next-lesson').click();await p.waitForFunction(()=>window.__WORD_GAME__.status.view==='complete');
   console.log(`PASS ${theme}, age ${age}: one recommendation, 6 real UI voice responses, end card and viewport fit`);
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
