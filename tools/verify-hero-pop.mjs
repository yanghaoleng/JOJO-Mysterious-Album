import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const base=process.argv[2]||'http://localhost:8153',out=process.env.VERIFY_OUTPUT||'/tmp/jma-pop-check';await mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:1440,height:950}});p.setDefaultNavigationTimeout(60000);const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/analytics/**',r=>r.fulfill({status:204}));
await p.addInitScript(()=>{
  window.titleFrames=[];const observe=()=>{const h=document.getElementById('mode-title');if(h){const count=h.querySelectorAll('[data-entered=true]').length;const last=window.titleFrames.at(-1);if(!last||count!==last.count)window.titleFrames.push({count,height:h.offsetHeight,time:performance.now()});}if(performance.now()<9000)requestAnimationFrame(observe);};requestAnimationFrame(observe);
  const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...args){window.lastJourneyAudio=this;return play.apply(this,args);};
});
const report={base,checks:[]};
try{
  await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForSelector('#mode-title[data-entrance=complete]');await p.waitForSelector('#landing-world[data-ready]');
  const title=await p.evaluate(()=>({frames:window.titleFrames,text:document.getElementById('mode-title').getAttribute('aria-label'),engine:document.getElementById('mode-title').dataset.textMotion}));
  assert.equal(title.engine,'calligraph');assert.equal(title.text,'故事的下一页，听孩子的。');assert.ok(title.frames.filter(f=>f.count>0&&f.count<12).length>=8,'letters must enter progressively');assert.ok(Math.max(...title.frames.map(f=>f.height))-Math.min(...title.frames.map(f=>f.height))<=2,'title must not jump');report.title=title.frames;report.checks.push('Calligraph progressive glyph entry and reserved title height');
  await p.evaluate(()=>{window.motionFrames=[];window.motionTimer=setInterval(()=>window.motionFrames.push({...document.getElementById('landing-world').__heroScene.status}),25);});
  await p.waitForFunction(()=>document.getElementById('landing-world').__heroScene.status.time>5.1,null,{timeout:30000});
  const frames=await p.evaluate(()=>{clearInterval(window.motionTimer);return window.motionFrames;});
  const changed=frames.filter(f=>f.actor===1);assert.ok(changed.some(f=>f.actorScale>.79),'elastic overshoot');assert.ok(changed.some(f=>Math.abs(f.actorScale-.78)<.001&&f.time<5.08),'settles within .6s');assert.ok(changed.some(f=>f.puffs.active>0),'smoke after change');assert.ok(frames.every(f=>f.puffs.active<=28));report.checks.push('fast elastic overshoot, settling, bounded white smoke');
  await p.waitForFunction(()=>document.getElementById('landing-world').__heroScene.status.puffs.active>0);await p.screenshot({path:`${out}/hero-smoke.png`});
  for(const id of ['candy','moon','question']){
    await p.locator(`[data-journey=${id}]`).click();assert.equal(await p.locator('.journey-question').count(),3);assert.equal(await p.locator('.journey-effect img').count(),3);assert.equal(await p.locator('.journey-voice').count(),3);
    await p.locator('.journey-effect img').evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode();})));
    for(let i=0;i<3;i++){
      const button=p.locator('.journey-voice').nth(i);await button.click();await p.waitForFunction(()=>window.lastJourneyAudio?.currentTime>.12&&!window.lastJourneyAudio.paused);assert.equal(await p.locator('.journey-voice[data-playing=true]').count(),1);assert.ok(await p.evaluate(()=>window.lastJourneyAudio.duration>1));
      await button.click();assert.ok(await p.evaluate(()=>window.lastJourneyAudio.paused));
    }
    await p.locator('.journey-voice').first().click();await p.locator('.journey-voice').nth(1).click();await p.waitForFunction(()=>window.lastJourneyAudio.currentSrc.includes('-2.mp3')&&!window.lastJourneyAudio.paused);assert.equal(await p.locator('.journey-voice[data-playing=true]').count(),1);
    await p.screenshot({path:`${out}/${id}-dialog.png`});await p.keyboard.press('Escape');await p.waitForFunction(()=>window.lastJourneyAudio.paused&&window.lastJourneyAudio.currentTime===0);
  }report.checks.push('nine real audio files play and pause, single playback, close stops audio, nine illustrations decode');
  await p.route('**/audio/candy-1.mp3',r=>r.abort());await p.locator('[data-journey=candy]').click();await p.locator('.journey-voice').first().click();await p.waitForFunction(()=>document.querySelector('.journey-audio-status').textContent.includes('再点一次'));assert.equal(await p.locator('.journey-voice[data-playing=true]').count(),0);await p.keyboard.press('Escape');report.checks.push('audio failure retains text and offers retry');
  await p.emulateMedia({reducedMotion:'reduce'});await p.setViewportSize({width:390,height:844});await p.evaluate(()=>document.getElementById('mode-gate').scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(200);assert.equal(await p.locator('.hero-letter[data-entered=true]').count(),12);assert.equal(await p.evaluate(()=>document.getElementById('landing-world').__heroScene.status.puffs.active),0);
  assert.ok(await p.locator('#mode-gate').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await p.locator('[data-journey=moon]').click();assert.ok(await p.locator('#landing-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await p.screenshot({path:`${out}/mobile-dialog.png`});await p.keyboard.press('Escape');report.checks.push('reduced motion clears smoke and reveals title, mobile has no overflow');
  const fallback=await b.newPage({viewport:{width:390,height:844}});await fallback.route('**/vendor/landing-title.js*',r=>r.abort());await fallback.goto(base,{waitUntil:'domcontentloaded'});await fallback.waitForTimeout(2400);assert.equal(await fallback.locator('#mode-title').evaluate(e=>getComputedStyle(e).visibility),'visible');assert.match(await fallback.locator('#mode-title').innerText(),/故事的下一页/);await fallback.close();report.checks.push('title module failure preserves readable fallback');
  assert.deepEqual(errors,[]);report.errors=errors;report.status='passed';await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await b.close();}
