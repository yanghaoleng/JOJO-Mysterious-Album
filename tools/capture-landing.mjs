// Reproducible 3D concept artwork + actual product screenshots for the landing page.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs SHARP_MODULE=/absolute/path/to/sharp/lib/index.js node tools/capture-landing.mjs
import {fileURLToPath} from 'node:url';
import {writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const {default:sharp}=await import(process.env.SHARP_MODULE||'sharp');
const base=process.env.BASE_URL||'http://localhost:8149';
const dir=new URL('../assets/landing/',import.meta.url);await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1});
try{
  if(!process.env.SKIP_ART)for(const [name,theme,concept,action] of [['hero','hero',0],['candy','hero',0,'secondary'],['chapter-wow','wow'],['chapter-debate','debate'],['chapter-moon','moon'],['concept-friends','hero',1],['concept-grow','hero',2,'primary'],['concept-cosmos','hero',3],['concept-relay','hero',4]]){
    await page.goto(`${base}/tools/landing-art?theme=${theme}`);await page.waitForFunction(()=>window.ready);
    await page.evaluate(({concept,action})=>{if(concept!==undefined)window.art.setConcept(concept);if(action)window.art.choose(action);window.art.render(0);},{concept,action});
    const image=await page.evaluate(()=>window.art.renderer.domElement.toDataURL('image/webp',.88).split(',')[1]);
    await writeFile(new URL(`${name}.webp`,dir),Buffer.from(image,'base64'));console.log(name);
  }
  await page.setViewportSize({width:1200,height:800});
  for(const [name,url] of [['history-story','/story-v2?story=doudou'],['history-lab','/?mode=debug'],['studio','/dev/?mode=studio'],['friends','/story-npcs?from=dev'],['yellow-four','/dev/yellow-four'],['iphone-duo','/dev/iphone-duo/']]){
    await page.goto(base+url);await page.waitForSelector('canvas');
    if(name==='iphone-duo'){await page.waitForFunction(()=>!document.querySelector('#toggle').disabled);await page.locator('#toggle').click();}
    await page.waitForTimeout(1800);
    await sharp(await page.screenshot()).webp({quality:85}).toFile(fileURLToPath(new URL(`${name}.webp`,dir)));console.log(name);
  }
}finally{await browser.close();}
