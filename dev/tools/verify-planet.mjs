/** Read-only geometry/gravity regression: node dev/tools/verify-planet.mjs */
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import { createPlanetSurface } from '../planet.js';
import { WORLD_CATALOG, createWorld } from '../worlds.js';

const surface = createPlanetSurface();
const up = new THREE.Vector3(0, 1, 0);
let mappedSamples = 0;
for (const x of [-4.6, -2.8, -1.2, 0, 1.2, 2.8, 4.6]) {
  for (const z of [-4.6, -2.8, -1.2, 0, 1.2, 2.8, 4.6]) {
    const normal = surface.surfaceNormal(x, z);
    assert.ok(Math.abs(normal.length() - 1) < 1e-12, 'Surface normal must have unit length');
    for (const height of [0, 0.045, 0.5, 2.4]) {
      mappedSamples++;
      const point = surface.surfacePoint(x, z, height);
      assert.ok(Math.abs(point.distanceTo(surface.center) - surface.radius - height) < 1e-12, 'Height must measure radial distance');
      assert.ok(point.clone().sub(surface.center).normalize().dot(normal) > 1 - 1e-12, 'Point and normal must share local gravity');
      const mappedUp = surface.mapNormal(x, height, z, up);
      assert.ok(mappedUp.dot(normal) > 1 - 1e-10, 'A flat ground normal must curve outward');
    }
    const delta = 1e-4;
    const dx = surface.surfacePoint(x + delta, z, 0.3).sub(surface.surfacePoint(x - delta, z, 0.3));
    const dz = surface.surfacePoint(x, z + delta, 0.3).sub(surface.surfacePoint(x, z - delta, 0.3));
    const numerical = dz.cross(dx).normalize();
    assert.ok(numerical.dot(normal) > 1 - 1e-8, 'Normal disagrees with actual curved geometry');
  }
}
assert.ok(surface.surfacePoint(0, 0).length() < 1e-12, 'North-pole surface must remain y=0');

const report = [];
const position = new THREE.Vector3(); const direction = new THREE.Vector3();
for (const definition of WORLD_CATALOG) {
  const world = createWorld(definition.id, { seed: 42 });
  assert.equal(world.planet.radius, 4.2);
  assert.deepEqual(world.planet.center.toArray(), [0, -4.2, 0]);
  let body; const anchors = []; const geometries = new Set();
  world.group.traverse(node => {
    if (node.userData.planetBody) body = node;
    if (node.userData.planetAnchor) anchors.push(node);
    assert.ok(!node.isBone && !node.isSkinnedMesh, 'A planet cannot depend on the old skeleton');
    if (node.geometry) {
      geometries.add(node.geometry.uuid);
      for (const attribute of Object.values(node.geometry.attributes)) {
        for (const value of attribute.array) assert.ok(Number.isFinite(value), `${definition.id} invalid vertex`);
      }
    }
  });
  assert.ok(body, `${definition.id} missing its complete sphere`);
  world.group.updateMatrixWorld(true);
  const bodyBounds = new THREE.Box3().setFromObject(body);
  const bodySize = bodyBounds.getSize(new THREE.Vector3());
  bodySize.toArray().forEach(size => assert.ok(Math.abs(size - world.planet.radius * 2) < 1e-5, `${definition.id} sphere was flattened`));
  assert.ok(Math.abs(bodyBounds.min.y + 8.4) < 1e-5 && Math.abs(bodyBounds.max.y) < 1e-5, `${definition.id} lacks a full south pole`);
  const ray = new THREE.Raycaster();
  for (let i = 0; i < 42; i++) {
    // Avoid exact UV-pole vertices, where a ray lies on every triangle edge.
    const y = 1 - (i + 0.5) / 42 * 2; const angle = i * 2.3999632297;
    direction.set(Math.sqrt(Math.max(0, 1 - y * y)) * Math.cos(angle), y, Math.sqrt(Math.max(0, 1 - y * y)) * Math.sin(angle));
    ray.set(direction.clone().multiplyScalar(world.planet.radius + 1).add(world.planet.center), direction.clone().negate());
    const hit = ray.intersectObject(body)[0];
    assert.ok(hit && Math.abs(hit.distance - 1) < 0.008, `${definition.id} has a missing or non-spherical sector`);
  }
  assert.equal(world.group.userData.secondaryAnchors.length, 14, `${definition.id} lacks side and reverse terrain`);
  assert.ok(world.group.userData.secondaryAnchors.filter(item => item.normal[1] < -0.2).length >= 7, `${definition.id} leaves its southern hemisphere unmodelled`);
  const poses = () => anchors.map(anchor => {
    const object = anchor.children[0]; const planar = object.position;
    const expected = world.surfacePoint(planar.x, planar.z, planar.y);
    object.getWorldPosition(position);
    assert.ok(position.distanceTo(expected) < 1e-8, `${definition.id}/${anchor.name} drifted away from its radial anchor`);
    direction.set(0, 1, 0).transformDirection(anchor.matrix);
    assert.ok(direction.dot(world.surfaceNormal(planar.x, planar.z)) > 1 - 1e-10, `${definition.id} dynamic landmark ignores local gravity`);
    return [...anchor.matrix.elements, ...object.matrix.elements];
  });
  let time = 10;
  for (const action of ['celebrate', 'listen', 'bridge', 'boat', 'launch', 'glow']) {
    world.update(time, 1 / 60); world.react(action);
    for (const delta of [0.12, 0.7, 1.4, 3.2]) {
      time += delta; world.update(time, 1 / 60); world.group.updateMatrixWorld(true); poses();
    }
  }
  world.update(time, 0); world.group.updateMatrixWorld(true); const unchanged = poses();
  for (let i = 0; i < 20; i++) { world.update(time, 0); world.group.updateMatrixWorld(true); }
  assert.deepEqual(poses(), unchanged, `${definition.id} accumulates transforms at a fixed animation time`);
  const after = new Set(); world.group.traverse(node => { if (node.geometry) after.add(node.geometry.uuid); });
  assert.deepEqual(after, geometries, `${definition.id} allocates geometry during animation`);
  report.push({ id: definition.id, radius: world.planet.radius, dynamicAnchors: anchors.length, sphericalRaySamples: 42, ...world.stats });
  world.dispose(); world.dispose();
}
console.log(JSON.stringify({ passed: true, mappedSamples, requirements: ['Complete closed sphere', 'Radial points and normals', 'Curved static geometry', 'Side and southern terrain', 'No cumulative dynamic transforms', 'No per-frame geometry allocation', 'Original six reactions remain valid'], worlds: report }, null, 2));
