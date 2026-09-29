import { evaluateWordUtterance, tokenizeWordUtterance } from './word-progress.js';
import { findWordObjects } from './word-intent.js';

// Guided lessons collect a complete phrase; later creation needs an actual description.
// The input menu builds one utterance, so the same rule works without a microphone.
export function evaluateNationalDayUtterance(lesson,text,previous,options){
  const result=evaluateWordUtterance(lesson,text,previous,options);
  const tokens=tokenizeWordUtterance(result.normalizedText);
  const nouns=findWordObjects(result.normalizedText);
  const requiredObjects=Math.min(2,findWordObjects(lesson.example).length)||1;
  // National Day is a long 96-question vocabulary journey. One recognized
  // curriculum word is enough to move on; a full phrase remains recorded as
  // complete coverage for the learning dashboard.
  const helperWords=new Set(['a','an','the','i','we','my','our','is','are','and','in','on','at','with','to','of','can','have']);
  const matchedTarget=result.currentMatched.find(word=>!helperWords.has(word.toLowerCase()));
  const customNoun=lesson.allowSwaps&&nouns[0]?.item.word;
  const spokeTargetOnce=Boolean(matchedTarget||customNoun);
  const completed=spokeTargetOnce||(lesson.mode==='open'&&tokens.length>=lesson.minWords&&nouns.length>=requiredObjects);
  const feedback=spokeTargetOnce&&!result.targetComplete
    ? `听到了 “${matchedTarget||customNoun}”，可以继续啦！`
    : result.feedback;
  return {...result,complete:completed,canContinue:completed,creative:false,singleWordPass:spokeTargetOnce&&!result.targetComplete,feedback};
}
