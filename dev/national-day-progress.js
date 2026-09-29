import { evaluateWordUtterance, tokenizeWordUtterance } from './word-progress.js';
import { findWordObjects } from './word-intent.js';

// Guided lessons collect a complete phrase; later creation needs an actual description.
// The input menu builds one utterance, so the same rule works without a microphone.
export function evaluateNationalDayUtterance(lesson,text,previous,options){
  const result=evaluateWordUtterance(lesson,text,previous,options);
  const tokens=tokenizeWordUtterance(result.normalizedText);
  const nouns=findWordObjects(result.normalizedText);
  const requiredObjects=Math.min(2,findWordObjects(lesson.example).length)||1;
  const completed=lesson.mode==='open'
    ? result.targetComplete||(tokens.length>=lesson.minWords&&nouns.length>=requiredObjects)
    : result.targetComplete;
  return {...result,complete:completed,canContinue:completed,creative:completed&&!result.targetComplete};
}
