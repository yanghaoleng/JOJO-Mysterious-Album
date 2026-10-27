import assert from 'node:assert/strict';
import {getChapterLessons} from '../dev/content/word-games.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8854';
assert.equal(new URL(origin).hostname,'127.0.0.1','Test telemetry must remain local');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try{
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce',permissions:['microphone']});
 const page=await context.newPage(),errors=[],outside=[];let socket;
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))outside.push(request.url());});
 await page.route('**/api/**',route=>{const path=new URL(route.request().url()).pathname;return /\/kkzsj\/api\/(session|progress|analytics|data|login)(?:\/|$)/.test(path)?route.continue():route.fulfill({status:200,contentType:'application/json',body:'{}'});});
 await page.routeWebSocket('**/kkzsj/api/word-realtime',ws=>{socket=ws;ws.onMessage(raw=>{if(typeof raw!=='string')return;const data=JSON.parse(raw);if(data.type==='start')ws.send(JSON.stringify({type:'ready'}));if(data.type==='say'){ws.send(JSON.stringify({type:'event',event:350,data:{text:data.text}}));ws.send(Buffer.alloc(4800));ws.send(JSON.stringify({type:'event',event:359,data:{}}));}});});
 await page.goto(origin+'/kkzsj');await page.locator('#choose-age').waitFor();
 const user=await page.evaluate(()=>window.__KKZSJ__.user);assert.match(user.uid,/^[A-Z0-9]{3}$/);assert.equal(user.kind,'guest');
 await page.locator('#choose-age').click();await page.locator('#continue-chapter').click();
 await page.waitForFunction(()=>window.__WORD_GAME__.status.view==='play');
 const initial=await page.evaluate(()=>window.__WORD_GAME__.status);
 const route=await page.evaluate(()=>JSON.parse(localStorage.getItem(window.__KKZSJ__.keys.tour)).early.routes[window.__WORD_GAME__.status.chapter]);
 const lessons=getChapterLessons(initial.chapter,initial.age,route);
 async function answer(text){
  await page.waitForFunction(()=>!window.__WORD_GAME__.status.busy);
  if(!(await page.evaluate(()=>window.__WORD_GAME__.status.listening)))await page.locator('#word-mic').click();
  await page.waitForFunction(()=>window.__WORD_GAME__.status.recording);
  for(const [event,data] of [[450,{}],[451,{results:[{text}]}],[459,{}]])socket.send(JSON.stringify({type:'event',event,data}));
  await page.waitForFunction(()=>window.__WORD_GAME__.status.canAdvance&&!window.__WORD_GAME__.status.busy);
 }
 for(let index=0;index<6;index++){
  await page.waitForFunction(i=>window.__WORD_GAME__.status.lessonIndex===i,index);
  await answer(lessons[index].example);
  if(index===1){
   await page.evaluate(()=>window.__KKZSJ__.flush());
   await page.reload();await page.waitForFunction(()=>window.__WORD_GAME__?.status.lessonIndex===1);
   assert.equal(await page.evaluate(()=>window.__KKZSJ__.user.uid),user.uid);
   assert.equal(await page.evaluate(()=>window.__WORD_GAME__.status.canAdvance),true);
  }
  await page.locator('#next-lesson').click();
 }
 await page.locator('#explore-next').waitFor();await page.locator('#explore-next').click();
 await page.waitForURL('**/kkzsj/login');await page.locator('#mock-login:not([disabled])').waitFor();
 assert.match(await page.locator('.kk-test-note').innerText(),/SDK 尚未接入/);
 assert.match(await page.locator('#guest-id').innerText(),new RegExp(user.uid));
 await page.goto(origin+'/kkzsj');await page.locator('#explore-next').waitFor();
 assert.equal(await page.evaluate(()=>window.__KKZSJ__.user.uid),user.uid);
 await page.locator('#explore-next').click();await page.waitForURL('**/kkzsj/login');
 await page.locator('#mock-login:not([disabled])').waitFor();
 await page.screenshot({path:'/tmp/kkzsj-login-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/kkzsj-login-mobile.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#mock-login').click();await page.waitForURL('**/kkzsj?continue=1');
 await page.waitForFunction(()=>window.__KKZSJ__?.user.kind==='mock'&&window.__WORD_GAME__);
 assert.equal(await page.evaluate(()=>window.__KKZSJ__.user.uid),user.uid);
 await page.waitForFunction(()=>['chapters','play'].includes(window.__WORD_GAME__.status.view));
 if(await page.locator('#continue-chapter').count())await page.locator('#continue-chapter').click();
 await page.waitForFunction(()=>window.__WORD_GAME__.status.view==='play');
 assert.notEqual(await page.evaluate(()=>window.__WORD_GAME__.status.chapter),initial.chapter);
 await page.evaluate(()=>window.__KKZSJ__.flush());
 await page.screenshot({path:'/tmp/kkzsj-game-mobile.png'});
 const other=await browser.newContext(),otherPage=await other.newPage();
 await otherPage.goto(origin+'/kkzsj');await otherPage.locator('#choose-age').waitFor();
 const second=await otherPage.evaluate(()=>window.__KKZSJ__.user);
 assert.notEqual(second.uid,user.uid);assert.equal(second.kind,'guest');
 assert.equal(await otherPage.evaluate(()=>JSON.parse(localStorage.getItem(window.__KKZSJ__.keys.game)||'null')),null);
 await other.close();
 const admin=await browser.newContext(),adminPage=await admin.newPage();
 assert.equal((await admin.request.get(origin+'/kkzsj/api/data/accounts')).status(),401);
 await adminPage.goto(origin+'/kkzsj/data');
 for(const digit of '997118')await adminPage.locator(`[data-key="${digit}"]`).click();
 await adminPage.locator('#dashboard:not([hidden])').waitFor();
 await adminPage.getByText(user.uid,{exact:true}).first().waitFor();
 for(const width of [1280,390,320]){await adminPage.setViewportSize({width,height:900});assert.equal(await adminPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 const summary=await (await admin.request.get(origin+'/kkzsj/api/data/summary?range=all')).json();
 assert.ok(summary.reading.words.totals.answer_attempts>=6);
 assert.equal(await adminPage.locator('[data-activity="national-day"]').count(),0);
 await adminPage.locator('#kk-accounts').scrollIntoViewIfNeeded();await adminPage.screenshot({path:'/tmp/kkzsj-data-mobile.png'});
 assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);
 console.log('PASS six lessons, server restore, guest UID, mock-login continuation, next theme, isolated users, authenticated metrics and 320/390/1280 layouts');
 await admin.close();await context.close();
}finally{await browser.close();}
