import * as THREE from '../vendor/three.module.js';

const UP = new THREE.Vector3(0, 1, 0);
const objectTargets = new WeakMap(), batchTargets = new WeakMap();
const MODES = ['hop', 'stretch', 'puff', 'wiggle', 'twist'];
const modeFor = name => MODES[[...name].reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 0) % MODES.length];
const matrix = () => new THREE.Matrix4();

export function visibleHit(hit) {
  for (let object = hit.object; object; object = object.parent) if (!object.visible || object.userData.tapIgnore) return false;
  const material = Array.isArray(hit.object.material) ? hit.object.material[hit.face?.materialIndex || 0] : hit.object.material;
  return material?.visible !== false && material?.opacity !== 0;
}

export function targetForHit(hit) {
  const ranges = batchTargets.get(hit.object);
  if (ranges) return ranges.find(range => hit.faceIndex >= range.start / 3 && hit.faceIndex < (range.start + range.count) / 3)?.target || null;
  for (let object = hit.object; object; object = object.parent) if (objectTargets.has(object)) return objectTargets.get(object);
  return null;
}

/** Select the first visible surface, including the closed planet as a blocker. */
export function firstTapHit(hits) {
  let glassHit = null;
  for (const hit of hits) {
    if (!visibleHit(hit)) continue;
    const target = targetForHit(hit);
    if (target?.reveal && !target.reveal.visible) continue;
    const material = Array.isArray(hit.object.material) ? hit.object.material[hit.face?.materialIndex || 0] : hit.object.material;
    if (target) {
      if (!glassHit && material?.transparent) { glassHit = { target, hit }; continue; }
      if (glassHit) {
        for (let child = target; child; child = child.parent) if (child === glassHit.target) return { target, hit };
        return glassHit;
      }
      return { target, hit };
    }
    for (let object = hit.object; object; object = object.parent) if (object.userData.actorId) return glassHit || { actorId: object.userData.actorId, hit };
    if (!material?.transparent) return glassHit;
  }
  return glassHit;
}

export function createBatchedTapTarget({ name, mode, position, quaternion, surface }) {
  const frame = matrix().compose(position, quaternion, new THREE.Vector3(1, 1, 1));
  return { name, mode: mode || modeFor(name), frame, inverse: frame.clone().invert(), surface, parts: [], age: Infinity, taps: 0, type: 'batch' };
}

export function attachTapRange(mesh, target, start, count, pickable = true) {
  if (!target || !count) return;
  const range = { target, start, count };
  if (pickable) {
    if (!batchTargets.has(mesh)) batchTargets.set(mesh, []);
    batchTargets.get(mesh).push(range);
  }
  const position = mesh.geometry.attributes.position, normal = mesh.geometry.attributes.normal;
  target.parts.push({ geometry: mesh.geometry, start, count, position: position.array.slice(start * 3, (start + count) * 3), normal: normal.array.slice(start * 3, (start + count) * 3) });
}

/** A neutral parent keeps existing prop/landmark animators in charge of their pose. */
export function createObjectTapTarget(object, { name = object.name, mode, surface } = {}) {
  let parentTarget;
  for (let parent = object.parent; parent; parent = parent.parent) if (objectTargets.has(parent)) { parentTarget = objectTargets.get(parent); break; }
  const wrapper = new THREE.Group();
  wrapper.name = `${name}-tap-offset`; wrapper.matrixAutoUpdate = false;
  wrapper.userData.tapOffset = true;
  object.parent.add(wrapper); wrapper.add(object);
  const target = { name, mode: mode || modeFor(name), object, wrapper, surface, parent: parentTarget, age: Infinity, taps: 0, type: 'object', frame: matrix(), inverse: matrix() };
  objectTargets.set(object, target);
  return target;
}

function objectPoints(target) {
  const { object, wrapper } = target;
  // Ignore the feedback parent while measuring the current authored pose.
  wrapper.matrix.identity();
  wrapper.updateWorldMatrix(true, true);
  const base = object.matrixWorld.clone(), inverse = base.clone().invert(), relative = matrix(), point = new THREE.Vector3();
  if (!target.samples) {
    const local = [], box = new THREE.Box3();
    object.traverseVisible(mesh => {
      if (!mesh.isMesh || mesh.userData.tapIgnore) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (materials.every(material => material.opacity === 0)) return;
      relative.multiplyMatrices(inverse, mesh.matrixWorld);
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(relative); local.push(point.clone()); box.expandByPoint(point);
      }
    });
    if (!local.length) return [];
    target.foot = box.min.y;
    target.samples = local.filter(point => point.y <= box.min.y + (box.max.y - box.min.y) * .25);
    target.samplePoints = target.samples.map(point => point.clone());
  }
  const pivot = new THREE.Vector3(0, target.foot, 0).applyMatrix4(base);
  const normal = target.surface ? pivot.clone().sub(target.surface.center).normalize() : UP.clone().transformDirection(base);
  target.frame.compose(pivot, new THREE.Quaternion().setFromUnitVectors(UP, normal), new THREE.Vector3(1, 1, 1));
  target.inverse.copy(target.frame).invert();
  return target.samplePoints.map((point, index) => point.copy(target.samples[index]).applyMatrix4(base).applyMatrix4(target.inverse));
}

function batchPoints(target) {
  const points = [], point = new THREE.Vector3();
  for (const part of target.parts) for (let i = 0; i < part.position.length; i += 3) points.push(point.fromArray(part.position, i).applyMatrix4(target.inverse).clone());
  const bottom = Math.min(...points.map(point => point.y)), top = Math.max(...points.map(point => point.y));
  const supports = points.filter(point => point.y <= bottom + (top - bottom) * .25);
  for (let i = 0; i < points.length; i += 3) if (Math.min(points[i].y, points[i + 1].y, points[i + 2].y) <= bottom + (top - bottom) * .25) {
    supports.push(points[i].clone().add(points[i + 1]).multiplyScalar(.5), points[i + 1].clone().add(points[i + 2]).multiplyScalar(.5), points[i + 2].clone().add(points[i]).multiplyScalar(.5), points[i].clone().add(points[i + 1]).add(points[i + 2]).multiplyScalar(1 / 3));
  }
  return supports;
}

function feedbackPose(mode, age, reduced) {
  const duration = reduced ? .22 : .66, t = Math.min(1, Math.max(0, age / duration));
  const pulse = Math.sin(Math.PI * t) ** 2;
  const position = new THREE.Vector3(), scale = new THREE.Vector3(1, 1, 1), rotation = new THREE.Quaternion();
  if (reduced) scale.setScalar(1 + .025 * pulse);
  else if (mode === 'hop') { position.y = .24 * pulse; scale.set(1 - .045 * pulse, 1 + .08 * pulse, 1 - .045 * pulse); }
  else if (mode === 'stretch') scale.set(1 - .075 * pulse, 1 + .25 * pulse, 1 - .075 * pulse);
  else if (mode === 'puff') scale.set(1 + .2 * pulse, 1 - .12 * pulse, 1 + .2 * pulse);
  else if (mode === 'wiggle') rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(t * Math.PI * 4) * pulse * .14);
  else rotation.setFromAxisAngle(UP, Math.sin(t * Math.PI * 2) * pulse * .25);
  return { matrix: matrix().compose(position, rotation, scale), complete: t >= 1 };
}

function preserveContact(target, points, transform) {
  if (!target.surface || !points.length) return;
  const center = target.surface.center.clone().applyMatrix4(target.inverse);
  const radius = Math.min(...points.map(point => point.distanceTo(center)));
  let after = -Infinity;
  const changed = new THREE.Vector3();
  const needed = point => {
    const tangent = (point.x - center.x) ** 2 + (point.z - center.z) ** 2;
    return tangent < radius * radius ? center.y + Math.sqrt(radius * radius - tangent) - point.y : -Infinity;
  };
  for (const point of points) after = Math.max(after, needed(changed.copy(point).applyMatrix4(transform)));
  // Maintain the model's original surface contact, including intentionally
  // buried grass roots. A wider foot may rise just enough to avoid new burial.
  const correction = Math.max(0, after);
  if (Number.isFinite(correction)) transform.elements[13] += correction;
}

function resetTarget(target) {
  if (target.type === 'object') {
    target.wrapper.matrix.identity(); target.wrapper.matrixWorldNeedsUpdate = true;
  } else for (const part of target.parts) {
    part.geometry.attributes.position.array.set(part.position, part.start * 3);
    part.geometry.attributes.normal.array.set(part.normal, part.start * 3);
    part.geometry.attributes.position.needsUpdate = true; part.geometry.attributes.normal.needsUpdate = true;
  }
  target.age = Infinity;
}

function paintTarget(target, pose) {
  const points = target.type === 'object' ? objectPoints(target) : target.points ||= batchPoints(target);
  preserveContact(target, points, pose);
  const transform = target.frame.clone().multiply(pose).multiply(target.inverse);
  if (target.type === 'object') {
    const parent = target.wrapper.parent;
    target.wrapper.matrix.copy(parent.matrixWorld).invert().multiply(transform).multiply(parent.matrixWorld);
    target.wrapper.matrixWorldNeedsUpdate = true;
  } else {
    const normals = new THREE.Matrix3().getNormalMatrix(transform), point = new THREE.Vector3(), normal = new THREE.Vector3();
    for (const part of target.parts) {
      const positions = part.geometry.attributes.position, directions = part.geometry.attributes.normal;
      for (let i = 0; i < part.count; i++) {
        point.fromArray(part.position, i * 3).applyMatrix4(transform); positions.setXYZ(part.start + i, point.x, point.y, point.z);
        normal.fromArray(part.normal, i * 3).applyNormalMatrix(normals); directions.setXYZ(part.start + i, normal.x, normal.y, normal.z);
      }
      positions.needsUpdate = true; directions.needsUpdate = true;
    }
  }
}

export class TapFeedback {
  constructor() { this.targets = new Set(); this.active = new Set(); this.ambient = new Set(); this.clock = 0; this.last = null; }
  add(target) {
    this.targets.add(target);
    if (target.decoration) {
      target.reveal = { visible: false, initialized: false, age: Infinity, entries: 0, factor: 0, breathing: 0, bornAt: this.clock };
      this.ambient.add(target);
      paintTarget(target, matrix().makeScale(.000001, .000001, .000001));
    }
    return target;
  }
  remove(target) { resetTarget(target); this.targets.delete(target); this.active.delete(target); this.ambient.delete(target); }
  setRevealProgress(targets, progress, { immediate = false, reduced = false } = {}) {
    for (const target of targets) {
      const reveal = target.reveal;
      if (!reveal) continue;
      const visible = progress + 1e-8 >= target.decoration.at;
      reveal.reduced = reduced;
      if (!reveal.initialized || immediate || !visible) {
        reveal.visible = visible; reveal.age = Infinity; reveal.bornAt = this.clock;
        reveal.factor = visible ? 1 : 0; reveal.breathing = 0; reveal.initialized = true;
        this.active.delete(target); resetTarget(target);
        if (!visible) paintTarget(target, matrix().makeScale(.000001, .000001, .000001));
      } else if (!reveal.visible) {
        reveal.visible = true; reveal.age = reduced ? Infinity : -target.decoration.delay;
        reveal.bornAt = this.clock; reveal.entries += reduced ? 0 : 1;
        reveal.factor = reduced ? 1 : 0; reveal.breathing = 0;
        if (reduced) resetTarget(target);
      }
    }
  }
  trigger(target, reduced = false) {
    if (!this.targets.has(target) || target.reveal && !target.reveal.visible) return false;
    const contains = (parent, child) => { for (let ancestor = child; ancestor; ancestor = ancestor.parent) if (ancestor === parent) return true; return false; };
    for (const active of this.active) if (contains(active, target) || contains(target, active)) { resetTarget(active); this.active.delete(active); }
    resetTarget(target);
    target.age = 0; target.reduced = reduced; target.taps++;
    if (target.type === 'object') target.samples = null;
    if (target.type === 'batch') target.points ||= batchPoints(target);
    this.active.add(target); this.last = { name: target.name, mode: reduced ? 'gentle' : target.mode, taps: target.taps };
    return true;
  }
  update(dt) {
    const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(dt, .1)) : 0;
    this.clock += elapsed;
    const work = new Set(this.active);
    for (const target of this.ambient) if (target.reveal.visible) work.add(target);
    for (const target of work) {
      let pose = matrix(), tapping = this.active.has(target), changing = tapping;
      if (tapping) {
        target.age += elapsed;
        const tap = feedbackPose(target.mode, target.age, target.reduced);
        if (tap.complete) { target.age = Infinity; this.active.delete(target); tapping = false; }
        else pose = tap.matrix;
      }
      const reveal = target.reveal;
      if (reveal) {
        if (Number.isFinite(reveal.age)) reveal.age += elapsed;
        const t = Math.min(1, Math.max(0, reveal.age / .7)), u = t - 1;
        const factor = t >= 1 ? 1 : Math.max(.000001, 1 + 2.25 * u ** 3 + 1.25 * u ** 2);
        if (t >= 1) reveal.age = Infinity;
        const phase = (this.clock + target.decoration.phase) % target.decoration.period;
        const breathing = reveal.reduced || Number.isFinite(reveal.age) || this.clock - reveal.bornAt < 2 || phase > 1.8 ? 0 : Math.sin(phase / 1.8 * Math.PI) ** 2;
        changing ||= factor !== reveal.factor || breathing !== reveal.breathing;
        reveal.factor = factor; reveal.breathing = breathing;
        pose.multiply(matrix().makeScale(factor * (1 + .007 * breathing), factor * (1 + .018 * breathing), factor * (1 + .007 * breathing)));
      }
      if (!changing) continue;
      if (!tapping && (!reveal || reveal.factor === 1 && reveal.breathing === 0)) resetTarget(target);
      else paintTarget(target, pose);
    }
  }
  clear() { for (const target of [...this.targets]) this.remove(target); }
  stats() { return { targets: this.targets.size, active: this.active.size, last: this.last, decorations: [...this.ambient].map(target => ({ id: target.name, kind: target.decoration.kind, step: target.decoration.step, region: target.decoration.region, visible: target.reveal.visible, entering: Number.isFinite(target.reveal.age), entries: target.reveal.entries, factor: target.reveal.factor, breathing: target.reveal.breathing })) }; }
}
