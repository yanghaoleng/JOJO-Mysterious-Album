/** Independent mesh-triangle regression for standing contact and intentional hops.
 * Run: node dev/tools/verify-grounding.mjs. No renderer, files or backend is changed.
 */
import assert from 'node:assert/strict';
import * as T from '../../vendor/three.module.js';
import {createCharacter,CHARACTER_CATALOG} from '../models.js';
import {createPlanetSurface,createActorGrounding} from '../planet.js';
import {createDocumentCharacter,supportsDocumentCharacter} from '../../src/story-npcs/factory.js';
import {NPC_CATALOG} from '../../src/story-npcs/catalog.js';
import {createWowCharacter} from '../wow-visuals.js';
const factories=[...['gugu','fish','cloud','clock','shadow','star','window'].map(kind=>({id:`wow-${kind}`,make:scale=>createWowCharacter({kind,scale})})),...CHARACTER_CATALOG.map(e=>({id:e.id,make:scale=>createCharacter({type:e.id,scale})})),...NPC_CATALOG.filter(e=>supportsDocumentCharacter(e.id)).map(e=>({id:e.id,make:scale=>createDocumentCharacter({characterId:e.id,scale})}))];
const tri=new T.Triangle(), closest=new T.Vector3();
let minOverall=Infinity,maxGrounded=-Infinity,poses=0,peakJump=0;
function clearance(group,center,radius){
 group.updateWorldMatrix(true,true);let best=Infinity,which='';
 group.traverseVisible(mesh=>{if(!mesh.isMesh||!mesh.geometry?.attributes.position)return;
 const material=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;if(!material?.visible||material.opacity===0)return;
 const p=mesh.geometry.attributes.position, idx=mesh.geometry.index;let vertices=[];
 for(let i=0;i<p.count;i++)vertices.push(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));
 for(let i=0,count=idx?.count??p.count;i<count;i+=3){const a=vertices[idx?idx.getX(i):i],b=vertices[idx?idx.getX(i+1):i+1],c=vertices[idx?idx.getX(i+2):i+2];
 if(Math.min(a.distanceTo(center),b.distanceTo(center),c.distanceTo(center))>radius+.35)continue;
 tri.set(a,b,c).closestPointToPoint(center,closest);let gap=closest.distanceTo(center)-radius;if(gap<best){best=gap;which=mesh.name;}}
 });return{best,which};
}
for (const {id,make} of factories){let report=[];
 for(const scale of [.78,1.3]){
  const a=make(scale),surface=createPlanetSurface(scale===.78?3.5:6),spot={x:-1.45,z:.85};
  a.group.position.copy(surface.surfacePoint(spot.x,spot.z,.045));a.group.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),surface.surfaceNormal(spot.x,spot.z));
  a.group.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),scale===.78?.24:1.8));
  const g=createActorGrounding(a,surface,spot);let time=0,min=Infinity,max=-Infinity,jump=0;
  for(const action of ['idle','talk','wave','listen','walk','hop','idle']){
   a.setAction(action);
   for(let frame=0;frame<90;frame++){
    a.update(time+=1/30,1/30);g.update();
    if(frame<60||frame%10)continue;
    let {best,which}=clearance(a.group,surface.center,surface.radius),lift=g.diagnostics.airborneHeight;
    assert(best>-.002,`${id}/${scale}/${action} penetrates ${best} at ${which}`);
    assert(Math.abs(best-lift)<.003,`${id}/${scale}/${action} loses its intended jump height: ${best} versus ${lift}`);
    if(lift<.00001){assert(best<.003,`${id}/${scale}/${action} floating ${best}`);max=Math.max(max,best);}
    min=Math.min(min,best);jump=Math.max(jump,best);poses++;
   }
  }
  report.push({scale,samples:g.diagnostics.samples,min,max,jump});minOverall=Math.min(minOverall,min);maxGrounded=Math.max(maxGrounded,max);peakJump=Math.max(peakJump,jump);a.dispose();
 }
 console.log(JSON.stringify({id,report}));
}
console.log(JSON.stringify({actors:factories.length,poses,minOverall,maxGrounded,peakJump}));
