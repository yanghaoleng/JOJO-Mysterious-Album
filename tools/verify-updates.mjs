import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.QA_ORIGIN||'http://127.0.0.1:8156';
const out=process.env.VERIFY_OUTPUT||'/tmp/jma-updates';await mkdir(out,{recursive:true});
const hashes=execFileSync('git',['rev-list','HEAD'],{encoding:'utf8'}).trim().split('\n');
const browser=await chromium.launch({channel:'chrome',headless:true});
let passed=false;
const errors=[],checks=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  page.setDefaultNavigationTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',r=>r.fulfill({status:204}));
  await page.goto(`${base}/changelog/`,{waitUntil:'domcontentloaded'});
  const response=await page.request.get(`${base}/changelog/history.json`);assert.equal(response.status(),200);
  const history=await response.json();
  assert.equal(history.commitCount,hashes.length);
  assert.deepEqual(new Set(history.days.flatMap(d=>d.commits.map(c=>c.hash))),new Set(hashes));
  assert.equal(history.revision,hashes[0]);assert.equal(history.timeZone,'Asia/Shanghai');
  assert.equal(await page.locator('.update').count(),history.days.length);
  assert.equal(await page.locator('.commit-list a').count(),hashes.length);
  assert.equal(await page.locator('details[open]').count(),0);
  const dates=await page.locator('.update').evaluateAll(nodes=>nodes.map(n=>n.dataset.date));
  assert.deepEqual(dates,[...new Set(dates)].sort().reverse());
  await page.locator('summary').first().click();assert.equal(await page.locator('details[open]').count(),1);
  await page.locator('summary').first().click();
  await page.screenshot({path:`${out}/changelog-desktop.png`});
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`changelog width ${width}`);
    if(width===390)await page.screenshot({path:`${out}/changelog-mobile.png`});
  }
  await page.locator('.month-nav a').last().click();assert.match(page.url(),/#month-2026-08$/);
  checks.push(`Complete history: ${hashes.length} unique commits, ${history.days.length} daily summaries, collapsible sources and month navigation`);
  console.log(checks.at(-1));
  await page.locator('.page-header>a').last().click();
  await page.waitForSelector('.landing-footer');
  assert.equal(await page.locator('.landing-closing').count(),0);
  assert.equal(await page.locator('a[href="#top"]').count(),0);
  assert.equal(await page.locator('.making-timeline article').count(),4);
  const modules=page.locator('.making-timeline .landing-text-link[href="./dev/modules/"]');assert.equal(await modules.count(),1);
  assert.equal(await page.locator('.experiment-grid a[href*="modules"]').count(),0);
  await page.locator('.making-history-heading').scrollIntoViewIfNeeded();
  await page.locator('.making-timeline img').last().scrollIntoViewIfNeeded();
  await page.locator('.making-timeline img').last().evaluate(i=>i.decode());
  await page.screenshot({path:`${out}/home-history.png`});
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});await page.locator('.landing-footer').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#mode-gate').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,`home width ${width}`);
    if(width===390)await page.screenshot({path:`${out}/home-footer-mobile.png`});
  }
  await page.locator('.landing-footer a').click();await page.waitForURL('**/changelog/');
  await page.locator('.page-header>a').last().click();await modules.click();await page.waitForURL('**/dev/modules/');
  await page.getByRole('heading',{name:'模块陈列馆',exact:true}).waitFor();
  checks.push('Module gallery belongs to iteration history; footer log and return links work; closing card removed; four responsive widths');
  console.log(checks.at(-1));
  await page.goto(`${base}/?mode=debug`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.mode==='debug');
  assert.equal(await page.locator('#debug-lab').isVisible(),true);
  checks.push('Legacy character simulator still opens after moving its status element');
  assert.deepEqual(errors,[]);
  const report={passed:true,base,checks,errors};await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));passed=true;console.log(JSON.stringify(report,null,2));
}finally{const deadline=setTimeout(()=>process.exit(passed?0:1),8000);await browser.close();clearTimeout(deadline);}
