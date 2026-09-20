import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.DEV_QA_BASE||'http://127.0.0.1:8166/dev/';
try {
 for (const mobile of [false,true]) {
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900},hasTouch:mobile});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
 await page.goto(base+'?story=wow');await page.locator('#start-story').click();
 async function decision(){for(let i=0;i<300;i++){const s=await page.evaluate(()=>window.__DEV_STORY__?.status);if(s?.phase==='question'&&!s.busy)return s;if(await page.locator('#speech-card').isVisible())await page.locator('#speech-card').click();await page.waitForTimeout(80);}throw Error('question timeout');}
 for(let i=0;i<12;i++) {
 const s=await decision();console.log('tap scene',mobile,i);assert.equal(s.sceneIndex,i);
 const t=s.stage.storyTapTarget;
 if(t?.id){
   await page.waitForTimeout(350);
   const target=await page.evaluate(()=>window.__DEV_STORY__.status.stage.storyTapTarget);
   assert.ok(target.enabled && target.visible,JSON.stringify(target));
   if(i===0){await page.mouse.move(target.x,target.y);await page.mouse.down();await page.mouse.move(target.x+20,target.y+12,{steps:5});await page.mouse.up();assert.equal((await page.evaluate(()=>window.__DEV_STORY__.status)).wow.entries,0);}
   const fresh=await page.evaluate(()=>window.__DEV_STORY__.status.stage.storyTapTarget);
   if(mobile)await page.touchscreen.tap(fresh.x,fresh.y);else await page.mouse.click(fresh.x,fresh.y);
   await page.waitForTimeout(100);
   const after=await page.evaluate(()=>window.__DEV_STORY__.status);
   assert.ok(after.stage.storyTapTarget.burst>.5,`no click feedback scene ${i}: ${JSON.stringify(after.stage.storyTapTarget)}`);
   assert.equal(after.busy,true);
   if(mobile)await page.touchscreen.tap(fresh.x,fresh.y);else await page.mouse.click(fresh.x,fresh.y);
   if(i===0)await page.screenshot({path:`/tmp/story-tap-${mobile?'mobile':'desktop'}.png`});
 }else{
   if(await page.locator('#choices').isHidden())await page.locator('#reply-more').click();
   await page.locator('#choices button').first().click();
 }
 if(i<11){await decision();assert.equal((await page.evaluate(()=>window.__DEV_STORY__.status)).wow.entries,i+1);}
 }
 assert.deepEqual(errors,[]);await page.close();console.log(`PASS all 8 scene targets, strong feedback, repeated taps, drag and ${mobile?'touch':'mouse'}`);
 }
} finally {await browser.close();}
