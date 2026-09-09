/** Geometry, occlusion and pointer regression without a WebGL dependency. */
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import { createWorld } from '../worlds.js';
import { TapFeedback, createObjectTapTarget, firstTapHit, targetForHit } from '../tap-feedback.js';
import { DioramaStage } from '../stage.js';
import { createWowPresentation } from '../wow-visuals.js';

const identity = new THREE.Matrix4().elements;
const reports = [];
for (const id of ['bakery', 'reef', 'cloud', 'home', 'meadow', 'observatory']) {
  const world = createWorld(id), feedback = new TapFeedback();
  world.tapTargets.forEach(target => feedback.add(target));
  assert.ok(world.tapTargets.length >= 30, `${id}: natural elements must remain separately tappable`);
  assert.ok(new Set(world.tapTargets.map(target => target.mode)).size >= 4, `${id}: motion variety`);
  let multiMaterial = 0;
  for (const target of world.tapTargets) {
    world.update(10, 0); world.group.updateMatrixWorld(true);
    const pose = target.object && { position: target.object.position.toArray(), quaternion: target.object.quaternion.toArray(), scale: target.object.scale.toArray() };
    feedback.trigger(target);
    feedback.update(.11); world.group.updateMatrixWorld(true);
    if (target.parts) {
      const geometries = new Set(target.parts.map(part => part.geometry));
      if (geometries.size > 1) multiMaterial++;
      assert.ok(target.parts.some(part => part.position.some((value, index) => value !== part.geometry.attributes.position.array[part.start * 3 + index])), `${id}/${target.name} did not move`);
      // Every material of an assembly must participate, including its children.
      for (const geometry of geometries) assert.ok(target.parts.filter(part => part.geometry === geometry).some(part => part.position.some((value, index) => value !== geometry.attributes.position.array[part.start * 3 + index])), `${id}/${target.name} left one material behind`);
    } else assert.notDeepEqual(target.wrapper.matrix.elements, identity, `${id}/${target.name} has no feedback offset`);
    for (let i = 0; i < 8; i++) { feedback.trigger(target); feedback.update(.04); }
    for (let i = 0; i < 8; i++) feedback.update(.1);
    if (target.parts) for (const part of target.parts) {
      assert.deepEqual(part.geometry.attributes.position.array.slice(part.start * 3, (part.start + part.count) * 3), part.position);
      assert.deepEqual(part.geometry.attributes.normal.array.slice(part.start * 3, (part.start + part.count) * 3), part.normal);
    } else {
      assert.deepEqual(target.wrapper.matrix.elements, identity);
      assert.deepEqual({ position: target.object.position.toArray(), quaternion: target.object.quaternion.toArray(), scale: target.object.scale.toArray() }, pose, 'Tap must not overwrite the authored pose');
    }
    feedback.trigger(target, true); feedback.update(.1); feedback.update(NaN);
    for (let i = 0; i < 3; i++) feedback.update(.1);
    assert.equal(feedback.active.size, 0, 'Reduced-motion feedback must finish promptly');
  }
  assert.ok(multiMaterial > 0, `${id}: expected multi-material assemblies`);
  reports.push({ id, targets: world.tapTargets.length, multiMaterial, drawMeshes: world.stats.meshes });
  feedback.clear(); world.dispose();
}

// A small upright object on the side of the real sphere keeps its foot contact
// through all five motions. The authored baseline is compared in world space.
const sphereWorld = createWorld('bakery'), scene = new THREE.Scene(); scene.add(sphereWorld.group);
const toy = new THREE.Group(), foot = new THREE.Mesh(new THREE.BoxGeometry(.38, .7, .28), new THREE.MeshStandardMaterial()); foot.position.y = .35; toy.add(foot);
toy.position.copy(sphereWorld.surfacePoint(-1.8, 1.4)); toy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sphereWorld.surfaceNormal(-1.8, 1.4)); scene.add(toy);
const toyTarget = createObjectTapTarget(toy, { name: 'test-foot', surface: sphereWorld.planet }), toyFeedback = new TapFeedback(); toyFeedback.add(toyTarget);
const points = [], p = new THREE.Vector3();
for (const x of [-.19, 0, .19]) for (const z of [-.14, 0, .14]) points.push(new THREE.Vector3(x, 0, z));
const clearance = () => { scene.updateMatrixWorld(true); return Math.min(...points.map(point => p.copy(point).applyMatrix4(toy.matrixWorld).distanceTo(sphereWorld.planet.center) - sphereWorld.planet.radius)); };
const restClearance = clearance();
for (const mode of ['hop', 'stretch', 'puff', 'wiggle', 'twist']) {
  toyTarget.mode = mode; toyFeedback.trigger(toyTarget);
  for (let frame = 0; frame < 45; frame++) { toyFeedback.update(1 / 60); assert.ok(clearance() >= restClearance - .006, `${mode} pushes the foot through the ground`); }
  assert.equal(clearance(), restClearance);
}

// Pick the frontmost real mesh. Hidden ancestors and mist do not steal hits;
// an opaque planet must prevent a far-side object from being selected.
const ray = new THREE.Raycaster(); scene.updateMatrixWorld(true);
const normal = toy.position.clone().sub(sphereWorld.planet.center).normalize();
const front = toy.position.clone().addScaledVector(normal, 2);
ray.set(front, normal.clone().negate());
assert.equal(firstTapHit(ray.intersectObjects(scene.children, true))?.target, toyTarget);
const back = sphereWorld.planet.center.clone().addScaledVector(normal, -sphereWorld.planet.radius - 3);
ray.set(back, normal);
assert.notEqual(firstTapHit(ray.intersectObjects(scene.children, true))?.target, toyTarget, 'Back face clicked through the planet');
toy.visible = false; ray.set(front, normal.clone().negate());
assert.notEqual(firstTapHit(ray.intersectObjects(scene.children, true))?.target, toyTarget);
toy.visible = true;
const actor = new THREE.Mesh(new THREE.SphereGeometry(.2), new THREE.MeshBasicMaterial()); actor.userData.actorId = 'friend';
assert.equal(firstTapHit([{ object: actor, distance: 1 }])?.actorId, 'friend');

// Same-chapter props retain their existing reveal and idle-motion contracts.
globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = () => {};
const propsStage = { scene, world: sphereWorld, style: { apply() {} }, reduced: false,
  registerTapObject(object, options) { const target = createObjectTapTarget(object, { surface: sphereWorld.planet, ...options }); toyFeedback.add(target); return () => toyFeedback.remove(target); } };
const props = createWowPresentation(propsStage);
props.set({ chapter: 1, scene: 8, kind: 'color', props: ['torch', 'radio', 'jar'], colors: ['yellow'], visual: { shape: 'heart', color: '#ffff00' }, progress: .9 });
const presentation = scene.getObjectByName('wow-story-props');
for (const name of ['torch', 'radio', 'jar', 'door', 'key']) {
  const object = scene.getObjectByName(`wow-${name}`), mesh = object.children.find(child => child.isMesh && !child.userData.tapIgnore);
  const target = targetForHit({ object: mesh }); assert.ok(target, `${name} cannot be selected`);
  const originalPosition = object.position.toArray(), originalScale = object.scale.toArray();
  toyFeedback.trigger(target); toyFeedback.update(.1);
  props.set({ scene: 9 });
  assert.equal(scene.getObjectByName('wow-story-props'), presentation);
  for (let i = 0; i < 8; i++) toyFeedback.update(.1);
  assert.deepEqual(object.position.toArray(), originalPosition);
  assert.deepEqual(object.scale.toArray(), originalScale);
  assert.deepEqual(target.wrapper.matrix.elements, identity);
}
props.dispose(); assert.equal(toyFeedback.targets.size, 1, 'Disposed props leaked tap targets');
toyFeedback.clear(); sphereWorld.dispose(); foot.geometry.dispose(); foot.material.dispose(); actor.geometry.dispose(); actor.material.dispose();

// The actual stage handlers: up-only displacement, a drag that returns to its
// start, canceled capture and multi-touch all must remain non-taps.
const handlers = {}, canvas = { addEventListener(type, handler) { handlers[type] = handler; }, setPointerCapture() {} };
let taps = 0;
const pointerStage = { renderer: { domElement: canvas }, pointers: new Map(), zoom: 1, yaw: 0, pitch: .25, updateCamera() {}, resize() {}, pick() { taps++; } };
DioramaStage.prototype.installPointer.call(pointerStage);
const event = (x, y, id = 1) => ({ clientX: x, clientY: y, pointerId: id, button: 0 });
handlers.pointerdown(event(10, 10)); handlers.pointerup(event(12, 12)); assert.equal(taps, 1);
handlers.pointerdown(event(10, 10)); handlers.pointerup(event(50, 10)); assert.equal(taps, 1);
handlers.pointerdown(event(10, 10)); handlers.pointermove(event(50, 10)); handlers.pointermove(event(10, 10)); handlers.pointerup(event(10, 10)); assert.equal(taps, 1);
handlers.pointerdown(event(10, 10)); handlers.pointerdown(event(20, 20, 2)); handlers.pointerup(event(10, 10)); handlers.pointerup(event(20, 20, 2)); assert.equal(taps, 1);
handlers.pointerdown(event(10, 10)); handlers.pointercancel(event(10, 10)); handlers.pointerup(event(10, 10)); assert.equal(taps, 1);
handlers.pointerdown(event(10, 10)); handlers.lostpointercapture(event(10, 10)); handlers.pointerup(event(10, 10)); assert.equal(taps, 1);
console.log(JSON.stringify({ passed: true, worlds: reports, coverage: 'all six worlds; all targets; all materials together; rapid repeat; exact vertex/normal/pose reset; contact; visibility/planet occlusion; props persist/dispose; tap/drag/pinch/cancel; reduced motion' }, null, 2));
