import * as THREE from '../vendor/three.module.js';

const UP = new THREE.Vector3(0, 1, 0);
export const WALK_SPEED = 2.25;
export function alongArc(a, b, fraction) {
  const rotation = new THREE.Quaternion().setFromUnitVectors(a, b);
  return a.clone().applyQuaternion(new THREE.Quaternion().slerp(rotation, fraction)).normalize();
}
export const surfaceDistance = (a, b, radius) => a.angleTo(b) * radius;

/** Plan on the sphere itself, including the reverse side. Obstacle rings make
 * lake and house clicks end at their edge and routes go around solid objects. */
export function createSurfaceWalker({ radius, initial = UP, obstacles = [] }) {
  let normal = initial.clone().normalize(), route = [], destination = null;
  const margin = .28;
  const clear = point => obstacles.every(obstacle => surfaceDistance(point, obstacle.normal, radius) >= obstacle.radius + margin - .005);
  function accessible(point) {
    point = point.clone().normalize();
    for (let pass = 0; pass < 4; pass++) for (const obstacle of obstacles) {
      const distance = surfaceDistance(point, obstacle.normal, radius);
      if (distance >= obstacle.radius + margin) continue;
      let tangent = point.clone().addScaledVector(obstacle.normal, -point.dot(obstacle.normal));
      if (tangent.lengthSq() < .000001) tangent = normal.clone().addScaledVector(obstacle.normal, -normal.dot(obstacle.normal));
      if (tangent.lengthSq() < .000001) tangent.crossVectors(obstacle.normal, new THREE.Vector3(1, .3, .1));
      tangent.normalize();
      const angle = (obstacle.radius + margin + .035) / radius;
      point.copy(obstacle.normal).multiplyScalar(Math.cos(angle)).addScaledVector(tangent, Math.sin(angle)).normalize();
    }
    return point;
  }
  const segmentClear = (a, b) => {
    const steps = Math.max(2, Math.ceil(surfaceDistance(a, b, radius) / .16));
    for (let i = 1; i <= steps; i++) if (!clear(alongArc(a, b, i / steps))) return false;
    return true;
  };
  normal = accessible(normal);
  function go(point) {
    const goal = accessible(point);
    if (segmentClear(normal, goal)) { route = [goal]; destination = goal; return true; }
    const nodes = [normal.clone(), goal];
    for (const obstacle of obstacles) {
      const rotation = new THREE.Quaternion().setFromUnitVectors(UP, obstacle.normal);
      const angle = (obstacle.radius + margin + .16) / radius;
      for (let i = 0; i < 16; i++) {
        const theta = i * Math.PI / 8;
        const point = new THREE.Vector3(Math.sin(angle) * Math.cos(theta), Math.cos(angle), Math.sin(angle) * Math.sin(theta)).applyQuaternion(rotation);
        if (clear(point)) nodes.push(point);
      }
    }
    const costs = nodes.map(() => Infinity), previous = [], visited = new Set(); costs[0] = 0;
    while (visited.size < nodes.length) {
      let current = -1;
      for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && (current < 0 || costs[i] < costs[current])) current = i;
      if (current < 0 || !Number.isFinite(costs[current])) break;
      if (current === 1) {
        const result = []; for (let i = 1; i !== 0; i = previous[i]) result.unshift(nodes[i]);
        route = result; destination = goal; return true;
      }
      visited.add(current);
      for (let i = 1; i < nodes.length; i++) {
        if (visited.has(i)) continue;
        const cost = costs[current] + surfaceDistance(nodes[current], nodes[i], radius);
        if (cost < costs[i] && segmentClear(nodes[current], nodes[i])) { costs[i] = cost; previous[i] = current; }
      }
    }
    return false;
  }
  return {
    get normal() { return normal; }, get destination() { return destination; }, get moving() { return route.length > 0; },
    go, stop() { route = []; destination = null; },
    step(dt, direction = null) {
      const before = normal.clone();
      let budget = WALK_SPEED * Math.max(0, Math.min(dt, .05));
      if (direction?.lengthSq() > .0001) {
        route = []; destination = null;
        const tangent = direction.clone().addScaledVector(normal, -direction.dot(normal)).normalize();
        const next = normal.clone().multiplyScalar(Math.cos(budget / radius)).addScaledVector(tangent, Math.sin(budget / radius)).normalize();
        if (clear(next)) normal = next;
        else { const slide = accessible(next); if (surfaceDistance(normal, slide, radius) < budget * 1.5) normal = slide; }
      } else while (route.length && budget > 0) {
        const distance = surfaceDistance(normal, route[0], radius);
        if (distance <= budget) { normal = route.shift().clone(); budget -= distance; }
        else { normal = alongArc(normal, route[0], budget / distance); budget = 0; }
      }
      if (!route.length) destination = null;
      return surfaceDistance(before, normal, radius);
    },
  };
}
