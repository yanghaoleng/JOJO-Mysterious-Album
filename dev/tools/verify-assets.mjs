/**
 * Read-only /dev asset and story-contract regression checks.
 * Run: node dev/tools/verify-assets.mjs
 * This does not prove audio playback, browser interaction, or a live deployment.
 */
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from '../../vendor/three.module.js';
import { CHARACTER_CATALOG, createCharacter } from '../models.js';
import { WORLD_CATALOG, createWorld } from '../worlds.js';
import { STORIES } from '../stories.js';
import { DioramaStage } from '../stage.js';

const project = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const dev = resolve(project, 'dev');
const sourceFiles = [];
async function discover(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await discover(path);
    else if (['.js', '.mjs', '.html', '.css'].includes(extname(path))) sourceFiles.push(path);
  }
}
await discover(dev);

const references = [];
const shared = new Set();
const sourceHashes = {};
async function checkReference(source, raw, kind) {
  if (!raw || /^(?:https?:|data:|blob:|node:|#)/.test(raw)) return;
  if (raw.startsWith('/api/')) return;
  if (kind === 'module' && !raw.startsWith('.') && !raw.startsWith('/')) return;
  const target = raw.startsWith('/') ? resolve(project, `.${raw.split(/[?#]/)[0]}`)
    : fileURLToPath(new URL(raw, pathToFileURL(source)));
  const info = await stat(target).catch(() => null);
  assert.ok(info, `Missing ${kind}: ${relative(project, source)} → ${raw}`);
  assert.ok(target === project || target.startsWith(`${project}/`), `Local reference escapes project: ${raw}`);
  if (!target.startsWith(`${dev}/`) && target !== dev) shared.add(relative(project, target) || '/');
  references.push({ source: relative(project, source), target: relative(project, target), kind });
}

for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8');
  if (dirname(file) === dev) sourceHashes[relative(project, file)] = createHash('sha256').update(source).digest('hex').slice(0, 12);
  if (['.js', '.mjs', '.html'].includes(extname(file))) {
    const modulePatterns = [
      /\b(?:import|export)\s*(?:[^'";]*?\s+from\s*)?(['"])([^'"\n]+)\1/g,
      /\bimport\(\s*(['"])([^'"\n]+)\1/g,
    ];
    for (const expression of modulePatterns) {
      for (const match of source.matchAll(expression)) await checkReference(file, match[2], 'module');
    }
    for (const match of source.matchAll(/new\s+URL\(\s*(['"])([^'"\n]+)\1\s*,\s*import\.meta\.url/g)) {
      await checkReference(file, match[2], 'URL');
    }
  }
  if (extname(file) === '.html') {
    for (const match of source.matchAll(/\b(?:src|href)\s*=\s*(['"])([^'"<>]*)\1/g)) await checkReference(file, match[2], 'HTML');
  }
  if (extname(file) === '.css') {
    for (const match of source.matchAll(/url\(\s*['"]?([^'"()\s]+)['"]?\s*\)/g)) await checkReference(file, match[1], 'CSS');
  }
}

const runtimeSources = sourceFiles.filter(file => dirname(file) === dev && extname(file) === '.js');
for (const file of runtimeSources) {
  const source = await readFile(file, 'utf8');
  assert.ok(!/from\s*['"][^'"]*(?:\/src\/|legacy|rig\.js|scenery\.js)/.test(source), `Legacy runtime imported by ${relative(project, file)}`);
  assert.ok(!/(?:localStorage|sessionStorage)\s*\.\s*clear\s*\(/.test(source), `Shared storage cleared by ${relative(project, file)}`);
  assert.ok(!/serviceWorker\s*\.\s*register\s*\(/.test(source), `Unreviewed service worker in ${relative(project, file)}`);
}
const app = await readFile(resolve(dev, 'app.js'), 'utf8');
assert.match(app, /const STORAGE = ['"]jma\.dev\.clay\.v1['"]/, 'The dedicated /dev storage namespace changed');

function inspectObject(object, label) {
  let meshes = 0; let triangles = 0;
  const geometries = new Set();
  object.updateMatrixWorld(true);
  object.traverse(node => {
    assert.ok(!node.isBone && !node.isSkinnedMesh && !node.skeleton, `${label} contains a skeletal object`);
    for (const value of node.matrixWorld.elements) assert.ok(Number.isFinite(value), `${label}/${node.name} invalid transform`);
    if (!node.isMesh) return;
    meshes++;
    const geometry = node.geometry;
    assert.ok(geometry?.attributes.position, `${label}/${node.name} lacks solid geometry`);
    assert.ok(!geometry.attributes.skinIndex && !geometry.attributes.skinWeight, `${label} contains skin weights`);
    triangles += (geometry.index?.count || geometry.attributes.position.count) / 3;
    if (geometries.has(geometry)) return;
    geometries.add(geometry);
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      for (const value of attribute.array) assert.ok(Number.isFinite(value), `${label}/${name} contains a nonfinite vertex value`);
    }
    if (geometry.index) {
      const count = geometry.attributes.position.count;
      for (const index of geometry.index.array) assert.ok(index >= 0 && index < count, `${label} has an invalid triangle index`);
    }
  });
  assert.ok(meshes > 0 && triangles > 0, `${label} contains no model geometry`);
  return { meshes, triangles, geometries: geometries.size };
}

function disposeParsed(object) {
  const geometries = new Set(); const materials = new Set();
  object.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.material) (Array.isArray(node.material) ? node.material : [node.material]).forEach(item => materials.add(item));
  });
  geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
}

function assertGeometryRoundTrip(source, restored, label) {
  const originalMeshes = []; const restoredMeshes = [];
  source.traverse(node => { if (node.isMesh) originalMeshes.push(node); });
  restored.traverse(node => { if (node.isMesh) restoredMeshes.push(node); });
  assert.equal(restoredMeshes.length, originalMeshes.length, `${label} round-trip mesh count`);
  originalMeshes.forEach((node, index) => {
    const loaded = restoredMeshes[index];
    assert.equal(loaded.name, node.name, `${label} round-trip mesh ordering`);
    assert.deepEqual(Object.keys(loaded.geometry.attributes).sort(), Object.keys(node.geometry.attributes).sort(), `${label}/${node.name} lost geometry attributes`);
    for (const [attributeName, attribute] of Object.entries(node.geometry.attributes)) {
      const values = loaded.geometry.attributes[attributeName].array;
      assert.equal(values.length, attribute.array.length, `${label}/${node.name}/${attributeName} changed length`);
      let maxDelta = 0;
      for (let i = 0; i < values.length; i++) maxDelta = Math.max(maxDelta, Math.abs(values[i] - attribute.array[i]));
      assert.ok(maxDelta <= 1e-6, `${label}/${node.name}/${attributeName}: exported model loses authored geometry (max delta ${maxDelta}); modified primitive geometry must serialize vertex data`);
    }
    assert.deepEqual(loaded.geometry.index?.array, node.geometry.index?.array, `${label}/${node.name} changed triangle topology`);
  });
}

const manifest = JSON.parse(await readFile(resolve(dev, 'assets/manifest.json'), 'utf8'));
assert.equal(manifest.usesSkeleton, false);
assert.equal(manifest.externalTextures, false);
assert.equal(String(manifest.threeRevision), THREE.REVISION);
assert.equal(CHARACTER_CATALOG.length, 7);
assert.deepEqual(new Set(manifest.characters.map(item => item.id)), new Set(CHARACTER_CATALOG.map(item => item.id)));
const characters = [];
for (const entry of CHARACTER_CATALOG) {
  const declared = manifest.characters.find(item => item.id === entry.id);
  const model = createCharacter({ type: entry.id });
  const live = inspectObject(model.group, entry.id);
  const json = JSON.parse(await readFile(resolve(dev, 'assets', declared.file), 'utf8'));
  assert.ok(!json.textures?.length && !json.images?.length, `${entry.id} depends on external textures`);
  const restored = new THREE.ObjectLoader().parse(json);
  const exported = inspectObject(restored, `${entry.id} exported asset`);
  assert.equal(live.meshes, declared.meshes, `${entry.id}: stale manifest mesh count`);
  assert.equal(live.triangles, declared.triangles, `${entry.id}: stale manifest triangle count`);
  assert.deepEqual(exported, live, `${entry.id}: source and exported resource disagree`);
  assertGeometryRoundTrip(model.group, restored, entry.id);
  const bounds = new THREE.Box3().setFromObject(model.group);
  const restHeight = bounds.max.y - bounds.min.y;
  assert.ok(Math.abs(bounds.min.y) < 0.015, `${entry.id} feet do not sit at y=0`);
  assert.ok(Math.abs(restHeight - declared.restHeight) < 0.015, `${entry.id} rest-height mismatch`);
  let time = 10;
  model.group.position.set(1.2, 0.08, -0.3);
  model.group.rotation.y = 0.42;
  for (const action of ['idle', 'wave', 'hop', 'listen', 'talk', 'walk']) {
    assert.equal(model.setAction(action), true, `${entry.id} missing ${action}`);
    for (const expression of ['happy', 'curious', 'sad', 'surprised']) {
      assert.equal(model.setExpression(expression), true, `${entry.id} missing ${expression}`);
      model.update(time += 0.08, 0.08);
      inspectObject(model.group, `${entry.id}/${action}/${expression}`);
      assert.deepEqual(model.group.position.toArray(), [1.2, 0.08, -0.3], `${entry.id} animation changed stage placement`);
      assert.equal(model.group.rotation.y, 0.42, `${entry.id} animation changed stage orientation`);
    }
  }
  characters.push({ id: entry.id, ...live, restHeight: Number(restHeight.toFixed(4)) });
  model.dispose(); model.dispose(); disposeParsed(restored);
}

assert.equal(WORLD_CATALOG.length, 11);
assert.equal(new Set(WORLD_CATALOG.map(world => world.id)).size, 11);
assert.deepEqual(new Set(STORIES.map(story => story.id)), new Set(['doudou', 'moon', 'echo']));
const worldIds = new Set(WORLD_CATALOG.map(world => world.id));
const characterIds = new Set(CHARACTER_CATALOG.map(character => character.id));
const visitedWorlds = new Set(); const sceneIds = new Set();
const actionIds = new Set(['celebrate', 'listen', 'bridge', 'boat', 'launch', 'glow']);
let sceneCount = 0; let choiceCount = 0;
for (const story of STORIES) {
  assert.equal(story.scenes.length, 6, `${story.id} needs six scenes`);
  assert.equal(story.chapters.length, 3, `${story.id} needs three chapters`);
  assert.ok(story.ending.title && story.ending.text, `${story.id} lacks an ending`);
  for (const [index, scene] of story.scenes.entries()) {
    sceneCount++;
    assert.ok(!sceneIds.has(scene.id), `Duplicate scene ID ${scene.id}`); sceneIds.add(scene.id);
    assert.ok(worldIds.has(scene.world), `Missing world ${scene.world}`); visitedWorlds.add(scene.world);
    assert.equal(scene.chapter, Math.floor(index / 2) + 1, `${scene.id} chapter sequence`);
    assert.equal(Boolean(scene.final), index === 5, `${scene.id} final-scene marker`);
    assert.ok(scene.objective && scene.question && scene.dialogue.length, `${scene.id} incomplete narrative`);
    assert.ok(scene.cast.length >= 1 && scene.cast.length <= 2, `${scene.id} must keep room for the companion and invention`);
    scene.cast.forEach(actor => assert.ok(characterIds.has(actor.type), `${scene.id} missing character ${actor.type}`));
    const cast = new Set([...scene.cast.map(actor => actor.id), 'companion']);
    [...scene.dialogue, ...(scene.closing || [])].forEach(line => assert.ok(cast.has(line.speaker) && line.text, `${scene.id} has an unavailable speaker`));
    assert.equal(new Set(scene.choices.map(choice => choice.id)).size, scene.choices.length, `${scene.id} repeats a choice ID`);
    assert.ok(scene.choices.length >= 2 && scene.choices.length <= 3, `${scene.id} needs focused choices`);
    for (const choice of scene.choices) {
      choiceCount++;
      assert.ok(choice.label && choice.result && choice.hints.length, `${scene.id}/${choice.id} incomplete choice`);
      assert.ok(cast.has(choice.speaker), `${scene.id}/${choice.id} unavailable result speaker`);
      assert.ok(actionIds.has(choice.action), `${scene.id}/${choice.id} unsupported reaction`);
    }
  }
}
assert.equal(sceneCount, 18);
assert.deepEqual(visitedWorlds, worldIds, 'Not every new world is used by a story');
const worlds = [];
for (const entry of WORLD_CATALOG) {
  const world = createWorld(entry.id, { seed: 42 });
  const measured = inspectObject(world.group, entry.id);
  assert.equal(measured.meshes, world.stats.meshes, `${entry.id} mesh stats mismatch`);
  assert.equal(measured.triangles, world.stats.triangles, `${entry.id} triangle stats mismatch`);
  assert.equal(world.characterSpots.length, 3, `${entry.id} must host three characters`);
  world.characterSpots.forEach(spot => {
    assert.ok([spot.x, spot.y, spot.z].every(Number.isFinite), `${entry.id} invalid standing position`);
    assert.ok(Math.hypot(spot.x, spot.z) < 4 && spot.y >= 0 && spot.y < 0.2, `${entry.id} standing position outside stage`);
  });
  let time = 10;
  world.update(time, 1 / 60);
  for (const action of actionIds) {
    world.react(action);
    for (const delta of [0.1, 0.8, 1.4, 3.2]) { world.update(time += delta, 1 / 60); inspectObject(world.group, `${entry.id}/${action}`); }
  }
  worlds.push({ id: entry.id, ...world.stats });
  world.dispose(); world.dispose();
}

// These mesh factories do not need a DOM or renderer. Exercise the same
// invention construction methods the browser uses, with every add-on present.
const inventions = [];
const inventionStage = Object.create(DioramaStage.prototype);
inventionStage.scene = new THREE.Scene();
inventionStage.invention = null;
for (const kind of ['portal', 'rocket', 'submarine', 'ladder', 'parachute', 'balloon', 'vehicle']) {
  inventionStage.showInvention({ kind, upgrades: ['navigation', 'thruster', 'float', 'rope', 'ladder', 'paddles', 'sail'] });
  inventions.push({ kind, ...inspectObject(inventionStage.invention, `invention/${kind}`) });
}
inventionStage.clearInvention();

const qa = [];
for (const story of STORIES) {
  const data = JSON.parse(await readFile(resolve(dev, `tools/verify-story-${story.id}-results.json`), 'utf8'));
  const event = item => item.event ?? item.step;
  const questions = data.log.filter(item => event(item) === 'scene-question').map(item => item.scene);
  assert.deepEqual(questions, [0, 1, 2, 3, 4, 5], `${story.id} QA lacks a scene`);
  assert.ok(data.log.some(item => event(item) === 'completed-refresh' && item.state.completed), `${story.id} QA lacks a persistent ending`);
  qa.push({ story: story.id, checkedAt: data.checkedAt, scenes: questions.length, refreshedMidStory: data.log.some(item => event(item) === 'refresh-continue'), completedAndSaved: data.log.some(item => event(item) === 'complete-and-save') });
}

console.log(JSON.stringify({
  passed: true,
  scope: 'Local resources, exported geometry, numerical animation lifecycle, three-story contracts, and existing QA evidence coverage',
  notProvenByThisCheck: ['Live release', 'Actual microphone and audio playback', 'All alternative answers', 'AI semantic responses', 'Simulator browser controls'],
  counts: { localReferences: references.length, characters: characters.length, worlds: worlds.length, inventionTypes: inventions.length, storyScenes: sceneCount, choices: choiceCount },
  sharedReadOnlyResources: [...shared].sort(), storageNamespace: 'jma.dev.clay.v1',
  characters, worlds, inventions, qa, sourceHashes,
}, null, 2));
