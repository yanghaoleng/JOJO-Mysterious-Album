import assert from 'node:assert/strict';
import {nationalDayLessons} from '../content/national-day-words.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8965';
assert.ok(new URL(origin).hostname==='127.0.0.1','Fixture telemetry must stay local');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const [path,activity,word] of [['words','words','duck'],['midautumn','midautumn','rabbit'],['national','national-day','flag']]){
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage(),attempts=[];
  await page.route('**/api/**',r=>r.request().url().includes('/api/analytics/')?r.continue():r.fulfill({status:200,body:'{}'}));
  page.on('request',r=>{if(r.url().endsWith('/api/analytics/word'))attempts.push(r.postDataJSON());});
  await page.goto(origin+'/'+path);await page.waitForFunction(()=>window.__WORD_GAME__);
  if(activity==='words'){await page.locator('#choose-age').click();await page.locator('#continue-chapter').click();}
  await page.waitForFunction(()=>window.__WORD_GAME__.status.view==='play');
  await page.locator('#word-options-toggle').click();
  const option=page.locator(`[data-word="${word}"]`);await (await option.count()?option:page.locator('[data-word]').first()).click();
  await page.waitForFunction(()=>!window.__WORD_GAME__.status.busy&&!window.__WORD_GAME__.status.pendingWords);
  assert.ok(attempts.length);assert.equal(attempts.at(-1).chapter,activity);assert.equal(attempts.at(-1).age,activity==='words'?5:null);assert.ok(attempts.at(-1).runId);assert.equal(attempts.at(-1).lessonCount,activity==='national-day'?96:6);
  if(activity==='national-day'){
   await page.addInitScript(lesson=>{let s=JSON.parse(localStorage.getItem('jma.word-national-day.v1'));let r=s.journeys['middle:national-day'];r.lessonId=lesson.id;r.lessonIndex=95;r.world=null;r.progress=null;localStorage.setItem('jma.word-national-day.v1',JSON.stringify(s));},nationalDayLessons()[95]);
   await page.reload();await page.waitForFunction(()=>window.__WORD_GAME__?.status.lessonIndex===95);await page.locator('#word-options-toggle').click();await page.locator('[data-word="panda"]').click();await page.waitForFunction(()=>!window.__WORD_GAME__.status.busy&&!window.__WORD_GAME__.status.pendingWords);assert.equal(attempts.at(-1).lessonIndex,95);
  }
  await page.goto(origin+'/');await context.close();console.log('PASS telemetry '+activity);
 }
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 assert.equal((await context.request.post(origin+'/api/data/login',{data:{code:'997118'}})).status(),200);
 const response=await context.request.get(origin+'/api/data/summary?range=all');assert.equal(response.status(),200);const data=await response.json();
 for(const id of ['words','midautumn','national-day'])assert.ok(data.reading[id].totals.answer_attempts>0);
 assert.ok(data.reading['national-day'].stages[95].answer_attempts>=1);assert.deepEqual(data.reading.midautumn.ages,[]);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/data');await page.locator('#reading-picker').waitFor();
 for(const id of ['words','midautumn','national-day']){await page.locator(`[data-activity="${id}"]`).click();assert.equal(await page.locator('#reading-age-panel').isVisible(),id==='words');if(id==='national-day')assert.equal(await page.locator('#word-stage-rows tr').count(),96);}
 await page.locator('#word-insights').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/reading-data-desktop.png'});
 for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`/tmp/reading-data-${width}.png`});}
 assert.deepEqual(errors,[]);console.log('PASS real collectors, independent activity summary, 96th question and responsive dashboard');
}finally{await browser.close();}
