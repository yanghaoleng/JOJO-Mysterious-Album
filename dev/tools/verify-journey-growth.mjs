/** Deterministic layouts and accepted-answer growth; no DOM/WebGL required. */
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import { WOW_STORY } from '../../src/wow-story-data.js';
import { chapterDecorationProgress, chapterLayoutOptions, makeDecorationLayout, newJourneySeed, savedJourneySeed } from '../journey-layout.js';
import { createWorld } from '../worlds.js';
import { TapFeedback, firstTapHit } from '../tap-feedback.js';

const worlds = ['bakery', 'reef', 'cloud', 'home', 'meadow', 'observatory'];
const legacy = { sceneIndex: 4, wowEntries: [{ id: 'c1-observe', answer: '星星' }], inventory: [{ id: 'torch' }] };
assert.equal(savedJourneySeed(legacy), savedJourneySeed(structuredClone(legacy)));
assert.equal(savedJourneySeed({ ...legacy, journeySeed: 42 }), 42);
assert.equal(new Set(Array.from({ length: 16 }, newJourneySeed)).size, 16, 'New journeys should not share one fixed layout');
const seeds = [2, 8, 42, 1234, 2030, 6872, 102938, 982344];
const reports = [];
const point = new THREE.Vector3();
for (const chapter of WOW_STORY.chapters) {
  const worldId = worlds[chapter.id - 1], options = chapterLayoutOptions(chapter.id, 1234);
  const layout = makeDecorationLayout(worldId, options);
  assert.deepEqual(makeDecorationLayout(worldId, options), layout);
  assert.equal(options.steps, chapter.scenes.length);
  const variants = seeds.map(seed => makeDecorationLayout(worldId, chapterLayoutOptions(chapter.id, seed)));
  assert.ok(new Set(variants.map(value => value.items.length)).size > 1, 'Density never changes between journeys');
  assert.equal(new Set(variants.map(value => JSON.stringify(value.items))).size, variants.length);
  for (const variant of variants) for (const item of variant.items) {
    assert.ok(item.step >= 1 && item.step <= options.steps);
    if (item.region === 'front') {
      for (const [x, z, radius] of [[-1.45, .35, .7], [-1.85, 1.95, .45], [-.8, 1.85, .45], [0, 1.65, .48], [-.35, -.3, .7], [-.5, .95, .35]]) assert.ok(Math.hypot(item.x - x, item.z - z) > radius, 'Decoration entered a cast or story-prop safety zone');
    } else assert.ok(Math.abs(Math.hypot(...item.normal) - 1) < 1e-12);
  }
  const world = createWorld(worldId, { seed: options.seed, decorations: options }), feedback = new TapFeedback();
  world.tapTargets.forEach(target => feedback.add(target));
  assert.equal(feedback.ambient.size, layout.items.length, 'Every new element needs its own entry/tap root');
  const essential = world.tapTargets.filter(target => !target.decoration && target.parts).flatMap(target => target.parts.map(part => ({ part, values: part.geometry.attributes.position.array.slice(part.start * 3, (part.start + part.count) * 3) })));
  assert.ok(essential.length > 0, 'The chapter lost its required scene anchors');
  feedback.setRevealProgress(world.tapTargets, 0);
  assert.ok(feedback.stats().decorations.every(item => !item.visible));
  const hidden = [...feedback.ambient][0];
  assert.equal(feedback.trigger(hidden), false, 'Hidden decorations must not respond');
  const hiddenPart = hidden.parts[0]; let hiddenMesh;
  world.group.traverse(object => { if (object.geometry === hiddenPart.geometry) hiddenMesh = object; });
  assert.equal(firstTapHit([{ object: hiddenMesh, faceIndex: hiddenPart.start / 3, distance: 1 }]), null);
  const state = { wowEntries: [] }, counts = [];
  let previousCount = 0;
  for (const [index, scene] of chapter.scenes.entries()) {
    state.wowEntries.push({ id: scene.id, answer: '星星' });
    const progress = chapterDecorationProgress(chapter.id, state);
    assert.equal(progress, (index + 1) / chapter.scenes.length);
    feedback.setRevealProgress(world.tapTargets, progress);
    const current = feedback.stats().decorations, count = current.filter(item => item.visible).length;
    assert.ok(count > previousCount, 'Every accepted answer must add a visible element');
    assert.ok(current.some(item => item.visible && item.step === index + 1 && item.region === 'front'), 'This answer only added invisible reverse-side scenery');
    assert.ok(current.some(item => item.entering), 'New elements need an entry animation');
    const duplicate = { wowEntries: [...state.wowEntries, state.wowEntries.at(-1), { id: 'unknown', answer: 'x' }, { id: WOW_STORY.chapters[(chapter.id) % 6].scenes[0].id, answer: 'x' }] };
    assert.equal(chapterDecorationProgress(chapter.id, duplicate), progress);
    const beforeEntries = current.map(item => item.entries);
    feedback.setRevealProgress(world.tapTargets, progress);
    assert.deepEqual(feedback.stats().decorations.map(item => item.entries), beforeEntries, 'Duplicate sync restarted entries');
    // Tap during entry; both transforms must be composed and settle correctly.
    const entering = [...feedback.ambient].find(target => target.reveal.visible && target.decoration.step === index + 1);
    assert.equal(feedback.trigger(entering), true);
    for (let frame = 0; frame < 75; frame++) feedback.update(1 / 60);
    assert.ok(feedback.stats().decorations.filter(item => item.visible).every(item => !item.entering && item.factor === 1));
    for (const part of entering.parts) assert.ok(part.geometry.attributes.position.array.every(Number.isFinite));
    counts.push(count); previousCount = count;
  }
  assert.equal(previousCount, layout.items.length);
  const entries = feedback.stats().decorations.map(item => item.entries);
  for (let frame = 0; frame < 1000; frame++) feedback.update(1 / 60);
  assert.deepEqual(feedback.stats().decorations.map(item => item.entries), entries, 'Time alone must not unlock more elements');
  assert.ok(feedback.stats().decorations.some(item => item.breathing > 0), 'The finished world never breathes');
  for (const { part, values } of essential) assert.deepEqual(part.geometry.attributes.position.array.slice(part.start * 3, (part.start + part.count) * 3), values, 'Decoration animation moved a required scene anchor');

  const restoredWorld = createWorld(worldId, { seed: options.seed, decorations: options }), restored = new TapFeedback();
  restoredWorld.tapTargets.forEach(target => restored.add(target));
  restored.setRevealProgress(restoredWorld.tapTargets, .5, { immediate: true });
  assert.deepEqual(restoredWorld.decorationLayout, world.decorationLayout);
  assert.ok(restored.stats().decorations.every(item => item.entries === 0 && !item.entering), 'Reload must not replay earned entries');
  assert.equal(restored.stats().decorations.filter(item => item.visible).length, layout.items.filter(item => item.at <= .5).length);
  restored.setRevealProgress(restoredWorld.tapTargets, 1, { reduced: true }); restored.update(.1);
  assert.ok(restored.stats().decorations.every(item => item.visible && !item.entering && item.factor === 1 && item.breathing === 0));
  // New pieces were baked around the actual planet, including the back side.
  for (const target of restored.ambient) {
    const part = target.parts[0];
    point.fromArray(part.position).sub(restoredWorld.planet.center);
    assert.ok(point.length() > restoredWorld.planet.radius - .15 && point.length() < restoredWorld.planet.radius + 1, 'Nature is detached from the sphere');
  }
  reports.push({ chapter: chapter.id, steps: options.steps, total: layout.items.length, growth: counts, densityVariants: variants.map(value => value.items.length) });
  feedback.clear(); restored.clear(); world.dispose(); restoredWorld.dispose();
}
for (const id of worlds) { const ordinary = createWorld(id); assert.equal(ordinary.decorationLayout, null); assert.ok(ordinary.tapTargets.every(target => !target.decoration)); ordinary.dispose(); }
console.log(JSON.stringify({ passed: true, chapters: reports, coverage: 'deterministic legacy/save seeds; new-journey variety; safe slots; every accepted answer; duplicate/foreign isolation; no timed unlocks; exact required anchors; entries/taps/breath composition; restore without replay; reduced motion; six spherical worlds; ordinary-world isolation' }, null, 2));
