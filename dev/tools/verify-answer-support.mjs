import assert from 'node:assert/strict';
import { AnswerSupport, isVagueAnswer } from '../answer-support.js';
import { STORIES } from '../stories.js';
let time = 0, available = true, reveals = 0;
const support = new AnswerSupport({ now: () => time, available: () => available, reveal: () => reveals++ });
const advance = ms => { time += ms; support.tick(); };
support.start(); advance(3900); assert.equal(reveals, 0); advance(100); assert.equal(reveals, 1);
support.start(); support.capture({state:'receiving'}); advance(4000); assert.equal(reveals, 1); advance(3900); assert.equal(reveals, 1); advance(100); assert.equal(reveals, 2);
support.start(); available = false; advance(10000); assert.equal(reveals, 2); available = true; advance(4000); assert.equal(reveals, 3);
support.start(); advance(3000); support.start(); advance(1000); assert.equal(reveals, 3); support.stop(); assert.equal(support.timer, null);
for (const text of ['嗯……', '我想，我想，嗯', '不知道', '我还没想好']) assert.ok(isVagueAnswer(text), text);
for (const text of ['火箭', '红色', '我想造一艘船', '我觉得可以轮流']) assert.ok(!isVagueAnswer(text), text);
for (const story of STORIES.filter(s => ['wow','moon'].includes(s.id))) {
  for (const scene of story.scenes) {
    const open = story.id === 'wow' ? scene.inputMode === 'voice' : scene.freeInput && scene.inputMode !== 'choice';
    if (open) assert.equal(scene.choices.length, 3, scene.id);
    assert.equal(new Set(scene.choices.map(c=>c.label)).size, scene.choices.length, scene.id);
  }
}
console.log('PASS: silence at 4s, speech at 8s, pause/reset/cancel, vague vs short concrete answers, three distinct scene suggestions.');
