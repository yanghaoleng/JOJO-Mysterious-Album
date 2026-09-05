import assert from 'node:assert/strict';
import { STORIES } from '../stories.js';
import { moonRequest, sceneRequest } from '../story-api.js';

const sceneIds = new Set(['orchard-bush', 'warm-bakery', 'creaky-bridge', 'two-houses', 'doudou-home']);
const moonIds = new Set(['moon-hill', 'moon-underwater', 'moon-pocket', 'moon-clouds', 'moon-landing']);
let sceneCount = 0, inventionCount = 0;
for (const story of STORIES) for (const scene of story.scenes) {
  if (scene.freeInput) {
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
console.log('PASS: 12 dialogue scenes and 5 free-invention scenes match the unchanged production API; the final moon memento stays local.');
