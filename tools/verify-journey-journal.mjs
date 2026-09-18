import assert from 'node:assert/strict';
import {journeys} from '../src/landing-journeys.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const base=process.argv[2]||'http://localhost:8153',browser=await chromium.launch({channel:'chrome',headless:true});
const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/analytics/**',r=>r.fulfill({status:204}));
await p.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...args){window.journalAudio=this;return play.apply(this,args);};});
try{
  await p.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
  for(const [id,j] of Object.entries(journeys)){
    await p.locator(`[data-journey=${id}]`).click();await p.waitForSelector('#landing-dialog[open]');
    assert.ok(await p.locator('#landing-dialog').evaluate(e=>e.getAnimations().some(a=>a.effect.getKeyframes().some(f=>f.transform?.includes('translateY')))),'entry animation exists');
    await p.locator('#landing-dialog').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));
    assert.equal(await p.locator('#preview-title').innerText(),`${j.child}的冒险日志`);
    assert.deepEqual(await p.locator('.journal-stats dd').allTextContents(),[`${j.duration}分钟`,'3个','4个','3件']);
    assert.equal(await p.locator('.journal-invention').count(),3);assert.equal(await p.locator('.journey-question').count(),3);assert.equal(await p.locator('.journey-effect').count(),3);
    assert.equal(await p.locator('.reply-avatar').count(),3);assert.equal(await p.locator('.reply-name strong').allTextContents().then(a=>a.every(n=>n===j.child)),true);
    assert.equal(await p.locator('.journey-journal [data-lucide]:not(svg)').count(),0);assert.ok(await p.locator('.journey-journal svg').count()>20);
    assert.equal(await p.locator('.journal-stop.is-visited').count(),id==='question'?2:3);
    assert.equal(await p.locator('.journal-chapter').nth(1).locator('.journey-moment').count(),id==='question'?2:1);
    assert.ok(await p.locator('#landing-dialog').evaluate((e,id)=>getComputedStyle(e).backgroundImage.includes(`journal-map-${id}.webp`),id),'art is a cropped atmospheric background');
    assert.equal(await p.locator('.journal-map-art').count(),0);
    await p.locator('#landing-dialog').evaluate(async e=>{const url=getComputedStyle(e).backgroundImage.match(/url\("([^"]+)"\)/)[1];const img=new Image();img.src=url;await img.decode();});
    await p.locator('.journey-journal img').evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode();})));
    await p.locator('#landing-dialog').evaluate(e=>e.scrollTo({top:0,behavior:'instant'}));await p.screenshot({path:`/tmp/journal-${id}-header.png`});
    await p.locator('.journal-stop').nth(1).click();await p.waitForTimeout(700);
    const bounds=await p.evaluate(()=>({top:document.querySelectorAll('.journal-chapter')[1].getBoundingClientRect().top,dialog:document.getElementById('landing-dialog').getBoundingClientRect().top}));assert.ok(bounds.top>=bounds.dialog&&bounds.top<bounds.dialog+100,'route jumps to chapter');
    for(let i=0;i<3;i++){
      await p.locator('.journey-voice').nth(i).click();await p.waitForFunction(()=>window.journalAudio?.currentTime>.12&&!window.journalAudio.paused);assert.equal(await p.locator('.journey-voice[data-playing=true]').count(),1);assert.ok(await p.evaluate(()=>window.journalAudio.duration>1));
      await p.locator('.journey-voice').nth(i).click();assert.ok(await p.evaluate(()=>window.journalAudio.paused));
    }
    await p.locator('.journey-voice').first().click();await p.waitForFunction(()=>!window.journalAudio.paused);
    if(id==='candy')await p.locator('.dialog-close').click();
    else if(id==='moon')await p.keyboard.press('Escape');
    else await p.mouse.click(8,8);
    assert.ok(await p.evaluate(()=>window.journalAudio.paused),'close stops audio immediately');
    await p.waitForFunction(()=>!document.getElementById('landing-dialog').open);assert.ok(await p.locator(`[data-journey=${id}]`).evaluate(e=>document.activeElement===e),'focus restored');
    checks.push(`${id}: child identity, consistent statistics, invention collection, chapter route, three voiced answers, matched illustrations, animated close`);
  }
  for(const width of [320,390,768]){
    await p.setViewportSize({width,height:844});await p.locator('[data-journey=question]').click();await p.locator('#landing-dialog').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));
    assert.ok(await p.locator('#landing-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`no overflow at ${width}`);
    await p.screenshot({path:`/tmp/journal-width-${width}.png`});await p.locator('.journey-voice').first().scrollIntoViewIfNeeded();await p.screenshot({path:`/tmp/journal-voice-${width}.png`});await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.getElementById('landing-dialog').open);
  }
  await p.emulateMedia({reducedMotion:'reduce'});await p.locator('[data-journey=candy]').click();assert.equal(await p.locator('#landing-dialog').evaluate(e=>e.getAnimations().length),0);await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.getElementById('landing-dialog').open);checks.push('320/390/768 responsive layouts; reduced motion; Escape, close button and backdrop all close');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({base,checks,errors,status:'passed'},null,2));
}finally{await browser.close();}
