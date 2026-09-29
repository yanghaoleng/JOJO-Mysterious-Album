import assert from 'node:assert/strict';
import {getChapterLessons,WORD_AGE_BANDS} from '../content/word-games.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8922';
const beta=origin.includes('/beta');
const tourStore=(beta?'beta.':'')+'jma.word-theme-tour.v1';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce',permissions:['microphone']});
  const errors=[];let socket;page.on('pageerror',e=>errors.push(e.message));
  const analyticsRequests=[];page.on('request',r=>{if(r.url().includes('/api/analytics/'))analyticsRequests.push(r.url());});
  if(beta)await page.addInitScript(()=>{if(!localStorage.getItem('jma.word-play.v1'))localStorage.setItem('jma.word-play.v1','{"officialSentinel":true}');});
  await page.routeWebSocket('**/api/word-realtime',ws=>{socket=ws;ws.onMessage(raw=>{
    if(typeof raw!=='string')return;const d=JSON.parse(raw);
    if(d.type==='start')ws.send(JSON.stringify({type:'ready'}));
    if(d.type==='say'){ws.send(JSON.stringify({type:'event',event:350,data:{text:d.text}}));ws.send(Buffer.alloc(4800));ws.send(JSON.stringify({type:'event',event:359,data:{}}));}
  });});
  const status=()=>page.evaluate(()=>window.__WORD_GAME__.status);
  await page.goto(origin+'/dev/words.html');
  if(beta){
    assert.ok(!page.url().includes('.html'));
    await page.locator('#word-beta').click();
    assert.equal(await page.locator('.beta-changes li').count(),6);
    await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});
  }
  await page.locator('#word-info').click();
  assert.equal(await page.locator('.theme-guide article').count(),9);
  assert.equal(await page.locator('.theme-guide').count(),3);
  await page.waitForTimeout(300);
  await page.screenshot({path:'/tmp/jma-theme-info-mobile.png'});
  await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>document.activeElement.id),'word-info');
  await page.locator('#choose-age').click();
  for(const band of WORD_AGE_BANDS){
    const seen=new Set();
    for(let theme=0;theme<3;theme++){
      await page.locator('#continue-chapter').click();
      await page.waitForFunction(()=>window.__WORD_GAME__.status.view==='play'&&!document.querySelector('.word-layout').hasAttribute('aria-busy'));
      const state=await status();assert.ok(band.recommended.includes(state.chapter));assert.ok(!seen.has(state.chapter));seen.add(state.chapter);
      const route=await page.evaluate(({band,id,key})=>JSON.parse(localStorage.getItem(key))[band].routes[id],{band:band.id,id:state.chapter,key:tourStore});
      const lessons=getChapterLessons(state.chapter,state.age,route);
      for(const [index,lesson] of lessons.entries()){
        await page.waitForFunction(i=>window.__WORD_GAME__.status.lessonIndex===i&&!window.__WORD_GAME__.status.busy&&!document.querySelector('.word-layout').hasAttribute('aria-busy'),index);
        if(!(await status()).listening)await page.locator('#word-mic').click();
        await page.waitForFunction(()=>window.__WORD_GAME__.status.recording);
        for(const [event,data] of [[450,{}],[451,{results:[{text:lesson.example}]}],[459,{}]])socket.send(JSON.stringify({type:'event',event,data}));
        await page.waitForFunction(()=>window.__WORD_GAME__.status.canAdvance&&!window.__WORD_GAME__.status.busy);
        await page.locator('#next-lesson').click();
      }
      await page.locator('#share-preview-open').waitFor();
      assert.equal(await page.locator('.share-thumbnail').count(),1);
      assert.equal(await page.locator('.save-image-hint').count(),0);
      assert.ok((await page.locator('.share-thumbnail').boundingBox()).width<70);
      if(theme===0){
        await page.screenshot({path:`/tmp/jma-theme-ending-${band.id}.png`});
        if(band.id==='early')await page.emulateMedia({reducedMotion:'no-preference'});
        await page.locator('#share-preview-open').click();await page.locator('.share-expanded').evaluate(i=>i.decode());
        await page.waitForTimeout(300);
        assert.equal(await page.locator('.save-image-hint').innerText(),'长按图片可以保存');
        assert.ok((await page.locator('.share-expanded').boundingBox()).width>250);
        await page.screenshot({path:`/tmp/jma-theme-share-${band.id}.png`});
        await page.locator('.dialog-close').click();await page.locator('dialog').waitFor({state:'detached'});
        assert.equal(await page.evaluate(()=>document.activeElement.id),'share-preview-open');
        await page.emulateMedia({reducedMotion:'reduce'});
      }
      const completed=await page.evaluate(({b,key})=>JSON.parse(localStorage.getItem(key))[b].completed,{b:band.id,key:tourStore});
      assert.equal(completed.length,theme+1);
      if(theme===2)assert.match(await page.locator('.completion-message').innerText(),/三个主题都玩完/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await page.locator('#explore-next').click();
    }
    console.log('PASS',band.id,'three unique random themes, 18 answers, completion and next age/replay');
  }
  assert.equal((await status()).age,8);
  // Resetting the world preserves completion badges across a real reload.
  await page.reload();await page.locator('#word-info').waitFor();
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).early.completed.length,tourStore),3);
  for(const viewport of [{width:1280,height:900},{width:320,height:568}]){
    await page.setViewportSize(viewport);await page.locator('#word-info').click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:`/tmp/jma-theme-info-${viewport.width}.png`});
    await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});
  }
  assert.deepEqual(errors,[]);
  if(beta){assert.deepEqual(analyticsRequests,[]);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('jma.word-play.v1')).officialSentinel),true);}
}finally{await browser.close();}
