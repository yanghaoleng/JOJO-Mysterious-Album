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
// camera repeatedly. Pull back gradually in small steps with a floor, keep the
// current viewport direction when possible, and hand the finished move to the
// stage so it animates instead of jumping. New models stay inside the current
// camera whenever the current framing can hold them.
export function arrangeInView(commands, entities, stage, random = Math.random) {
  const original = {zoom:stage.zoom, pitch:stage.pitch, yaw:stage.yaw, target:stage.target.clone(), pan:stage.panOffset.clone()};
  const attempt = (factor, contactPacking = false) => scatterCommands(commands.map(c => c.type === 'entity.spawn' ? {...c,scale:c.sizeLocked ? c.scale : Math.max(.2,(c.scale ?? .55)*factor)} : c),entities,stage.world,random,stage.camera,{compact:true,contactPacking});
  const commit = (target, reduced, factor) => {
    // Position the new models inside the target framing first, then return the
    // camera to the original spot and animate the move over ~0.9s.
    stage.zoom = target.zoom; stage.pitch = target.pitch; stage.yaw = target.yaw;
    stage.target.copy(target.target); stage.panOffset.copy(target.pan); stage.resize();
    const commands = attempt(factor, target.zoom < original.zoom * .9 || factor < 1);
    Object.assign(stage,{zoom:original.zoom,pitch:original.pitch,yaw:original.yaw});
    stage.target.copy(original.target); stage.panOffset.copy(original.pan); stage.resize();
    stage.animateCameraTo(target,.9);
    return {commands, reframed:true, reduced};
  };
  try { return {commands:attempt(1), reframed:false, reduced:false}; }
  catch(error) { if(error.code !== 'placement_retry') throw error; }
  // Small, bounded pull-backs: each step shrinks the framing slightly, never a
  // single jump to the farthest possible view, and never below a zoom floor.
  // Keep the same ground point targeted (the horizon stays put in the frame);
  // only the field of view widens, so the move never tilts into a top-down view.
  const minZoom=Math.max(.22,Math.min(original.zoom*.55,original.zoom*((stage.camera.right-stage.camera.left)/(stage.world.planet.radius*2+3))));
  for (const factor of [1,.75,.5]) {
    let zoom=original.zoom;
    while(zoom>minZoom+.001){
      zoom=Math.max(minZoom,zoom*.88);
      stage.target.copy(original.target);stage.panOffset.copy(original.pan);
      stage.pitch=original.pitch;stage.yaw=original.yaw;stage.zoom=zoom;stage.resize();
      try { return commit({yaw:original.yaw,pitch:original.pitch,zoom,target:original.target.clone(),pan:original.pan.clone()},factor<1,factor); }
      catch(error) { if(error.code !== 'placement_retry') throw error; }
    }
  }
  // Still stuck: a gentle yaw nudge as the last resort, never a 90-degree turn.
  for (const turn of [.35,-.35,.7,-.7]) {
    const zoom=Math.max(minZoom,original.zoom*.5);
    stage.target.copy(original.target);stage.panOffset.copy(original.pan);
    stage.pitch=original.pitch;stage.yaw=original.yaw+turn;stage.zoom=zoom;stage.resize();
    try { return commit({yaw:stage.yaw,pitch:original.pitch,zoom,target:original.target.clone(),pan:original.pan.clone()},true,.5); }
    catch(error) { if(error.code !== 'placement_retry') throw error; }
  }
  Object.assign(stage,{zoom:original.zoom,pitch:original.pitch,yaw:original.yaw});
  stage.target.copy(original.target); stage.panOffset.copy(original.pan); stage.resize();
  throw new Error(commands.some(c=>c.sizeLocked) ? '当前区域放不下指定尺寸与数量，请减少数量或选更大的星球；指定尺寸未被缩小。' : '自动布局暂未完成，请重新提交；已有模型保持不变。');
}
