import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import { createPlanetSurface } from '../planet.js';
import { createSurfaceWalker, surfaceDistance } from '../exploration-navigation.js';
import { createWorld } from '../worlds.js';
import { createExplorationWorld, createChildAvatar } from '../exploration-world.js';

const world = createWorld('bakery', { radius: 10 }), scenery = createExplorationWorld(world);
const walker = createSurfaceWalker({ radius: 10, obstacles: scenery.obstacles, initial: world.surfaceNormal(.5, 2.4) });
function travel(goal) {
  assert.ok(walker.go(goal), 'A route must be available');
  for (let i = 0; i < 3000 && walker.moving; i++) {
    walker.step(1 / 60);
    assert.ok(Math.abs(walker.normal.length() - 1) < 1e-10);
    for (const obstacle of scenery.obstacles) assert.ok(surfaceDistance(walker.normal, obstacle.normal, 10) >= obstacle.radius + .265, 'Walked into a solid landmark');
    scenery.update(1 / 60, walker.normal, false);
  }
  assert.equal(walker.moving, false, 'Route got stuck');
}
for (const zone of scenery.zones.slice(1)) travel(zone.normal);
travel(scenery.zones[0].normal);
for (const kind of ['fish', 'flower', 'mushroom', 'bell']) assert.ok(scenery.reactions.some(r => r.kind === kind && r.count > 0), `${kind} did not react on approach`);
const counts = scenery.reactions.map(r => r.count);
for (let i = 0; i < 300; i++) scenery.update(1 / 60, walker.normal, false);
assert.deepEqual(scenery.reactions.map(r => r.count), counts, 'Standing still retriggers scenery');
travel(new THREE.Vector3(0, -1, 0)); travel(scenery.zones[0].normal);
const surface = createPlanetSurface(10);
const straight = createSurfaceWalker({ radius: 10, initial: surface.surfaceNormal(0, 0) });
straight.go(surface.surfaceNormal(3, 0));
const before = straight.normal.clone(); for (let i = 0; i < 60; i++) straight.step(1 / 60);
assert.ok(Math.abs(surfaceDistance(before, straight.normal, 10) - 2.25) < .001, 'Movement speed should not depend on frame rate');
straight.stop(); const stopped = straight.normal.clone(); straight.step(.05); assert.equal(stopped.distanceTo(straight.normal), 0);
straight.go(surface.surfaceNormal(5, 0)); straight.step(.05, new THREE.Vector3(0, 0, 1)); assert.equal(straight.moving, false, 'Keyboard must cancel click route');
const child = createChildAvatar(); child.update(.05, true, false); child.dispose();
scenery.dispose(); world.dispose();
console.log('Exploration verified: all five regions, obstacle clearance, lake shore, full sphere, environmental reactions, stable speed, stop and keyboard override.');

for (const id of ['meadow', 'observatory', 'reef', 'pocket', 'cloud', 'moon', 'home']) {
  const planet = createWorld(id, { radius: 10 });
  const areas = createExplorationWorld(planet);
  const navigation = createSurfaceWalker({ radius: 10, obstacles: areas.obstacles, initial: planet.surfaceNormal(.5, 2.4) });
  for (const zone of [...areas.zones.slice(1), areas.zones[0]]) {
    assert.ok(navigation.go(zone.normal), `${id}: no route to ${zone.id}`);
    for (let i = 0; i < 2000 && navigation.moving; i++) {
      navigation.step(.05);
      for (const obstacle of areas.obstacles) assert.ok(surfaceDistance(navigation.normal, obstacle.normal, 10) >= obstacle.radius + .265, `${id}: collision`);
    }
    assert.equal(navigation.moving, false, `${id}: route stuck`);
  }
  areas.dispose(); planet.dispose();
}
console.log('All eight world themes passed routing and collision checks.');
