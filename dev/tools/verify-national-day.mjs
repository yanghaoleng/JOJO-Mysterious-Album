import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import { NATIONAL_DAY_STOPS, NATIONAL_DAY_PROPS, NATIONAL_DAY_WORDS, nationalDayLessons } from '../content/national-day-words.js';
import { getChapterLessons, WORD_VOCABULARY } from '../content/word-games.js';
import { planWordIntent, WORD_SPEECH_VOCABULARY } from '../word-intent.js';
import { evaluateNationalDayUtterance } from '../national-day-progress.js';
import { WorldRuntime } from '../runtime/world-runtime.js';
import { createCreationModel } from '../creation-models.js';
const lessons=nationalDayLessons();
assert.equal(NATIONAL_DAY_STOPS.length,12);assert.equal(lessons.length,96);assert.equal(new Set(lessons.map(l=>l.id)).size,96);
assert.equal(getChapterLessons('midautumn',6).length,6);
for(const age of [3,6,10])assert.equal(getChapterLessons('national-day',age).length,96);
for(const word of NATIONAL_DAY_WORDS){assert.ok(WORD_VOCABULARY[word],word);assert.ok(WORD_SPEECH_VOCABULARY.includes(word),word);}
for(const prop of NATIONAL_DAY_PROPS){
 const model=createCreationModel(prop.model);assert.ok(!new THREE.Box3().setFromObject(model.group).isEmpty());let disposed=0;model.group.traverse(o=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>disposed++);});model.update(.2);model.dispose();assert.ok(disposed>0);
 assert.ok(planWordIntent(prop.word,{chapter:'national-day'}).commands.some(c=>c.asset===`prop:${prop.model}`),prop.word);
}
for(const lesson of lessons){
 const result=evaluateNationalDayUtterance(lesson,lesson.example);assert.ok(result.complete,lesson.id);
 if(lesson.mode==='open')assert.equal(evaluateNationalDayUtterance(lesson,'panda').complete,false,lesson.id);
 const plan=planWordIntent(lesson.example,{chapter:'national-day'});
 assert.ok(plan.commands.length,`No scene response: ${lesson.id}`);
 const runtime=new WorldRuntime();runtime.enter({storyId:'national-day',sceneId:lesson.id,world:'meadow'});
 const applied=runtime.dispatch(plan.commands);assert.ok(applied.ok,`${lesson.id}: ${applied.error}`);
}
assert.ok(evaluateNationalDayUtterance(lessons.find(l=>l.id==='national-day-create-garden'),'Make three red flowers grow.').complete);
const withoutPunctuation=planWordIntent('I have an apple make the panda eat an apple',{chapter:'national-day'});
const storyRuntime=new WorldRuntime();storyRuntime.enter({storyId:'national-day',sceneId:'unpunctuated',world:'meadow'});assert.ok(storyRuntime.dispatch(withoutPunctuation.commands).ok);
console.log(`PASS: 12 stops, 96 stable lessons, ${NATIONAL_DAY_WORDS.length} words, all example commands, model lifecycle and gradual response requirements.`);
