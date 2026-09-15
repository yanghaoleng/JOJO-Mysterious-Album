/** Numeric regression only; no renderer, browser, build, files or network.
 * Run: node dev/tools/verify-camera-drift.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { CAMERA_DRIFT_DEFAULTS as defaults, createCameraDrift } from '../camera-drift.js';
import * as THREE from '../../vendor/three.module.js';
import { DioramaStage } from '../stage.js';
import { createPlanetSurface } from '../planet.js';
import { createWowCharacter } from '../wow-visuals.js';

const near = (actual, expected, epsilon = 1e-10) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} differs from ${expected}`);
const sameOffset = (actual, expected, epsilon) => { near(actual.yaw, expected.yaw, epsilon); near(actual.pitch, expected.pitch, epsilon); };
const zero = value => assert.deepEqual(value, { yaw: 0, pitch: 0 });
const advance = (drift, seconds, step = 1 / 60, flags) => {
  const count = Math.floor(seconds / step);
  for (let i = 0; i < count; i++) drift.update(step, flags);
  const remaining = seconds - count * step;
  if (remaining > 1e-12) drift.update(remaining, flags);
  return drift.offset;
};

test('42-second trajectory closes without a jump after fade-in', () => {
  const drift = createCameraDrift({ enabled: true });
  const before = drift.update(7.25);
  const after = drift.update(defaults.period);
  sameOffset(after, before);
  near(drift.state.weight, 1);
  const edge = createCameraDrift({ enabled: true });
  const left = edge.update(defaults.period - .001);
  const right = edge.update(.002);
  assert.ok(Math.hypot(right.yaw - left.yaw, right.pitch - left.pitch) < .00003);
});

test('trajectory remains within gentle angular bounds over many loops', () => {
  const drift = createCameraDrift({ enabled: true });
  let yawMin = Infinity, yawMax = -Infinity, pitchMin = Infinity, pitchMax = -Infinity;
  for (let i = 0; i < 42 * 60 * 20; i++) {
    const offset = drift.update(1 / 60);
    assert.ok(Math.abs(offset.yaw) <= .075 + 1e-12);
    assert.ok(Math.abs(offset.pitch) <= .02 + 1e-12);
    yawMin = Math.min(yawMin, offset.yaw); yawMax = Math.max(yawMax, offset.yaw);
    pitchMin = Math.min(pitchMin, offset.pitch); pitchMax = Math.max(pitchMax, offset.pitch);
  }
  near(yawMin, -.075, .000001); near(yawMax, .075, .000001);
  near(pitchMin, -.02, .000001); near(pitchMax, .02, .000001);
  assert.ok(drift.state.phase >= 0 && drift.state.phase < defaults.period);
});

test('frame rate and time partition do not change the path or fade', () => {
  for (const time of [.4, 1.7, 3, 8.25, 47.37]) {
    const one = createCameraDrift({ enabled: true }); one.update(time);
    for (const rate of [30, 60, 120]) {
      const many = createCameraDrift({ enabled: true }); advance(many, time, 1 / rate);
      sameOffset(many.offset, one.offset);
      near(many.state.weight, one.state.weight);
    }
  }
  const one = createCameraDrift({ enabled: true }); const many = createCameraDrift({ enabled: true });
  one.update(11); many.update(11); one.pause(); many.pause();
  one.update(9.3); advance(many, 9.3, .037);
  sameOffset(many.offset, one.offset); near(many.state.weight, one.state.weight);
});

test('disabled and reduced motion are exactly still, including state changes', () => {
  const disabled = createCameraDrift(); zero(disabled.update(100)); near(disabled.state.phase, 0);
  const reduced = createCameraDrift({ enabled: true, reduced: true }); zero(reduced.update(100));
  const drift = createCameraDrift({ enabled: true }); drift.update(9);
  assert.notEqual(drift.offset.yaw, 0);
  zero(drift.update(.01, { reduced: true })); near(drift.state.weight, 0);
  zero(drift.update(10)); near(drift.state.phase, 0);
  zero(drift.update(0, { reduced: false }));
  drift.update(5); zero(drift.update(.01, { enabled: false }));
  zero(drift.update(5));
});

test('interaction fades out smoothly and owns the complete quiet window', () => {
  const drift = createCameraDrift({ enabled: true }); drift.update(10);
  const original = drift.offset;
  drift.interaction(); sameOffset(drift.offset, original);
  const first = drift.update(1 / 60, { interacting: true });
  assert.ok(Math.hypot(first.yaw - original.yaw, first.pitch - original.pitch) < .001);
  assert.ok(drift.state.weight < 1 && drift.state.weight > .99);
  advance(drift, 1, 1 / 60, { interacting: true });
  zero(drift.offset); near(drift.state.holdRemaining, 8);
  advance(drift, 7.9); zero(drift.offset); assert.ok(drift.state.holdRemaining > 0);
  drift.update(.05); zero(drift.offset);
  drift.update(.15); assert.ok(drift.state.weight > 0 && drift.state.weight < .001);
  drift.update(3); near(drift.state.weight, 1);
});

test('wheel and viewport pauses extend cooldown without restarting fade-out', () => {
  const drift = createCameraDrift({ enabled: true }); drift.update(10);
  drift.pause(); drift.update(.4); const halfway = drift.state.weight;
  near(halfway, .5);
  drift.pause(); drift.update(.4); zero(drift.offset);
  drift.update(5); drift.pause();
  drift.update(7.999); zero(drift.offset);
  drift.update(.101); assert.ok(drift.state.weight > 0 && drift.state.weight < .001);
  drift.pause(1); assert.ok(drift.state.holdRemaining >= 8);
});

test('startup and restoration are gradual, with no instantaneous angle step', () => {
  const drift = createCameraDrift({ enabled: true }); zero(drift.offset);
  const first = drift.update(1 / 60);
  assert.ok(Math.abs(first.yaw) < .000001 && Math.abs(first.pitch) < .000001);
  near(drift.update(3).pitch, .02 * Math.cos(drift.state.phase / 42 * Math.PI * 2));
  drift.pause(); drift.update(8); zero(drift.offset);
  const resumed = drift.update(1 / 60);
  assert.ok(Math.abs(resumed.yaw) < .000001 && Math.abs(resumed.pitch) < .000001);
});

test('additive offsets never mutate or accumulate into user orbit and target', () => {
  const baseline = Object.freeze({ yaw: .7, pitch: .31, zoom: 1.5 });
  const target = Object.freeze({ x: 1.2, y: 4.5, z: -.7 });
  const drift = createCameraDrift({ enabled: true });
  let largest = 0;
  for (let i = 0; i < 5000; i++) {
    const offset = drift.update(.03);
    const yaw = baseline.yaw + offset.yaw, pitch = baseline.pitch + offset.pitch, radius = 23;
    const position = { x: Math.sin(yaw) * Math.cos(pitch) * radius + target.x, y: Math.sin(pitch) * radius + target.y, z: Math.cos(yaw) * Math.cos(pitch) * radius + target.z };
    near(Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z), radius);
    largest = Math.max(largest, Math.abs(yaw - baseline.yaw));
  }
  assert.ok(largest <= .075 + 1e-12);
  assert.deepEqual(baseline, { yaw: .7, pitch: .31, zoom: 1.5 });
  assert.deepEqual(target, { x: 1.2, y: 4.5, z: -.7 });
  assert.ok(Object.isFrozen(drift.offset));
  drift.reset(); zero(drift.offset); near(drift.state.phase, 0); near(drift.state.holdRemaining, 0);
});

test('invalid elapsed time does not jump or corrupt the camera', () => {
  const drift = createCameraDrift({ enabled: true }); drift.update(10);
  const offset = drift.offset;
  for (const dt of [undefined, NaN, Infinity, -1, '1']) sameOffset(drift.update(dt), offset);
  const configured = createCameraDrift({ enabled: true, period: 1, yawAmplitude: 9, pitchAmplitude: 9, quietSeconds: -1 });
  assert.equal(configured.state.period, 30); assert.equal(configured.state.yawAmplitude, .1);
  assert.equal(configured.state.pitchAmplitude, .025); assert.equal(configured.state.quietSeconds, 6);
});

// Exercise the production framing and camera methods with real character
// geometry, while keeping WebGL/browser construction outside this regression.
function createStageFixture({ width, height, insets, radius, cast }) {
  const stage = Object.create(DioramaStage.prototype);
  Object.assign(stage, {
    container: { getBoundingClientRect: () => ({ width, height }) },
    renderer: { setSize() {} }, scene: new THREE.Scene(), style: { apply() {} },
    actors: new Map(), actorFrames: new Map(), viewportInsets: { ...insets },
    camera: new THREE.OrthographicCamera(-8, 8, 7, -7, .1, 100),
    target: new THREE.Vector3(), yaw: .28, pitch: .25, zoom: 1, studio: false,
    cameraDrift: createCameraDrift({ enabled: true }), cameraDriftEnabled: true,
    world: {
      ...createPlanetSurface(radius),
      characterSpots: [{ x: -1.45, y: .045, z: .35, rotation: .24 }, { x: 0, y: .045, z: .85, rotation: 0 }, { x: 1.45, y: .045, z: .35, rotation: -.24 }],
    },
  });
  stage.setCast(cast.map((config, index) => ({ id: String(index), ...(typeof config === 'string' ? { type: config } : config) })), { preserveCamera: false });
  return stage;
}

function actorEnvelope(stage) {
  const result = [];
  for (const [id, actor] of stage.actors) {
    actor.group.updateWorldMatrix(true, true);
    const bounds = stage.actorFrames.get(id);
    for (let index = 0; index < 8; index++) result.push(new THREE.Vector3(
      index & 1 ? bounds.max.x : bounds.min.x,
      index & 2 ? bounds.max.y : bounds.min.y,
      index & 4 ? bounds.max.z : bounds.min.z,
    ).applyMatrix4(actor.group.matrixWorld));
  }
  return result;
}

test('production stage keeps real resting cast inside the safe viewport for a full orbit', () => {
  const viewports = [
    { width: 320, height: 640, insets: { left: 16, right: 16, top: 70, bottom: 310 } },
    { width: 390, height: 844, insets: { left: 20, right: 20, top: 80, bottom: 350 } },
    { width: 844, height: 390, insets: { left: 20, right: 380, top: 56, bottom: 40 } },
    { width: 1280, height: 900, insets: { left: 32, right: 400, top: 90, bottom: 80 } },
  ];
  const casts = [['rabbit'], ['rabbit', 'bear'], ['rabbit', 'bear', 'cat'],
    ...['window', 'gugu', 'fish', 'cloud', 'clock', 'shadow', 'star'].map(kind => ['rabbit', {
      kind, createActor: ({ scale }) => createWowCharacter({ kind, scale }),
    }]),
  ];
  let smallestMargin = Infinity;
  let combinations = 0, samples = 0;
  for (const viewport of viewports) for (const radius of [3.55, 4.2, 6]) for (const cast of casts) {
    combinations++;
    const stage = createStageFixture({ ...viewport, radius, cast });
    const corners = actorEnvelope(stage), target = stage.target.clone();
    const baseline = { yaw: stage.yaw, pitch: stage.pitch, zoom: stage.zoom };
    const safe = stage.safeViewport;
    for (let frame = 0; frame <= 42 * 30; frame++) {
      samples++;
      stage.cameraDrift.update(frame ? 1 / 30 : 0); stage.updateCamera();
      near(stage.camera.position.distanceTo(target), 23);
      assert.deepEqual({ yaw: stage.yaw, pitch: stage.pitch, zoom: stage.zoom }, baseline);
      assert.ok(stage.target.equals(target));
      const aim = target.clone().project(stage.camera);
      near((aim.x + 1) / 2 * viewport.width, (safe.left + safe.right) / 2, 1e-8);
      near((1 - aim.y) / 2 * viewport.height, (safe.top + safe.bottom) / 2, 1e-8);
      for (const corner of corners) {
        const point = corner.clone().project(stage.camera);
        const x = (point.x + 1) / 2 * viewport.width, y = (1 - point.y) / 2 * viewport.height;
        const margin = Math.min(x - safe.left, safe.right - x, y - safe.top, safe.bottom - y);
        smallestMargin = Math.min(smallestMargin, margin);
        assert.ok(margin >= 0, `${viewport.width}×${viewport.height}, radius ${radius}, ${cast.map(item => item.kind || item).join('/')}, frame ${frame}: outside safe viewport by ${-margin}px`);
      }
    }
    for (const actor of stage.actors.values()) actor.dispose();
  }
  assert.ok(smallestMargin > 4, `safe margin was only ${smallestMargin}px`);
  console.log(`Resting cast: ${combinations} framing combinations, ${samples} orbit samples; smallest safe margin ${smallestMargin.toFixed(2)}px.`);
});

test('production stage pointer, pinch and wheel paths yield to manual camera changes', () => {
  const stage = createStageFixture({ width: 390, height: 844, insets: { left: 20, right: 20, top: 80, bottom: 350 }, radius: 4.2, cast: ['rabbit'] });
  const listeners = new Map();
  stage.renderer.domElement = { addEventListener: (type, handler) => listeners.set(type, handler), setPointerCapture() {} };
  stage.pointers = new Map();
  stage.installPointer();
  stage.cameraDrift.update(10);
  listeners.get('pointerdown')({ button: 0, pointerId: 1, clientX: 100, clientY: 100 });
  near(stage.cameraDrift.state.holdRemaining, 8);
  listeners.get('pointermove')({ pointerId: 1, clientX: 120, clientY: 110 });
  near(stage.yaw, .14); near(stage.pitch, .29);
  stage.cameraDrift.update(1, { interacting: stage.pointers.size > 0 }); zero(stage.cameraDrift.offset);
  listeners.get('pointerdown')({ button: 0, pointerId: 2, clientX: 220, clientY: 110 });
  listeners.get('pointermove')({ pointerId: 2, clientX: 270, clientY: 110 });
  near(stage.zoom, 1.5); near(stage.yaw, .14); near(stage.pitch, .29);
  listeners.get('pointercancel')({ pointerId: 1 });
  listeners.get('lostpointercapture')({ pointerId: 2 });
  assert.equal(stage.pointers.size, 0);
  stage.cameraDrift.update(7.9); zero(stage.cameraDrift.offset);
  let prevented = false;
  listeners.get('wheel')({ deltaY: 100, preventDefault() { prevented = true; } });
  assert.ok(prevented); near(stage.zoom, 1.4); near(stage.cameraDrift.state.holdRemaining, 8);
  stage.cameraDrift.update(7.9); zero(stage.cameraDrift.offset);
  stage.studio = true; stage.setCameraDriftEnabled(true); zero(stage.cameraDrift.offset); assert.equal(stage.cameraDrift.state.enabled, false);
  stage.studio = false; stage.setCameraDriftEnabled(true); stage.cameraDrift.update(5);
  assert.notEqual(stage.cameraDrift.offset.yaw, 0);
  stage.setCameraDriftEnabled(false); zero(stage.cameraDrift.offset);
  for (const actor of stage.actors.values()) actor.dispose();
});
