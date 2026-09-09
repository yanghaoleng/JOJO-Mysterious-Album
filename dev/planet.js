import * as THREE from '../vendor/three.module.js';

export const PLANET_RADIUS = 4.2;

/** Exponential map from the north-pole tangent plane to a complete round world. */
export function createPlanetSurface(radius = PLANET_RADIUS) {
  if (!Number.isFinite(radius) || radius <= 0) throw new TypeError('A planet needs a positive finite radius');
  const center = new THREE.Vector3(0, -radius, 0);
  const surfaceNormal = (x, z, target = new THREE.Vector3()) => {
    const distance = Math.hypot(x, z);
    if (distance < 1e-8) return target.set(0, 1, 0);
    const angle = distance / radius;
    const factor = Math.sin(angle) / distance;
    return target.set(x * factor, Math.cos(angle), z * factor);
  };
  const surfacePoint = (x, z, height = 0, target = new THREE.Vector3()) => {
    surfaceNormal(x, z, target).multiplyScalar(radius + height);
    target.y -= radius;
    return target;
  };
  const dx = new THREE.Vector3(); const dy = new THREE.Vector3(); const dz = new THREE.Vector3();
  const cofactorX = new THREE.Vector3(); const cofactorY = new THREE.Vector3(); const cofactorZ = new THREE.Vector3();
  function mapNormal(x, y, z, normal, target = new THREE.Vector3()) {
    const distance = Math.hypot(x, z);
    if (distance < 1e-7) return target.set(normal.x * radius / (radius + y), normal.y, normal.z * radius / (radius + y)).normalize();
    const angle = distance / radius;
    const sine = Math.sin(angle); const cosine = Math.cos(angle);
    const factor = sine / distance;
    const derivative = (cosine / radius * distance - sine) / (distance ** 3);
    const r = radius + y;
    dx.set(r * (factor + x * x * derivative), -r * sine * x / (radius * distance), r * x * z * derivative);
    dy.set(x * factor, cosine, z * factor);
    dz.set(r * x * z * derivative, -r * sine * z / (radius * distance), r * (factor + z * z * derivative));
    cofactorX.crossVectors(dy, dz); cofactorY.crossVectors(dz, dx); cofactorZ.crossVectors(dx, dy);
    return target.copy(cofactorX).multiplyScalar(normal.x).addScaledVector(cofactorY, normal.y).addScaledVector(cofactorZ, normal.z).normalize();
  }
  return { radius, center, surfacePoint, surfaceNormal, mapNormal };
}

/** Fit the actual sole geometry to the curved surface along local gravity.
 * Models keep ownership of their animation. A model may expose a deliberate
 * airborne lift in its group-local units; idle breathing and sway stay planted.
 */
export function createActorGrounding(actor, surface, { x = 0, z = 0 } = {}) {
  const group = actor.group;
  const radius = surface.planet?.radius ?? surface.radius;
  if (!Number.isFinite(radius) || !surface.surfacePoint) return null;
  const inverse = new THREE.Matrix4(), relative = new THREE.Matrix4();
  const point = new THREE.Vector3();
  const declaredSupports = actor.grounding?.meshes;
  group.updateWorldMatrix(true, true);
  inverse.copy(group.matrixWorld).invert();
  const meshes = [];
  let bottom = Infinity, top = -Infinity;
  group.traverseVisible(mesh => {
    if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
    if (declaredSupports?.length && !declaredSupports.includes(mesh)) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (materials.every(material => !material?.visible || material.opacity === 0)) return;
    relative.multiplyMatrices(inverse, mesh.matrixWorld);
    const positions = mesh.geometry.attributes.position;
    const heights = new Float32Array(positions.count);
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(relative);
      heights[i] = point.y; bottom = Math.min(bottom, point.y); top = Math.max(top, point.y);
    }
    meshes.push({ mesh, positions, heights });
  });
  // Cache just the lower envelope once, including edges and face centres.
  // This works for feet, paws and flat bases without a species/name lookup.
  const soleTop = bottom + (top - bottom) * .12;
  const supports = [];
  for (const { mesh, positions, heights } of meshes) {
    const samples = [], indices = mesh.geometry.index;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
      if (heights[i] <= soleTop) samples.push(new THREE.Vector3().fromBufferAttribute(positions, i));
    }
    for (let i = 0, count = indices?.count ?? positions.count; i < count; i += 3) {
      const ai = indices ? indices.getX(i) : i, bi = indices ? indices.getX(i + 1) : i + 1, ci = indices ? indices.getX(i + 2) : i + 2;
      if (Math.min(heights[ai], heights[bi], heights[ci]) > soleTop) continue;
      a.fromBufferAttribute(positions, ai); b.fromBufferAttribute(positions, bi); c.fromBufferAttribute(positions, ci);
      samples.push(a.clone().add(b).multiplyScalar(.5), b.clone().add(c).multiplyScalar(.5), c.clone().add(a).multiplyScalar(.5), a.clone().add(b).add(c).multiplyScalar(1 / 3));
    }
    if (samples.length) {
      const unique = new Map(samples.map(sample => [`${sample.x.toFixed(7)},${sample.y.toFixed(7)},${sample.z.toFixed(7)}`, sample]));
      supports.push({ mesh, samples: [...unique.values()] });
    }
  }
  if (!supports.length) return null;
  const contact = new THREE.Vector3();
  const diagnostics = { samples: supports.reduce((sum, support) => sum + support.samples.length, 0), correction: 0, airborneHeight: 0, clearance: 0, contact: [] };
  function update() {
    group.updateWorldMatrix(true, true);
    inverse.copy(group.matrixWorld).invert();
    let height = -Infinity;
    for (const { mesh, samples } of supports) {
      relative.multiplyMatrices(inverse, mesh.matrixWorld);
      for (const sample of samples) {
        point.copy(sample).applyMatrix4(relative).multiply(group.scale);
        const tangentSquared = point.x * point.x + point.z * point.z;
        if (tangentSquared >= radius * radius) continue;
        const needed = Math.sqrt(radius * radius - tangentSquared) - radius - point.y;
        if (needed > height) { height = needed; contact.copy(point); }
      }
    }
    if (!Number.isFinite(height)) return;
    const lift = Math.max(0, Number(actor.grounding?.getAirborneHeight?.()) || 0) * group.scale.y;
    // A sub-pixel tolerance protects the curved triangle interiors; it is not
    // the old fixed .045/.08 gap above the planet's tangent-plane origin.
    const clearance = .0006;
    const placement = height + lift + clearance;
    group.position.copy(surface.surfacePoint(x, z, placement));
    group.userData.surfaceHeight = placement;
    contact.applyQuaternion(group.quaternion).add(group.position);
    Object.assign(diagnostics, { correction: height, airborneHeight: lift, clearance, contact: contact.toArray() });
    group.userData.grounding = diagnostics;
  }
  update();
  return { update, diagnostics };
}
