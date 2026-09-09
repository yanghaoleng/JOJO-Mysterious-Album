/** Node-only contour ownership / geometry / picking contracts.
 * Runs real Three objects, not WebGL. Visual/shader validation is separate.
 * Run: node src/ink-planet-lines.test.mjs
 */
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createWorld, WORLD_CATALOG } from '../dev/worlds.js';
import { createInkPlanetLines } from './ink-planet-lines.js';

const results = [];
function test(name, run) {
  try { run(); results.push({ name, pass: true }); }
  catch (error) { results.push({ name, pass: false, error: error.stack }); }
}
const marks = group => {
  const list = []; group.traverse(node => { if (node.userData.decorativeInkLine) list.push(node); }); return list;
};
function fixture(surface = 'wood') {
  const root = new THREE.Group(), parent = new THREE.Group(); root.add(parent);
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = new THREE.MeshStandardMaterial({ color: '#c8b192' });
  material.userData.handcraftedSurface = surface;
  const mesh = new THREE.Mesh(geometry, material); parent.add(mesh);
  return { root, parent, mesh, geometry, material, clean: () => { geometry.dispose(); material.dispose(); } };
}
function observeDisposals(resources) {
  const counts = new Map([...resources].map(resource => [resource, 0]));
  for (const [resource] of counts) resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
  return counts;
}

test('dispose removes only owned marks; borrowed geometry/material never disposed', () => {
  const f = fixture(), lines = createInkPlanetLines();
  const borrowed = observeDisposals([f.geometry, f.material]);
  lines.apply(f.root);
  const children = marks(f.root);
  assert.equal(children.length, 2);
  assert.equal(children.find(n => n.name === 'picturebook-pencil-contour').geometry, f.geometry);
  const ownGeometry = new Set(children.map(n => n.geometry).filter(g => g !== f.geometry));
  const ownMaterials = new Set(children.map(n => n.material));
  const owned = observeDisposals([...ownGeometry, ...ownMaterials]);
  const rootChildren = [...f.parent.children];
  lines.dispose(); lines.dispose();
  assert.deepEqual([...borrowed.values()], [0, 0]);
  assert.ok([...owned.values()].every(count => count === 1));
  assert.deepEqual(f.parent.children, rootChildren);
  assert.equal(f.mesh.parent, f.parent); assert.equal(f.mesh.geometry, f.geometry); assert.equal(f.mesh.material, f.material);
  assert.equal(marks(f.root).length, 0); assert.equal(f.mesh.userData.inkLinesApplied, undefined);
  assert.deepEqual(lines.diagnostics(), { meshes: 0, geometries: 0, materials: 0, disposed: true });
  lines.apply(f.root); assert.equal(marks(f.root).length, 0); f.clean();
});

test('apply is idempotent, and another owner cannot remove an existing contour', () => {
  const f = fixture(), a = createInkPlanetLines(), b = createInkPlanetLines();
  a.apply(f.root); const original = marks(f.root), stats = a.diagnostics();
  a.apply(f.root); b.apply(f.root);
  assert.deepEqual(marks(f.root), original); assert.deepEqual(a.diagnostics(), stats);
  b.dispose(); assert.deepEqual(marks(f.root), original);
  a.dispose();
  const next = createInkPlanetLines(); next.apply(f.root); assert.equal(marks(f.root).length, 2);
  next.dispose(); f.clean();
});

test('transparent water and legacy textured/basic actors receive no new marks', () => {
  const f = fixture(), basic = new THREE.MeshBasicMaterial(), water = new THREE.MeshStandardMaterial({ transparent: true, opacity: .7 });
  const actor = new THREE.Mesh(f.geometry, basic), sea = new THREE.Mesh(f.geometry, water);
  f.root.add(actor, sea);
  const lines = createInkPlanetLines(); lines.apply(f.root);
  assert.equal(actor.children.length, 0); assert.equal(sea.children.length, 0);
  assert.equal(lines.diagnostics().meshes, 1);
  lines.dispose(); basic.dispose(); water.dispose(); f.clean();
});

test('marks stay local to their moving source mesh and preserve its transforms', () => {
  const f = fixture(), lines = createInkPlanetLines();
  f.parent.position.set(3, -2, .5); f.parent.rotation.set(.4, -.7, .2); f.parent.scale.set(1.2, .8, 1.4);
  f.mesh.position.set(.4, .3, -.1); f.mesh.rotation.set(.1, .2, .3);
  const before = { p: f.mesh.position.toArray(), q: f.mesh.quaternion.toArray(), s: f.mesh.scale.toArray() };
  lines.apply(f.root);
  for (const angle of [-.85, 0, .85]) {
    f.parent.rotation.y = angle; f.root.updateMatrixWorld(true);
    for (const mark of marks(f.root)) {
      assert.equal(mark.parent, f.mesh);
      assert.deepEqual(mark.matrixWorld.elements, f.mesh.matrixWorld.elements);
    }
  }
  assert.deepEqual({ p: f.mesh.position.toArray(), q: f.mesh.quaternion.toArray(), s: f.mesh.scale.toArray() }, before);
  lines.dispose(); f.clean();
});

test('contours and creases never enter recursive raycasts, including scenery blockers', () => {
  const f = fixture(), lines = createInkPlanetLines(); lines.apply(f.root); f.root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -1));
  const hits = ray.intersectObject(f.root, true);
  assert.ok(hits.length > 0); assert.ok(hits.every(hit => hit.object === f.mesh));
  for (const mark of marks(f.root)) {
    assert.deepEqual(ray.intersectObject(mark, true), []);
    const target = []; mark.raycast(ray, target); assert.deepEqual(target, []);
    assert.equal(mark.material.depthTest, true); assert.equal(mark.material.depthWrite, false);
    assert.equal(mark.material.transparent, true);
  }
  lines.dispose(); f.clean();
});

test('screen-width uniforms update for mobile/desktop without geometry mutation', () => {
  const f = fixture(), lines = createInkPlanetLines(); lines.apply(f.root);
  const before = Array.from(f.geometry.attributes.position.array);
  for (const [width, height] of [[390, 844], [360, 800], [1280, 720], [0, -10]]) {
    lines.resize(width, height);
    for (const mark of marks(f.root)) {
      assert.deepEqual(mark.material.uniforms.uViewport.value.toArray(), [Math.max(1, width), Math.max(1, height)]);
      assert.ok(Number.isFinite(mark.material.uniforms.uWidth.value));
      assert.equal(mark.material.uniforms.uInk.value.isColor, true);
    }
  }
  assert.deepEqual(Array.from(f.geometry.attributes.position.array), before); lines.dispose(); f.clean();
});

test('all 11 worlds keep original meshes, finite line buffers, and single-owner disposal', () => {
  const originalManagement = THREE.ColorManagement.enabled;
  try {
    for (const enabled of [false, true]) {
      THREE.ColorManagement.enabled = enabled;
      for (const { id } of WORLD_CATALOG) {
        const world = createWorld(id), lines = createInkPlanetLines(), sources = new Map(), borrowed = new Set();
        world.group.traverse(mesh => {
          if (!mesh.isMesh) return;
          sources.set(mesh, { geometry: mesh.geometry, material: mesh.material, matrix: mesh.matrix.toArray() });
          borrowed.add(mesh.geometry);
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) borrowed.add(material);
        });
        const disposals = observeDisposals(borrowed);
        lines.apply(world.group); const first = lines.diagnostics();
        lines.apply(world.group); assert.deepEqual(lines.diagnostics(), first, `${id}: apply duplicated marks`);
        assert.ok(first.meshes > 0, `${id}: no contour candidates`);
        for (const mark of marks(world.group)) {
          assert.ok(sources.has(mark.parent), `${id}: mark is not a direct source child`);
          for (const attr of Object.values(mark.geometry.attributes)) assert.ok(Array.from(attr.array).every(Number.isFinite), `${id}: non-finite line buffer`);
          if (mark.geometry.index) assert.ok(Array.from(mark.geometry.index.array).every(i => i < mark.geometry.attributes.position.count), `${id}: invalid line index`);
        }
        lines.dispose();
        assert.ok([...disposals.values()].every(count => count === 0), `${id}: borrowed resource disposed`);
        for (const [mesh, before] of sources) {
          assert.equal(mesh.geometry, before.geometry); assert.equal(mesh.material, before.material);
          assert.deepEqual(mesh.matrix.toArray(), before.matrix); assert.equal(mesh.userData.inkLinesApplied, undefined);
        }
        world.dispose();
        assert.ok([...disposals.values()].every(count => count === 1), `${id}: world disposal should own every original resource exactly once`);
        assert.equal(THREE.ColorManagement.enabled, enabled);
      }
    }
  } finally { THREE.ColorManagement.enabled = originalManagement; }
});

console.log(JSON.stringify({ pass: results.every(result => result.pass), results }, null, 2));
if (results.some(result => !result.pass)) process.exitCode = 1;
