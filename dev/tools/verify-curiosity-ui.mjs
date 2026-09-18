import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.DEV_QA_BASE||'http://127.0.0.1:8156/dev/';
const out=process.env.VERIFY_OUTPUT||'/tmp/jma-curiosity';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:820}});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"verification offline"}'}));
let succeeded=false;
const checkpoint=message=>{checks.push(message);console.log(message);};
const state=()=>page.evaluate(()=>(window.__DEV_STORY__||window.__DEBATE_3D__).status);
async function ready(){await page.waitForFunction(()=>(window.__DEV_STORY__||window.__DEBATE_3D__)?.status.stage?.exploration);}
async function decision(target='question'){
  for(let i=0;i<200;i++){const s=await state();if(s.phase===target&&!s.busy)return;if(await page.locator('#speech-card').isVisible())await page.locator('#speech-card').click({timeout:5000});await page.waitForTimeout(70);}
  throw new Error(`Never reached ${target}: ${JSON.stringify(await state())}`);
}
async function make(text){if(await page.locator('#reply-options').isHidden())await page.locator('#reply-more').click();await page.locator('#show-text').click();await page.locator('#answer-input').fill(text);await page.locator('#text-form button').click();await decision('creation-review');}
async function meet(){
  const before=await state();const friend=before.stage.exploration.friends.find(n=>n.screen.x>100&&n.screen.x<1100&&n.screen.y>120&&n.screen.y<480);assert.ok(friend,'A friend is visible');
  await page.mouse.click(friend.screen.x,friend.screen.y);
  await page.locator('.encounter-dialog').waitFor({state:'visible',timeout:20000});
  const normal=(await state()).stage.exploration.normal;
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');
  assert.ok(Math.hypot(...(await state()).stage.exploration.normal.map((v,i)=>v-normal[i]))<.001,'Encounter pauses walking');
  const old=await page.locator('.encounter-line').textContent();await page.locator('.encounter-choices button').first().click();assert.notEqual(await page.locator('.encounter-line').textContent(),old);
  await page.screenshot({path:`${out}/${before.storyId||'debate'}-encounter.png`});
  await page.locator('.encounter-close').click();assert.equal((await state()).sceneIndex,before.sceneIndex);assert.equal((await state()).phase,before.phase);
  checkpoint(`${before.storyId||'debate'}: walk up, dialogue, response, movement pause, main progress unchanged`);
}
try{
  await page.goto(`${base}?story=wow`,{waitUntil:'domcontentloaded'});await ready();await meet();
  // Seed only saved chapter handoff, then exercise actual topic, reflection and link controls.
  await page.evaluate(()=>localStorage.setItem('jma.curiosity-journey.v1',JSON.stringify({wow:{completed:true,question:'星星为什么愿意发光？'}})));
  await page.goto(`${base}debate`,{waitUntil:'domcontentloaded'});await ready();assert.match(await page.locator('#speech-text').textContent(),/星星为什么/);assert.equal(await page.locator('#answer-choices button').count(),3);await meet();
  await page.locator('#answer-choices button').first().click();await page.waitForFunction(()=>window.__DEBATE_3D__.status.phase==='discussing');await page.locator('#finish').click();await page.locator('#speech-card').click();
  await page.waitForFunction(()=>!document.querySelector('#answer-choices').hidden,{},{timeout:12000});await page.locator('#answer-choices button').last().click();await page.locator('#speech-card').click();
  assert.equal((await state()).phase,'ending');await page.locator('#next-chapter').click();await ready();assert.match(await page.locator('#speech-text').textContent(),/先听大家的点子/);
  checkpoint('First question carried to debate; three topics; offline authored discussion; child idea carried to chapter three');
  await meet();
  await page.locator('#start-story').click();await decision();await make('请铃铛造一个蓝色花园和小桥');
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jma.dev.clay.v1.story.moon')));assert.equal(saved.creations.length,1);assert.deepEqual(saved.creations[0].parts,['bridge','garden']);assert.equal(saved.creations[0].helper,'lingdang');
  await page.screenshot({path:`${out}/first-creation.png`});
  await page.locator('#creation-again').click();await make('给刚才的作品加一个机器人');
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jma.dev.clay.v1.story.moon')));assert.equal(saved.creations.length,1);assert.ok(saved.creations[0].parts.includes('robot'));
  await page.reload({waitUntil:'domcontentloaded'});await ready();assert.equal((await state()).stage.exploration.friends.filter(n=>n.creationId).length,1);
  checkpoint('Compound blue creation, requested helper, modify existing object, visible world and storage restored on refresh');
  await page.locator('#start-story').click();await decision();await make('一台望远镜');
  for(let i=1;i<6;i++){
    await page.locator('#creation-next').click();await decision();assert.equal((await state()).sceneIndex,i);
    if(await page.locator('#reply-options').isHidden())await page.locator('#reply-more').click();await page.locator('#choices button').first().click();await decision('creation-review');
  }
  await page.locator('#creation-next').click();await page.waitForFunction(()=>window.__DEV_STORY__.status.phase==='complete');await page.locator('#return-creating').click();await make('请小鹿老师来弹钢琴');
  await page.screenshot({path:`${out}/moon-workshop.png`});checkpoint('All six creative scenes, explicit onward action, ending and continuing to create');
  const visibleFriends=(await state()).stage.exploration.friends.filter(n=>n.present);assert.equal(new Set(visibleFriends.map(n=>n.id)).size,visibleFriends.length);
  await page.locator('#open-story-menu').click();await page.locator('#bag-button').click();await page.locator('#bag-content button').first().click();await decision();
  assert.equal((await state()).stage.world,'observatory');assert.ok((await state()).stage.exploration.friends.some(n=>n.creationId));
  checkpoint('One visible instance per friend; backpack returns to a previous planet and its saved work');
  for(const story of ['wow','debate','moon']){
    await page.setViewportSize({width:390,height:844});await page.goto(story==='debate'?`${base}debate`:`${base}?story=${story}`,{waitUntil:'domcontentloaded'});await ready();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.exploration-map-toggle,.exploration-help,.exploration-return').count(),0);
    await page.screenshot({path:`${out}/${story}-mobile.png`});
  }
  checkpoint('Three mobile entries, no horizontal overflow or removed navigation controls');assert.deepEqual(errors,[]);
  const report={passed:true,base,checks,errors,note:'Deterministic offline API and speech fallback; no live microphone capture claimed.'};await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));succeeded=true;console.log(JSON.stringify(report,null,2));
}catch(error){console.error(error);throw error;}finally{
  // Chrome can finish its process without settling the close pipe on macOS.
  const cleanupDeadline=setTimeout(()=>process.exit(succeeded?0:1),8000);
  await browser.close();clearTimeout(cleanupDeadline);
}
