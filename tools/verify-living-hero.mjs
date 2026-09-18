import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const base=process.argv[2]||'http://localhost:8149',out=process.env.VERIFY_OUTPUT||'/tmp/jma-living-check';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/analytics/**',r=>r.fulfill({status:204}));
const status=()=>page.evaluate(()=>document.querySelector('#landing-world').__heroScene.status);
const report={base,widths:[],transitions:[],checks:[]};
try{
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForSelector('#landing-world[data-ready]');
  await page.evaluate(()=>{window.heroSamples=[];window.heroSampler=setInterval(()=>window.heroSamples.push({...document.getElementById('landing-world').__heroScene.status,background:getComputedStyle(document.querySelector('.landing-hero')).backgroundImage}),200);});
  await page.waitForFunction(()=>document.getElementById('landing-world').__heroScene.status.time>29,{},{timeout:60000});
  const samples=await page.evaluate(()=>{clearInterval(window.heroSampler);return window.heroSamples;});
  for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i],changed=['actor','scenery','planet'].filter(k=>a[k]!==b[k]);if(changed.length)report.transitions.push({time:b.time,changed});}
  for(const key of ['actor','scenery','planet'])assert.ok(report.transitions.some(t=>t.changed.length===1&&t.changed[0]===key),`${key} must change independently`);
  for(const key of ['actor','scenery']){const times=report.transitions.filter(t=>t.changed.includes(key)).map(t=>t.time);const gaps=times.slice(1).map((t,i)=>t-times[i]);assert.ok(Math.max(...gaps)-Math.min(...gaps)>1,`${key} rhythm varies`);}
  assert.ok(new Set(samples.map(s=>s.background)).size>5);assert.ok(samples.some(s=>s.sky.ufo));assert.ok(samples.some(s=>s.sky.comet));assert.ok(samples.every(s=>s.geometries<260));
  await page.screenshot({path:`${out}/hero-active.png`});report.checks.push('independent uneven schedules, changing sky, UFO and meteor, bounded geometry');
  await page.locator('#journeys').scrollIntoViewIfNeeded();await page.waitForTimeout(500);const before=await status();await page.waitForTimeout(700);const after=await status();assert.equal(after.visible,false);assert.equal(after.time,before.time);report.checks.push('offscreen animation pauses');
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>document.querySelector('#mode-gate').scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(400);const still=await status();await page.waitForTimeout(500);assert.equal((await status()).time,still.time);assert.equal(still.reduced,true);report.checks.push('live reduced motion preference');
  for(const width of [320,390,768,1440,1920]){
    await page.setViewportSize({width,height:width<768?844:1000});await page.evaluate(()=>document.querySelector('#mode-gate').scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(180);
    const layout=await page.evaluate(()=>{const gate=document.querySelector('#mode-gate'),hero=document.querySelector('.landing-hero').getBoundingClientRect(),button=document.querySelector('.hero-copy .landing-primary').getBoundingClientRect();return {width:innerWidth,left:hero.left,right:hero.right,overflow:gate.scrollWidth-gate.clientWidth,buttonBottom:button.bottom};});
    assert.ok(Math.abs(layout.left)<1&&Math.abs(layout.right-layout.width)<1,`edge to edge ${width}`);assert.ok(layout.overflow<=1,`overflow ${width}`);assert.ok(layout.buttonBottom<844,`CTA ${width}`);
    await page.screenshot({path:`${out}/hero-${width}.png`});report.widths.push(width);
  }
  assert.deepEqual(await page.locator('.chapter-number').allTextContents(),['第一章','第二章','第三章']);
  assert.equal(await page.locator('.landing-nav nav,.landing-page [role=tab]').count(),0);
  assert.equal(await page.locator('.making-beliefs article').count(),3);
  assert.match(await page.locator('#making').innerText(),/涌现/);
  await page.setViewportSize({width:1440,height:1000});
  for(const selector of ['#journeys','#making']){await page.locator(selector).evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.waitForTimeout(100);await page.screenshot({path:`${out}/${selector.slice(1)}.png`});}
  for(const id of ['candy','moon','question']){await page.locator(`[data-journey="${id}"]`).click();await page.locator('.dialog-art').evaluate(e=>e.decode());assert.match(await page.locator('.dialog-art').getAttribute('src'),new RegExp(`journey-${id}`));await page.keyboard.press('Escape');}
  await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.landing-page img')].map(i=>{i.loading='eager';return i.decode();}));});
  report.checks.push('chapter numbering, three themed journey dialogs, design-first journal, images loaded');
  const fallback=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:get.call(this,type,...args);};});
  await fallback.goto(base,{waitUntil:'domcontentloaded'});await fallback.locator('#landing-world img').evaluate(e=>e.decode());assert.match(await fallback.locator('#landing-world img').evaluate(e=>e.currentSrc),/hero-immersive-mobile/);assert.equal(await fallback.locator('#landing-world img').evaluate(e=>getComputedStyle(e).visibility),'visible');await fallback.screenshot({path:`${out}/fallback-mobile.png`});await fallback.close();report.checks.push('mobile WebGL fallback');
  assert.deepEqual(errors,[]);report.errors=errors;report.status='passed';await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
