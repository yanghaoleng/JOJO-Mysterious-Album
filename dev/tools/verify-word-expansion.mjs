import assert from 'node:assert/strict';
import { WORD_CHAPTERS, WORD_VOCABULARY, getAgeBand, getRecommendedWordChapter, createWordSuggestions } from '../content/word-games.js';
import { RLINE_EXTENSIONS } from '../content/rline-nouns.js';
import { planWordIntent, findWordObjects, WORD_SPEECH_VOCABULARY } from '../word-intent.js';
import { evaluateWordUtterance } from '../word-progress.js';
import { WorldRuntime } from '../runtime/world-runtime.js';
import { createIntentGateway } from '../runtime/intent-gateway.js';
const themes=WORD_CHAPTERS.filter(c=>['ocean','camp','polar'].includes(c.id));
const nouns=RLINE_EXTENSIONS.filter(n=>n.word!=='poop');
assert.equal(nouns.length,12);
for(const n of nouns){
 assert.equal(WORD_VOCABULARY[n.word].inSource,false);assert.deepEqual(n.sourceLines,[]);
 for(const word of [n.word,...n.aliases]){
  assert.equal(findWordObjects(word)[0]?.item.assetId,n.assetId,word);
  assert.ok(WORD_SPEECH_VOCABULARY.includes(word),`Missing ASR hotword: ${word}`);
  const lesson=themes.flatMap(c=>Object.values(c.lessons).flat()).find(l=>l.example.toLowerCase().includes(n.word))||themes[0].lessons.early[0];
  assert.ok(evaluateWordUtterance(lesson,word).supported,word);
 }
}
let examples=0;
for(const c of themes)for(const lessons of Object.values(c.lessons))for(const lesson of lessons){
 assert.ok(lesson.words.every(w=>w.meaning!=='表达辅助词'),lesson.id);
 for(const text of [lesson.example,...lesson.alternatives]){
  const r=new WorldRuntime();r.enter({storyId:'words',sceneId:lesson.id,world:c.world,actors:[]});
  const plan=planWordIntent(text,{chapter:c.id});assert.ok(plan.matched.length,text);
  const result=createIntentGateway(r).apply({version:1,context:r.token,commands:plan.commands},'player');assert.ok(result.ok,`${text}: ${result.error}`);
  assert.ok(evaluateWordUtterance(lesson,text).canContinue,text);examples++;
 }
 const suggestions=createWordSuggestions(lesson);
 suggestions.accept(lesson.example,{nouns:findWordObjects(lesson.example).map(h=>h.alias.toLowerCase())});
 assert.equal(suggestions.parts.filter(p=>/[a-z]/i.test(p.text)&&!p.matched).length,0,`Unmatched full example: ${lesson.id}`);
}
for(const age of [3,4,5,6,7,8,9,10]){
 const ids=[];let previous=null;
 for(let n=0;n<5;n++){const next=getRecommendedWordChapter(age,{previous});ids.push(next.id);previous=next.id;}
 assert.equal(new Set(ids).size,5);assert.deepEqual(new Set(ids),new Set(getAgeBand(age).recommended));
 assert.equal(getRecommendedWordChapter(age,{previous}).id,ids[0]);
}
for(const [text,noun,count] of [['two little walruses','walrus',2],['three starfish','starfish',3],['two jellyfish','jellyfish',2]]){
 const spawns=planWordIntent(text).commands.filter(c=>c.type==='entity.spawn');assert.equal(spawns.length,count);assert.ok(spawns.every(c=>c.asset===`prop:rword-${noun}`));
}
console.log(`PASS: ${examples} new main/alternative expressions execute, 12 noun models and plural hotwords, confirmed captions, five-theme recommendation cycle per age.`);

for(const text of ['Two blue jellyfish.','Three little starfish.']){const s=createWordSuggestions({mode:'open',example:text});const index=s.parts.find(p=>/^(jellyfish|starfish)$/.test(p.text)).index;s.change(index);assert.match(s.text,/turtles|octopuses|jellyfish|starfish|fishes|tents|acorns|pinecones|hedgehogs|penguins|seals|walruses|igloos|hands|feet|eyes|ears|flowers|robots|balls|boxes|cars|ducks|birds/);}
