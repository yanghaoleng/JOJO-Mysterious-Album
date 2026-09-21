import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.QA_ORIGIN||'http://127.0.0.1:8161';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/dev/modules/#logic:intent',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__MODULE_GALLERY__?.status.runtime);
 async function command(text){await page.locator('#natural-command-input').fill(text);const pending=page.waitForResponse(r=>r.url().endsWith('/api/scene-control'));await page.locator('#natural-command-submit').click();const response=await pending;assert.equal(response.status(),200);const data=await response.json();await page.waitForFunction(()=>!document.querySelector('#natural-command-submit').disabled);assert.ok(!(await page.locator('#natural-command-status').innerText()).includes('失败'));return data;}
 const result=await command('10个猪小弟吃80个汉堡包');assert.equal(result.commands.length,91);
 await page.waitForFunction(()=>window.__MODULE_GALLERY__.status.feeding?.active===10);
 await page.waitForFunction(()=>window.__MODULE_GALLERY__.status.feeding?.consumed>=1,{},{timeout:60000});
 console.log('First hamburger consumed; independent feeding is running.');
 await command('停止吃');assert.equal((await page.evaluate(()=>window.__MODULE_GALLERY__.status.feeding)).active,0);
 await command('猪小弟吃汉堡包');
 console.log('Stop and resume existing eaters/food passed.');
 await page.screenshot({path:'/tmp/jma-feeding-live.png'});
 await page.waitForFunction(()=>window.__MODULE_GALLERY__.status.feeding?.consumed===80,{},{timeout:150000});
 const status=await page.evaluate(()=>window.__MODULE_GALLERY__.status);
 const entities=Object.values(status.runtime.worlds).flatMap(w=>Object.values(w.entities||{}));assert.equal(entities.filter(e=>e.asset==='npc:zhuxiaodi').length,10);assert.equal(entities.filter(e=>e.asset==='prop:burger').length,0);
 await page.waitForFunction(()=>window.__MODULE_GALLERY__.status.feeding.active===0);
 console.log('PASS: 10 pigs consumed exactly 80 hamburgers, then stopped; persisted world contains no hamburgers.');
 await command('把猪小弟变成3倍大小和蓝色');
 const edited=await page.evaluate(()=>Object.values(window.__MODULE_GALLERY__.status.runtime.worlds).flatMap(w=>Object.values(w.entities||{})));
 assert.ok(edited.filter(e=>e.asset==='npc:zhuxiaodi').every(e=>e.scale===1.95&&e.color==='#528ccc'&&e.sizeLocked));
 await command('把猪小弟恢复正常尺寸');
 assert.ok((await page.evaluate(()=>Object.values(window.__MODULE_GALLERY__.status.runtime.worlds).flatMap(w=>Object.values(w.entities||{})))) .filter(e=>e.asset==='npc:zhuxiaodi').every(e=>e.scale===.65));
 await command('来一个超大的紫色钻石');
 const diamond=await page.evaluate(()=>Object.values(window.__MODULE_GALLERY__.status.runtime.worlds).flatMap(w=>Object.values(w.entities||{}))).then(es=>es.find(e=>e.asset==='prop:purple-diamond'));
 assert.equal(diamond.scale,1.625);assert.equal(diamond.sizeLocked,true);
 assert.deepEqual(errors,[]);console.log('PASS: existing models resize/recolor, normal size restores, explicit large spawn survives layout.');
}finally{await browser.close();}
