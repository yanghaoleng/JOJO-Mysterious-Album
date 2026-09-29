import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8964';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const [route,words] of [['words',['a','big','head']],['midautumn',['moon','mooncake','lantern']],['national',['flag','balloon']]]){
  const page=await browser.newPage({viewport:{width:1200,height:900},reducedMotion:'reduce'});
  await page.route('**/api/**',r=>r.fulfill({status:200,body:'{}'}));
  await page.goto(origin+'/'+route);await page.waitForFunction(()=>window.__WORD_GAME__);
  if(route==='words'){
   if(await page.locator('#skip-intro').isVisible())await page.locator('#skip-intro').click();
   await page.locator('#choose-age').click();await page.locator('#continue-chapter').click();
  }
  await page.waitForFunction(()=>window.__WORD_GAME__.status.view==='play');
  await page.locator('#word-options-toggle').click();
  for(const word of words){const button=page.locator(`[data-word="${word}"]`);if(await button.count()){await button.click();await page.waitForFunction(()=>!window.__WORD_GAME__.status.busy&&!window.__WORD_GAME__.status.pendingWords);}}
  await page.addStyleTag({content:'.word-header,#word-panel,#clear-world,.world-title,.scene-shade{visibility:hidden!important}'});
  await page.waitForTimeout(1000);
  const shot=await page.screenshot();
  // Encode the unretouched game screenshot as WebP through the browser canvas.
  const data=await page.evaluate(async src=>{const i=new Image();i.src=src;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;c.getContext('2d').drawImage(i,0,0);return c.toDataURL('image/webp',.9).split(',')[1];},'data:image/png;base64,'+shot.toString('base64'));
  await writeFile(`assets/landing/reading-${route}.webp`,Buffer.from(data,'base64'));await page.close();console.log('Captured '+route);
 }
}finally{await browser.close();}
