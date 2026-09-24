import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const b=await chromium.launch({channel:'chrome',headless:true});
try{
 const p=await b.newPage({viewport:{width:1280,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/api/scene-control',r=>r.fulfill({status:503,body:'unexpected backend call'}));
 await p.goto((process.env.QA_ORIGIN||'http://127.0.0.1:8919')+'/dev/modules/');await p.waitForFunction(()=>window.__MODULE_GALLERY__?.status);
 const state=()=>p.evaluate(()=>window.__MODULE_GALLERY__.status),say=async text=>{await p.locator('#natural-command-input').fill(text);await p.locator('#natural-command-submit').click();await p.waitForFunction(()=>!document.querySelector('#natural-command-submit').disabled);assert.match(await p.locator('#natural-command-status').textContent(),/已执行/);};
 for(const word of ['push','pull','throw','kick','hide','cold','hungry','thirsty','dirty'])assert.ok(await p.locator('#behavior-events tr').filter({hasText:new RegExp('\\b'+word+'\\b')}).count()>0,word+' documented');
 for(const action of ['push','pull','throw','kick']){
  await say(`Make the robot ${action} the ball.`);const initial=(await state()).runtime.worlds.meadow.entities;const ball=Object.values(initial).find(e=>e.asset==='prop:rword-ball');assert.ok(ball);
  await p.waitForFunction(a=>window.__MODULE_GALLERY__.status.behaviors.jobs.some(j=>j.action===a&&j.progress>.3),action);
  if(action==='throw'){await p.locator('#preview-stage').scrollIntoViewIfNeeded();await p.screenshot({path:'/tmp/jma-new-throw.png'});}
  await p.waitForFunction(()=>window.__MODULE_GALLERY__.status.behaviors.active===0,{}, {timeout:15000});const after=(await state()).runtime.worlds.meadow.entities[ball.id];assert.ok(Math.hypot(...after.position.map((x,i)=>x-ball.position[i]))>.2,action+' landed at new location');
 }
 await say('Make the turtle hide.');assert.equal((await state()).behaviors.temporaryModels,1);await say('Stop the turtle.');assert.equal((await state()).behaviors.active,0);
 for(const symbol of ['cold','hungry','thirsty']){await say(`A ${symbol} turtle.`);assert.ok(Object.values((await state()).runtime.worlds.meadow.entities).some(e=>e.effects?.symbol===symbol));}
 await say('A dirty tent.');assert.ok(Object.values((await state()).runtime.worlds.meadow.entities).some(e=>e.asset==='prop:rword-tent'&&e.effects?.dirt));
 await p.locator('#preview-stage').scrollIntoViewIfNeeded();await p.waitForTimeout(1500);await p.screenshot({path:'/tmp/jma-new-states.png'});
 await say('Clean the tent.');await p.waitForFunction(()=>window.__MODULE_GALLERY__.status.behaviors.active===0,{}, {timeout:15000});assert.ok(Object.values((await state()).runtime.worlds.meadow.entities).filter(e=>e.asset==='prop:rword-tent').every(e=>!e.effects?.dirt));
 assert.deepEqual(errors,[]);console.log('PASS all nine additions in event table, visible actions, persistent landing positions, temporary hiding prop, cold/hungry/thirsty states and dirt removal.');
}finally{await b.close();}
