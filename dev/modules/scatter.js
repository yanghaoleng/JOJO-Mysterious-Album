import * as THREE from '../../vendor/three.module.js';
import { createCreationModel } from '../creation-models.js';
import { createActor } from '../presentation/actor-factory.js';
import { capacityEvictions } from '../runtime/contracts.js';

// Measure actual silhouettes once. Placement is committed into the proposal,
// so reloads keep positions and rendering never rerolls them.
const footprints = new Map();
const heights = new Map();
function footprint(asset, scale = 1) {
  if (!footprints.has(asset)) {
    const model = asset.startsWith('prop:') ? createCreationModel(asset.slice(5)) : createActor({asset}, 1);
    try {
      const box = new THREE.Box3().setFromObject(model.group);
      footprints.set(asset, Math.max(.25, Math.hypot(Math.max(Math.abs(box.min.x), Math.abs(box.max.x)), Math.max(Math.abs(box.min.z), Math.abs(box.max.z)))));
      heights.set(asset, Math.max(.25, box.max.y));
    } finally { model.dispose(); }
  }
  return footprints.get(asset) * scale;
}
export function scatterCommands(commands, entities, world, random = Math.random, camera = null, { compact = false, contactPacking = false } = {}) {
  camera?.updateMatrixWorld(true);
  world.group?.updateWorldMatrix(true, true);
  const viewDirection = camera ? camera.getWorldDirection(new THREE.Vector3()).negate() : null;
  const raycaster = new THREE.Raycaster();
  function visible(normal, size, height) {
    if (!camera) return true;
    // Stay well inside the facing hemisphere, not on its almost-hidden rim.
    if (normal.dot(viewDirection) < .35) return false;
    const base = world.planet.center.clone().addScaledVector(normal, world.planet.radius + .02);
    const side = new THREE.Vector3(1,0,0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal));
    const tangent = new THREE.Vector3().crossVectors(normal,side);
    for (const y of [0,height]) for (const x of [-size,size]) for (const z of [-size,size]) {
      const screen = base.clone().addScaledVector(normal,y).addScaledVector(side,x).addScaledVector(tangent,z).project(camera);
      if (Math.abs(screen.x) > .9 || Math.abs(screen.y) > .86 || Math.abs(screen.z) > 1) return false;
    }
    return true;
  }
  function unobscured(normal, height) {
    if (!camera || !world.group) return true;
    const point = world.planet.center.clone().addScaledVector(normal,world.planet.radius + .02 + height*.65);
    const screen = point.clone().project(camera);
    raycaster.setFromCamera(new THREE.Vector2(screen.x,screen.y),camera);
    raycaster.far = raycaster.ray.origin.distanceTo(point) - .04;
    return raycaster.intersectObject(world.group,true).length === 0;
  }
  const excluded = new Set([...capacityEvictions(entities, commands), ...commands.filter(c => c.type === 'entity.remove' || c.type === 'entity.spawn').map(c => c.id)]);
  const occupied = Object.values(entities).filter(e => !excluded.has(e.id)).map(e => ({ normal: world.surfaceNormal(...e.position), radius: footprint(e.asset, e.scale) }));
  const radius = world.planet.radius;
  const result = commands.map(c => ({...c}));
  for (const command of result) {
    if (command.type !== 'entity.spawn') continue;
    const size = footprint(command.asset, command.scale ?? .55);
    const height = heights.get(command.asset) * (command.scale ?? .55);
    let best, clearance = -Infinity, bestScore = Infinity;
    for (let i = 0; i < 2400; i++) {
      // Uniform area on the sphere, rejecting unrepresentable local coordinates.
      const y = random() * 2 - 1, angle = Math.acos(y), azimuth = random() * Math.PI * 2;
      const position = [radius * angle * Math.cos(azimuth), radius * angle * Math.sin(azimuth)];
      if (position.some(v => Math.abs(v) > 8.9)) continue;
      const normal = world.surfaceNormal(...position);
      if (!visible(normal, size, height)) continue;
      const gap = occupied.reduce((min, e) => Math.min(min, radius * normal.distanceTo(e.normal) - (size + e.radius) * (contactPacking ? .7 : 1) - (compact ? .01 : .08)), Infinity);
      const score = compact ? (occupied.length ? Math.abs(gap - .02) : 1 - normal.dot(viewDirection || new THREE.Vector3(0,1,0))) : -gap;
      if (gap < 0 || (best && score >= bestScore) || !unobscured(normal,height)) continue;
      best = {position, normal}; clearance = gap; bestScore = score;
      if (!camera && gap >= .12 && i > 36) break;
    }
    if (!best || clearance < 0) { const error = new Error('placement_retry'); error.code = 'placement_retry'; throw error; }
    command.position = best.position;
    occupied.push({normal: best.normal, radius: size});
  }
  return result;
}

// Reframe from physical world dimensions, never multiply an already zoomed-out
// camera repeatedly. Keep all sampling on the visible, representable hemisphere.
export function arrangeInView(commands, entities, stage, random = Math.random) {
  // Explicit resizing preserves positions and sizes, widening the camera when needed.
  const resizes=commands.filter(c=>c.type==='entity.scale' && entities[c.id]);
  if(resizes.length){
    const extent=Math.max(3,...resizes.map(c=>{const asset=entities[c.id].asset;return Math.max(footprint(asset,c.scale),heights.get(asset)*c.scale);}));
    const diameter=stage.world.planet.radius*2+extent*2;
    stage.target.copy(stage.world.planet.center);stage.panOffset.set(0,0,0);
    stage.zoom*=Math.min(1,(stage.camera.right-stage.camera.left)*.8/diameter,(stage.camera.top-stage.camera.bottom)*.8/diameter);stage.resize();
  }
  const original = {zoom:stage.zoom, pitch:stage.pitch, yaw:stage.yaw, target:stage.target.clone(), pan:stage.panOffset.clone()};
  const attempt = (factor, contactPacking = false) => scatterCommands(commands.map(c => c.type === 'entity.spawn' ? {...c,scale:c.sizeLocked ? c.scale : Math.max(.2,(c.scale ?? .55)*factor)} : c),entities,stage.world,random,stage.camera,{compact:true,contactPacking});
  try { return {commands:attempt(1), reframed:false, reduced:false}; }
  catch(error) { if(error.code !== 'placement_retry') throw error; }
  const maxSize=Math.max(3,...commands.filter(c=>c.type==='entity.spawn').map(c=>Math.max(footprint(c.asset,c.scale||.55),heights.get(c.asset)*(c.scale||.55))));
  const diameter = stage.world.planet.radius * 2 + maxSize*2;
  stage.target.copy(stage.world.planet.center);
  stage.panOffset.set(0,0,0);
  stage.zoom *= Math.min((stage.camera.right-stage.camera.left)*.85/diameter,(stage.camera.top-stage.camera.bottom)*.8/diameter);
  try {
    for (const factor of [1,.75,.5,.36,.2]) {
      for (const turn of [0,1,2,3]) {
        stage.pitch = Math.max(.8, original.pitch);
        stage.yaw = original.yaw + turn * Math.PI / 2;
        stage.resize();
        try { return {commands:attempt(factor,factor===.2),reframed:true,reduced:factor<1}; }
        catch(error) { if(error.code !== 'placement_retry') throw error; }
      }
    }
    throw new Error(commands.some(c=>c.sizeLocked) ? '当前区域放不下指定尺寸与数量，请减少数量或选更大的星球；指定尺寸未被缩小。' : '自动布局暂未完成，请重新提交；已有模型保持不变。');
  } catch(error) {
    Object.assign(stage,{zoom:original.zoom,pitch:original.pitch,yaw:original.yaw});
    stage.target.copy(original.target); stage.panOffset.copy(original.pan); stage.resize();
    throw error;
  }
}
