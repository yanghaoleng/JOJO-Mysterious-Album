import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1200,height:900}});
  for(const theme of (process.argv.slice(2).length ? process.argv.slice(2) : ['candy','moon','question','music','lantern'])){
    await page.goto(`${process.env.BASE_URL||'http://localhost:8149'}/tools/journey-art?theme=${theme}`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.ready);
    const data=await page.evaluate(()=>window.art.renderer.domElement.toDataURL('image/webp',.92).split(',')[1]);
    await writeFile(new URL(`../assets/landing/journey-${theme}.webp`,import.meta.url),Buffer.from(data,'base64'));console.log(theme);
  }
}finally{await browser.close();}
