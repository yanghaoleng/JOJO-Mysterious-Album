import assert from 'node:assert/strict';
import {planWordIntent} from '../word-intent.js';

const lanterns=planWordIntent('Two lanterns.',{chapter:'midautumn'}).commands.filter(c=>c.type==='entity.spawn');
assert.equal(lanterns.length,2);
assert.ok(lanterns.every(c=>c.asset==='prop:festival-lantern'));
const rabbit={id:'festival-rabbit',asset:'prop:rword-rabbit',position:[-2.3,.7],scale:.72};
const feast=planWordIntent('Make the rabbit eat a mooncake.',{chapter:'midautumn',entities:{[rabbit.id]:rabbit}}).commands;
assert.ok(feast.some(c=>c.type==='entity.spawn'&&c.asset==='prop:festival-mooncake'));
assert.ok(feast.some(c=>c.type==='feeding.start'&&c.eaters.includes(rabbit.id)));

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:8920';
const path=process.env.MID_AUTUMN_PATH||'/midautumn.html';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try{
  for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
    const context=await browser.newContext({viewport,reducedMotion:'reduce',permissions:['microphone']});
    const page=await context.newPage(),errors=[],readings=[];let socket;
    page.on('pageerror',error=>errors.push(error.message));
    await page.routeWebSocket('**/api/word-realtime',ws=>{
      socket=ws;
      ws.onMessage(raw=>{
        if(typeof raw!=='string')return;
        const data=JSON.parse(raw);
        if(data.type==='start')ws.send(JSON.stringify({type:'ready'}));
        if(data.type==='say'){
          readings.push(data);
          ws.send(JSON.stringify({type:'event',event:350,data:{text:data.text}}));
          ws.send(Buffer.alloc(4800));
          ws.send(JSON.stringify({type:'event',event:359,data:{}}));
        }
      });
    });
    await page.goto(origin+path);
    await page.waitForFunction(()=>window.__WORD_GAME__?.status.view==='play');
    const status=()=>page.evaluate(()=>window.__WORD_GAME__.status);
    assert.equal((await status()).chapter,'midautumn');
    assert.equal((await status()).lessonIndex,0);
    assert.equal((await status()).webglFailed,false);
    assert.equal(await page.locator('.age-stepper,#change-age:visible').count(),0);
    assert.match(await page.locator('#lesson-sentence').innerText(),/^moon$/i);
    assert.ok((await status()).entities['festival-rabbit']);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.locator('#listen-example').click();
    await page.waitForFunction(()=>window.__WORD_GAME__.status.recording);
    assert.ok(readings.some(r=>r.wordPrompt&&r.text.includes('月亮的英文怎么说')));
    for(const [event,data] of [[450,{}],[451,{results:[{text:'moon'}]}],[459,{}]])socket.send(JSON.stringify({type:'event',event,data}));
    await page.waitForFunction(()=>window.__WORD_GAME__.status.canAdvance&&Object.values(window.__WORD_GAME__.status.entities).some(e=>e.asset==='prop:festival-moon'));
    assert.equal((await status()).chapter,'midautumn');
    assert.ok(await page.locator('#next-lesson').isVisible());
    await page.locator('#next-lesson').click();
    await page.waitForFunction(()=>window.__WORD_GAME__.status.lessonIndex===1);
    assert.match(await page.locator('#lesson-sentence').innerText(),/^mooncake$/i);
    await page.locator('#word-options-toggle').click();
    for(const word of ['osmanthus','pomelo','tea','teapot','moonlight','firework','gift','fan','wish','reunion'])
      assert.equal(await page.locator(`#word-options [data-word="${word}"]`).count(),1,word);
    await page.locator('#word-options [data-word="pomelo"]').click();
    await page.waitForFunction(()=>Object.values(window.__WORD_GAME__.status.entities).some(entity=>entity.asset==='prop:festival-pomelo'));
    assert.deepEqual(errors,[]);
    console.log(`PASS Mid-Autumn ${viewport.width}px: direct night scene, child voice, festival word menu and new model`);
    await context.close();
  }
}finally{await browser.close();}
