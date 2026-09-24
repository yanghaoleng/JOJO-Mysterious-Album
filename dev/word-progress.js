import { WORD_VOCABULARY } from './content/word-games.js';

// Text recognition is used only to find words, never to grade pronunciation.
const INFLECTIONS = {
  lanterns:'lantern',mooncakes:'mooncake',moons:'moon',
  turtles:'turtle',octopuses:'octopus',jellyfishes:'jellyfish',starfishes:'starfish',tents:'tent',acorns:'acorn',pinecones:'pinecone',hedgehogs:'hedgehog',penguins:'penguin',seals:'seal',walruses:'walrus',igloos:'igloo',
  pushes:'push',pushing:'push',pulls:'pull',pulling:'pull',throws:'throw',throwing:'throw',kicks:'kick',kicking:'kick',hides:'hide',hiding:'hide',
  feet: 'foot', children: 'child', mice: 'mouse', men: 'man', women: 'woman',
  hands: 'hand', heads: 'head', eyes: 'eye', ears: 'ear', noses: 'nose', mouths: 'mouth',
  legs: 'leg', tails: 'tail', bodies: 'body', cars: 'car', balls: 'ball', trains: 'train',
  robots: 'robot', monsters: 'monster', flowers: 'flower', trees: 'tree', bees: 'bee',
  cats: 'cat', hats: 'hat', mats: 'mat', pigs: 'pig', wigs: 'wig', bugs: 'bug', rugs: 'rug',
  frogs: 'frog', ducks: 'duck', birds: 'bird', dogs: 'dog', toys: 'toy', boxes: 'box',
  seeds: 'seed', snails: 'snail', bears: 'bear', bunnies: 'bunny', rabbits: 'rabbit',
  bows: 'bow', capes: 'cape', gardens: 'garden', kites: 'kite', bikes: 'bike',
  jumps: 'jump', jumping: 'jump', runs: 'run', running: 'run', flies: 'fly', flying: 'fly',
  swims: 'swim', swimming: 'swim', grows: 'grow', growing: 'grow', dances: 'dance',
  dancing: 'dance', spins: 'spin', spinning: 'spin', walks: 'walk', walking: 'walk',
  watered: 'water', watering: 'water', stopped: 'stop', stopping: 'stop',
};
const GRAMMAR_WORDS = new Set(['a', 'an', 'the', 'my', 'your', 'his', 'her', 'its', 'is', 'are', 'was', 'were', 'i', 'you', 'it', 'we', 'they', 'and', 'then', 'with', 'in', 'on', 'at', 'to', 'of', 'this', 'that', 'has', 'have', 'can', 'let', 'please']);
const baseOf = (word) => INFLECTIONS[word] || word;

export function tokenizeWordUtterance(text) {
  return String(text || '').toLowerCase().normalize('NFKC').match(/[a-z]+(?:'[a-z]+)?/g) || [];
}

export function createWordProgress(lesson) {
  return { lessonId: lesson?.id || '', heard: [], attempts: 0, lastText: '' };
}

// A small amount of ASR spelling noise can be repaired against the visible prompt.
// Known alternate words remain the child's own idea; this is not a pronunciation score.
export function normalizeWordAttempt(lesson, text, reference=lesson?.example||'') {
  const expected=[...new Set(tokenizeWordUtterance(reference).map(baseOf))].filter(w=>!GRAMMAR_WORDS.has(w));
  const distance=(a,b)=>{let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){const next=[i+1];for(let j=0;j<b.length;j++)next.push(Math.min(next[j]+1,row[j+1]+1,row[j]+Number(a[i]!==b[j])));row=next;}return row[b.length];};
  const corrections=[];
  const normalizedText=String(text).replace(/[a-z]+(?:'[a-z]+)?/gi,original=>{
    const word=original.toLowerCase();
    const soundAlike={bloo:'blue',blu:'blue',yello:'yellow',tu:'two'}[word];
    if(!corrections.length&&soundAlike&&expected.includes(soundAlike)){corrections.push({heard:word,accepted:soundAlike});return soundAlike;}
    if(corrections.length||word.length<3||WORD_VOCABULARY[word]||WORD_VOCABULARY[baseOf(word)]||GRAMMAR_WORDS.has(word))return original;
    const candidates=expected.filter(w=>w[0]===word[0]&&Math.abs(w.length-word.length)<=2).map(w=>({word:w,d:distance(word,w)})).filter(c=>c.d<=((Math.max(word.length,c.word.length)>=6)?2:1)).sort((a,b)=>a.d-b.d);
    if(!candidates.length||(candidates[1]&&candidates[1].d===candidates[0].d))return original;
    const target=candidates[0].word;corrections.push({heard:word,accepted:target});return target;
  });
  return {normalizedText,corrections};
}

/**
 * Pure word coverage, not a pronunciation or grammatical correctness score.
 * Build mode accumulates words across attempts and accepts a whole sentence.
 * Cloze/open modes inspect the current utterance, never require word order.
 * `supported` means recognizable curriculum/extension vocabulary only; the
 * world layer separately confirms whether it could perform a requested effect.
 * A creative response can continue after that confirmation, even if target
 * coverage is incomplete. `complete` by itself must not automatically advance
 * or discard a child's creation.
 */
export function evaluateWordUtterance(lesson, text, previous, {reference=lesson?.example}={}) {
  const {normalizedText,corrections}=normalizeWordAttempt(lesson,text,reference);
  const state = previous && previous.lessonId === lesson?.id ? previous : createWordProgress(lesson);
  const tokens = tokenizeWordUtterance(normalizedText);
  const currentBases = new Set(tokens.map(baseOf));
  const targets = [...new Set(lesson?.targets || [])];
  const targetBases = new Set(targets.map((word) => baseOf(word.toLowerCase())));
  const heard = lesson?.mode === 'build'
    ? [...new Set([...(state.heard || []), ...tokens])]
    : [...new Set(tokens)];
  const heardBases = new Set(heard.map(baseOf));
  const matched = targets.filter((word) => heardBases.has(baseOf(word.toLowerCase())));
  const missing = targets.filter((word) => !heardBases.has(baseOf(word.toLowerCase())));
  const currentMatched = targets.filter((word) => currentBases.has(baseOf(word.toLowerCase())));
  const knownWords = [...new Set(tokens.filter((word) => WORD_VOCABULARY[word] || WORD_VOCABULARY[baseOf(word)]))];
  const contentWords = knownWords.filter((word) => !GRAMMAR_WORDS.has(word));
  const supported = currentMatched.length > 0 || contentWords.length > 0;
  const alternatives = contentWords.filter((word) => !targetBases.has(baseOf(word)));
  const creative = supported && contentWords.length > 0 &&
    (alternatives.length > 0 || (lesson?.mode === 'open' && missing.length > 0));
  const targetComplete = targets.length > 0 && (missing.length === 0 || (matched.some(w=>!GRAMMAR_WORDS.has(w)) && missing.every(w=>['a','an','the'].includes(w))));
  const complete = lesson?.mode === 'open' ? supported && contentWords.length > 0 : targetComplete;
  const canContinue = complete || (supported && creative);
  const coverage = targets.length ? matched.length / targets.length : 0;
  let feedback;
  if (!tokens.length) feedback = '还没听到英文。可以再说一次，或者用文字输入。';
  else if (!supported) feedback = '这句话暂时没有找到熟悉的英文词，可以重说、看看例句，或换个点子。';
  else if (creative && !targetComplete) feedback = '听到你的新点子了！看看场景的变化，喜欢的话可以保留并继续。';
  else if (complete) feedback = lesson?.mode === 'open' ? '这是你的表达！看看它在世界里变成什么样。' : '这句话的词都收集到了！';
  else feedback = `已经收集到 ${matched.length} 个词，接着试试 “${missing[0]}”。`;
  return {
    progress: { lessonId: lesson?.id || '', heard, attempts: (state.attempts || 0) + 1, lastText: String(text || '') },
    normalizedText, corrections, coverage, matched, missing, currentMatched, nextWord: missing[0] || null,
    complete, targetComplete, supported, creative, canContinue,
    knownWords, unknownWords: [...new Set(tokens.filter((word) => !WORD_VOCABULARY[word] && !WORD_VOCABULARY[baseOf(word)]))],
    feedback,
  };
}

// Scoped by the word-game caller: other chapters still accept Chinese.
export function acceptsEnglishUtterance(text) {
  const value=String(text||'').normalize('NFKC').trim();
  return /[a-z]/i.test(value) && !/[^\p{Script=Latin}\p{Number}\p{Punctuation}\p{Separator}\s]/u.test(value);
}


/** Ignore surrounding Chinese while retaining the child's English words. */
export function englishWordContent(raw) {
  const value=String(raw||'').normalize('NFKC').trim();
  if(acceptsEnglishUtterance(value))return value;
  return (value.match(/[a-z]+(?:['’-][a-z]+)*|\b\d+\b/gi)||[]).join(' ');
}

/** Measured speech time, not silent wall time; reminders have a separate cooldown. */
export function createWordLanguageGate({now=()=>performance.now()}={}) {
  let chineseMs=0,lastChineseEnd=-Infinity,lastReminder=-Infinity;
  return {
    reset(){chineseMs=0;lastChineseEnd=-Infinity;},
    accept(raw,{durationMs=0}={}) {
      const text=englishWordContent(raw),time=now();
      if(text){chineseMs=0;lastChineseEnd=-Infinity;return {text,remind:false};}
      if(!/[\u3400-\u9fff]/.test(String(raw)))return {text:'',remind:false};
      const duration=Math.max(0,Math.min(30000,Number(durationMs)||0));
      if(time-duration-lastChineseEnd>8000)chineseMs=0;
      chineseMs+=duration;lastChineseEnd=time;
      const remind=chineseMs>=12000&&time-lastReminder>=45000;
      if(remind){lastReminder=time;chineseMs=0;}
      return {text:'',remind};
    }
  };
}
