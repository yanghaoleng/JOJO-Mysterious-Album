import assert from 'node:assert/strict';
import {WOW_DEV_STORY as story} from '../content/stories/wow.js';
import {FIRST_LIGHT_MODEL_BEATS,firstLightModelChoice,firstLightWorldCommands} from '../content/stories/first-light-models.js';
import {createCreationModel} from '../creation-models.js';
import {validateCommand} from '../runtime/contracts.js';
import {WorldRuntime} from '../runtime/world-runtime.js';
for(const beat of story.scenes)for(const e of beat.events)for(const c of e.effects)validateCommand(c);
const modelIds=new Set(Object.values(FIRST_LIGHT_MODEL_BEATS).flatMap(b=>[...(b.enter||[]),...(b.answer||[]),...Object.values(b.choices||{}).flat()]).filter(c=>c.asset).map(c=>c.asset.slice(5)));
for(const id of modelIds){
 const m=createCreationModel(id);let meshes=0,disposed=0;
 m.group.traverse(o=>{if(o.isMesh){meshes++;o.geometry.addEventListener('dispose',()=>disposed++);}});
 assert.ok(meshes>2,id);m.trigger();m.update(.25);m.update(.25,true);m.dispose();assert.ok(disposed>0,`${id}: cleanup`);
}
for(const color of ['粉色','彩虹色'])for(const object of ['棉花糖','小鱼']){
 const entries=[{id:'gugu-feeling',answer:color},{id:'gugu-question',answer:object}];
 const commands=firstLightWorldCommands(story,story.scenes[7],entries);
 assert.ok(commands.some(c=>c.asset===`prop:${color==='粉色'?'pink-sky':'rainbow-sky'}`));
 assert.ok(commands.some(c=>c.asset===`prop:${object==='小鱼'?'sky-fish':'cotton-cloud'}`));
 const runtime=new WorldRuntime();runtime.enter({world:'meadow',storyId:'wow',sceneId:'gugu-key',actors:['wow']});assert.ok(runtime.dispatch(commands).ok);
 const restored=new WorldRuntime({saved:runtime.snapshot});assert.deepEqual(restored.snapshot.worlds.meadow.entities,runtime.snapshot.worlds.meadow.entities);
}
assert.equal(firstLightModelChoice(story.scenes[5],'我想要七彩的天空'),'彩虹色');
assert.equal(firstLightModelChoice(story.scenes[6],'让三条小鱼在天上游'),'小鱼');
console.log(`PASS: ${modelIds.size} independent models, command contracts, all four combinations, speech mapping and snapshot restore`);
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.DEV_QA_BASE||'http://127.0.0.1:8166/dev/';
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
const status=()=>page.evaluate(()=>window.__DEV_STORY__?.status);
async function decision(){for(let i=0;i<250;i++){const s=await status();if(s?.phase==='question'&&!s.busy)return;if(await page.locator('#speech-card').isVisible())await page.locator('#speech-card').click();await page.waitForTimeout(70);}throw Error('Question timeout');}
async function choose(label){console.log('choose',label,(await status()).sceneIndex);if(await page.locator('#choices').isHidden())await page.locator('#reply-more').click();await page.locator('#choices button').filter({hasText:label}).click();await decision();}
try{
 await page.goto(base+'?story=wow');await page.waitForFunction(()=>window.__DEV_STORY__?.status);
 const entries=story.scenes.slice(0,5).map(s=>({id:s.id,chapter:1,kind:s.wow.kind,answer:s.id==='voice-light'?'为什么天是蓝的？':s.choices[0].label,reaction:'啵！',source:'local'}));
 await page.addInitScript(entries=>{if(sessionStorage.getItem('fl-fixture'))return;sessionStorage.setItem('fl-fixture','1');localStorage.setItem('jma.dev.clay.v1.story.wow',JSON.stringify({sceneIndex:5,sceneId:'gugu-feeling',scriptVersion:2,setupDone:true,inventory:[{id:'torch'}],inventions:[],wowEntries:entries,firstWords:'为什么天是蓝的？'}));},entries);
 await page.reload();await page.waitForFunction(()=>window.__DEV_STORY__?.status);await page.locator('#start-story').click();await decision();
 await choose('彩虹色');await choose('小鱼');
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jma.dev.clay.v1.story.wow')));
 assert.equal(saved.worldState.worlds.meadow.entities['fl-sky'].asset,'prop:rainbow-sky');
 assert.equal(saved.worldState.worlds.meadow.entities['fl-floating'].asset,'prop:sky-fish');
 assert.ok((await status()).stage.scriptedEntities.some(e=>e.id==='fl-floating'));
 await page.waitForTimeout(9000);await page.screenshot({path:'/tmp/first-light-rainbow-fish-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({path:'/tmp/first-light-rainbow-fish-mobile.png'});
 await page.reload();await page.waitForFunction(()=>window.__DEV_STORY__?.status);assert.ok((await status()).stage.scriptedEntities.some(e=>e.id==='fl-floating'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#start-story').click();await decision();await choose('想和星星做朋友');
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jma.dev.clay.v1.story.wow')));assert.equal(saved.worldState.worlds.meadow.entities['fl-friends'].asset,'prop:star-friends');
 await page.goto(base+'modules/#prop%3Arainbow-sky');await page.waitForFunction(()=>window.__MODULE_GALLERY__?.status?.selected==='prop:rainbow-sky');
 assert.deepEqual(errors,[]);
 console.log('PASS: real choice buttons compose rainbow and fish, mobile, refresh, stars and independent gallery preview');
}finally{await browser.close();}
