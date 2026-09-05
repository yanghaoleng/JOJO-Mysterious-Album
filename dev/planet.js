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
