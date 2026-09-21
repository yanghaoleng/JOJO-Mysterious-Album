import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.QA_ORIGIN || 'http://127.0.0.1:8156'}/dev/modules/#story%3Amoon`);
 await page.getByLabel('故事标题',{exact:true}).waitFor();
 await page.getByLabel('对白内容',{exact:true}).first().fill('这是保存与恢复的测试对白。');
 await page.getByLabel('向孩子提出的问题').click();
 await page.reload();
 assert.equal(await page.getByLabel('对白内容',{exact:true}).first().inputValue(),'这是保存与恢复的测试对白。');
 const destination=page.locator('label.se-select-field').filter({hasText:'选项 1 的去向'});
 await destination.locator('summary').click();await destination.getByRole('button',{name:'结束故事',exact:true}).click();
 await page.getByRole('button',{name:'＋ 新增场景'}).click();
 await page.getByLabel('场景标题',{exact:true}).fill('测试新场景');await page.getByRole('heading',{name:'场景与去向',exact:true}).click();
 await page.getByRole('button',{name:'＋ 添加对白'}).first().click();
 await page.getByRole('button',{name:'＋ 添加选项'}).click();
 await page.getByRole('button',{name:'＋ 新增事件'}).first().click();
 await page.locator('label.se-select-field').filter({hasText:'世界回应 1'}).getByRole('button',{name:'倾听',exact:true}).click();
 await page.getByRole('button',{name:'发布脚本',exact:true}).click();
 assert.match(await page.locator('.se-status').textContent(),/已发布/);
 await page.locator('.story-editor input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"id":"bad"}')});
 await page.locator('.se-status').filter({hasText:'导入失败'}).waitFor();
 await page.screenshot({path:'/tmp/story-editor-desktop.png',fullPage:true});
 for(const width of [390,768,1440]) {await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);}
 await page.setViewportSize({width:390,height:900});await page.screenshot({path:'/tmp/story-editor-mobile.png',fullPage:true});
 await page.goto(`${process.env.QA_ORIGIN || 'http://127.0.0.1:8156'}/dev/modules/?editor-test=debate#story%3Adebate`);await page.getByLabel('开场对白').waitFor();
 assert.equal(await page.getByText('查看备用六轮对白（只读）',{exact:true}).count(),3);
 await page.goto(`${process.env.QA_ORIGIN || 'http://127.0.0.1:8156'}/dev/modules/#story%3Awow`);await page.getByLabel('故事标题',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('故事标题',{exact:true}).inputValue(),'第一束好奇的光');
 assert.equal(await page.locator('.story-editor button[aria-current]').count(),12);
 assert.deepEqual(errors,[]);
 console.log('PASS: real script editing, draft restoration, branching, adding scenes/dialogue/options/events, export, invalid import, debate content and responsive widths.');
} finally {await browser.close();}
