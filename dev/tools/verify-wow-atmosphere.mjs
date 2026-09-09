/** Night-to-dawn contracts using real Three.js lights/fog, without WebGL.
 * Run: node dev/tools/verify-wow-atmosphere.mjs. No network or files are changed.
 * Browser verification separately covers shader appearance and live UI contrast.
 */
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import { DioramaStage } from '../stage.js';
import { WOW_DEV_STORY, wowVisualState } from '../wow-story.js';

const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: ${actual} != ${expected}`);
const entryFor = scene => ({ id: scene.id, chapter: scene.chapter, answer: '我愿意慢慢听。', reaction: '我们一起听。' });
const retainedInventory = [
  ...['torch', 'radio', 'jar'].map(id => ({ id })),
  ...WOW_DEV_STORY.chapters.map(chapter => ({ id: `wow-color-${chapter.number}`, color: '#efd36e' })),
];
const stateFor = entries => ({ inventory: retainedInventory, inventions: [], wowEntries: entries, firstWords: '你好，我在这里。' });
const chapterReports = [];
for (const chapter of WOW_DEV_STORY.chapters) {
  const scenes = WOW_DEV_STORY.scenes.filter(scene => scene.chapter === chapter.number);
  const colorAt = scenes.findIndex(scene => scene.wow.kind === 'color');
  const otherEntries = WOW_DEV_STORY.scenes.filter(scene => scene.chapter !== chapter.number).map(entryFor);
  const entries = [...otherEntries, { id: 'unknown-scene', chapter: chapter.number, answer: '无效条目' }];
  const state = stateFor(entries);
  assert.equal(wowVisualState(scenes[0], state).progress, 0, `Chapter ${chapter.number} inherited another world's light`);
  assert.equal(wowVisualState(scenes[0], state, true).progress, 0, 'A pending-response pulse must not disperse fog');
  assert.equal(wowVisualState(scenes.at(-1), state).progress, 0, 'Moving the scene cursor must not earn daylight');
  const steps = [0];
  for (let i = 0; i < scenes.length; i++) {
    entries.push(entryFor(scenes[i]));
    const visual = wowVisualState(scenes[i], state);
    close(visual.progress, Math.min(1, (i + 1) / (colorAt + 1)), `Chapter ${chapter.number}, answer ${i + 1}`);
    assert.ok(visual.progress >= steps.at(-1), 'Accepted answers must not restore fog');
    entries.push({ ...entryFor(scenes[i]), answer: '重复保存的同一次回答' });
    assert.equal(wowVisualState(scenes[i], state).progress, visual.progress, 'Duplicate entries earned extra light');
    assert.equal(wowVisualState(scenes[i], JSON.parse(JSON.stringify(state))).progress, visual.progress, 'Refresh changed earned daylight');
    steps.push(visual.progress);
  }
  assert.equal(steps[colorAt + 1], 1, 'Collecting this chapter color must reach dawn');
  assert.equal(steps.at(-1), 1, 'The invitation or final memory must remain at dawn');
  chapterReports.push({ chapter: chapter.number, daylightAfter: colorAt + 1, steps });
}

function stageHarness() {
  const stage = Object.create(DioramaStage.prototype);
  const themes = [];
  Object.assign(stage, {
    scene: new THREE.Scene(), hemisphere: new THREE.HemisphereLight(),
    sun: new THREE.DirectionalLight(), rim: new THREE.DirectionalLight(),
    renderer: { toneMappingExposure: 1 }, space: new THREE.Group(),
    actors: new Map(), actorFrames: new Map(), style: { apply() {} },
    resetCamera() {}, reduced: false,
    onCuriosityTheme(theme) { themes.push({ ...theme }); },
  });
  stage.space.add(new THREE.Mesh(new THREE.OctahedronGeometry(.1), new THREE.MeshBasicMaterial({ transparent: true, opacity: .6 })));
  return { stage, themes, dispose() {
    stage.world?.dispose();
    stage.space.children[0].geometry.dispose(); stage.space.children[0].material.dispose();
  } };
}
function sample(stage) {
  assert.ok(stage.scene.fog instanceof THREE.Fog, 'WOW needs the stage depth fog');
  return {
    progress: stage.curiosity.progress,
    hemisphere: stage.hemisphere.intensity, sun: stage.sun.intensity, rim: stage.rim.intensity,
    exposure: stage.renderer.toneMappingExposure,
    near: stage.scene.fog.near, far: stage.scene.fog.far,
    stars: stage.space.children[0].material.opacity,
  };
}
function increasing(a, b) {
  for (const key of ['progress', 'hemisphere', 'sun', 'rim', 'exposure', 'near', 'far']) {
    assert.ok(Number.isFinite(b[key]) && b[key] >= a[key] - 1e-10, `${key} moved backwards from ${a[key]} to ${b[key]}`);
  }
  assert.ok(b.far > b.near && b.near > 0, 'Fog distances became invalid');
  assert.ok(b.stars <= a.stars + 1e-10, 'Stars should recede as dawn arrives');
}
const { stage, themes, dispose } = stageHarness();
stage.setLighting();
stage.setCuriosityProgress(0);
const night = sample(stage);
assert.equal(night.progress, 0, 'A new chapter must seed night before the first frame');
assert.equal(themes.at(-1).period, 'night');
assert.ok(night.sun < .5 && night.hemisphere < 1 && night.exposure < 1, 'The initial state must use night lighting');
const progression = [night];
for (const progress of [.1, .25, .5, .75, 1]) {
  stage.setCuriosityProgress(progress);
  stage.updateLighting(1, true);
  const next = sample(stage); increasing(progression.at(-1), next); progression.push(next);
}
const dawn = sample(stage);
assert.equal(dawn.progress, 1);
assert.equal(themes.at(-1).period, 'day');
assert.ok(dawn.sun > 2 && dawn.hemisphere >= 2 && dawn.near > 30, 'Dawn should illuminate and reveal the planet');
for (const theme of themes) {
  for (const key of ['base', 'glow', 'horizon', 'ink', 'muted', 'paper', 'accent']) assert.match(theme[key], /^#[\da-f]{6}$/i);
}
const callbackCount = themes.length;
stage.updateLighting(1 / 60);
assert.equal(themes.length, callbackCount, 'Settled light should not rewrite the theme every frame');

// A fresh world/refresh seeds saved light immediately. Same-world answers ease
// toward their target without overshoot, then settle to an exact stable value.
for (const saved of [0, .37, 1]) {
  stage.curiosity = null; stage.scene.fog = null;
  stage.setCuriosityProgress(saved);
  close(stage.curiosity.progress, saved, 'Restored light must be seeded immediately');
}
stage.curiosity = null; stage.scene.fog = null;
stage.setCuriosityProgress(0); stage.setCuriosityProgress(1);
let previous = sample(stage);
stage.updateLighting(1 / 60);
assert.ok(stage.curiosity.progress > 0 && stage.curiosity.progress < 1, 'A new answer should gradually reveal the world');
for (let frame = 0; frame < 420; frame++) {
  stage.updateLighting(1 / 60);
  const next = sample(stage); increasing(previous, next); previous = next;
}
assert.equal(stage.curiosity.progress, 1, 'Animation failed to settle at dawn');
stage.reduced = true; stage.setCuriosityProgress(.25); stage.updateLighting(1 / 60);
assert.equal(stage.curiosity.progress, .25, 'Reduced motion should apply the target without an animation');

// Real world construction verifies the shared stage releases WOW fog and can
// immediately seed the next chapter's night; camera and DOM checks are separate.
stage.setScene('orchard', []);
assert.equal(stage.curiosity, null); assert.equal(stage.scene.fog, null);
stage.updateLighting(1, true);
close(stage.sun.intensity, stage.world.atmosphere.lighting.sunIntensity, 'Ordinary story lighting was not restored');
stage.setCuriosityProgress(0);
assert.equal(stage.curiosity.progress, 0); assert.equal(themes.at(-1).period, 'night');
stage.setScene('home', []);
assert.equal(stage.scene.fog, null); assert.equal(stage.curiosity, null);
dispose();
console.log(JSON.stringify({ passed: true, chapterReports, progression, smoothFrames: 420, coverage: 'chapter-local accepted progress; duplicate and foreign-entry isolation; saved seeds; monotonic real lights/depth fog; reduced motion; ordinary-world reset' }, null, 2));
