/**
 * Reproducible, offline NPC/data/model/Dev integration checks.
 * Full: node src/story-npcs/verify.mjs
 * Data/Dev first, while model factories are being built: --catalog-only
 * No browser, microphone, real audio, network request, save write or deployment.
 * The JSON printed to stdout can be retained by the caller as a QA artifact.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.js';
import { NPC_CATALOG, CORE_NPC_IDS, getNpc, getNpcVoice } from './catalog.js';
import { CHARACTER_CATALOG } from '../../dev/models.js';
import { STORIES } from '../../dev/stories.js';
import { sceneRequest, moonRequest } from '../../dev/story-api.js';
import { StoryVoice } from '../../dev/voice.js';

const EXPECTED_IDS = [
  'jiaojiao', 'lingdang', 'zhuxiaodi',
  'jiaojiao-mom', 'jiaojiao-dad', 'zhuxiaodi-mom', 'zhuxiaodi-dad', 'lingdang-mom', 'lingdang-dad',
  'nini', 'xiaomaoqiu', 'xiaolu-teacher', 'miao-boss', 'zhuxiaoyu',
  'lvdou', 'douya', 'fendou', 'landou', 'dahongdou', 'donggaofen', 'qinlianxi', 'aigaicuo',
  'wulala', 'mili', 'yuanbao', 'duziteng', 'wanneng', 'baozai', 'danzai', 'maoge',
  'sunwukong', 'rusheng', 'lanbitou', 'dengdeng', 'domi', 'hatty', 'elfie', 'hackett', 'allie', 'sage',
  'gulu', 'prank-doctor',
];
const LEGACY_TYPES = ['dog', 'rabbit', 'otter', 'owl', 'cat', 'bear', 'frog'];
const VOICES = ['sprout', 'bubble', 'moss', 'star', 'clever', 'bright', 'lively', 'sweet', 'clear', 'neighbor', 'youth', 'gentle', 'soft', 'smart', 'caring'];
const ACTIONS = ['idle', 'talk', 'wave', 'hop', 'listen', 'walk'];
const EXPRESSIONS = ['happy', 'curious', 'sad', 'surprised'];
const SCALES = [.6, 1, 1.4];
const CONTRACT = {
  doudou: {
    age: '4～6 岁', companion: 'rabbit', chapters: ['care', 'cross', 'home'],
    scenes: ['doudou-orchard', 'doudou-bakery', 'doudou-riverbank', 'doudou-crossing', 'doudou-two-houses', 'doudou-home'],
    choices: [['apple', 'water'], ['roof', 'sign'], ['sit', 'hand'], ['bridge', 'boat'], ['check-roof', 'check-sign'], ['care', 'together']],
    items: ['home-sketch', 'river-stamp'],
  },
  moon: {
    age: '10 岁以上', companion: 'rabbit', chapters: ['begin', 'adjust', 'arrive'],
    scenes: ['moon-observatory', 'moon-reef', 'moon-pocket', 'moon-cloud', 'moon-landing', 'moon-arrival'],
    choices: [['portal', 'rocket'], ['bubbles', 'paddles'], ['ladder', 'sail'], ['radar', 'light-line'], ['gentle-thruster', 'low-portal'], ['route-drawing', 'group-photo']],
    items: ['sea-bolt', 'pocket-thread', 'cloud-bearing'],
  },
  echo: {
    age: '4～7 岁', companion: 'rabbit', chapters: ['hear', 'follow', 'accompany'],
    scenes: ['echo-cove', 'echo-meadow', 'echo-moon', 'echo-reef', 'echo-pocket', 'echo-cloud-home'],
    choices: [['hello', 'rhythm'], ['greeting', 'wave'], ['listen-shell', 'play-again'], ['touch-bubble', 'catch-sound'], ['im-listening', 'sit-beside'], ['plant-light', 'lay-thread']],
    items: ['listening-shell', 'light-thread', 'glow-seed'],
  },
};
const onlyCatalog = process.argv.includes('--catalog-only');
const report = {
  status: 'running', mode: onlyCatalog ? 'catalog-and-offline-dev-only' : 'full-offline-matrix',
  browser: false, physicalMicrophone: false, realAudio: false, network: false, writes: false,
  expected: { profiles: 42, models: 42, modelScales: 126, actionExpressionPoses: 3024, scenes: 18 },
  checks: {}, models: [], failures: [],
};
const jsonCopy = value => JSON.parse(JSON.stringify(value));
async function check(name, task) {
  try { report.checks[name] = { status: 'passed', ...await task() }; }
  catch (error) { report.checks[name] = { status: 'failed', error: error.message }; report.failures.push({ check: name, error: error.message }); }
}

await check('catalog', () => {
  execFileSync(process.execPath, [fileURLToPath(new URL('./generate-catalog.mjs', import.meta.url)), '--check'], { encoding: 'utf8' });
  const raw = readFileSync(new URL('./catalog.json', import.meta.url), 'utf8');
  const canonical = JSON.parse(raw);
  assert.deepEqual(jsonCopy(NPC_CATALOG), canonical);
  assert.deepEqual(NPC_CATALOG.map(p => p.id), EXPECTED_IDS);
  assert.equal(new Set(EXPECTED_IDS).size, 42);
  assert.deepEqual(CORE_NPC_IDS, ['jiaojiao', 'lingdang', 'zhuxiaodi']);
  assert(!/https?:\/\/|OSSAccessKeyId|Signature=|\/tmp\//.test(raw), 'Private source location leaked into published data');
  for (const profile of NPC_CATALOG) {
    assert.equal(profile.role, 'npc', profile.id); assert.equal(profile.selectableAsCompanion, false, profile.id);
    assert(VOICES.includes(profile.voiceKey), profile.id);
    assert(Number.isFinite(profile.speechRate) && profile.speechRate >= .86 && profile.speechRate <= 1.08, profile.id);
    for (const key of ['appearance', 'personality', 'speakingStyle', 'family', 'sampleLine']) assert(profile[key]?.trim(), `${profile.id}/${key}`);
    assert.equal(getNpcVoice(profile.id), profile.voiceKey);
  }
  for (const value of ['doudou', '__proto__', 'constructor', '', null, undefined, 'not-a-character']) {
    assert.equal(getNpc(value), null, `Unknown id ${value}`); assert.equal(getNpcVoice(value), null);
  }
  assert.notEqual(getNpc('lvdou'), getNpc('domi'));
  assert(getNpc('lvdou').relatedProfiles.some(p => p.id === 'domi'));
  assert(getNpc('domi').relatedProfiles.some(p => p.id === 'lvdou'));
  assert.match(getNpc('xiaomaoqiu').appearance, /黄鼠狼/);
  assert.match(getNpc('hackett').appearance, /毛球.*帽/);
  assert.deepEqual(CHARACTER_CATALOG.map(p => p.id), LEGACY_TYPES, 'NPCs entered the saved companion catalog');
  assert(CHARACTER_CATALOG.every(p => !EXPECTED_IDS.includes(p.id)));
  return { profiles: 42, legacyCompanionTypes: 7, visualBasis: Object.fromEntries(['reference-3d', 'document-image', 'text-adaptation'].map(basis => [basis, NPC_CATALOG.filter(p => p.visualBasis === basis).length])) };
});

await check('story-contract-and-api-payload', () => {
  assert.deepEqual(STORIES.map(s => s.id), Object.keys(CONTRACT));
  let scenes = 0, speakers = 0, requests = 0;
  const primaryScenes = [];
  for (const story of STORIES) {
    const contract = CONTRACT[story.id];
    assert.equal(story.age, contract.age); assert.equal(story.companion, contract.companion);
    assert.deepEqual(story.chapters.map(c => c.id), contract.chapters);
    assert.deepEqual(story.scenes.map(s => s.id), contract.scenes);
    assert.deepEqual(story.scenes.map(s => s.choices.map(c => c.id)), contract.choices);
    const items = new Set();
    for (const [index, scene] of story.scenes.entries()) {
      scenes++;
      assert.equal(scene.chapter, Math.floor(index / 2) + 1); assert.equal(Boolean(scene.final), index === 5);
      const cast = new Set(scene.cast.map(p => p.id));
      assert.equal(cast.size, scene.cast.length); assert(scene.cast.length >= 1 && scene.cast.length <= 2);
      assert(!cast.has('companion'), 'NPC must not use the player companion id');
      for (const actor of scene.cast) {
        if (actor.characterId) {
          const profile = getNpc(actor.characterId); assert(profile, scene.id);
          assert.equal(actor.id, profile.id); assert.equal(actor.type, profile.id);
          assert.equal(actor.voice, profile.voiceKey); assert.equal(actor.name, profile.name);
        } else assert(LEGACY_TYPES.includes(actor.type), scene.id);
      }
      for (const line of [...scene.dialogue, ...scene.choices, ...scene.closing]) {
        assert(line.speaker === 'companion' || cast.has(line.speaker), `${scene.id}/${line.speaker}`); speakers++;
      }
      if (scene.inventionSpeaker) assert(cast.has(scene.inventionSpeaker));
      for (const item of [scene.inventionReward, ...scene.choices.map(c => c.reward)].filter(Boolean)) items.add(item.id);
      const questionActor = scene.cast.find(p => p.id === scene.questionSpeaker) || scene.cast[0];
      if (CORE_NPC_IDS.includes(questionActor.characterId)) {
        primaryScenes.push({ sceneId: scene.id, npcId: questionActor.characterId, voiceKey: questionActor.voice });
        assert(scene.dialogue.some(line => line.speaker === questionActor.id));
      }
      if (scene.freeInput && scene.final) continue;
      const payload = scene.freeInput ? moonRequest(scene, [], '保留我的小帆') : sceneRequest(scene, '我想陪着它');
      requests++; assert.equal(payload.npcId, questionActor.characterId || '', scene.id);
      assert(!('personality' in payload) && !('speakingStyle' in payload), 'Client must send NPC identity, not an authoritative persona');
      if (!scene.freeInput) assert.deepEqual(payload.choices.map(c => c.id), scene.choices.map(c => c.id));
    }
    assert.deepEqual([...items], contract.items);
  }
  assert.equal(STORIES.find(s => s.id === 'moon').onboarding, 'direct');
  for (const id of CORE_NPC_IDS) assert(primaryScenes.some(scene => scene.npcId === id), `${id} has no primary NPC scene`);
  const motherScene = STORIES[0].scenes.at(-1);
  assert.deepEqual(motherScene.cast.map(p => [p.id, p.type, p.name]), [['mama', 'dog', '豆豆妈妈'], ['doudou', 'dog', '豆豆']]);
  assert(motherScene.dialogue.some(line => line.speaker === 'mama'));
  const cast = ['jiaojiao', 'lingdang'].map(id => ({ id, characterId: id }));
  for (const questionSpeaker of ['jiaojiao', 'lingdang', 'missing']) {
    const expected = questionSpeaker === 'lingdang' ? 'lingdang' : 'jiaojiao';
    assert.equal(sceneRequest({ ...STORIES[0].scenes[1], cast, questionSpeaker }, '测试').npcId, expected);
    assert.equal(moonRequest({ ...STORIES[1].scenes[0], cast, questionSpeaker }, [], '测试').npcId, expected);
  }
  return { scenes, speakers, requests, questionSpeakerFixtures: 6, primaryScenes, stableStorySceneChoiceItemIds: true };
});

function sourceFunction(source, name) {
  const match = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert(match, `Cannot extract actual Dev function ${name}`); return match[0];
}

await check('actual-dev-speaker-and-save-functions-fixture', async () => {
  const source = readFileSync(new URL('../../dev/app.js', import.meta.url), 'utf8');
  assert.match(source, /const STORAGE = ['"]jma\.dev\.clay\.v1['"]/);
  const ui = new Map(), calls = [];
  const state = { sceneIndex: 0, companion: { name: '旧伙伴', type: 'rabbit', color: '#eee3d5' } };
  const context = vm.createContext({
    story: STORIES[0], state, epoch: 7, getNpc, CHARACTER_CATALOG,
    $: id => { if (!ui.has(id)) ui.set(id, { dataset: {} }); return ui.get(id); },
    stage: { speak() {} }, voice: { say: async (...args) => { calls.push(args); } },
    defaultState: () => ({ sceneIndex: 0, setupDone: false, companion: {}, inventory: [], inventions: [], completed: false }),
  });
  vm.runInContext([sourceFunction(source, 'speakerInfo'), sourceFunction(source, 'speakLine'), sourceFunction(source, 'savedState')].join('\n'), context);
  for (const id of CORE_NPC_IDS) {
    state.sceneIndex = STORIES[0].scenes.findIndex(scene => scene.cast.some(actor => actor.characterId === id));
    assert(state.sceneIndex >= 0);
    const line = STORIES[0].scenes[state.sceneIndex].dialogue.find(item => item.speaker === id);
    context.testLine = line;
    await vm.runInContext('speakLine(testLine, 7)', context);
    const args = calls.at(-1);
    assert.equal(args[0], line.text); assert.equal(args[1], getNpcVoice(id)); assert.equal(args[3], id);
    assert.equal(ui.get('speaker').textContent, getNpc(id).name);
  }
  context.testLine = { speaker: 'companion', text: '我是原来的伙伴。' };
  await vm.runInContext('speakLine(testLine, 7)', context);
  assert.equal(calls.at(-1)[3], undefined, 'NPC identity leaked into player speech');
  let saves = 0;
  for (const story of STORIES) for (const type of LEGACY_TYPES) {
    const saved = { sceneIndex: 3, setupDone: true, companion: { type, name: '旧伙伴', color: '#eee3d5', manner: 'calm' }, inventory: [{ id: 'old-item', name: '以前的纪念' }], inventions: [{ scene: '旧场景', visual: { name: '旧发明' } }], completed: false };
    const before = JSON.stringify(saved);
    context.story = story; context.readStorage = () => saved;
    const restored = vm.runInContext('savedState()', context);
    assert.deepEqual(jsonCopy(restored), saved); assert.equal(JSON.stringify(saved), before); saves++;
  }
  return { sourceFunctions: ['speakerInfo', 'speakLine', 'savedState'], coreSpeakerCalls: 3, companionCall: 1, savedStateFixtures: saves, browserOrMicrophone: false };
});

await check('actual-tts-request-fixture', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [], active = [];
  globalThis.fetch = (path, options) => {
    requests.push({ path, body: JSON.parse(options.body), signal: options.signal });
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('offline-fixture-abort')), { once: true }));
  };
  try {
    for (const profile of NPC_CATALOG) {
      const voice = new StoryVoice({ onState() {}, onAnswer() { throw new Error('No ASR is permitted'); }, onLevel() {}, onError() {} });
      voice.unlock = () => { throw new Error('No AudioContext may open in the offline fixture'); };
      voice.enable = () => { throw new Error('No microphone may open in the offline fixture'); };
      active.push(voice);
      const pending = voice.say(profile.sampleLine, profile.voiceKey, () => {}, profile.id);
      const request = requests.at(-1);
      assert.equal(request.path, '/api/tts');
      assert.deepEqual(request.body, { text: profile.sampleLine, voice: profile.voiceKey, npcId: profile.id, realtime: true });
      voice.skip(); await pending; voice.stop();
      assert.equal(request.signal.aborted, true); assert.equal(voice.enabled, false); assert.equal(voice.utterance, null);
    }
  } finally { active.forEach(voice => voice.stop()); globalThis.fetch = originalFetch; }
  return { interceptedRequests: requests.length, realRequests: 0, audioContexts: 0, microphoneRequests: 0, cancelledCleanly: true };
});

function finiteModel(group, label) {
  group.updateWorldMatrix(true, true);
  let meshes = 0, triangles = 0;
  const geometries = new Set(), materials = new Set();
  group.traverse(node => {
    assert(!node.isBone && !node.isSkinnedMesh && !node.skeleton, `${label}: skeletal substitution`);
    for (const value of node.matrixWorld.elements) if (!Number.isFinite(value)) throw new Error(`${label}/${node.name}: nonfinite transform`);
    if (!node.isMesh) return;
    meshes++;
    const geometry = node.geometry;
    assert(geometry?.attributes.position, `${label}: no solid vertices`);
    assert(!geometry.attributes.skinIndex && !geometry.attributes.skinWeight, `${label}: skinned vertices`);
    triangles += (geometry.index?.count || geometry.attributes.position.count) / 3;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
    if (geometries.has(geometry)) return;
    geometries.add(geometry);
    for (const [key, attribute] of Object.entries(geometry.attributes)) {
      for (const value of attribute.array) if (!Number.isFinite(value)) throw new Error(`${label}/${node.name}/${key}: nonfinite vertex`);
    }
    if (geometry.index) for (const index of geometry.index.array) if (index < 0 || index >= geometry.attributes.position.count) throw new Error(`${label}: invalid triangle index`);
  });
  assert(meshes > 0 && triangles > 0, `${label}: empty model`);
  const bounds = new THREE.Box3().setFromObject(group);
  assert([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite), `${label}: invalid bounds`);
  return { meshes, triangles, geometries, materials, bounds };
}

if (onlyCatalog) {
  report.checks['factory-model-matrix'] = { status: 'not-run', reason: 'Explicit --catalog-only; no model pass is claimed' };
  report.checks['actual-dev-stage-fixture'] = { status: 'not-run', reason: 'Explicit --catalog-only' };
} else {
  let factory;
  await check('factory-support', async () => {
    factory = await import('./factory.js');
    assert.equal(typeof factory.createDocumentCharacter, 'function'); assert.equal(typeof factory.supportsDocumentCharacter, 'function');
    for (const id of EXPECTED_IDS) assert.equal(factory.supportsDocumentCharacter(id), true, id);
    for (const id of ['doudou', 'dog', 'rabbit', '__proto__', 'constructor', '', 'not-a-character', null, undefined]) {
      assert.equal(factory.supportsDocumentCharacter(id), false, `Unknown factory id: ${id}`);
      assert.throws(() => factory.createDocumentCharacter({ characterId: id }), undefined, `Unknown factory id silently substituted: ${id}`);
    }
    return { supported: EXPECTED_IDS.length, rejectedUnknownIds: 9 };
  });
  if (factory) {
    await check('factory-model-matrix', () => {
      let poses = 0;
      for (const id of EXPECTED_IDS) for (const scale of SCALES) {
        let model;
        try {
          model = factory.createDocumentCharacter({ characterId: id, scale });
          for (const method of ['update', 'setAction', 'setExpression', 'setColor', 'dispose']) assert.equal(typeof model[method], 'function', `${id}/${method}`);
          assert.equal(model.group.userData.characterId, id); assert.equal(model.group.userData.role, 'npc');
          const rest = finiteModel(model.group, `${id}@${scale}/rest`);
          const height = rest.bounds.max.y - rest.bounds.min.y;
          assert(Math.abs(rest.bounds.min.y) < .0001, `${id}@${scale}: foot must rest at y=0, got ${rest.bounds.min.y}`);
          assert(Math.abs(height - 2.2 * scale) < .0001, `${id}@${scale}: height ${height}, expected ${2.2 * scale}`);
          assert.deepEqual(model.group.scale.toArray(), [scale, scale, scale]);
          model.group.position.set(1.2, .08, -.3); model.group.quaternion.setFromEuler(new THREE.Euler(.08, .42, -.12));
          const placement = model.group.position.toArray(), rotation = model.group.quaternion.toArray();
          let time = 0;
          for (const action of ACTIONS) for (const expression of EXPRESSIONS) {
            assert.notEqual(model.setAction(action), false, `${id}: rejected ${action}`);
            assert.notEqual(model.setExpression(expression), false, `${id}: rejected ${expression}`);
            // Let blended actions settle and sample motion away from t=0.
            for (let frame = 0; frame < 12; frame++) model.update(time += 1 / 30, 1 / 30);
            finiteModel(model.group, `${id}@${scale}/${action}/${expression}`); poses++;
            assert.deepEqual(model.group.position.toArray(), placement, `${id}: animation moved its stage-owned placement`);
            assert.deepEqual(model.group.quaternion.toArray(), rotation, `${id}: animation changed its stage-owned orientation`);
            assert.deepEqual(model.group.scale.toArray(), [scale, scale, scale], `${id}: animation changed placement scale`);
          }
          model.update(Number.NaN, Number.POSITIVE_INFINITY);
          finiteModel(model.group, `${id}@${scale}/nonfinite-input-guard`);
          const resources = [...rest.geometries, ...rest.materials];
          const released = new Map(resources.map(resource => [resource, 0]));
          resources.forEach(resource => resource.addEventListener('dispose', () => released.set(resource, released.get(resource) + 1)));
          model.dispose(); model.dispose();
          assert([...released.values()].every(count => count === 1), `${id}: model resources must dispose exactly once`);
          model.update(100, .1);
          report.models.push({ id, scale, status: 'passed', restFoot: rest.bounds.min.y, restHeight: height, meshes: rest.meshes, triangles: rest.triangles, poses: 24, disposedResources: resources.length });
        } catch (error) {
          report.models.push({ id, scale, status: 'failed', error: error.message });
        } finally { model?.dispose(); }
      }
      const failed = report.models.filter(model => model.status !== 'passed');
      assert.equal(failed.length, 0, `${failed.length} model-scale failures: ${failed.map(model => `${model.id}@${model.scale}: ${model.error}`).join('; ')}`);
      assert.equal(report.models.length, 126); assert.equal(poses, 3024);
      return { uniqueModels: new Set(report.models.map(model => model.id)).size, scales: SCALES, modelScales: report.models.length, actionExpressionPoses: poses, actions: ACTIONS, expressions: EXPRESSIONS, disposal: 'all observed geometry/material resources once; second call harmless' };
    });
    await check('actual-dev-stage-fixture', async () => {
      const { DioramaStage } = await import('../../dev/stage.js');
      const fixture = {
        scene: new THREE.Scene(), actors: new Map(), actorFrames: new Map(), style: { apply() {} },
        clearInvention() {}, setLighting() {}, resetCamera() {},
      };
      let scenes = 0;
      try {
        for (const id of CORE_NPC_IDS) {
          const scene = STORIES[0].scenes.find(s => s.cast.some(actor => actor.characterId === id));
          DioramaStage.prototype.setScene.call(fixture, scene.world, [...scene.cast, { id: 'companion', type: 'rabbit', name: '旧伙伴' }]);
          assert.equal(fixture.actors.get(id).group.userData.characterId, id);
          assert.equal(fixture.actors.get(id).group.userData.role, 'npc');
          assert.equal(fixture.actors.get('companion').group.userData.species, 'rabbit');
          assert.equal(fixture.actors.get('doudou').group.userData.species, 'dog');
          assert.equal(fixture.actors.size, 3);
          for (const [actorId, actor] of fixture.actors) {
            finiteModel(actor.group, `${scene.id}/${actorId}/stage`);
            const normal = new THREE.Vector3(...actor.group.userData.surfaceNormal);
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(actor.group.quaternion);
            assert(up.distanceTo(normal) < 1e-6, `${scene.id}/${actorId}: not radial to planet`);
          }
          scenes++;
        }
      } finally { fixture.world?.dispose(); fixture.actors.forEach(actor => actor.dispose()); }
      return { actualSetSceneCalls: scenes, coreNPCs: 3, existingDogAndPlayerPreserved: true, renderer: 'not created; offline scene-graph fixture only' };
    });
    await check('actual-gallery-switch-fixture', () => {
      const source = readFileSync(new URL('./gallery.js', import.meta.url), 'utf8');
      const scene = new THREE.Scene(), elements = new Map();
      const buttons = NPC_CATALOG.map(profile => ({ dataset: { characterId: profile.id }, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } }));
      elements.set('characters', { children: buttons });
      const context = vm.createContext({
        NPC_CATALOG, getNpc, createDocumentCharacter: factory.createDocumentCharacter,
        createStorybookStyle: () => ({ apply() {}, dispose() {} }),
        model: null, style: null, current: null, yaw: 0, scene, stopVoice() {}, resize() {},
        document: { body: { dataset: {} }, title: '' },
        $: id => { if (!elements.has(id)) elements.set(id, {}); return elements.get(id); },
      });
      vm.runInContext(sourceFunction(source, 'choose'), context);
      const sequence = [...EXPECTED_IDS, 'jiaojiao', 'jiaojiao-mom', 'lvdou', 'lingdang', 'zhuxiaodi-dad', 'gulu'];
      try {
        for (const id of sequence) {
          context.testId = id; vm.runInContext('choose(testId, false)', context);
          assert.equal(scene.children.length, 1, `${id}: previous model remains in the gallery scene`);
          assert.equal(scene.children[0].userData.characterId, id);
          assert.equal(elements.get('name').textContent, getNpc(id).name);
          assert.equal(buttons.filter(button => button.attributes['aria-pressed'] === 'true').length, 1);
          assert.equal(buttons.find(button => button.attributes['aria-pressed'] === 'true').dataset.characterId, id);
        }
      } finally { context.model?.dispose(); context.style?.dispose(); scene.clear(); }
      return { actualChooseCalls: sequence.length, oneModelAtATime: true, profileLabelsAndSelection: true, renderer: 'not created; offline scene-graph and DOM fixture' };
    });
  } else {
    report.checks['factory-model-matrix'] = { status: 'not-run', reason: 'Factory import failed; no model pass claimed' };
    report.checks['actual-dev-stage-fixture'] = { status: 'not-run', reason: 'Factory import failed' };
  }
}

report.status = report.failures.length ? 'failed' : onlyCatalog ? 'partial-passed-models-not-run' : 'passed';
console.log(JSON.stringify(report, null, 2));
if (report.failures.length) process.exitCode = 1;
