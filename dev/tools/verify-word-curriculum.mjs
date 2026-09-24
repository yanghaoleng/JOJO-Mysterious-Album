import assert from 'node:assert/strict';
import { WORD_AGE_BANDS, WORD_CHAPTERS, getAgeBand, getChapterLessons } from '../content/word-games.js';
import { createWordProgress, evaluateWordUtterance, tokenizeWordUtterance, acceptsEnglishUtterance } from '../word-progress.js';
import { WORLD_CATALOG } from '../content/worlds.js';

assert.equal(WORD_CHAPTERS.length, 9);
assert.equal(WORD_AGE_BANDS.length, 3);
const ids = new Set();
const chapterIds = new Set(WORD_CHAPTERS.map((chapter) => chapter.id));
for (const age of [3, 4, 5, 6, 7, 8, 9, 10]) {
  const band = getAgeBand(age);
  assert.ok(band && age >= band.minAge && age <= band.maxAge);
  assert.equal(new Set(band.recommended).size, 5);
  assert.ok(band.recommended.every((id) => chapterIds.has(id)));
}
for (const age of [-1, 2, 11, 5.5, null, undefined, '', 'abc']) assert.equal(getAgeBand(age), null);
assert.deepEqual(getChapterLessons('missing', 4), []);
assert.deepEqual(getChapterLessons('monster', 100), []);

for (const chapter of WORD_CHAPTERS) {
  assert.ok(WORLD_CATALOG.some((world) => world.id === chapter.world));
  assert.ok(chapter.words.length >= 6 && chapter.knowledge.length > 0);
  for (const band of WORD_AGE_BANDS) {
    const lessons = getChapterLessons(chapter.id, band.minAge);
    assert.equal(lessons.length, 6);
    assert.deepEqual(lessons.map((lesson) => lesson.mode), ['build', 'build', 'build', 'build', 'build', 'open']);
    assert.deepEqual(lessons.slice(0,5).map(l=>tokenizeWordUtterance(l.example).length),[1,1,2,2,3]);
    assert.ok(lessons[0].chineseGuide.includes('英文怎么说'));
    assert.ok(lessons[1].chineseGuide.includes('不同'));
    assert.ok(lessons[2].chineseGuide.includes('彩色虚线'));
    assert.deepEqual(lessons.map(l=>l.allowSwaps),[false,false,true,true,true,true]);
    assert.equal(new Set(lessons.map((lesson) => lesson.example)).size, 6);
    for (const [index, lesson] of lessons.entries()) {
      assert.ok(!ids.has(lesson.id), `Duplicate stable lesson ID: ${lesson.id}`);
      ids.add(lesson.id);
      assert.equal(lesson.stage, index + 1);
      assert.ok(lesson.prompt && lesson.example && lesson.targets.length && lesson.words.length && lesson.knowledge.length);
      assert.ok(lesson.words.every((word) => word.word && word.meaning));
      const exampleTokens = tokenizeWordUtterance(lesson.example);
      assert.ok(lesson.targets.every((word) => exampleTokens.includes(word)), `Target absent from example: ${lesson.id}`);
      assert.equal(evaluateWordUtterance(lesson, lesson.example).targetComplete, true, `Full example not accepted: ${lesson.id}`);
      assert.equal(evaluateWordUtterance(lesson, [...exampleTokens].reverse().join(' ')).targetComplete, true, `Word order must not gate progress: ${lesson.id}`);
      if (lesson.mode === 'build') {
        assert.deepEqual(lesson.buildWords, exampleTokens);
        assert.deepEqual(lesson.targets, [...new Set(exampleTokens)]);
        let progress = createWordProgress(lesson);
        let result;
        for (const word of lesson.buildWords) {
          const before = structuredClone(progress);
          result = evaluateWordUtterance(lesson, word, progress);
          assert.deepEqual(progress, before, 'Evaluator must not mutate stored progress');
          progress = result.progress;
        }
        assert.equal(result.complete, true, `Word-by-word cannot finish: ${lesson.id}`);
        assert.equal(result.coverage, 1);
      } else if (lesson.mode === 'cloze') {
        const count = (lesson.displayText.match(/____/g) || []).length;
        assert.equal(count, lesson.stage === 2 ? 1 : 2, `Wrong number of blanks: ${lesson.id}`);
        assert.equal(lesson.blankWords.length, count);
      } else {
        assert.ok(lesson.alternatives.length >= 2, `Open play needs optional examples: ${lesson.id}`);
        for (const text of lesson.alternatives) {
          assert.ok(evaluateWordUtterance(lesson, text).canContinue, `Creative example rejected: ${text}`);
        }
      }
      const empty = evaluateWordUtterance(lesson, '');
      assert.equal(empty.supported, false);
      assert.equal(empty.complete, false);
      const unknown = evaluateWordUtterance(lesson, 'zqxvv');
      assert.equal(unknown.supported, false);
      assert.equal(unknown.canContinue, false);
      assert.equal('score' in unknown, false, 'ASR coverage must not become a pronunciation score');
      const creative = evaluateWordUtterance(lesson, 'Make a purple poop grow.');
      assert.equal(creative.canContinue, true, `Creative substitution is blocked: ${lesson.id}`);
    }
  }
}
assert.equal(ids.size, 162);
const build = getChapterLessons('monster', 3)[0];
const other = getChapterLessons('color', 3)[0];
const oldProgress = evaluateWordUtterance(build, build.example).progress;
assert.equal(evaluateWordUtterance(other, 'red', oldProgress).coverage, 0, 'Progress must not leak between lesson IDs');
const hands = getChapterLessons('monster', 3)[2];
assert.equal(evaluateWordUtterance(hands, 'two hand').targetComplete, true, 'Inflections should not hard-fail a child');
const rhyme = getChapterLessons('rhyme', 8);
assert.equal(tokenizeWordUtterance(rhyme[4].example).length,3);
assert.ok(!JSON.stringify(WORD_CHAPTERS).includes('pan / ham'), 'Do not claim pan and ham rhyme');
console.log(`Word curriculum verified: ${ids.size} lessons, 3 age bands, 9 chapters; full-word accumulation, gradual noun/quantity/color/size progression, creative alternatives and independent progress passed.`);

for(const text of ['大大的头','a 大 head','让 flower grow','机器人','123','こんにちは'])assert.equal(acceptsEnglishUtterance(text),false,text);
for(const text of ['A big head.','Grow, flower!','two hands','a sleepy robot'])assert.equal(acceptsEnglishUtterance(text),true,text);
