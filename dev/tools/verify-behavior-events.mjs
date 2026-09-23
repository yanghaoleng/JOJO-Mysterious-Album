import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import { BEHAVIOR_ACTIONS, BEHAVIOR_EFFECTS } from '../content/behavior-events.js';
import { planBehaviorIntent } from '../word-intent.js';
import { WorldRuntime } from '../runtime/world-runtime.js';
import { createIntentGateway } from '../runtime/intent-gateway.js';
import { createCreationModel } from '../creation-models.js';
import { createWordEffects } from '../presentation/word-effects.js';
import { createBehaviorController } from '../presentation/behavior-controller.js';
for(const def of [...BEHAVIOR_ACTIONS,...BEHAVIOR_EFFECTS]){
  const runtime=new WorldRuntime();runtime.enter({storyId:'test',sceneId:'test',world:'meadow',actors:[]});
  const plan=planBehaviorIntent(def.example);assert.ok(plan?.commands.length,def.example);
  const result=createIntentGateway(runtime).apply({version:1,context:runtime.token,commands:plan.commands});assert.ok(result.ok,`${def.id}: ${result.error}`);
  assert.ok(plan.commands.some(c=>c.type==='entity.event'||c.type==='entity.effect'||(def.id==='same'&&c.type==='entity.color')),def.id);
}
const stage={scene:new THREE.Scene()},entries=new Map(),effects=createWordEffects();
function add(id,asset='prop:rword-cat'){
 const model=createCreationModel(asset.slice(5)),anchor=new THREE.Group();anchor.add(model.group);stage.scene.add(anchor);
 const item={id,asset,model,anchor,scale:.7,modelTop:1.2,entrance:2};entries.set(id,item);effects.sync(item,{id,effects:{}});return item;
}
const cat=add('cat');const dispatches=[];const controller=createBehaviorController({entries,stage,dispatch:c=>{dispatches.push(c);return {ok:true};}});
for(const action of BEHAVIOR_ACTIONS){
 controller.start({id:'cat',action:action.id,duration:2});assert.equal(controller.stats.active,1,action.id);
 for(let i=0;i<60;i++){effects.update(entries,1/60,i/60,false);controller.update(1/60,i/60,false);}
 stage.scene.updateMatrixWorld(true);stage.scene.traverse(n=>{assert.ok(n.matrixWorld.elements.every(Number.isFinite),action.id);});
 for(let i=0;i<90;i++){effects.update(entries,1/60,i/60,false);controller.update(1/60,i/60,false);}
 assert.equal(controller.stats.active,0,action.id);assert.ok(entries.has('cat'));assert.equal(stage.scene.children.length,1,`${action.id}: leaked temporary root`);
}
const pool=add('pool','prop:swimming-pool');controller.start({id:'cat',action:'swim'});assert.equal(controller.stats.jobs[0].target,'pool');assert.equal(controller.stats.temporaryModels,0);controller.stop('cat');assert.ok(entries.has('pool'));
const demoCat=add('demo-cat');controller.start({id:'demo-cat',action:'swim'});assert.equal(controller.stats.jobs[0].target,null);assert.equal(controller.stats.temporaryModels,1);controller.stop();entries.delete('demo-cat');effects.remove(demoCat);demoCat.model.dispose();demoCat.anchor.removeFromParent();
controller.start({id:'cat',action:'sail'});assert.equal(controller.stats.temporaryModels,1);controller.stop();assert.equal(controller.stats.active,0);
controller.start({id:'cat',action:'swim'});entries.delete('pool');controller.update(.1,1,false);assert.equal(controller.stats.active,0);pool.model.dispose();pool.anchor.removeFromParent();
for(const [state,kind]of [[{symbol:'hum'},'note'],[{motion:'sleep'},'z'],[{emotion:'sleepy'},'z']]){
 effects.sync(cat,{id:'cat',effects:state});effects.update(entries,.1,2,true);assert.equal(cat.wordSymbolKind,kind);assert.equal(cat.wordSymbols.length,3);assert.equal(cat.effectRoot.rotation.z,0);
}
effects.sync(cat,{id:'cat',effects:{motion:'stop'}});assert.equal(cat.wordSymbols.length,0);
const runtime=new WorldRuntime();runtime.enter({storyId:'test',sceneId:'test',world:'meadow',actors:[]});
const invalid=runtime.dispatch([{type:'entity.spawn',id:'x',asset:'prop:rword-cat',position:[0,0]},{type:'entity.event',id:'x',action:'swim',target:'missing'}]);assert.equal(invalid.ok,false);assert.equal(Object.keys(runtime.snapshot.worlds.meadow?.entities||{}).length,0);
controller.dispose();effects.dispose();cat.model.dispose();
console.log(`PASS: ${BEHAVIOR_ACTIONS.length} finite events + ${BEHAVIOR_EFFECTS.length} states, all documented examples, valid geometry, temporary-prop reuse/cleanup, stop/removal, note/Z symbols and atomic validation.`);
