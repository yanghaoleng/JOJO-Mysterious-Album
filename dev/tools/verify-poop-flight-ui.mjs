import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.QA_ORIGIN||'http://127.0.0.1:8920';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  for(const asset of ['prop:poop','prop:rword-poop']){
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/dev/modules/');
    await page.locator('#module-search').fill(asset);
    await page.locator(`[data-module="${asset}"]`).click();
    await page.waitForFunction(()=>window.__MODULE_GALLERY__.status.stage.scriptedEntities[0]?.settled);
    const canvas=page.locator('#preview-stage canvas'),rect=await canvas.boundingBox();
    await page.mouse.click(rect.x+rect.width*.44,rect.y+rect.height*.75);
    await page.waitForFunction(()=>window.__MODULE_GALLERY__.status.stage.scriptedEntities[0]?.cueHeight>1);
    assert.ok((await page.evaluate(()=>window.__MODULE_GALLERY__.status.runtime.worlds.meadow.entities.preview)).asset===asset);
    await page.waitForFunction(()=>!window.__MODULE_GALLERY__.status.runtime.worlds.meadow.entities.preview);
    assert.deepEqual(errors,[]);
    await page.close();
  }
  console.log('PASS: both poop models fly after a real canvas click and leave the world.');
}finally{await browser.close();}
