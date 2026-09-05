/** Actual UI acceptance for the independent /dev character simulator. */
import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import * as THREE from '../../vendor/three.module.js';
import { createCharacter } from '../models.js';
const browser='/Users/jojo/.npm-global/bin/agent-browser';
const session='dev-studio-qa';
const base=process.env.DEV_QA_BASE||'http://127.0.0.1:8913/dev/?mode=studio';
const environment=new URL(base).hostname==='127.0.0.1'?'local':'production';
const artifactPrefix=`/tmp/dev-studio-qa-${environment}-${new Date().toISOString().replace(/[:.]/g,'-')}`;
const resultFile=new URL(`./verify-studio-${environment}-results.json`,import.meta.url);
const call=(...args)=>execFileSync(browser,['--session',session,...args],{encoding:'utf8',timeout:25000}).trim();
const evaluate=source=>JSON.parse(call('eval',source));
const getState=()=>evaluate('window.__DEV_STORY__.status');
const click=selector=>call('click',selector);
const capture=name=>call('screenshot',`${artifactPrefix}-${name}.png`);
const rows=[];
let complete=false;
process.on('exit',()=>writeFileSync(resultFile,`${JSON.stringify({base,session,artifactPrefix,checkedAt:new Date().toISOString(),complete,method:'actual agent-browser clicks, keyboard slider, mouse drag, real model download; diagnostics read only',rows},null,2)}\n`));
const record=(event,data)=>{const row={event,...data};rows.push(row);console.log(JSON.stringify(row));};
const settle=()=>evaluate('(async()=>{await new Promise(r=>setTimeout(r,350));return window.__DEV_STORY__.status})()');
function assert(condition,message){if(!condition)throw Error(message);}
function overflow(){return evaluate(`({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,visibleOutliers:Array.from(document.querySelectorAll('button,input,a,canvas')).filter(node=>node.getClientRects().length).map(node=>({tag:node.tagName,id:node.id,label:node.textContent.trim().slice(0,22),left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right})).filter(item=>item.left<-.5||item.right>innerWidth+.5)})`);}

call('set','viewport','1280','900');call('open',base);call('snapshot','-i');
assert(getState().phase==='studio','Simulator did not open');
for(const type of ['dog','rabbit','otter','owl','cat','bear','frog']){
 click(`[data-type="${type}"]`);const state=settle();
 assert(state.studio.type===type&&state.stage.actors.join()==='studio','Wrong character');
 assert(evaluate(`document.querySelector('[data-type="${type}"]').getAttribute('aria-pressed')==='true'`),'Type selection not indicated');
 capture(`type-${type}`);record('character',{type,state});
}
const colors=evaluate(`Array.from(document.querySelectorAll('#color-swatches button')).map(button=>({color:button.dataset.color,label:button.getAttribute('aria-label')}))`);
for(const color of colors){click(`[data-color="${color.color}"]`);const state=settle();assert(state.studio.color===color.color,'Color not applied');record('color',{...color,state:state.studio});}
call('focus','#character-size');call('press','Home');
assert(getState().studio.size===75,'Slider minimum keyboard action failed');record('size-minimum',{state:getState().studio});
call('press','End');assert(getState().studio.size===125,'Slider maximum keyboard action failed');record('size-maximum',{state:getState().studio});capture('size-125');
click('#tab-performance');call('snapshot','-i');
for(const expression of ['happy','curious','sad','surprised']){
 click(`[data-expression="${expression}"]`);const state=settle();assert(state.studio.expression===expression,'Expression not applied');
 capture(`expression-${expression}`);record('expression',{expression,state:state.studio});
}
for(const action of ['idle','wave','hop','listen','talk','walk']){
 click(`[data-action="${action}"]`);const state=settle();assert(state.studio.action===action,'Action not applied');
 capture(`action-${action}`);record('action',{action,state:state.studio});
}
click('#tab-world');call('snapshot','-i');
const worlds=evaluate(`Array.from(document.querySelectorAll('#world-options button')).map(button=>({id:button.dataset.world,label:button.textContent}))`);
assert(worlds.length===11,'Expected eleven scenes');
for(const world of worlds){
 click(`[data-world="${world.id}"]`);const state=settle();assert(state.studio.world===world.id&&state.stage.world===world.id,'Scene not applied');
 capture(`world-${world.id}`);record('world',{...world,stage:state.stage});
}
const beforeCamera=getState().stage.camera;
const rect=evaluate(`(()=>{const r=document.querySelector('#stage canvas').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})()`);
const x=Math.round(rect.x+rect.width*.48),y=Math.round(rect.y+rect.height*.48);
call('mouse','move',String(x),String(y));call('mouse','down');
for(let i=1;i<=5;i++)call('mouse','move',String(x+i*30),String(y+i*5));
call('mouse','up');const rotated=settle().stage.camera;
assert(beforeCamera.some((value,index)=>Math.abs(value-rotated[index])>.2),'Dragging did not orbit camera');capture('camera-turned');
click('#camera-reset');const reset=settle().stage.camera;
record('camera-drag-and-reset',{beforeCamera,rotated,reset});
click('#tab-character');click('[data-type="otter"]');click('[data-color="#90b6c5"]');call('fill','#character-name','巡游小獭');
call('focus','#character-size');call('press','End');for(let i=0;i<8;i++)call('press','ArrowLeft');
click('#tab-performance');click('[data-expression="curious"]');click('[data-action="listen"]');
const selected=getState().studio;click('#save-character');
const stored=evaluate(`JSON.parse(localStorage.getItem('jma.dev.clay.v1.characters')||'[]').find(item=>item.name==='巡游小獭')`);
assert(JSON.stringify(stored)===JSON.stringify(selected),'Saved character differs from UI');
call('reload');call('snapshot','-i');
click('.saved-character');const restored=getState().studio;
assert(JSON.stringify(restored)===JSON.stringify(selected),'Saved character not restored');
record('save-and-reload',{selected,stored,restored});
evaluate('(async()=>{await new Promise(r=>setTimeout(r,500));return true})()');
capture('desktop-restored');const desktopOverflow=overflow();assert(desktopOverflow.document<=1280&&desktopOverflow.body<=1280&&!desktopOverflow.visibleOutliers.length,'Desktop horizontal overflow');
record('desktop-layout',desktopOverflow);
const output=`${artifactPrefix}-export.json`;
call('download','#download-character',output);
const exported=JSON.parse(await readFile(output,'utf8'));
const object=new THREE.ObjectLoader().parse(exported);let meshes=0,triangles=0,bones=0,invalid=0;
object.traverse(node=>{if(node.isMesh){meshes++;triangles+=(node.geometry.index?.count||node.geometry.attributes.position.count)/3;for(const value of node.geometry.attributes.position.array)if(!Number.isFinite(value))invalid++;}if(node.isBone||node.isSkinnedMesh)bones++;});
assert(meshes>10&&triangles>5000&&!bones&&!invalid,'Exported model invalid');
assert(object.userData.recipe?.name===selected.name&&object.userData.recipe?.color===selected.color,'Recipe metadata not preserved by ObjectLoader');
const reference=createCharacter({type:selected.type,color:selected.color});
const sourceMeshes=[],loadedMeshes=[];reference.group.traverse(node=>{if(node.isMesh)sourceMeshes.push(node);});object.traverse(node=>{if(node.isMesh)loadedMeshes.push(node);});
assert(sourceMeshes.length===loadedMeshes.length,'Downloaded model mesh count differs from source');
let checkedValues=0,maxVertexDelta=0;
for(let i=0;i<sourceMeshes.length;i++){
 const source=sourceMeshes[i],loaded=loadedMeshes[i];assert(source.name===loaded.name,'Downloaded mesh order differs from source');
 for(const attribute of ['position','normal','uv']){
  const a=source.geometry.attributes[attribute]?.array,b=loaded.geometry.attributes[attribute]?.array;
  if(!a&&!b)continue;assert(a?.length===b?.length,`Attribute length mismatch: ${source.name}/${attribute}`);
  for(let j=0;j<a.length;j++){maxVertexDelta=Math.max(maxVertexDelta,Math.abs(a[j]-b[j]));checkedValues++;}
 }
 const a=source.geometry.index?.array,b=loaded.geometry.index?.array;
 assert(a?.length===b?.length,`Index length mismatch: ${source.name}`);
 if(a)assert(a.every((value,index)=>value===b[index]),`Index differs: ${source.name}`);
}
reference.dispose();assert(maxVertexDelta<=1e-6,'Downloaded sculpted geometry differs from source');
record('real-download-and-parse',{file:output,bytes:(await stat(output)).size,meshes,triangles,bones,invalid,checkedValues,maxVertexDelta,rootUserData:object.userData,topLevelUserData:exported.userData});
call('set','viewport','390','844');call('reload');call('snapshot','-i');click('.saved-character');
// The preview is sticky on mobile. A user scrolls back to the tabs after
// selecting a saved item at the bottom; don't click through the canvas.
call('scroll','up','1600');settle();
const mobileOverflow=overflow();assert(mobileOverflow.document<=390&&mobileOverflow.body<=390&&!mobileOverflow.visibleOutliers.length,'Mobile horizontal overflow');
capture('mobile-restored');record('mobile-layout',mobileOverflow);
click('#tab-performance');click('[data-action="wave"]');click('[data-expression="happy"]');capture('mobile-performance');
assert(getState().studio.action==='wave'&&getState().studio.expression==='happy','Mobile performance controls failed');
call('scroll','up','1600');click('#tab-world');click('[data-world="moon"]');settle();capture('mobile-moon');assert(getState().stage.world==='moon','Mobile scene control failed');
record('mobile-controls',{state:getState()});
const errors=call('errors');record('page-errors',{errors});assert(!errors.trim(),'Uncaught page errors');
console.log('Studio acceptance passed.');
complete=true;
