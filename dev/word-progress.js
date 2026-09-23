import { WORD_VOCABULARY } from './content/word-games.js';

// Text recognition is used only to find words, never to grade pronunciation.
const INFLECTIONS = {
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
export function evaluateWordUtterance(lesson, text, previous) {
  const state = previous?.lessonId === lesson?.id ? previous : createWordProgress(lesson);
  const tokens = tokenizeWordUtterance(text);
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
  const targetComplete = targets.length > 0 && missing.length === 0;
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
    coverage, matched, missing, currentMatched, nextWord: missing[0] || null,
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
