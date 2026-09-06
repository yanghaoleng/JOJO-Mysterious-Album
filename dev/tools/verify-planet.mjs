/** Read-only geometry/gravity regression: node dev/tools/verify-planet.mjs */
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import { createPlanetSurface } from '../planet.js';
import { WORLD_CATALOG, createWorld } from '../worlds.js';
import { WORLD_ENVIRONMENTS } from '../environments.js';

const up = new THREE.Vector3(0, 1, 0);
const luminance = hex => [1, 3, 5]
  .map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
  .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
let mappedSamples = 0;
const radii = Object.values(WORLD_ENVIRONMENTS).map(environment => environment.radius);
assert.equal(new Set(radii).size, WORLD_CATALOG.length, 'Worlds need actually different radii');
assert.ok(Math.max(...radii) - Math.min(...radii) >= 2, 'Planet sizes should meaningfully vary');
for (const radius of radii) {
  const surface = createPlanetSurface(radius);
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
}

const report = [];
const position = new THREE.Vector3(); const direction = new THREE.Vector3();
for (const definition of WORLD_CATALOG) {
  const world = createWorld(definition.id, { seed: 42 });
  const expectedEnvironment = WORLD_ENVIRONMENTS[definition.id];
  const radius = world.planet.radius;
  assert.equal(radius, expectedEnvironment.radius);
  assert.ok(radius >= 3.5 && radius <= 6, `${definition.id} radius is outside the authored range`);
  assert.deepEqual(world.planet.center.toArray(), [0, -radius, 0]);
  assert.deepEqual(world.group.scale.toArray(), [1, 1, 1], 'Different worlds must not use visual scaling');
  assert.deepEqual(world.atmosphere, expectedEnvironment.atmosphere);
  const expectedPeriod = ['observatory', 'moon', 'meadow'].includes(definition.id) ? 'night' : definition.id === 'pocket' ? 'dusk' : 'day';
  assert.equal(world.atmosphere.period, expectedPeriod, `${definition.id} wrong story time of day`);
  for (const name of ['base', 'glow', 'horizon', 'ink', 'muted', 'accent', 'paper']) {
    assert.match(world.atmosphere[name], /^#[a-f\d]{6}$/i, `${definition.id} invalid atmosphere ${name}`);
  }
  for (const background of ['base', 'glow', 'horizon', 'paper']) {
    assert.ok(luminance(world.atmosphere[background]) > 0.55, `${definition.id} should keep a pale diffused background`);
    for (const foreground of ['ink', 'muted']) {
      assert.ok(contrast(world.atmosphere[foreground], world.atmosphere[background]) >= 4.5, `${definition.id} ${foreground} is unreadable on ${background}`);
    }
  }
  const { lighting } = world.atmosphere;
  for (const name of ['sky', 'bounce', 'sun', 'rim']) assert.match(lighting[name], /^#[a-f\d]{6}$/i);
  for (const name of ['hemisphereIntensity', 'sunIntensity', 'rimIntensity', 'exposure']) {
    assert.ok(Number.isFinite(lighting[name]) && lighting[name] > 0, `${definition.id} invalid lighting ${name}`);
  }
  assert.ok(lighting.hemisphereIntensity >= 1.7 && lighting.sunIntensity >= 2 && lighting.exposure >= 1, `${definition.id} faces should remain well lit`);
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
  assert.ok(Math.abs(bodyBounds.min.y + radius * 2) < 1e-5 && Math.abs(bodyBounds.max.y) < 1e-5, `${definition.id} lacks a full south pole`);
  const ray = new THREE.Raycaster();
  for (let i = 0; i < 42; i++) {
    // Avoid exact UV-pole vertices, where a ray lies on every triangle edge.
    const y = 1 - (i + 0.5) / 42 * 2; const angle = i * 2.3999632297;
    direction.set(Math.sqrt(Math.max(0, 1 - y * y)) * Math.cos(angle), y, Math.sqrt(Math.max(0, 1 - y * y)) * Math.sin(angle));
    ray.set(direction.clone().multiplyScalar(world.planet.radius + 1).add(world.planet.center), direction.clone().negate());
    const hit = ray.intersectObject(body)[0];
    const maximumFacetSag = radius * (1 - Math.cos(Math.PI / 96) * Math.cos(Math.PI / 72)) + 1e-4;
    assert.ok(hit && Math.abs(hit.distance - 1) < maximumFacetSag, `${definition.id} has a missing or non-spherical sector`);
  }
  assert.equal(world.group.userData.secondaryAnchors.length, 14, `${definition.id} lacks side and reverse terrain`);
  assert.ok(world.group.userData.secondaryAnchors.filter(item => item.normal[1] < -0.2).length >= 7, `${definition.id} leaves its southern hemisphere unmodelled`);
  for (const anchor of world.group.userData.secondaryAnchors) {
    const point = new THREE.Vector3(...anchor.point);
    assert.ok(Math.abs(point.distanceTo(world.planet.center) - radius) < 1e-10, `${definition.id} reverse terrain ignores the new radius`);
    assert.ok(point.sub(world.planet.center).normalize().dot(new THREE.Vector3(...anchor.normal)) > 1 - 1e-10, `${definition.id} reverse terrain is not locally upright`);
  }
  let riverMinimumClearance = null;
  if (['reef', 'bridge', 'cove'].includes(definition.id)) {
    // This unique water material identifies the actual post-batching geometry,
    // so the test validates all emitted triangles rather than a duplicate formula.
    const waterColor = new THREE.Color('#81b7b3');
    const triangle = new THREE.Triangle(); const closest = new THREE.Vector3();
    let waterTriangles = 0;
    world.group.traverse(node => {
      if (!node.isMesh || !node.material.color?.equals(waterColor)) return;
      const attribute = node.geometry.getAttribute('position'); const index = node.geometry.index;
      for (let i = 0, length = index ? index.count : attribute.count; i < length; i += 3) {
        [triangle.a, triangle.b, triangle.c].forEach((target, j) => target.fromBufferAttribute(attribute, index ? index.getX(i + j) : i + j).applyMatrix4(node.matrixWorld));
        triangle.closestPointToPoint(world.planet.center, closest);
        const clearance = closest.distanceTo(world.planet.center) - radius;
        riverMinimumClearance = Math.min(riverMinimumClearance ?? Infinity, clearance);
        assert.ok(clearance > 0.001, `${definition.id} river triangle cuts into the planet`);
        waterTriangles++;
      }
    });
    assert.equal(waterTriangles, 112 * 4 * 2, `${definition.id} lost cross-river subdivision`);
  }
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
  report.push({ id: definition.id, radius, period: world.atmosphere.period, riverMinimumClearance, dynamicAnchors: anchors.length, sphericalRaySamples: 42, ...world.stats });
  world.dispose(); world.dispose();
}
console.log(JSON.stringify({ passed: true, mappedSamples, requirements: ['Eleven actual different planet radii', 'Story-specific readable day/dusk/night atmospheres', 'Complete closed sphere', 'Radial points and normals', 'Curved static geometry', 'Positive clearance on every actual river triangle', 'Side and southern terrain', 'No cumulative dynamic transforms', 'No per-frame geometry allocation', 'Original six reactions remain valid'], worlds: report }, null, 2));
