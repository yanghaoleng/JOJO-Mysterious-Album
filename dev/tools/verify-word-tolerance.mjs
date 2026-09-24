import assert from 'node:assert/strict';
import {getChapterLessons,createWordSuggestions} from '../content/word-games.js';
import {evaluateWordUtterance,normalizeWordAttempt} from '../word-progress.js';
const lesson=(text)=>({id:'test',mode:'build',example:text,targets:text.toLowerCase().match(/[a-z]+/g)});
for(const [spoken,expected]of [['hed','head'],['bloo ball','blue ball'],['pengwin','penguin'],['octupus','octopus']]){
 const l=lesson(expected),r=evaluateWordUtterance(l,spoken);assert.equal(r.normalizedText,expected);assert.equal(r.targetComplete,true);
}
assert.equal(normalizeWordAttempt(lesson('blue head'),'bloo hed').corrections.length,1);
assert.equal(normalizeWordAttempt(lesson('head'),'cat').normalizedText,'cat');
assert.equal(evaluateWordUtterance(lesson('blue ball'),'blue').targetComplete,false);
assert.equal(evaluateWordUtterance(lesson('a big head'),'big head').targetComplete,true);
assert.equal(evaluateWordUtterance(lesson('head'),'xyzzy').targetComplete,false);
for(const c of ['monster','color','sports','toys','garden','rhyme','ocean','camp','polar'])for(const age of [3,6,8]){
 const lessons=getChapterLessons(c,age);
 for(const l of lessons.slice(0,2)){const s=createWordSuggestions(l);assert.equal(s.change(),l.example);assert.ok(s.parts.every(p=>!s.canChange(p.index)));}
 const s=createWordSuggestions(lessons[2]);const before=s.text.split(/\s+/),after=s.change().split(/\s+/);assert.equal(before.filter((w,i)=>w!==after[i]).length,1);
}
console.log('PASS conservative ASR repairs, missing articles, meaningful nouns, creative alternatives and two-word unlock in all 27 chapters.');
