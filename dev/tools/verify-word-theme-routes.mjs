import assert from 'node:assert/strict';
import {WORD_AGE_BANDS,getChapterLessons,getRecommendedWordChapter} from '../content/word-games.js';
import {WORD_THEME_PLANS,cleanThemeProgress,pickThemeRoute} from '../content/word-theme-routes.js';
import {RLINE_NOUNS} from '../content/rline-nouns.js';
import {WorldRuntime} from '../runtime/world-runtime.js';
import {createIntentGateway} from '../runtime/intent-gateway.js';
import {planWordIntent} from '../word-intent.js';
import {evaluateWordUtterance} from '../word-progress.js';
const ids=new Set(),themes=new Set();
for(const band of WORD_AGE_BANDS){
  assert.equal(band.recommended.length,3);
  for(const id of band.recommended){
    assert.ok(!themes.has(id));themes.add(id);
    const plan=WORD_THEME_PLANS[id];assert.equal(plan.band,band.id);
    for(const noun of plan.words.split(' '))assert.ok(RLINE_NOUNS.some(n=>n.word===noun),`Not in R-line: ${noun}`);
    assert.equal(new Set(plan.routes.map(r=>r[0])).size,3);
    for(let route=0;route<3;route++){
      const runtime=new WorldRuntime();runtime.enter({storyId:'words',sceneId:'routes',world:plan.world,actors:[]});const gateway=createIntentGateway(runtime);
      for(const lesson of getChapterLessons(id,band.minAge,route)){
        assert.ok(!ids.has(lesson.id));ids.add(lesson.id);
        assert.ok(evaluateWordUtterance(lesson,lesson.example).canContinue,lesson.example);
        const result=planWordIntent(lesson.example,{chapter:id,entities:runtime.snapshot.worlds[plan.world]?.entities||{}});
        assert.ok(result.commands.length,lesson.example);
        assert.ok(gateway.apply({version:1,context:runtime.token,commands:result.commands},'player').ok,lesson.example);
        for(const alternative of lesson.alternatives){
          assert.ok(evaluateWordUtterance(lesson,alternative).canContinue,alternative);
          assert.ok(planWordIntent(alternative,{chapter:id}).commands.length,alternative);
        }
      }
      for(const sample of [0,.49,.99])assert.notEqual(pickThemeRoute(plan,route,()=>sample),route);
    }
  }
  for(const sample of [0,.34,.99]){
    const completed=[];let previous=null;
    for(let n=0;n<3;n++){const next=getRecommendedWordChapter(band.minAge,{completed,previous,random:()=>sample});assert.ok(!completed.includes(next.id));completed.push(next.id);previous=next.id;}
    assert.equal(new Set(completed).size,3);
  }
}
assert.equal(themes.size,9);assert.equal(ids.size,162);
assert.deepEqual(cleanThemeProgress({early:{completed:['animals','animals','bad'],routes:{animals:100}}}).early,{completed:['animals'],last:null,routes:{}});
assert.deepEqual(cleanThemeProgress(null),cleanThemeProgress());
console.log('PASS: 9 age-specific themes, 27 routes, 162 executable lessons, source nouns, nonrepeating random selection and safe progress.');
