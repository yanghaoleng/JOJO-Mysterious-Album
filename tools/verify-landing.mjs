// Run against local or production without submitting voice, story, or analytics data.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const base=process.argv[2]||'http://localhost:8149';
const out=process.env.VERIFY_OUTPUT||'/tmp/jma-landing-verification';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],failed=[],report={base,viewports:[],concepts:[],links:[]};
page.on('pageerror',error=>errors.push(error.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
await page.route('**/api/analytics/**',r=>r.fulfill({status:204}));
try{
  await page.goto(base);await page.waitForSelector('#landing-world[data-ready]');await page.waitForTimeout(900);
  assert.equal(await page.locator('.chapter').count(),3);
  for(let i=0;i<5;i++){
    await page.locator(`[data-concept="${i}"]`).click();
    assert.equal(await page.locator(`[data-concept="${i}"]`).getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('#landing-world canvas').count(),1);
    for(const action of ['primary','secondary'])await page.locator(`[data-imagine="${action}"]`).click();
    await page.screenshot({path:`${out}/desktop-concept-${i+1}.png`});report.concepts.push(await page.locator('#concept-description').textContent());
  }
  await page.locator('[data-concept="4"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-concept="0"]').getAttribute('aria-selected'),'true');
  await page.keyboard.press('End');assert.equal(await page.locator('[data-concept="4"]').getAttribute('aria-selected'),'true');
  await page.locator('.chapter-action[data-debate-preview]').click();await page.waitForSelector('#landing-dialog[open]');
  await page.locator('[data-topic="1"]').click();assert.match(await page.locator('#debate-lines').innerText(),/船/);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#landing-dialog').evaluate(el=>el.open),false);
  for(const id of ['candy','moon','question']){await page.locator(`[data-journey="${id}"]`).click();assert.equal(await page.locator('#landing-dialog li').count(),3);await page.locator('.dialog-close').click();}
  const hrefs=await page.locator('.landing-page a').evaluateAll(links=>[...new Set(links.map(a=>a.href))]);
  for(const href of hrefs){if(new URL(href).origin!==new URL(base).origin)continue;const r=await page.request.get(href);assert.equal(r.status(),200,href);report.links.push({url:href,status:r.status()});}
  for(const width of [320,390,768,1024,1440]){
    await page.setViewportSize({width,height:width<768?844:900});
    await page.evaluate(()=>{document.getElementById('mode-gate').scrollTop=0;});
    await page.locator('[data-concept="0"]').click();
    const dimensions=await page.locator('#mode-gate').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth}));assert.ok(dimensions.scrollWidth<=dimensions.width+1,JSON.stringify({width,dimensions}));
    await page.screenshot({path:`${out}/home-${width}.png`});
    for(const section of ['chapters','journeys','making']){await page.locator(`#${section}`).scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${section}-${width}.png`});}
    await page.locator('.experiment-grid').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/experiments-${width}.png`});
    const imageSizes=await page.locator('.experiment-grid>a>img').evaluateAll(imgs=>imgs.map(i=>({width:i.clientWidth,height:i.clientHeight})));assert.ok(imageSizes.every(i=>i.height<=i.width),JSON.stringify(imageSizes));
    report.viewports.push({width,...dimensions});
  }
  await page.evaluate(async()=>{await Promise.all([...document.images].map(img=>{img.loading='eager';return img.decode().catch(()=>{});}));});
  const broken=await page.locator('.landing-page img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src));assert.deepEqual(broken,[]);
  await page.goto(`${base}/?preview=debate`);await page.waitForSelector('#landing-dialog[open]');await page.keyboard.press('Escape');
  await page.goto(`${base}/?journey=candy`);await page.waitForSelector('#landing-dialog[open]');await page.locator('.dialog-close').click();
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  report.errors=errors;report.failed=failed;report.status='passed';
  // The poster must remain useful if WebGL cannot be created.
  const fallback=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await fallback.route('**/api/analytics/**',r=>r.fulfill({status:204}));
  await fallback.addInitScript(()=>{const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:native.call(this,type,...args);};});
  await fallback.goto(base);await fallback.locator('[data-concept="3"]').click();assert.equal(await fallback.locator('#landing-world img').evaluate(el=>getComputedStyle(el).visibility),'visible');
  assert.match(await fallback.locator('#landing-world img').getAttribute('src'),/concept-cosmos/);await fallback.close();report.webglFallback='passed';
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
