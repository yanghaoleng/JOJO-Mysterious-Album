import assert from 'node:assert/strict';
import { SKY_PROP_HEIGHTS } from '../content/props.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  for(const reducedMotion of ['no-preference','reduce']){
    const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto((process.env.QA_ORIGIN||'http://127.0.0.1:8920')+'/dev/modules/');
    for(const [asset,height] of Object.entries(SKY_PROP_HEIGHTS)){
      await page.locator('#module-search').fill(asset);
      await page.locator(`[data-module="${asset}"]`).click();
      await page.waitForFunction(()=>window.__MODULE_GALLERY__.status.stage.scriptedEntities[0]?.settled);
      const state=await page.evaluate(()=>window.__MODULE_GALLERY__.status.stage);
      const position=state.scriptedEntities[0].position,center=state.planet.center;
      const altitude=Math.hypot(...position.map((n,i)=>n-center[i]))-state.planet.radius;
      assert.ok(Math.abs(altitude-height-.02)<.05,`${asset}: altitude ${altitude}`);
      if(asset==='prop:festival-moon'&&reducedMotion==='no-preference')await page.screenshot({path:'/tmp/jma-moon-sky.png'});
    }
    assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: moon, star, fireworks and moonlight remain airborne, including reduced motion.');
}finally{await browser.close();}
