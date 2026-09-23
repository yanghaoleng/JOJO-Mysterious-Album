import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import { NPC_CATALOG } from '../../src/story-npcs/catalog.js';
import { createDocumentCharacter } from '../../src/story-npcs/factory.js';
import { createYellowCharacter } from '../yellow-four-models.js';
import { ENCOUNTERS, ENCOUNTER_PLACES, encountersFor } from '../encounter-catalog.js';
import { createWorld } from '../worlds.js';
import { createSurfaceWalker, surfaceDistance } from '../exploration-navigation.js';
import { explorationConfig } from '../exploration-config.js';
import { CREATION_KITS, planCreation } from '../creation-catalog.js';
import { createCreationModel } from '../creation-models.js';
import { MOON_CURIOSITY_STORY } from '../moon-story.js';
import { DEBATE_TOPICS, debateFallback, journeyDebate } from '../curiosity-journey.js';

assert.equal(ENCOUNTERS.length,46);
assert.equal(new Set(ENCOUNTERS.map(n=>n.id)).size,46);
for(const npc of NPC_CATALOG)assert.ok(ENCOUNTERS.some(n=>n.id===npc.id),`Missing ${npc.id}`);
for(const row of ENCOUNTERS){
  assert.equal(row.choices.length,2);assert.ok(row.greeting&&row.occupation);
  const actor=row.yellow?createYellowCharacter(row.id.slice(7),.7):createDocumentCharacter({characterId:row.id,scale:.7});
  for(const action of ['idle','talk','hop','wave']){actor.setAction(action);actor.update(1,.016);}
  const size=new THREE.Box3().setFromObject(actor.group).getSize(new THREE.Vector3());assert.ok(size.y>.5&&size.y<4,`${row.id} scale`);actor.dispose();
}
for(const kit of [...CREATION_KITS,{id:'prototype'}]){
  const model=createCreationModel(kit.id);model.trigger();for(let i=0;i<180;i++)model.update(1/60,i>90);
  const box=new THREE.Box3().setFromObject(model.group);assert.ok([...box.min.toArray(),...box.max.toArray()].every(Number.isFinite));model.dispose();
}
const combined=planCreation('请铃铛妈妈给我造一个蓝色花园和小桥');
assert.deepEqual(combined.parts,['bridge','garden']);assert.equal(combined.helper,'lingdang-mom');assert.equal(combined.primary,'#95becb');
assert.deepEqual(planCreation('让大家一起探索的机器人').parts,['robot']);
assert.equal(planCreation('请袋鼠来试试秋千').helper,'yellow:kangaroo');
assert.deepEqual(planCreation('一棵蓝色的树').parts,['tree']);
assert.deepEqual(planCreation('一艘飞船').parts,['rocket']);
assert.deepEqual(planCreation('会收集梦的棉花糖').parts,['prototype']);
for(const scene of MOON_CURIOSITY_STORY.scenes){assert.ok(scene.creation&&scene.freeInput);assert.equal(scene.choices.length,3);for(const c of scene.choices)assert.notEqual(planCreation(c.label).parts[0],'prototype',c.label);}
const debatePhases=['offer','connect','challenge','experiment'];
for(const topic of DEBATE_TOPICS){
  const result=debateFallback(topic,[{id:'a'},{id:'b'}]);
  assert.equal(result.turns.length,4);
  assert.deepEqual(result.turns.map(turn=>turn.speakerId),['a','b','a','b']);
  assert.deepEqual(result.turns.map(turn=>turn.phase),debatePhases);
  assert.ok(result.turns.every(turn=>turn.text.length>=18&&turn.text.length<=34));
  assert.ok(result.turns.every(turn=>!/我认为|另一方面|我的重点是|综合来看|做出合适的选择/.test(turn.text)));
}
const skyDebate=journeyDebate('为什么天是蓝的？',[{id:'a'},{id:'b'}]);
assert.match(skyDebate.turns.map(turn=>turn.text).join(''),/太阳光.*空气.*蓝光.*红橙光/);
assert.ok(!/先观察|试一小步|小表格/.test(skyDebate.turns.map(turn=>turn.text).join('')));
for(const key of new Set(ENCOUNTERS.map(n=>`${n.storyId}:${n.world}`))){
  const [storyId,worldId]=key.split(':'),world=createWorld(worldId,{radius:10});
  const spots=encountersFor(storyId,worldId).map((row,i)=>({row,normal:world.surfaceNormal(...ENCOUNTER_PLACES[i]),radius:1.15}));
  const obstacles=[...explorationConfig(worldId,storyId).landmarks,[-6.5,1,1.72]].map(([x,z,radius])=>({normal:world.surfaceNormal(x,z),radius}));obstacles.push(...spots);
  for(const spot of spots){const walker=createSurfaceWalker({radius:10,initial:world.surfaceNormal(.5,2.4),obstacles});assert.ok(walker.go(spot.normal),`Unreachable ${key}/${spot.row.id}`);for(let i=0;i<4000&&walker.moving;i++)walker.step(.05);assert.ok(surfaceDistance(walker.normal,spot.normal,10)<2.5,`Cannot greet ${spot.row.id}`);}
  world.dispose();
}
console.log('PASS: 42 profile models + 4 yellow models, 46 authored encounters, 20 functional prop models, compound/name/color matching, six creative scenes and debate continuity.');
