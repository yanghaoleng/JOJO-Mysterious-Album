import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import { MID_AUTUMN_PROPS, MID_AUTUMN_CHAPTER_WORDS, MID_AUTUMN_EXTRA_WORDS } from '../content/midautumn-words.js';
import { CREATION_KITS, PROP_CATEGORIES } from '../content/props.js';
import { WORD_VOCABULARY, getChapterLessons } from '../content/word-games.js';
import { WORD_SPEECH_VOCABULARY, planWordIntent } from '../word-intent.js';
import { ASSETS } from '../content/assets.js';
import { createCreationModel } from '../creation-models.js';
import { validateCommand } from '../runtime/contracts.js';

assert.equal(MID_AUTUMN_PROPS.length,10);
assert.ok(MID_AUTUMN_CHAPTER_WORDS.length>=45);
assert.equal(getChapterLessons('midautumn',6).length,6);
for(const word of MID_AUTUMN_CHAPTER_WORDS){assert.ok(WORD_VOCABULARY[word],word);assert.ok(WORD_SPEECH_VOCABULARY.includes(word),word);}
for(const entry of MID_AUTUMN_EXTRA_WORDS)assert.ok(WORD_SPEECH_VOCABULARY.includes(entry.word),entry.word);
const signatures=new Set();
for(const prop of MID_AUTUMN_PROPS){
  assert.equal(PROP_CATEGORIES[prop.model],'中秋节');
  assert.ok(ASSETS[`prop:${prop.model}`]);
  assert.ok(CREATION_KITS.some(kit=>kit.id===prop.model));
  for(const word of [prop.word,...prop.aliases]){
    assert.ok(WORD_SPEECH_VOCABULARY.includes(word),word);
    const spawn=planWordIntent(word,{chapter:'midautumn'}).commands.find(command=>command.type==='entity.spawn'&&command.asset===`prop:${prop.model}`);
    assert.ok(spawn,`Wrong model for ${word}`);
    validateCommand(spawn);
  }
  const model=createCreationModel(prop.model),meshes=[];
  model.group.traverse(node=>{if(node.isMesh)meshes.push(node);});
  assert.ok(meshes.length>=3,prop.model);
  const bounds=new THREE.Box3().setFromObject(model.group);
  assert.ok(!bounds.isEmpty()&&[...bounds.min,...bounds.max].every(Number.isFinite),prop.model);
  signatures.add(JSON.stringify(meshes.map(m=>[m.geometry.type,m.position.toArray(),m.scale.toArray()])));
  model.dispose();
}
assert.equal(signatures.size,MID_AUTUMN_PROPS.length);
const check=(text,type,field,value)=>assert.ok(planWordIntent(text,{chapter:'midautumn'}).commands.some(c=>c.type===type&&c[field]===value),text);
check('Golden moon','entity.color','color','#e7bb68');
check('Bright moon','entity.effect','effect','glow');
check('Wish upon a star','fx.play','effect','stars');
check('Celebrate with fireworks','fx.play','effect','firework');
check('Autumn night','environment.set','preset','night');
assert.ok(planWordIntent('Make the rabbit drink tea',{chapter:'midautumn'}).commands.some(c=>c.type==='feeding.start'));
console.log(`PASS: ${MID_AUTUMN_CHAPTER_WORDS.length} festival words, 10 distinct models, hotwords, 6 lessons and scene effects.`);
