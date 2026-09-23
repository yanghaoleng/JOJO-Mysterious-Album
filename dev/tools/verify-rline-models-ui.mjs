import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base=process.env.QA_ORIGIN || 'http://127.0.0.1:8917';
const out=process.env.VERIFY_OUTPUT || '/tmp/jma-rline-models';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1260,height:1600},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/dev/content/rline-nouns.js');
await page.evaluate(async()=>{
 const THREE=await import('/vendor/three.module.js');const {createCreationModel}=await import('/dev/creation-models.js');const {RLINE_MODEL_WORDS}=await import('/dev/content/rline-nouns.js');
 document.body.innerHTML='';document.body.style.cssText='margin:0;padding:20px;background:#f3eee5;font:14px system-ui;color:#33434b;display:grid;grid-template-columns:repeat(6,1fr);gap:8px';
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(190,180);renderer.setClearColor('#f3eee5');
 window.thumbnails=[];
 for(const n of RLINE_MODEL_WORDS){const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#bea484',2.4));const lamp=new THREE.DirectionalLight('#ffffff',2.5);lamp.position.set(3,5,5);scene.add(lamp);const m=createCreationModel(n.assetId.slice(5));scene.add(m.group);const b=new THREE.Box3().setFromObject(m.group),c=b.getCenter(new THREE.Vector3()),size=b.getSize(new THREE.Vector3()),r=Math.max(size.x,size.y,size.z)*.7;const cam=new THREE.OrthographicCamera(-r,r,r,-r,.01,100);cam.position.copy(c).add(new THREE.Vector3(2.6,1.8,4).normalize().multiplyScalar(7));cam.lookAt(c);renderer.render(scene,cam);const gl=renderer.getContext(),pixels=new Uint8Array(190*180*4);gl.readPixels(0,0,190,180,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let visible=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-243)+Math.abs(pixels[i+1]-238)+Math.abs(pixels[i+2]-229)>35)visible++;if(visible<100)throw Error('Blank model render: '+n.word);const im=renderer.domElement.toDataURL();window.thumbnails.push({word:n.word,zh:n.zh,image:im});m.dispose();}
 renderer.dispose();window.done=true;
});
for(let p=0;p<4;p++){await page.evaluate(p=>{document.body.innerHTML=window.thumbnails.slice(p*42,(p+1)*42).map(n=>`<div style="background:#fff8;border-radius:12px;text-align:center;padding:6px"><img src="${n.image}" style="width:190px;height:180px"><div style="font-weight:600">${n.word}</div><div>${n.zh}</div></div>`).join('');},p);await page.screenshot({path:`${out}/sheet-${p+1}.png`,fullPage:true});}
const rendered=await page.evaluate(()=>window.thumbnails.length);await browser.close();assert.equal(errors.length,0,errors.join('\n'));assert.ok(rendered>=155);console.log(`PASS: ${rendered} nonblank WebGL model renders, no browser errors; contact sheets in ${out}`);
