import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base=process.env.DEV_QA_BASE || 'http://127.0.0.1:8156/dev/';
const output=process.env.VERIFY_OUTPUT || '/tmp/jma-three-worlds'; await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[], errors=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"local test fallback"}'}));
 await page.route('**/api/debate',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({allowed:true,topic:'轮流当船长',commonGround:'让每个人都有机会，也一起照顾船。',closingQuestion:'你想怎么安排轮流？',turns:['我想先把船开稳，再邀请大家。','你先看海浪，我来把船长徽章分给大家。','轮流很好。那谁来记下每个人想去的地方？','要不画张航海图，每人贴一颗目的地星星。'].map((text,i)=>({speakerId:i%2?'snow-rabbit':'book-owl',phase:['offer','connect','challenge','experiment'][i],text}))})}));
 const state=()=>page.evaluate(()=>window.__DEV_STORY__?.status || window.__DEBATE_3D__?.status);
 const exp=async()=>(await state()).stage.exploration;
 async function idle(){await page.waitForFunction(()=>!(window.__DEV_STORY__?.status || window.__DEBATE_3D__?.status).stage.exploration.moving,{}, {timeout:25000});}
 async function walk(id){await page.locator('.exploration-map-toggle').click();await page.locator(`[data-zone="${id}"]`).click();await idle();}
 const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
 async function decision(){for(let i=0;i<200;i++){const s=await state();if(['question','complete'].includes(s.phase)&&!s.busy)return;if(await page.locator('#speech-card').isVisible())await page.locator('#speech-card').click();await page.waitForTimeout(80);}throw Error('Question timeout');}
 for(const story of ['moon','debate']){
  await page.goto(story==='debate'?`${base}debate`:`${base}?story=moon`);await page.waitForFunction(()=>(window.__DEV_STORY__?.status || window.__DEBATE_3D__?.status)?.stage?.exploration);
  await page.waitForTimeout(250); assert.equal((await exp()).zones.length,5);
  await page.screenshot({path:`${output}/${story}-desktop.png`});
  for(const [id,kind] of [['lake','fish'],['flowers','flower'],['mushrooms','mushroom'],['bells','bell']]){await walk(id);assert.ok((await exp()).reactions.some(r=>r.kind===kind&&r.count>0));}
  const saved=(await exp()).normal;await page.reload();await page.waitForFunction(()=>(window.__DEV_STORY__?.status || window.__DEBATE_3D__?.status)?.stage?.exploration);assert.ok(distance(saved,(await exp()).normal)<.005);
  await walk('home');const before=(await exp()).normal;await page.keyboard.down('ArrowRight');await page.waitForTimeout(500);await page.keyboard.up('ArrowRight');assert.ok(distance(before,(await exp()).normal)>.04);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);await page.locator('.exploration-map-toggle').click();await page.screenshot({path:`${output}/${story}-mobile-map.png`});await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const avatar=(await exp()).avatar;assert.ok(avatar.x>=20&&avatar.x<=370&&avatar.y>140&&avatar.y<650,`${story} avatar behind UI`);
  checks.push(`${story}: four walkable secondary areas, approach feedback, keyboard, saved location, 390px map and framing`);
  if(story==='moon'){
   await page.locator('#start-story').click();await decision();
   for(let i=0;i<6;i++){
    assert.equal((await state()).sceneIndex,i);assert.ok(await exp());
    if(await page.locator('#reply-options').isHidden())await page.locator('#reply-more').click();
    if(await page.locator('#choices').isHidden())await page.locator('#show-choices').click();
    await page.locator('#choices button').first().click();await decision();
    assert.equal(await page.locator('.exploration-hud').count(),1);
   }
   assert.equal((await state()).completed,true);assert.equal((await state()).stage.world,'moon');
   const current=(await exp()).normal;await page.keyboard.down('d');await page.waitForTimeout(400);await page.keyboard.up('d');assert.ok(distance(current,(await exp()).normal)>.03);
   checks.push('moon: all six scenes and inventions progress normally; child remains controllable on final moon');
  }else{
   await page.locator('#answer-choices button').first().click();await page.waitForFunction(()=>window.__DEBATE_3D__.status.phase==='discussing');
   for(let i=0;i<4;i++)await page.locator('#next-turn').click();
   await page.waitForFunction(()=>window.__DEBATE_3D__.status.phase==='reflection');
   await page.locator('#write-answer').click();const current=(await exp()).normal;
   await page.locator('#answer-input').fill('我想让大家轮流当船长。');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(250);await page.keyboard.up('ArrowLeft');assert.ok(distance(current,(await exp()).normal)<.001);
   await page.locator('#send-answer').click();await page.waitForFunction(()=>window.__DEBATE_3D__.status.phase==='ending');
   assert.ok(await exp());await page.locator('#restart').click();assert.equal((await exp()).area,'想法树下');
   checks.push('debate: topic, four connected turns, typed reflection, ending and reset work; modal typing never moves child');
  }
  await page.setViewportSize({width:1280,height:800});
 }
 assert.deepEqual(errors,[]);const report={passed:true,base,checks,errors,note:'API/speech use fixtures; verifies UI and lifecycle, not real microphone.'};await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
