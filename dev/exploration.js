import * as THREE from '../vendor/three.module.js';
import { createSurfaceWalker, surfaceDistance } from './exploration-navigation.js';
import { createExplorationWorld, createChildAvatar } from './exploration-world.js';
import { createExplorationFriends } from './exploration-friends.js';

const UP = new THREE.Vector3(0, 1, 0);
const MOVEMENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
const editing = target => target?.closest?.('input, textarea, select, [contenteditable=true]');

export function createExploration(stage, { saved, storyId = 'wow', getName = () => '我', onSave = () => {}, canInteract, onInteraction, onSpeech, creations = [] } = {}) {
  const world = stage.world;
  const actorObstacles = [...stage.actors.values()].map(actor => ({ normal: actor.group.position.clone().sub(world.planet.center).normalize(), radius: .6 }));
  const scenery = createExplorationWorld(world, { storyId, actorObstacles }), avatar = createChildAvatar();
  const friends = createExplorationFriends(stage, { storyId, canInteract, onInteraction, onSpeech });
  friends.setCreations(creations);
  scenery.obstacles.push(...friends.obstacles);
  const uiHost = document.getElementById('world-viewport') || stage.container.parentElement;
  stage.scene.add(scenery.root, avatar.group); stage.style.apply(scenery.root); stage.style.apply(avatar.group);
  const validSaved = Array.isArray(saved?.normal) && saved.normal.length === 3 && saved.normal.every(Number.isFinite) && Math.hypot(...saved.normal) > .5 && Math.hypot(...saved.normal) < 1.5;
  const walker = createSurfaceWalker({ radius: world.planet.radius, obstacles: scenery.obstacles, initial: validSaved ? new THREE.Vector3(...saved.normal).normalize() : world.surfaceNormal(.5, 2.4) });
  const nearbyProps = new Set();
  const keys = new Set(), controller = new AbortController(), options = { signal: controller.signal };
  let moved = false, saveAge = 0, area = '', heading = 0, travelLabel = '', previousNormal = walker.normal.clone();
  const cameraNormal = walker.normal.clone();
  const surfaceFrame = new THREE.Quaternion().setFromUnitVectors(UP, walker.normal);
  const cameraFrame = surfaceFrame.clone();
  const sphere = new THREE.Sphere(world.planet.center, world.planet.radius);
  const markerGeometry = new THREE.TorusGeometry(.22, .025, 6, 32);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#fff1bf', depthWrite: false });
  const marker = new THREE.Mesh(markerGeometry, markerMaterial); marker.visible = false; stage.scene.add(marker);
  const ui = document.createElement('aside'); ui.className = 'exploration-hud'; ui.setAttribute('aria-label', '星球探索');
  ui.innerHTML = `<div class="exploration-location"><span>我的小小星球</span><strong id="exploration-area">${scenery.zones[0].name}</strong></div><p class="exploration-feedback" role="status" aria-live="polite"></p>`;
  uiHost.append(ui);
  const nameLabel = document.createElement('span'); nameLabel.className = 'exploration-child-name'; nameLabel.setAttribute('aria-hidden', 'true');
  uiHost.append(nameLabel);
  const areaLabel = ui.querySelector('#exploration-area'), feedback = ui.querySelector('.exploration-feedback');
  const go = (normal, label = '') => {
    keys.clear();
    if (!walker.go(normal)) { feedback.textContent = '这边有东西挡住了，试试旁边的小路。'; return; }
    travelLabel = label; feedback.textContent = label ? `正走向${label}…` : '';
    if (walker.destination) {
      marker.position.copy(world.planet.center).addScaledVector(walker.destination, world.planet.radius + .075);
      marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), walker.destination); marker.visible = true;
    }
  };
  const blocked = () => friends.active || document.hidden || Boolean(document.querySelector('dialog[open]')) || document.getElementById('story-menu')?.hidden === false;
  const stop = () => { keys.clear(); walker.stop(); marker.visible = false; };
  window.addEventListener('keydown', event => {
    if (event.code === 'Escape') { stop(); return; }
    if (!MOVEMENT.has(event.code) || editing(event.target) || event.ctrlKey || event.metaKey || event.altKey || blocked()) return;
    event.preventDefault(); keys.add(event.code); travelLabel = ''; marker.visible = false;
  }, options);
  window.addEventListener('keyup', event => keys.delete(event.code), options);
  window.addEventListener('blur', stop, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); save(); } }, options);
  document.addEventListener('focusin', event => { if (editing(event.target)) stop(); }, options);
  function save() { onSave({ normal: walker.normal.toArray() }); saveAge = 0; }
  window.addEventListener('pagehide', save, options);
  function update(dt) {
    if (blocked()) stop();
    const direction = new THREE.Vector3();
    if (keys.size) {
      const horizontal = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
      const vertical = Number(keys.has('ArrowUp') || keys.has('KeyW')) - Number(keys.has('ArrowDown') || keys.has('KeyS'));
      const right = new THREE.Vector3().setFromMatrixColumn(stage.camera.matrixWorld, 0);
      right.addScaledVector(walker.normal, -right.dot(walker.normal)).normalize();
      const forward = new THREE.Vector3().crossVectors(walker.normal, right).normalize();
      direction.addScaledVector(right, horizontal).addScaledVector(forward, vertical).normalize();
    }
    previousNormal.copy(walker.normal);
    const distance = walker.step(dt, direction), moving = distance > .00001;
    const normal = walker.normal;
    surfaceFrame.premultiply(new THREE.Quaternion().setFromUnitVectors(previousNormal, normal));
    const surfaceRotation = surfaceFrame;
    if (moving) {
      const tangent = normal.clone().sub(previousNormal).applyQuaternion(surfaceRotation.clone().invert());
      heading = Math.atan2(tangent.x, tangent.z);
      saveAge += dt;
      if (saveAge > 1) save();
    } else if (moved) { save(); if (travelLabel) feedback.textContent = `到了，${travelLabel}！`; }
    avatar.group.position.copy(world.planet.center).addScaledVector(normal, world.planet.radius + .015);
    avatar.group.quaternion.copy(surfaceRotation);
    avatar.facing.rotation.y = heading; avatar.update(dt, moving, stage.reduced);
    scenery.update(dt, normal, stage.reduced);
    friends.update(dt, normal, moving);
    if (moving) for (const target of world.tapTargets) {
      if (target.reveal?.visible === false) continue;
      const point = target.object ? target.object.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3().setFromMatrixPosition(target.frame);
      const near = point.distanceTo(avatar.group.position) < 1.3;
      if (near && !nearbyProps.has(target)) { stage.tapFeedback.trigger(target, stage.reduced); nearbyProps.add(target); }
      else if (!near) nearbyProps.delete(target);
    }
    if (!walker.moving) marker.visible = false;
    const previousCameraNormal = cameraNormal.clone();
    cameraNormal.lerp(normal, stage.reduced ? 1 : 1 - Math.exp(-dt * 5)).normalize();
    cameraFrame.premultiply(new THREE.Quaternion().setFromUnitVectors(previousCameraNormal, cameraNormal));
    const nearest = scenery.zones.reduce((a, b) => surfaceDistance(normal, a.normal, world.planet.radius) < surfaceDistance(normal, b.normal, world.planet.radius) ? a : b);
    const nearZone = surfaceDistance(normal, nearest.normal, world.planet.radius) < 3.3;
    const nextArea = nearZone ? nearest.name : '星球小路';
    if (area !== nextArea) {
      area = nextArea; areaLabel.textContent = area;
      if (!walker.moving) feedback.textContent = nearZone ? nearest.hint : '慢慢走，总会遇见新东西。';
    }
    moved = moving;
  }
  update(0);
  document.body.dataset.exploring = 'true';
  return {
    setCreations(records) {
      const previous = new Set(friends.obstacles);scenery.obstacles.splice(0,scenery.obstacles.length,...scenery.obstacles.filter(o=>!previous.has(o)));
      friends.setCreations(records);scenery.obstacles.push(...friends.obstacles);
    },
    showCreation(id) { friends.showCreation(id); },
    visitCreation(id) { const normal=friends.creationNormal(id);if(normal)go(normal,'你的作品'); },
    creationPosition() {
      // Place new work beside the child, outside all existing actor and prop footprints.
      const frame = new THREE.Quaternion().setFromUnitVectors(UP,walker.normal);
      for(const radius of [2.6,3.6,4.8,6])for(let i=0;i<16;i++){
        const angle=i*Math.PI/8,normal=new THREE.Vector3(Math.sin(radius/world.planet.radius)*Math.cos(angle),Math.cos(radius/world.planet.radius),Math.sin(radius/world.planet.radius)*Math.sin(angle)).applyQuaternion(frame).normalize();
        if(scenery.obstacles.every(o=>surfaceDistance(normal,o.normal,world.planet.radius)>o.radius+1.5))return normal.toArray();
      }
      return null;
    },
    goHome() { go(scenery.zones[0].normal, scenery.zones[0].name); },
    pick(raycaster) {
      if(blocked())return false;
      if(friends.pick(raycaster,walker.normal,normal=>go(normal)))return true;
      const hit = raycaster.ray.intersectSphere(sphere, new THREE.Vector3());
      if (!hit) return false;
      go(hit.sub(world.planet.center).normalize()); return true;
    },
    update,
    updateCamera() {
      const rotation = cameraFrame;
      stage.target.copy(world.planet.center).addScaledVector(cameraNormal, world.planet.radius + .55);
      const pitch = THREE.MathUtils.clamp(stage.pitch, .25, 1.15), yaw = stage.yaw;
      const offset = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).applyQuaternion(rotation).multiplyScalar(23);
      stage.camera.position.copy(stage.target).add(offset); stage.camera.up.copy(cameraNormal); stage.camera.lookAt(stage.target); stage.camera.updateMatrixWorld();
      const labelPoint = avatar.group.position.clone().addScaledVector(walker.normal, 1.58).project(stage.camera);
      const bounds = stage.container.getBoundingClientRect();
      const playerName = getName() || '我';
      if (nameLabel.textContent !== playerName) nameLabel.textContent = playerName;
      nameLabel.style.transform = `translate(-50%, -100%) translate(${(labelPoint.x + 1) * bounds.width / 2}px, ${(1 - labelPoint.y) * bounds.height / 2}px)`;
      stage.sun.position.copy(stage.target).add(new THREE.Vector3(-7, 12, 8).applyQuaternion(rotation));
      stage.sun.target.position.copy(stage.target); stage.sun.target.updateMatrixWorld();
    },
    get stats() {
      const projected = avatar.group.position.clone().addScaledVector(walker.normal, .7).project(stage.camera);
      const { width, height } = stage.container.getBoundingClientRect();
      return { area, moving: walker.moving || moved, normal: walker.normal.toArray(), position: avatar.group.position.toArray(), destination: walker.destination?.toArray() || null, avatar: { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 }, zones: scenery.zones.map(({ id, name }) => ({ id, name })), reactions: scenery.reactions, friends: friends.stats, encounterOpen: friends.active };
    },
    dispose() {
      // Routing/restarting owns persistence; never write old coordinates into a new story.
      controller.abort(); friends.dispose(); ui.remove(); nameLabel.remove(); scenery.dispose(); avatar.dispose(); marker.removeFromParent(); markerGeometry.dispose(); markerMaterial.dispose();
      document.body.removeAttribute('data-exploring'); stage.camera.up.copy(UP); stage.sun.position.set(-7, 12, 8); stage.sun.target.position.set(0, 0, 0); stage.sun.target.updateMatrixWorld();
    },
  };
}
