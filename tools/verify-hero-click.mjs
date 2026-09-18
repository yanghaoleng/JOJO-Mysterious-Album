import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const base=process.argv[2]||'http://localhost:8153';
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],checks=[];
const status=p=>p.evaluate(()=>document.getElementById('landing-world').__heroScene.status);
async function locate(p,kind,element){
  return p.evaluate(({kind,element})=>{
    const scene=document.getElementById('landing-world').__heroScene,canvas=document.querySelector('#landing-world canvas');
    if(element){
      const target=scene.skyTargets.find(t=>t.element===element);
      return target&&document.elementFromPoint(target.x,target.y)===canvas&&scene.hitAt(target.x,target.y)?.element===element?target:null;
    }
    for(let y=80;y<innerHeight-10;y+=8)for(let x=10;x<innerWidth-10;x+=8){
      if(document.elementFromPoint(x,y)!==canvas)continue;
      const hit=scene.hitAt(x,y);
      if(hit?.kind===kind&&(!element||hit.element===element)&&[[3,0],[-3,0],[0,3],[0,-3]].every(([dx,dy])=>scene.hitAt(x+dx,y+dy)?.element===hit.element))return {x,y,element:hit.element};
    }
    return null;
  },{kind,element});
}
try{
  for(const mobile of [false,true]){
    const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:950},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
    p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/analytics/**',r=>r.fulfill({status:204}));
    await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForSelector('#landing-world[data-ready]');await p.waitForTimeout(200);
    for(const kind of ['actor','scenery','planet','sky']){
      const point=await locate(p,kind);assert.ok(point,`${mobile?'mobile':'desktop'} visible ${kind}`);
      const before=await status(p);
      if(mobile)await p.touchscreen.tap(point.x,point.y);else await p.mouse.click(point.x,point.y);
      await p.waitForTimeout(80);const after=await status(p);
      for(const key of ['actor','scenery','planet'])assert.equal(after[key],before[key]+Number(key===kind),`${kind} changes only itself`);
      assert.equal(after.sky.changes,before.sky.changes+Number(kind==='sky'));
    }
    const point=await locate(p,'planet'),before=await status(p);
    if(mobile){
      const session=await p.context().newCDPSession(p);
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y}]});
      for(let i=1;i<=6;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x,y:point.y-i*25}]});
      await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(200);
      assert.ok(await p.locator('#mode-gate').evaluate(e=>e.scrollTop>30),'touch swipe scrolls');
    }else{
      await p.mouse.move(point.x,point.y);await p.mouse.down();await p.mouse.move(point.x+35,point.y-30,{steps:5});await p.mouse.up();
      await p.mouse.wheel(0,300);await p.waitForTimeout(200);assert.ok(await p.locator('#mode-gate').evaluate(e=>e.scrollTop>30),'wheel scrolls');
    }
    assert.equal((await status(p)).planet,before.planet,'drag must not switch');
    await p.locator('#mode-gate').evaluate(e=>e.scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(150);
    const canvas=p.locator('#landing-world canvas');await canvas.focus();const keyBefore=await status(p);
    await p.keyboard.press('Enter');await p.keyboard.press('ArrowRight');await p.keyboard.press('Space');await p.keyboard.press('ArrowRight');await p.keyboard.press('Enter');await p.keyboard.press('ArrowRight');await p.keyboard.press('Enter');
    const keyAfter=await status(p);for(const key of ['actor','scenery','planet'])assert.equal(keyAfter[key],keyBefore[key]+1);
    assert.equal(keyAfter.sky.changes,keyBefore.sky.changes+1);
    const cta=await p.locator('.hero-copy .landing-primary').boundingBox();assert.ok(await p.evaluate(({x,y})=>document.elementFromPoint(x,y).closest('a')?.classList.contains('landing-primary'),{x:cta.x+cta.width/2,y:cta.y+cta.height/2}));
    await p.screenshot({path:`/tmp/jma-click-${mobile?'mobile':'desktop'}.png`});
    checks.push(`${mobile?'mobile touch':'desktop mouse'}: independent picking, reduced-motion manual changes, scroll without accidental switching, keyboard, CTA`);await p.close();
  }
  const p=await browser.newPage({viewport:{width:1440,height:950}});p.on('pageerror',e=>errors.push(e.message));await p.goto(base,{waitUntil:'domcontentloaded',timeout:60000});await p.waitForSelector('#landing-world[data-ready]');await p.waitForFunction(()=>document.getElementById('landing-world').__heroScene.status.time>3.4,null,{timeout:30000});
  for(const element of ['star-0','satellite','ufo']){
    const point=await locate(p,'sky',element);assert.ok(point,element);const before=await status(p);await p.mouse.click(point.x,point.y);assert.equal((await status(p)).sky.changes,before.sky.changes+1);
  }
  const point=await locate(p,'actor');const before=await status(p);await p.mouse.click(point.x,point.y);await p.mouse.click(point.x,point.y);assert.equal((await status(p)).actor,before.actor+1,'rapid clicks do not interrupt transition');
  await p.waitForTimeout(700);assert.ok(Math.abs((await status(p)).actorScale-.78)<.001,'clicked actor settles');
  const after=await status(p);await p.waitForFunction(index=>document.getElementById('landing-world').__heroScene.status.actor>index,after.actor,{timeout:20000});
  checks.push('individual stars, satellite and moving UFO switch; rapid clicks settle; automatic schedule resumes');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({base,checks,errors,status:'passed'},null,2));
}finally{await browser.close();}
