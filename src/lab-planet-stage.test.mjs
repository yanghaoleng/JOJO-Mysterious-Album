import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { LabPlanetStage, LAB_PLANET_SCENES } from './lab-planet-stage.js';
import { WORLD_CATALOG } from '../dev/worlds.js';

// Real geometry, ownership and repeated scene changes without a WebGL mock
// claiming visual coverage. The separate browser QA exercises the real canvas.
const source = readFileSync(new URL('./lab-scenes.js', import.meta.url), 'utf8');
const ids = [...source.matchAll(/\{ id: '([^']+)', group:/g)].map(match => match[1]);
assert.equal(ids.length, 22);
assert.deepEqual(Object.keys(LAB_PLANET_SCENES).sort(), ids.sort());
for (const config of Object.values(LAB_PLANET_SCENES)) assert.ok(WORLD_CATALOG.some(world => world.id === config.worldId));

const stage = Object.create(LabPlanetStage.prototype);
const container = {clientWidth:390,clientHeight:321};
let contextLosses=0, rendererDisposals=0, framesStopped=0;
Object.assign(stage, {
  container, scene:new THREE.Scene(), actors:new Map(), actorFrames:new Map(), borrowed:new Map(),
  style:{apply(){},dispose(){}}, inkSpace:{update(){},dispose(){}},
  setLighting(){}, resetCamera(){}, resizeObserver:{disconnect(){}},
  renderer:{setAnimationLoop(value){assert.equal(value,null);framesStopped++;},dispose(){rendererDisposals++;},forceContextLoss(){contextLosses++;},domElement:{remove(){}}},
});
const originalParent = new THREE.Group(), holder = new THREE.Group();originalParent.add(holder);
holder.position.set(.2,-1.1,.1);holder.rotation.z=.02;holder.scale.setScalar(.8);
const material=new THREE.MeshBasicMaterial({color:'#a0b0c0'}), geometry=new THREE.BoxGeometry(1,2,.1);
holder.add(new THREE.Mesh(geometry,material));
const shadow = new THREE.Sprite(new THREE.SpriteMaterial());holder.add(shadow);holder.userData.softShadow=shadow;
const saved={position:holder.position.toArray(),rotation:holder.quaternion.toArray(),scale:holder.scale.toArray()};
let originalDisposals=0, ownedCreated=0, ownedDisposed=0, updates=0;
for(const resource of [geometry,material,shadow.material])resource.addEventListener('dispose',()=>originalDisposals++);
const rows=[];
for(const id of ids) {
  stage.setLabScene(id,{id:'lab-character',holder,update(){updates++;}});
  assert.equal(stage.worldId,LAB_PLANET_SCENES[id].worldId);
  assert.equal(stage.borrowed.size,1);assert.equal(stage.actors.size,1);
  assert.notEqual(holder.parent,originalParent);assert.equal(shadow.visible,false);
  const resourceSet=new Set();let meshes=0,vertices=0;
  stage.labDecor.group.updateWorldMatrix(true,true);
  stage.labDecor.group.traverse(node=>{
    if(!node.isMesh||node.userData.decorativeInkLine)return;
    meshes++;resourceSet.add(node.geometry);resourceSet.add(node.material);
    for(const key of ['position','normal'])for(const value of node.geometry.attributes[key]?.array||[])assert.ok(Number.isFinite(value));
    vertices+=node.geometry.attributes.position?.count||0;
  });
  for(const resource of resourceSet) {ownedCreated++;let count=0;resource.addEventListener('dispose',()=>{count++;assert.equal(count,1,'decor resource disposed more than once');ownedDisposed++;});}
  stage.actors.get('lab-character').update(1,.016);
  rows.push({id,world:stage.worldId,decorMeshes:meshes,vertices});
  stage.releaseActors();stage.releaseActors();
  assert.equal(holder.parent,originalParent);assert.equal(shadow.visible,true);
  assert.deepEqual(holder.position.toArray(),saved.position);assert.deepEqual(holder.quaternion.toArray(),saved.rotation);assert.deepEqual(holder.scale.toArray(),saved.scale);
  assert.equal(originalDisposals,0);
}
assert.equal(updates,22);
stage.dispose();stage.dispose();
assert.equal(contextLosses,1);assert.equal(rendererDisposals,1);assert.equal(framesStopped,1);
assert.equal(ownedCreated,ownedDisposed);assert.equal(originalDisposals,0);
geometry.dispose();material.dispose();shadow.material.dispose();
console.log(JSON.stringify({pass:true,scenes:rows,ownedCreated,ownedDisposed,contextLosses,originalResourcesPreserved:true},null,2));
