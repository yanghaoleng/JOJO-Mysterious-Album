import assert from 'node:assert/strict';
import { MID_AUTUMN_PROPS } from '../content/midautumn-words.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.QA_ORIGIN||'http://127.0.0.1:8920';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
  await page.goto(base+'/dev/modules/');
  await page.locator('#filters [data-choice="prop"]').click();
  await page.locator('#prop-categories button',{hasText:'中秋节'}).click();
  assert.equal(await page.locator('#module-list [data-module^="prop:festival-"]').count(),MID_AUTUMN_PROPS.length+3);
  await page.evaluate(async()=>{
    const THREE=await import('/vendor/three.module.js');
    const {createCreationModel}=await import('/dev/creation-models.js');
    const {MID_AUTUMN_PROPS}=await import('/dev/content/midautumn-words.js');
    document.body.innerHTML='';
    document.body.style.cssText='margin:0;padding:18px;background:#182845;font:16px system-ui;color:#fff1d5;display:grid;grid-template-columns:repeat(5,1fr);gap:12px';
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(220,210);renderer.setClearColor('#182845');
    window.festivalRenders=[];
    for(const prop of [{model:'festival-moon',word:'moon',zh:'圆月'},...MID_AUTUMN_PROPS]){
      const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#708bb6',2.4));
      const lamp=new THREE.DirectionalLight('#ffffff',2.5);lamp.position.set(3,5,5);scene.add(lamp);
      const model=createCreationModel(prop.model);scene.add(model.group);
      const bounds=new THREE.Box3().setFromObject(model.group),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),r=Math.max(size.x,size.y,size.z)*.72;
      const camera=new THREE.OrthographicCamera(-r,r,r,-r,.01,100);camera.position.copy(center).add(new THREE.Vector3(2.6,1.8,4).normalize().multiplyScalar(7));camera.lookAt(center);
      renderer.render(scene,camera);
      const pixels=new Uint8Array(220*210*4),gl=renderer.getContext();gl.readPixels(0,0,220,210,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let visible=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-24)+Math.abs(pixels[i+1]-40)+Math.abs(pixels[i+2]-69)>35)visible++;
      if(visible<100)throw Error('Blank '+prop.word);
      window.festivalRenders.push({word:prop.word,zh:prop.zh,image:renderer.domElement.toDataURL()});model.dispose();
    }
    renderer.dispose();
    document.body.innerHTML=window.festivalRenders.map(prop=>`<div style="background:#243b5a;border-radius:12px;text-align:center;padding:8px"><img src="${prop.image}" width="220" height="210"><div><b>${prop.word}</b> · ${prop.zh}</div></div>`).join('');
  });
  await page.screenshot({path:'/tmp/jma-midautumn-models.png',fullPage:true});
  assert.equal(await page.evaluate(()=>window.festivalRenders.length),MID_AUTUMN_PROPS.length+1);
  assert.deepEqual(errors,[]);
  console.log('PASS: eleven nonblank festival WebGL models and gallery category.');
}finally{await browser.close();}
