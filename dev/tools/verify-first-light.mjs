import assert from 'node:assert/strict';
import { WOW_DEV_STORY as story } from '../content/stories/wow.js';
import { firstLightReply, acceptLightReply } from '../content/stories/first-light.js';
assert.equal(story.scenes.length,12);
assert.equal(story.scenes.filter(s=>s.inputMode==='voice').length,4);
for(const answer of ['啊吧吧','不知道','恐龙开火车','先安静看看','为什么鱼会游泳？','我的电话是13800138000','炸弹']){
  const result=firstLightReply(story.scenes[3],answer);assert.equal(result.accepted,true);
  if(!/电话|炸弹|先安静/.test(answer))assert.ok(result.reaction.includes(answer));
  else assert.ok(!/13800138000|炸弹/.test(result.reaction));
}
const fallback=firstLightReply(story.scenes[3],'小鱼');
assert.equal(acceptLightReply({accepted:true,reaction:'你说错了',source:'ai'},fallback,'小鱼'),fallback);
assert.equal(acceptLightReply({accepted:true,reaction:'“小鱼”像光一样游过来了。',source:'ai'},fallback,'小鱼').source,'ai');
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}}), errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
const status=()=>page.evaluate(()=>window.__DEV_STORY__?.status);
async function decision(target='question'){
 for(let i=0;i<280;i++){
  const s=await status();if(s?.phase===target&&!s.busy)return;
  if(await page.locator('#speech-card').isVisible())await page.locator('#speech-card').click();
  await page.waitForTimeout(60);
 }
 throw Error(`Stuck: ${JSON.stringify(await status())}`);
}
try{
 await page.goto((process.env.DEV_QA_BASE||'http://127.0.0.1:8164/dev/')+'?story=wow');
 await page.waitForFunction(()=>window.__DEV_STORY__?.status.stage?.exploration);
 assert.ok((await status()).stage.lighting.exposure < .9, 'Opening stays dark during exploration');
 await page.locator('#start-story').click();await decision();
 const answers={3:'为什么鱼会游泳？',5:'粉色',6:'棉花糖',7:'不知道'};
 for(let i=0;i<12;i++){
  assert.equal((await status()).sceneIndex,i);
  if(answers[i]){
   await page.locator('#reply-more').click();await page.locator('#show-text').click();
   await page.locator('#answer-input').fill(answers[i]);await page.locator('#text-form button').click();
  }else await page.locator('#choices button').first().click();
  if(i===3){await page.waitForTimeout(2800);assert.ok((await status()).wow.pulseRemaining>0,'Light response lasts over three seconds');}
  await decision(i===11?'complete':'question');
  if(i===6){
   assert.match(await page.locator('.first-light-memory').textContent(),/粉色的天空，飘着棉花糖/);
   await page.screenshot({path:'/tmp/first-light-mobile.png'});
   await page.reload();await page.waitForFunction(()=>window.__DEV_STORY__?.status.stage?.exploration);
   await page.locator('#start-story').click();await decision();assert.equal((await status()).sceneIndex,7);
  }
 }
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jma.dev.clay.v1.story.wow')));
 assert.equal(saved.wowEntries.length,12);assert.equal(saved.firstWords,'为什么鱼会游泳？');
 assert.ok(saved.inventory.some(i=>i.id==='first-light-page'));assert.equal(saved.completed,true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.match(await page.locator('.first-light-memory').textContent(),/25%/);
 await page.screenshot({path:'/tmp/first-light-ending.png'});
 await page.locator('#journey-next').click();await page.waitForFunction(()=>window.__DEBATE_3D__?.status);
 assert.match(await page.locator('#speech-text').textContent(),/为什么鱼会游泳/);
 await page.evaluate(()=>localStorage.setItem('jma.dev.clay.v1.story.wow',JSON.stringify({sceneIndex:5,sceneId:'gugu-feeling',scriptVersion:1,inventory:[],inventions:[],wowEntries:[],firstWords:'旧版的小秘密'})));
 await page.goto((process.env.DEV_QA_BASE||'http://127.0.0.1:8164/dev/')+'?story=wow');await page.waitForFunction(()=>window.__DEV_STORY__?.status.stage?.exploration);
 assert.equal((await status()).sceneIndex,0);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('jma.dev.clay.v1.story.wow.before-first-light')).firstWords),'旧版的小秘密');
 await page.screenshot({path:'/tmp/first-light-intro.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS: 12 rounds, vague/off-topic/safety replies, word/color continuity, reload, 25% light, book reward, mobile and chapter-two handoff.');
}finally{await browser.close();}
