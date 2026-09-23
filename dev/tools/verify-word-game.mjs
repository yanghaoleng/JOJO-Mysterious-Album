import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import { WorldRuntime } from '../runtime/world-runtime.js';
import { createIntentGateway } from '../runtime/intent-gateway.js';
import { planWordIntent } from '../word-intent.js';
import { WORD_CHAPTERS, getChapterLessons } from '../content/word-games.js';
import { createWordEffects } from '../presentation/word-effects.js';
import { planCreation } from '../creation-catalog.js';

const legacyCreation=planCreation('请铃铛造一个蓝色花园和小桥');
assert.deepEqual(legacyCreation.parts,['bridge','garden']);
assert.equal(legacyCreation.helper,'lingdang');

function session(chapter='color'){
  const runtime=new WorldRuntime();runtime.enter({storyId:'words',sceneId:'test',world:'meadow',actors:[]});
  const gateway=createIntentGateway(runtime);
  const entities=()=>runtime.snapshot.worlds.meadow?.entities||{};
  const run=text=>{const plan=planWordIntent(text,{chapter,entities:entities()});assert.ok(plan.commands.length,text);const result=gateway.apply({version:1,context:runtime.token,commands:plan.commands},'player');assert.ok(result.ok,`${text}: ${result.error}`);return entities();};
  return {runtime,gateway,entities,run};
}
let lessons=0;
for(const chapter of WORD_CHAPTERS)for(const age of [3,6,8]){
  const s=session(chapter.id);if(chapter.id==='monster')s.run('body');
  for(const lesson of getChapterLessons(chapter.id,age)){s.run(lesson.example);lessons++;}
  const restored=new WorldRuntime({saved:s.runtime.snapshot});assert.deepEqual(restored.snapshot,s.runtime.snapshot,`${chapter.id}: save round trip`);
}
{
  const s=session();let e=s.run('two blue cats');assert.equal(Object.keys(e).length,2);assert.ok(Object.values(e).every(e=>e.color==='#6eabd0'));
  e=s.run('one red cat');assert.equal(Object.keys(e).length,1);assert.equal(Object.values(e)[0].color,'#de7066');
  e=s.run('Let the bee fly near a tree.');assert.equal(e['wg-bee-0'].effects.motion,'fly');assert.equal(e['wg-tree-0'].effects?.motion,undefined);
  e=s.run('Put the cat with a hat on the mat.');assert.deepEqual(e['wg-hat-0'].attachment,{target:'wg-cat-0',slot:'hair'});assert.deepEqual(e['wg-cat-0'].attachment,{target:'wg-mat-0',slot:'on'});
  const before=s.runtime.snapshot;const invalid=s.gateway.apply({version:1,context:s.runtime.token,commands:[{type:'entity.attach',id:'wg-mat-0',target:'wg-hat-0',slot:'on'}]});assert.equal(invalid.ok,false);assert.deepEqual(s.runtime.snapshot,before);
  e=s.run('Water the flower.');assert.equal(e['wg-flower-0'].effects.shape,'grow');assert.equal(e['wg-flower-0'].effects.surface,'wet');
  e=s.run('让大便生长');assert.equal(e['wg-poop-0'].effects.shape,'grow');
  e=s.run('Make the tiny robot grow and dance.');assert.equal(e['wg-robot-0'].effects.shape,'grow');assert.equal(e['wg-robot-0'].effects.gesture,'dance');
  e=s.run('Let the sleepy dog walk slowly.');assert.equal(e['wg-dog-0'].effects.emotion,'sleepy');assert.equal(e['wg-dog-0'].effects.motion,'walk');assert.equal(e['wg-dog-0'].effects.speed,'slow');
  e=s.run('Make the dog run and then stop.');assert.equal(e['wg-dog-0'].effects.motion,'run-stop');
}
{
  const s=session('monster');s.run('body');let e=s.run('Make a happy monster with two big feet.');
  assert.equal(Object.values(e).filter(e=>e.asset==='prop:robot-body').length,1);assert.equal(Object.values(e).filter(e=>e.asset==='prop:robot-foot').length,2);assert.equal(Object.values(e).filter(e=>e.asset==='prop:rword-feet').length,0);
  e=s.run('Give the monster a red hat.');assert.equal(e['wg-body-0'].colorOverride,false);assert.equal(e['wg-hat-0'].color,'#de7066');
  e=s.run('A robot head.');assert.equal(e['wg-head-0'].asset,'prop:robot-head');assert.equal(e['wg-head-0'].attachment.target,'wg-body-0');
  e=s.run('Make three eyes.');assert.equal(Object.values(e).filter(e=>e.asset==='prop:rword-eye').length,3);
}
{
  const effects=createWordEffects(),anchor=new THREE.Group(),group=new THREE.Group();group.scale.setScalar(.7);anchor.add(group);
  const item={model:{group},anchor,scale:.7,modelTop:1};const entries=new Map([['a',item]]);
  effects.sync(item,{effects:{shape:'grow',motion:'fly',gesture:'spin',surface:'wet',emotion:'happy'}});
  for(let i=0;i<120;i++)effects.update(entries,1/60,i/60,false);
  assert.ok(item.effectRoot.scale.y>1.75);assert.ok(item.effectRoot.position.y>1.2);assert.ok(item.effectRoot.rotation.y>1);assert.equal(item.waterDrops.visible,true);assert.ok(item.emotionBadge);
  effects.sync(item,{effects:{shape:'shrink',motion:'stop',surface:'dry'}});for(let i=0;i<120;i++)effects.update(entries,1/60,i/60,true);
  assert.equal(item.effectRoot.scale.y,.5);assert.equal(item.effectRoot.position.y,0);assert.equal(item.waterDrops.visible,false);
  effects.dispose();
}
console.log(`PASS: ${lessons} curriculum examples execute; quantities, precise modifiers, attachments/cycle prevention, robot assembly, growth/flight/spin/wet/dry, sequential stop, save/restore and reduced motion.`);
