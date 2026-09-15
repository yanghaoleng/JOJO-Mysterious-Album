import assert from 'node:assert/strict';
import { STORIES } from '../stories.js';
import { moonRequest, sceneRequest } from '../story-api.js';
import { localResult } from '../../src/wow-local-turn.js';
import { execFileSync } from 'node:child_process';

const sceneIds = new Set(['orchard-bush', 'warm-bakery', 'creaky-bridge', 'two-houses', 'doudou-home']);
const moonIds = new Set(['moon-hill', 'moon-underwater', 'moon-pocket', 'moon-clouds', 'moon-landing']);
let sceneCount = 0, inventionCount = 0;
const wowPayloads = [];
for (const story of STORIES) for (const scene of story.scenes) {
  if (story.id === 'wow') {
    for (const choice of scene.choices) {
      const payload = { chapter: scene.chapter, kind: scene.wow.kind, answer: choice.label, prompt: scene.question, momo: scene.wow.momo };
      const local = localResult(payload);
      assert.equal(local.accepted, true, `${scene.id}: suggested reply was rejected`);
      assert.ok(local.reaction && local.visual?.shape && local.visual?.color);
      wowPayloads.push(payload);
    }
  } else if (scene.freeInput) {
    if (scene.final) continue;
    const request = moonRequest(scene, [], '装一个会发光的导航屏');
    assert.ok(moonIds.has(request.sceneId));
    assert.match(request.destination, /[\u4e00-\u9fff]/);
    assert.equal(request.sceneName, scene.title);
    assert.equal(request.constraint, scene.inventionResult);
    inventionCount++;
  } else {
    const request = sceneRequest(scene, '我想先陪着它');
    assert.ok(sceneIds.has(request.sceneId));
    assert.ok(request.question.includes(scene.title));
    assert.ok(request.question.includes(scene.question));
    assert.deepEqual(request.choices.map(choice => choice.id), scene.choices.map(choice => choice.id));
    assert.ok(request.choices.length >= 2);
    sceneCount++;
  }
}
assert.equal(sceneCount, 12);
assert.equal(inventionCount, 5);
assert.equal(wowPayloads.length, 82);
// Compare with the actual backend validator/fallback without calling the AI or network.
const backendResults = JSON.parse(execFileSync('python3', ['-c', 'import json,sys; from wow_director import validate_payload,local_result; print(json.dumps([local_result(validate_payload(p)) for p in json.load(sys.stdin)]))'], {
  cwd: new URL('../../', import.meta.url), input: JSON.stringify(wowPayloads), encoding: 'utf8',
}));
backendResults.forEach((result, index) => assert.deepEqual(result, localResult(wowPayloads[index]), `WOW frontend/backend mismatch at ${index}`));
console.log('PASS: 12 dialogue scenes and 5 free-invention scenes keep their production API; all 82 WOW suggestions across 41 scenes match the WOW backend contract and local fallback.');
