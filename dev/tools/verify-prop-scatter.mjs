import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import { createCreationModel } from '../creation-models.js';
import { PROP_CATEGORIES, PROP_IDS } from '../content/props.js';
import { createPlanetSurface } from '../planet.js';
import { scatterCommands, arrangeInView } from '../modules/scatter.js';

for (const id of ['ufo','fighter-jet','spaceship','battleship','toy-bomb','toy-pistol','toy-launcher'])
  assert.ok(PROP_IDS.includes(id), `Missing distinct model: ${id}`);
assert.equal(Object.values(PROP_CATEGORIES).filter(c => c === '食物').length, 150);
for (const id of PROP_IDS) {
  const model = createCreationModel(id);
  const bounds = new THREE.Box3().setFromObject(model.group);
  assert.ok(!bounds.isEmpty() && [...bounds.min, ...bounds.max].every(Number.isFinite), id);
  model.trigger(); model.update(.3); model.dispose();
}
const surface = createPlanetSurface(), world = {...surface, planet:surface};
const prototype = createCreationModel('rocket');
const bounds = new THREE.Box3().setFromObject(prototype.group);
const size = Math.hypot(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x)),Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z))) * .36;
prototype.dispose();
for (let seed=1; seed<=5; seed++) {
  let state=seed;
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const commands=Array.from({length:100},(_,i)=>({type:'entity.spawn',id:'rocket-'+i,asset:'prop:rocket',scale:.36,position:[0,0]}));
  const placed=scatterCommands(commands,{},world,random);
  for (let i=0;i<placed.length;i++) {
    assert.ok(placed[i].position.every(v=>Math.abs(v)<=9));
    for(let j=0;j<i;j++)assert.ok(surface.surfaceNormal(...placed[i].position).distanceTo(surface.surfaceNormal(...placed[j].position))*surface.radius >= 2*size+.08);
  }
  assert.deepEqual(commands[0].position,[0,0], 'Planning must not mutate proposals');
  const existing=Object.fromEntries(placed.map(c=>[c.id,c]));
  const extra=scatterCommands([{...commands[0],id:'extra'}],existing,world,random)[0];
  for(const c of placed)assert.ok(surface.surfaceNormal(...extra.position).distanceTo(surface.surfaceNormal(...c.position))*surface.radius >= 2*size+.08);
}
console.log(`PASS: ${PROP_IDS.length} models, requested distinct types, 100-object batches and avoidance of existing objects across five random seeds.`);
const visibleSurface = createPlanetSurface(6);
for (const yaw of [0, 1.8, -1.8, 3]) {
  const camera = new THREE.OrthographicCamera(-12,12,9,-9,.1,100);
  camera.position.set(Math.sin(yaw)*23,5,Math.cos(yaw)*23);
  camera.lookAt(0,-3,0); camera.updateMatrixWorld();
  const front = camera.getWorldDirection(new THREE.Vector3()).negate();
  const commands = Array.from({length:100},(_,i)=>({type:'entity.spawn',id:`visible-${i}`,asset:'prop:rocket',scale:.2}));
  const placed = scatterCommands(commands,{}, {...visibleSurface,planet:visibleSurface},Math.random,camera);
  for (const c of placed) {
    const normal = visibleSurface.surfaceNormal(...c.position);
    const screen = visibleSurface.center.clone().addScaledVector(normal,6.02).project(camera);
    assert.ok(normal.dot(front)>=.35, 'Must be on the camera-facing surface');
    assert.ok(Math.abs(screen.x)<.9 && Math.abs(screen.y)<.86, 'Must stay within the viewport');
  }
}
console.log('PASS: 100 visible placements from four camera directions');
const camera = new THREE.OrthographicCamera(-2,2,1,-1,.1,100);
const stage = { camera, world:{...visibleSurface,planet:visibleSurface}, zoom:1, yaw:0, pitch:-1,
  target:new THREE.Vector3(0,1,0), panOffset:new THREE.Vector3(15,0,0),
  resize() {
    Object.assign(camera,{left:-2/this.zoom,right:2/this.zoom,top:1/this.zoom,bottom:-1/this.zoom});
    camera.updateProjectionMatrix();
    camera.position.set(Math.sin(this.yaw)*23*Math.cos(this.pitch),Math.sin(this.pitch)*23,Math.cos(this.yaw)*23*Math.cos(this.pitch)).add(this.target);
    camera.lookAt(this.target);camera.position.add(this.panOffset);camera.updateMatrixWorld();
  }
};
stage.resize();
let entities = {};
for(let batch=0;batch<4;batch++) {
  const commands = Array.from({length:100},(_,i)=>({type:'entity.spawn',id:`batch-${batch}-${i}`,asset:'prop:rocket',scale:.36}));
  const arranged = arrangeInView(commands,entities,stage);
  if(batch===0)assert.ok(arranged.reframed,'Panned-away tight camera must automatically reframe');
  for(const c of arranged.commands)entities[c.id]={...c,createdOrder:batch*100+Number(c.id.split('-').at(-1))};
  entities=Object.fromEntries(Object.entries(entities).slice(-300));
  for(const c of arranged.commands){
    const p=visibleSurface.surfacePoint(...c.position).project(camera);
    assert.ok(Math.abs(p.x)<.9 && Math.abs(p.y)<.86);
  }
}
console.log('PASS: automatic framing from a panned-away camera, four consecutive 100-object compact batches, FIFO capacity.');
