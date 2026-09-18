import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const {default:sharp}=await import(process.env.SHARP_MODULE||'sharp');
const base=process.env.BASE_URL||'http://localhost:8149';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:900,height:1000},reducedMotion:'reduce'});
  await page.route('**/api/analytics/**',r=>r.fulfill({status:204}));
  for(const [name,url] of [['story-wow','/dev/?story=wow'],['story-debate','/dev/debate'],['story-moon','/dev/?story=moon']]){
    await page.goto(base+url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.__DEV_STORY__||window.__DEBATE_3D__));
    if(name==='story-wow'){
      await page.locator('#start-story').click();
      for(let attempt=0;attempt<130;attempt++){
        const state=await page.evaluate(()=>window.__DEV_STORY__.status);
        if(state.sceneIndex>=5&&state.phase==='question')break;
        if(state.phase==='question'){
          if(await page.locator('#reply-more').getAttribute('aria-expanded')!=='true')await page.locator('#reply-more').click();
          const first=page.locator('#choices button').first();
          if(await first.isVisible())await first.click();
        }else if(['narrating','responding'].includes(state.phase))await page.locator('#speech-card').click();
        await page.waitForTimeout(180);
      }
      if(await page.locator('#reply-more').getAttribute('aria-expanded')==='true')await page.locator('#close-replies').click();
    }
    // Capture the actual story renderer with its interface hidden for a clean cover.
    await page.addStyleTag({content: name==='story-debate' ? 'header,.chapter-title,.conversation,#world-error{visibility:hidden!important}' : '.topbar,.scene-caption,.camera-reset,.stage-hint,.story-panel,#notice{visibility:hidden!important}'});
    await page.waitForTimeout(1400);
    await writeFile(new URL(`../assets/landing/${name}.webp`,import.meta.url),await sharp(await page.screenshot()).webp({quality:88}).toBuffer());
    console.log(name);
  }
  await page.setViewportSize({width:1440,height:900});await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#landing-world[data-ready]');await page.waitForTimeout(500);
  const data=await page.locator('#landing-world canvas').evaluate(c=>c.toDataURL('image/webp',.9).split(',')[1]);
  await writeFile(new URL('../assets/landing/hero-immersive.webp',import.meta.url),Buffer.from(data,'base64'));console.log('hero-immersive');
}finally{await browser.close();}
