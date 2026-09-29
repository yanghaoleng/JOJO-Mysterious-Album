import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.QA_ORIGIN||'http://127.0.0.1:8964';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('Page error:',e.message)});
 await page.route('**/api/**',r=>r.fulfill({status:200,body:'{}'}));
 await page.goto(base+'/');
 assert.deepEqual(await page.locator('#chapters .chapter-card').evaluateAll(a=>a.map(x=>x.getAttribute('href'))),['/words','/midautumn','/national']);
 assert.equal(await page.locator('#stories .chapter-card').count(),3);
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});await page.locator('#chapters').scrollIntoViewIfNeeded();
  await page.locator('#chapters img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
  assert.equal(await page.locator('#mode-gate').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
  await page.screenshot({path:`/tmp/reading-home-${width}.png`});
 }
 for(const route of ['words','midautumn','national']){
  console.log('Checking '+route);await page.goto(base+'/');await page.locator(`#chapters a[href="/${route}"]`).click();await page.waitForURL(base+'/'+route);await page.waitForFunction(()=>window.__WORD_GAME__);assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://jma.mikeywa.site/'+route);
 }
 for(const [old,canonical] of [['/dev/words.html','/words'],['/dev/words','/words'],['/words.html','/words'],['/midautumn.html','/midautumn'],['/national-day.html','/national'],['/national-day','/national'],['/national.html','/national']]){
  await page.goto(base+old+'?voice=legacy#make=abc');assert.equal(new URL(page.url()).pathname,canonical);assert.equal(new URL(page.url()).search,'?voice=legacy');assert.equal(new URL(page.url()).hash,'#make=abc');
 }
 assert.deepEqual(errors,[]);console.log('PASS three primary reading cards, original stories second, real screenshots, 320/390/1440 layout, single-tap links, canonical paths and legacy query/hash redirects');
}finally{await browser.close();}
