import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivityLedger } from './activity-bridge.js';
test('counts real voice separately from menu, and never duplicates a passed lesson', () => {
 let now=0;const ledger=createActivityLedger(()=>now);
 ledger.start({chapterId:'garden',title:'花园',lessonIds:['one','two']});
 ledger.attempt({chapterId:'garden',lessonId:'one',fromMenu:false,targetComplete:false,knownWords:['cat']});
 ledger.attempt({chapterId:'garden',lessonId:'one',fromMenu:false,targetComplete:true,knownWords:['cat','blue']});
 ledger.attempt({chapterId:'garden',lessonId:'one',fromMenu:true,targetComplete:true,knownWords:[]});
 now=3500;
 assert.deepEqual(ledger.snapshot('exited'),{status:'exited',chapter:'花园',voiceAttempts:2,menuAttempts:1,completedLessons:1,totalLessons:2,words:['cat','blue'],wordGroupsVersion:1,independentWords:[],guidedWords:[],durationSeconds:3});
});
test('multiple themes accumulate actual session progress without using older saved words',()=>{
 const ledger=createActivityLedger(()=>0);
 ledger.start({chapterId:'a',title:'A',lessonIds:['one']});ledger.attempt({chapterId:'a',lessonId:'one',targetComplete:true,knownWords:[]});
 ledger.start({chapterId:'b',title:'B',lessonIds:['one']});
 assert.equal(ledger.snapshot('completed').completedLessons,1);assert.equal(ledger.snapshot().totalLessons,2);assert.deepEqual(ledger.snapshot().words,[]);
});

test('classifies each spoken word against that round default, keeping autonomous use across later guidance', () => {
 const ledger=createActivityLedger(()=>0);ledger.start({chapterId:'a',title:'A',lessonIds:['one','two']});
 ledger.attempt({chapterId:'a',lessonId:'one',fromMenu:false,spokenText:'A blue cat and dragon',defaultPrompt:'A red cat',knownWords:['blue','cat']});
 ledger.attempt({chapterId:'a',lessonId:'two',fromMenu:false,spokenText:'blue cat',defaultPrompt:'blue cat'});
 ledger.attempt({chapterId:'a',lessonId:'two',fromMenu:true,spokenText:'robot',defaultPrompt:'blue cat',knownWords:['robot']});
 const report=ledger.snapshot();assert.deepEqual(report.independentWords,['blue','and','dragon']);assert.deepEqual(report.guidedWords,['a','cat']);assert.ok(report.words.includes('robot'));assert.ok(!report.independentWords.includes('robot'));
});
test('a previously guided word becomes independent when spoken outside a later default', () => {
 const ledger=createActivityLedger(()=>0);
 ledger.attempt({spokenText:'CAT',defaultPrompt:'Cat.'});ledger.attempt({spokenText:'cat',defaultPrompt:'dog'});
 assert.deepEqual(ledger.snapshot().guidedWords,[]);assert.deepEqual(ledger.snapshot().independentWords,['cat']);
});
