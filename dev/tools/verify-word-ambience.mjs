import assert from 'node:assert/strict';
import {createWordAmbience} from '../word-ambience.js';
import {planWordIntent,WORD_SPEECH_VOCABULARY} from '../word-intent.js';
import {WorldRuntime} from '../runtime/world-runtime.js';
import {createCreationModel} from '../creation-models.js';
for(const [word,preset]of [['sunny','clear'],['rainy','rain'],['snowy','snow'],['rain','rain'],['snow','snow']]){const plan=planWordIntent(word);assert.ok(plan.commands.some(c=>c.type==='weather.set'&&c.preset===preset));assert.ok(plan.matched.includes(word));assert.ok(WORD_SPEECH_VOCABULARY.includes(word));}
for(const kind of ['duck','rword-duck','rword-bird','rword-hen']){const m=createCreationModel(kind),w=[];m.group.traverse(n=>{if(n.name.startsWith('wing-'))w.push(n);});assert.equal(w.length,2);m.setState('idle');m.update(.2,false,false);assert.ok(w.some(n=>Math.abs(n.rotation.x)+Math.abs(n.rotation.z)>.1));m.update(.2,true,false);assert.ok(w.every(n=>n.rotation.x===0&&n.rotation.z===0));m.dispose();}
for(const choice of [0,.3,.6,.9]){
 let clock=0,commands=[],blocked=[],allowed=true,mode=choice;const runtime=new WorldRuntime();runtime.enter({storyId:'test',sceneId:'test',world:'meadow',actors:[]});
 runtime.dispatch([{type:'entity.spawn',id:'a',asset:'npc:domi',position:[0,0]},{type:'entity.spawn',id:'b',asset:'prop:rword-duck',position:[1,0]},{type:'entity.spawn',id:'food',asset:'prop:rword-cake',position:[2,0]},{type:'entity.spawn',id:'demo-bird',asset:'prop:rword-bird',position:[-1,0]}]);
 const a=createWordAmbience({entities:()=>runtime.snapshot.worlds.meadow.entities,occupied:()=>blocked,now:()=>clock,random:()=>mode,canAct:()=>allowed,send:c=>{commands.push(...c);const r=runtime.dispatch(c);assert.ok(r.ok,r.error);return r;}});
 clock=16000;a.tick();assert.ok(a.status.active.length);assert.ok(!a.status.active.includes('demo-bird'));const expected=['entity.animate','group.patrol','feeding.start','group.stack'][Math.floor(choice*4)];assert.ok(commands.some(c=>c.type===expected),expected);
 a.before([{type:'entity.event',id:'a',action:'swim'}]);assert.deepEqual(a.status.active,[]);assert.ok(commands.some(c=>c.type==='entity.move'));
 blocked=['a','b'];clock+=30000;a.tick();assert.deepEqual(a.status.active,[]);
 a.observe([{type:'weather.set',preset:'snow'}]);const count=commands.length;clock+=60000;a.tick();assert.equal(commands.length,count,'manual weather protected');
 a.dispose();clock+=100000;a.tick();assert.equal(commands.length,count);
}
const runtime=new WorldRuntime();runtime.enter({storyId:'test',sceneId:'test',world:'meadow',actors:[]});assert.equal(runtime.dispatch([{type:'group.patrol',targets:['a'],speed:999}]).ok,false);
console.log('PASS weather phrases/hotwords, four flapping models/reduced motion, finite autonomous actions, command preemption, occupied/demo exclusion, manual weather hold, cleanup and patrol bounds');
