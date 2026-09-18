// Real browser checks for the immersive landing and the 3D debate state machine.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const base=process.argv[2]||'http://localhost:8149',out=process.env.VERIFY_OUTPUT||'/tmp/jma-immersive-check';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],failures=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
await page.route('**/api/analytics/**',r=>r.fulfill({status:204}));
const report={base,widths:[],links:[],hero:[],debate:[]};
try{
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForSelector('#landing-world[data-ready]');
  assert.equal(await page.locator('.landing-page [role=tab],.landing-nav nav,.nav-start').count(),0);
  assert.equal(await page.locator('.landing-brand').innerText(),'萌萌星的奇妙图鉴');
  assert.equal(await page.locator('#chapters .chapter-card').count(),3);
  assert.equal(await page.locator('#journeys .section-heading p').count(),1);
  for(const n of [0,1,2]){await page.waitForFunction(n=>document.getElementById('landing-world').dataset.scene===String(n),n,{timeout:15000});await page.waitForTimeout(1000);await page.screenshot({path:`${out}/hero-${n}.png`});report.hero.push(n);}
  const card=page.locator('.chapter-card').first();await card.scrollIntoViewIfNeeded();await card.hover();await page.waitForTimeout(400);assert.equal(await card.locator('.chapter-reveal').evaluate(e=>getComputedStyle(e).opacity),'1');
  for(const id of ['candy','moon','question']){await page.locator(`[data-journey="${id}"]`).click();await page.waitForSelector('#landing-dialog[open]');await page.keyboard.press('Escape');}
  const hrefs=await page.locator('.landing-page a').evaluateAll(list=>[...new Set(list.map(a=>a.href))]);
  for(const href of hrefs){if(new URL(href).origin!==new URL(base).origin)continue;const r=await page.request.get(href);assert.equal(r.status(),200,href);report.links.push(href);}
  for(const width of [320,390,768,1024,1440]){
    await page.setViewportSize({width,height:width<768?844:900});await page.evaluate(()=>document.getElementById('mode-gate').scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`${out}/home-${width}.png`});
    assert.ok(await page.locator('#mode-gate').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`overflow ${width}`);
    for(const section of ['chapters','journeys','making']){await page.locator(`#${section}`).scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${section}-${width}.png`});}
    await page.locator('.landing-footer').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/footer-${width}.png`});report.widths.push(width);
  }
  await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode().catch(()=>{});}));});
  assert.deepEqual(await page.locator('.landing-page img').evaluateAll(imgs=>imgs.filter(i=>!i.naturalWidth).map(i=>i.src)),[]);
  const avatar=await page.request.get(`${base}/assets/landing/child-avatars.webp`);assert.equal(avatar.status(),200);
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mobile.route('**/api/analytics/**',r=>r.fulfill({status:204}));await mobile.goto(base,{waitUntil:'domcontentloaded'});const mobileCard=mobile.locator('.chapter-card').nth(1);await mobileCard.tap();assert.equal(await mobileCard.evaluate(e=>e.classList.contains('is-expanded')),true);await mobileCard.tap();await mobile.waitForURL('**/dev/debate');await mobile.waitForSelector('#debate-world[data-ready]');await mobile.screenshot({path:`${out}/debate-mobile.png`});await mobile.close();
  const debate=await browser.newPage({viewport:{width:1440,height:900}});const debateErrors=[];debate.on('pageerror',e=>debateErrors.push(e.message));await debate.route('**/api/analytics/**',r=>r.fulfill({status:204}));
  // Deterministic audio + response fixtures isolate playback, cancellation and UI transitions.
  const wav=Buffer.alloc(44+16000*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
  await debate.route('**/api/tts',r=>r.fulfill({status:200,contentType:'audio/wav',body:wav}));
  const result={allowed:true,topic:'星球上可以只种棒棒糖吗？',turns:Array.from({length:6},(_,i)=>({speakerId:i%2?'snow-rabbit':'book-owl',phase:['opening','response','closing'][Math.floor(i/2)],text:['我喜欢甜甜的棒棒糖。','也有朋友更喜欢苹果。','可以给苹果留一块地方。','还可以听听其他朋友的想法。','每种愿望都值得被听见。','我们一起设计这个星球吧。'][i]})),closingQuestion:'你的星球上想种些什么？',commonGround:'大家都希望朋友能快乐地生活。'};
  let mode='normal';await debate.route('**/api/debate',async r=>{const data=r.request().postDataJSON();assert.deepEqual(data.speakers.map(s=>s.id),['book-owl','snow-rabbit']);if(mode==='delayed')await new Promise(resolve=>setTimeout(resolve,1000));await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mode==='blocked'?{allowed:false,safeMessage:'请换一个不含个人信息的问题。'}:result)}).catch(()=>{});});
  await debate.goto(`${base}/dev/debate`,{waitUntil:'domcontentloaded'});await debate.waitForSelector('#debate-world[data-ready]');assert.equal(await debate.evaluate(()=>window.__DEBATE_3D__.status.characters),2);
  async function submit(text){await debate.locator('#write-answer').click();await debate.locator('#answer-input').fill(text);await debate.locator('#send-answer').click();}
  await submit('星球上可以只种棒棒糖吗？');await debate.waitForFunction(()=>document.body.dataset.phase==='discussing');await debate.locator('#toggle-play').click();assert.equal(await debate.evaluate(()=>window.__DEBATE_3D__.status.paused),true);await debate.locator('#next-turn').click();assert.equal(await debate.evaluate(()=>window.__DEBATE_3D__.status.index),1);await debate.locator('#toggle-play').click();await debate.waitForFunction(()=>document.body.dataset.phase==='reflection');await submit('我要种苹果和棒棒糖，分给大家。');await debate.waitForFunction(()=>document.body.dataset.phase==='ending');report.debate.push('six alternating turns, pause, next, resume, reflection, ending');await debate.locator('#restart').click();assert.equal(await debate.evaluate(()=>window.__DEBATE_3D__.status.phase),'ready');
  mode='blocked';await submit('测试安全拒绝');await debate.waitForFunction(()=>document.body.dataset.phase==='topic');assert.match(await debate.locator('#status').innerText(),/个人信息/);report.debate.push('safe rejection');
  await debate.locator('#restart').click();mode='delayed';await submit('测试重开');await debate.waitForFunction(()=>document.body.dataset.phase==='thinking');await debate.locator('#restart').click();await debate.waitForTimeout(1300);assert.equal(await debate.evaluate(()=>window.__DEBATE_3D__.status.phase),'ready');report.debate.push('restart cancels pending request');
  await debate.addInitScript(()=>{navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('denied','NotAllowedError'));});await debate.reload({waitUntil:'domcontentloaded'});await debate.locator('#mic-button').click();await debate.waitForFunction(()=>document.getElementById('status').textContent.includes('权限'));assert.equal(await debate.locator('#write-answer').isVisible(),true);report.debate.push('denied microphone retains text input');assert.deepEqual(debateErrors,[]);await debate.close();
  const fallback=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await fallback.addInitScript(()=>{const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:native.call(this,type,...args);};});await fallback.goto(base,{waitUntil:'domcontentloaded'});await fallback.locator('#landing-world img').evaluate(img=>img.decode());assert.equal(await fallback.locator('#landing-world img').evaluate(e=>getComputedStyle(e).visibility),'visible');await fallback.close();
  report.errors=errors;report.status='passed';await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
