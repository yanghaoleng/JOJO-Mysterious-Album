import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { nationalDayLessons } from '../content/national-day-words.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8964',out='/tmp/jma-national-day-qa';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const lessons=nationalDayLessons();
try{
 for(const viewport of (process.env.NATIONAL_QA_MOBILE_ONLY?[{width:390,height:844},{width:320,height:568}]:[{width:1280,height:900},{width:390,height:844},{width:320,height:568}])){
  const context=await browser.newContext({viewport,reducedMotion:'reduce',permissions:['microphone']});
  await context.addInitScript(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.__SHARED_WORLD__=payload;}}));
  const page=await context.newPage(),errors=[],ai=[];let socket;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',r=>{if(r.request().url().includes('scene-control'))ai.push(r.request().postData());return r.fulfill({status:200,contentType:'application/json',body:'{}'});});
  await page.routeWebSocket('**/api/word-realtime',ws=>{socket=ws;ws.onMessage(raw=>{if(typeof raw!=='string')return;const d=JSON.parse(raw);if(d.type==='start')ws.send(JSON.stringify({type:'ready'}));if(d.type==='say'){ws.send(JSON.stringify({type:'event',event:350,data:{text:d.text}}));ws.send(Buffer.alloc(4800));ws.send(JSON.stringify({type:'event',event:359,data:{}}));}});});
  await page.goto(origin+'/national');
  const ready=()=>page.waitForFunction(()=>window.__WORD_GAME__?.status.view==='play');await ready();
  const state=()=>page.evaluate(()=>window.__WORD_GAME__.status);
  assert.equal((await state()).chapter,'national-day');assert.equal((await state()).webglFailed,false);
  assert.equal(await page.locator('.age-stepper,#change-age:visible').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:`${out}/entry-${viewport.width}.png`});
  await page.locator('#word-options-toggle').click();await page.locator('[data-word="flag"]').click();
  await page.waitForFunction(()=>window.__WORD_GAME__.status.canAdvance);
  assert.ok(Object.values((await state()).entities).some(e=>e.asset==='prop:national-flag'));
  await page.locator('#next-lesson').click();await page.waitForFunction(()=>window.__WORD_GAME__.status.lessonIndex===1);
  await page.reload();await ready();assert.equal((await state()).lessonIndex,1,'Refresh resumes');
  await page.locator('#reveal-previous').click();await page.locator('#previous-lesson').click();await page.waitForFunction(()=>window.__WORD_GAME__.status.lessonIndex===0);
  await page.locator('#listen-example').click();await page.waitForFunction(()=>window.__WORD_GAME__.status.recording);
  const answer=async text=>{
   await page.waitForFunction(()=>!window.__WORD_GAME__.status.busy&&window.__WORD_GAME__.status.recording);
   for(const [event,data] of [[450,{}],[451,{results:[{text}]}],[459,{}]])socket.send(JSON.stringify({type:'event',event,data}));
  };
  if(viewport.width===1280){
   for(let i=0;i<lessons.length;i++){
    assert.equal((await state()).lessonIndex,i);
    if(i===48||i===80){await answer('panda');await page.waitForFunction(()=>!window.__WORD_GAME__.status.busy&&window.__WORD_GAME__.status.progress.attempts>0);assert.equal((await state()).canAdvance,false,'One noun cannot skip a later sentence');}
    await answer(lessons[i].example);await page.waitForFunction(()=>window.__WORD_GAME__.status.canAdvance,null,{timeout:15000});
    if(i===0||i===40||i===88)await page.screenshot({path:`${out}/lesson-${i+1}.png`});
    await page.waitForFunction(()=>!window.__WORD_GAME__.status.busy);
    await page.locator('#next-lesson').click();
    if(i<95)await page.waitForFunction(index=>window.__WORD_GAME__.status.lessonIndex===index,i+1);
    if((i+1)%8===0)console.log(`PASS station ${(i+1)/8}, lesson ${i+1}`);
   }
   await page.waitForFunction(()=>window.__WORD_GAME__.status.view==='complete');
   assert.match(await page.locator('.panel-title').innerText(),/96/);
   await page.screenshot({path:`${out}/complete.png`});
   await page.locator('#share-preview-open').click();await page.locator('#share-world').click();
   await page.waitForFunction(()=>Boolean(window.__SHARED_WORLD__));const url=await page.evaluate(()=>window.__SHARED_WORLD__.url);assert.ok(url.includes('/national#make='));
   await page.evaluate(()=>Object.defineProperty(navigator,'share',{value:async()=>{throw new Error('share unavailable');}}));await page.locator('#share-world').click();await page.locator('#share-link').waitFor({state:'visible'});assert.equal(await page.locator('#share-link').inputValue(),url);
   const copy=await context.newPage();await copy.goto(url);await copy.waitForFunction(()=>window.__WORD_GAME__?.status.view==='play');assert.equal(await copy.evaluate(()=>window.__WORD_GAME__.status.chapter),'national-day');await copy.close();
   assert.equal(await page.evaluate(()=>localStorage.getItem('jma.word-midautumn.v1')),null);
   assert.equal(await page.evaluate(()=>localStorage.getItem('jma.word-play.v1')),null);
   await page.locator('.dialog-close').click();await page.locator('#explore-next').click();await page.waitForFunction(()=>window.__WORD_GAME__.status.view==='play'&&window.__WORD_GAME__.status.lessonIndex===0);
  }else{
   // Resume into a long, late lesson at phone widths using a real persisted record.
   const lateIndex=viewport.width===320?92:91;
   await page.addInitScript(lesson=>{const saved=JSON.parse(localStorage.getItem('jma.word-national-day.v1'));const r=saved.journeys['middle:national-day'];r.lessonId=lesson.id;r.lessonIndex=lesson.stage-1;r.progress=null;r.world=null;localStorage.setItem('jma.word-national-day.v1',JSON.stringify(saved));},lessons[lateIndex]);
   await page.reload();await ready();assert.equal((await state()).lessonIndex,lateIndex);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   const sentence=await page.locator('.sentence').boundingBox(),controls=await page.locator('.play-bottom').boundingBox();assert.ok(sentence.y+sentence.height<controls.y,'Long prompt fits above controls');
   await page.screenshot({path:`${out}/long-${viewport.width}.png`});
   await page.locator('#word-options-toggle').click();
   for(const word of lessons[lateIndex].example.toLowerCase().match(/[a-z]+/g)){await page.locator(`[data-word="${word}"]`).click();await page.waitForFunction(()=>!window.__WORD_GAME__.status.busy&&!window.__WORD_GAME__.status.pendingWords);}
   assert.equal((await state()).canAdvance,true,'Late stories can be built through the word menu');
   assert.ok(!Object.values((await state()).entities).some(e=>e.asset==='prop:procedural'),'No fallback in the taught story');
  }
  assert.deepEqual(ai,[],'Every taught example resolves locally');assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}px: entry, taps, independent resume and layout`);await context.close();
 }
}finally{await browser.close();}
