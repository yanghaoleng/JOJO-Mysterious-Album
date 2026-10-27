import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import {createCreationModel} from '../creation-models.js';
// The cab/base seam is visible from both sides and must not share exterior planes.
for(const kind of ['train','rword-train']){
 const model=createCreationModel(kind),cab=model.group.getObjectByName('train-cab'),base=model.group.getObjectByName('train-chassis');
 assert.ok(cab&&base);model.trigger();
 for(let frame=0;frame<60;frame++){
  model.update(1/30);model.group.updateMatrixWorld(true);
  const a=new THREE.Box3().setFromObject(cab),b=new THREE.Box3().setFromObject(base);
  assert.ok(Math.abs(a.min.y-b.max.y)<1e-6,'Cab is seated on the chassis rather than overlapping its walls');
  assert.ok(a.min.z>b.min.z+.04&&a.max.z<b.max.z-.04,'Cab side faces are inset on both sides');
 }
 let released=0;model.group.traverse(mesh=>mesh.geometry?.addEventListener('dispose',()=>released++));model.dispose();assert.ok(released>0);
}
// Adjacent vehicle recipes must not contain differently colored, overlapping box faces.
for(const kind of ['car','bus','truck','train','rword-train','rword-car','collection-18-0','collection-83-0']){
 const model=createCreationModel(kind),boxes=[];model.group.updateMatrixWorld(true);
 model.group.traverse(mesh=>{if(mesh.geometry?.type==='BoxGeometry'&&[mesh.rotation.x,mesh.rotation.y,mesh.rotation.z].every(v=>Math.abs(v)<1e-6))boxes.push({mesh,box:new THREE.Box3().setFromObject(mesh)});});
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const a=boxes[i],b=boxes[j];if(a.mesh.material===b.mesh.material)continue;
  for(const axis of ['x','y','z'])for(const side of ['min','max'])if(Math.abs(a.box[side][axis]-b.box[side][axis])<1e-6){
   const overlap=['x','y','z'].filter(v=>v!==axis).every(v=>Math.min(a.box.max[v],b.box.max[v])-Math.max(a.box.min[v],b.box.min[v])>.02);
   assert.equal(overlap,false,`${kind}: overlapping ${axis} exterior planes`);
  }
 }
 model.dispose();
}
console.log('PASS train and R-line alias seam through 60 animated frames, model disposal and eight vehicle surface audits');
