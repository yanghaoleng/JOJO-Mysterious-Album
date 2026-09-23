import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8918';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/tts',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
 await page.goto(`${origin}/dev/words?voice=legacy`);await page.locator('#skip-intro').tap();await page.waitForFunction(()=>window.__WORD_GAME__.status.view==='age');
 const cdp=await context.newCDPSession(page),scale=()=>page.evaluate(()=>visualViewport.scale);
 await cdp.send('Input.synthesizePinchGesture',{x:195,y:180,scaleFactor:2,gestureSourceType:'touch'});assert.equal(await scale(),1);
 await page.touchscreen.tap(195,170);await page.touchscreen.tap(195,170);assert.equal(await scale(),1);
 const plus=await page.locator('#age-plus').boundingBox(),before=await page.evaluate(()=>window.__WORD_GAME__.status.age);
 await page.touchscreen.tap(plus.x+plus.width/2,plus.y+plus.height/2);await page.touchscreen.tap(plus.x+plus.width/2,plus.y+plus.height/2);assert.equal(await page.evaluate(()=>window.__WORD_GAME__.status.age),before+2,'rapid taps still work');
 await page.locator('#choose-age').tap();await page.locator('#continue-chapter').tap();await page.waitForFunction(()=>window.__WORD_GAME__.status.view==='play');await page.locator('#word-options-toggle').tap();
 const menu=await page.locator('#word-menu').boundingBox();
 await cdp.send('Input.synthesizeScrollGesture',{x:Math.round(menu.x+menu.width/2),y:Math.round(menu.y+menu.height*.8),yDistance:-160,xDistance:0,gestureSourceType:'touch'});
 assert.ok(await page.evaluate(()=>[...document.querySelectorAll('#word-menu,#word-menu *')].some(n=>n.scrollTop>0)),'word menu still scrolls');
 assert.equal(await page.evaluate(()=>{const e=new Event('gesturestart',{bubbles:true,cancelable:true});document.dispatchEvent(e);return e.defaultPrevented;}),true,'Safari gesture fallback');
 assert.equal(await page.evaluate(()=>{const image=document.createElement('img');image.className='share-preview';document.querySelector('#word-panel').append(image);const menu=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});image.dispatchEvent(menu);const value=!menu.defaultPrevented&&getComputedStyle(image).userSelect==='auto';image.remove();return value;}),true,'image context menu is not blocked');
 assert.deepEqual(errors,[]);console.log('PASS mobile pinch/double tap do not zoom; rapid age taps, real touch menu scroll and image-save callout preserved.');
}finally{await browser.close();}
