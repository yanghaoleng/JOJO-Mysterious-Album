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
 assert.deepEqual(ledger.snapshot('exited'),{status:'exited',chapter:'花园',voiceAttempts:2,menuAttempts:1,completedLessons:1,totalLessons:2,words:['cat','blue'],durationSeconds:3});
});
test('multiple themes accumulate actual session progress without using older saved words',()=>{
 const ledger=createActivityLedger(()=>0);
 ledger.start({chapterId:'a',title:'A',lessonIds:['one']});ledger.attempt({chapterId:'a',lessonId:'one',targetComplete:true,knownWords:[]});
 ledger.start({chapterId:'b',title:'B',lessonIds:['one']});
 assert.equal(ledger.snapshot('completed').completedLessons,1);assert.equal(ledger.snapshot().totalLessons,2);assert.deepEqual(ledger.snapshot().words,[]);
});
