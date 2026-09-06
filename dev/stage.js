import * as THREE from '../vendor/three.module.js';
import { createCharacter } from './models.js';
import { createDocumentCharacter } from '../src/story-npcs/factory.js';
import { createWorld } from './worlds.js';
import { createStorybookStyle, STORYBOOK_PALETTE } from './storybook.js';

const clamp = THREE.MathUtils.clamp;
const UP = new THREE.Vector3(0, 1, 0);
const DEFAULT_PITCH = .25;
const boxCorners = box => [0, 1, 2, 3, 4, 5, 6, 7].map(index => new THREE.Vector3(
  index & 1 ? box.max.x : box.min.x,
  index & 2 ? box.max.y : box.min.y,
  index & 4 ? box.max.z : box.min.z,
));

export class DioramaStage {
  constructor(container, onTouch = () => {}) {
    this.container = container;
    this.onTouch = onTouch;
    this.actors = new Map();
    this.actorFrames = new Map();
    this.viewportInsets = { top: 0, bottom: 0, left: 0, right: 0 };
    this.style = createStorybookStyle();
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setClearColor('#f3ecdf', 0);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = STORYBOOK_PALETTE.exposure;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', '可以拖动旋转、点击角色的立体场景');
    this.renderer.domElement.setAttribute('role', 'img');
    container.append(this.renderer.domElement);
    this.camera = new THREE.OrthographicCamera(-8, 8, 7, -7, .1, 100);
    this.target = new THREE.Vector3(0, 1, 0);
    this.yaw = .28;
    this.pitch = DEFAULT_PITCH;
    this.zoom = 1;
    this.studio = false;
    this.hemisphere = new THREE.HemisphereLight(STORYBOOK_PALETTE.sky, STORYBOOK_PALETTE.bounce, STORYBOOK_PALETTE.hemisphereIntensity);
    this.scene.add(this.hemisphere);
    const key = new THREE.DirectionalLight(STORYBOOK_PALETTE.sun, STORYBOOK_PALETTE.sunIntensity);
    key.position.set(-7, 12, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 45 });
    key.shadow.normalBias = .04;
    key.shadow.bias = -.00015;
    key.shadow.radius = 3;
    this.scene.add(key);
    this.sun = key;
    const rim = new THREE.DirectionalLight(STORYBOOK_PALETTE.rim, STORYBOOK_PALETTE.rimIntensity);
    rim.position.set(8, 7, -6);
    this.scene.add(rim);
    this.rim = rim;
    // A floating complete world has no tabletop or plane underneath it.
    this.space = new THREE.Group();
    const starGeometry = new THREE.OctahedronGeometry(.105);
    const starMaterial = new THREE.MeshBasicMaterial({ color: '#c9b078', transparent: true, opacity: .58 });
    [[-5.5, 1, -1.8], [5.3, -.6, -2], [-5, -5.7, -1.8], [4.6, -6.2, -2.5], [2.4, 3.5, -4]].forEach((point, index) => {
      const star = new THREE.Mesh(starGeometry, starMaterial);
      star.position.set(...point); star.scale.setScalar(index % 2 ? .7 : 1);
      star.rotation.set(.4, .3 * index, .2); this.space.add(star);
    });
    this.scene.add(this.space);
    this.pointers = new Map();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.installPointer();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    let previous = 0;
    this.renderer.setAnimationLoop(now => {
      const dt = Math.min((now - previous) / 1000, .05);
      previous = now;
      if (document.hidden) return;
      const time = this.reduced ? 0 : now / 1000;
      this.world?.update(time, dt);
      for (const actor of this.actors.values()) actor.update(time, dt);
      this.updateLighting(dt);
      if (this.invention && !this.reduced) {
        this.invention.position.y = this.invention.userData.restY + Math.sin(time * 1.4) * .10;
        this.invention.rotation.y += dt * .12;
      }
      this.renderer.render(this.scene, this.camera);
    });
  }

  installPointer() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', event => {
      this.pointers.set(event.pointerId, new THREE.Vector2(event.clientX, event.clientY));
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinch = { distance: a.distanceTo(b), zoom: this.zoom };
        this.drag = null;
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      this.drag = { x: event.clientX, y: event.clientY, yaw: this.yaw, pitch: this.pitch, moved: false };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (this.pointers.has(event.pointerId)) this.pointers.set(event.pointerId, new THREE.Vector2(event.clientX, event.clientY));
      if (this.pinch && this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.zoom = clamp(this.pinch.zoom * a.distanceTo(b) / Math.max(1, this.pinch.distance), .7, 1.8);
        this.resize(); return;
      }
      if (!this.drag) return;
      const dx = event.clientX - this.drag.x;
      const dy = event.clientY - this.drag.y;
      this.drag.moved ||= Math.hypot(dx, dy) > 7;
      this.yaw = this.drag.yaw - dx * .007;
      this.pitch = clamp(this.drag.pitch + dy * .004, -1.15, 1.35);
      this.updateCamera();
    });
    canvas.addEventListener('pointerup', event => {
      if (this.drag && !this.drag.moved && !this.pinch) this.pick(event);
      this.pointers.delete(event.pointerId);
      this.pinch = null;
      this.drag = null;
    });
    canvas.addEventListener('pointercancel', event => { this.pointers.delete(event.pointerId); this.drag = null; this.pinch = null; });
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.zoom = clamp(this.zoom - event.deltaY * .001, .7, 1.8);
      this.resize();
    }, { passive: false });
  }

  pick(event) {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([...this.actors.values()].map(actor => actor.group), true);
    if (!hits.length) return;
    const blockers = this.world ? this.raycaster.intersectObject(this.world.group, true) : [];
    const visibleBlocker = blockers.find(hit => {
      if (!hit.object.visible || hit.object.material?.transparent) return false;
      for (let parent = hit.object.parent; parent; parent = parent.parent) if (!parent.visible) return false;
      return true;
    });
    if (visibleBlocker && visibleBlocker.distance < hits[0].distance - .025) return;
    let object = hits[0].object;
    while (object && !object.userData.actorId) object = object.parent;
    if (object) {
      this.actors.get(object.userData.actorId)?.setAction('wave');
      this.onTouch(object.userData.actorId);
    }
  }

  resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    // Insets are CSS pixels, not device pixels. Keep at least a small usable
    // rectangle while a sheet is animating or the container is being resized.
    const left = clamp(this.viewportInsets.left, 0, Math.max(0, width - 48));
    const top = clamp(this.viewportInsets.top, 0, Math.max(0, height - 48));
    const right = width - clamp(this.viewportInsets.right, 0, Math.max(0, width - left - 48));
    const bottom = height - clamp(this.viewportInsets.bottom, 0, Math.max(0, height - top - 48));
    const safeWidth = right - left, safeHeight = bottom - top;
    this.safeViewport = { left, top, right, bottom, width: safeWidth, height: safeHeight, canvasWidth: width, canvasHeight: height, insets: { ...this.viewportInsets } };
    const focus = this.characterFocus || { width: 2.2, height: 2.6, meanHeight: 2.2 };
    const compact = width < 640;
    const desiredHeight = this.studio
      ? clamp(safeHeight * .62, Math.min(120, safeHeight * .7), compact ? 260 : 340)
      : clamp(safeHeight * .4, Math.min(110, safeHeight * .55), compact ? 160 : 270);
    const density = Math.max(.001, Math.min(
      desiredHeight / Math.max(.1, focus.meanHeight),
      Math.max(1, safeWidth - 24) / (focus.width + .34),
      Math.max(1, safeHeight - 28) / (focus.height + .46),
    ));
    const fullWidth = width / density / this.zoom;
    const fullHeight = height / density / this.zoom;
    // An asymmetric projection places the orbit target at the safe area's
    // centre; the physical cast and its contact with the globe never move.
    const centerX = (.5 - (left + right) / (2 * width)) * fullWidth;
    const centerY = ((top + bottom) / (2 * height) - .5) * fullHeight;
    Object.assign(this.camera, { left: centerX - fullWidth / 2, right: centerX + fullWidth / 2, top: centerY + fullHeight / 2, bottom: centerY - fullHeight / 2 });
    this.camera.updateProjectionMatrix();
    this.updateCamera();
  }

  updateCamera() {
    const radius = 23;
    this.camera.position.set(
      Math.sin(this.yaw) * Math.cos(this.pitch) * radius + this.target.x,
      Math.sin(this.pitch) * radius + this.target.y,
      Math.cos(this.yaw) * Math.cos(this.pitch) * radius + this.target.z,
    );
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }

  setViewportInsets(insets = {}) {
    for (const side of ['top', 'bottom', 'left', 'right']) {
      const value = Number(insets[side] ?? 0);
      this.viewportInsets[side] = Number.isFinite(value) ? Math.max(0, value) : 0;
    }
    this.resize();
  }

  frameCharacters() {
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const up = new THREE.Vector3(-Math.sin(this.yaw) * Math.sin(this.pitch), Math.cos(this.pitch), -Math.cos(this.yaw) * Math.sin(this.pitch));
    const bounds = new THREE.Box3();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, totalHeight = 0;
    for (const [id, actor] of this.actors) {
      actor.group.updateWorldMatrix(true, true);
      const local = this.actorFrames.get(id);
      // Cache the resting mesh envelope once, so expressions and a hop in
      // progress cannot make repeated framing breathe or creep upward.
      const corners = local ? boxCorners(local).map(point => point.applyMatrix4(actor.group.matrixWorld)) : boxCorners(new THREE.Box3().setFromObject(actor.group));
      let actorMinY = Infinity, actorMaxY = -Infinity;
      for (const point of corners) {
        bounds.expandByPoint(point);
        const x = point.dot(right), y = point.dot(up);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        actorMinY = Math.min(actorMinY, y); actorMaxY = Math.max(actorMaxY, y);
      }
      totalHeight += actorMaxY - actorMinY;
    }
    if (!bounds.isEmpty()) {
      bounds.getCenter(this.target);
      this.target.addScaledVector(right, (minX + maxX) / 2 - this.target.dot(right));
      this.target.addScaledVector(up, (minY + maxY) / 2 - this.target.dot(up));
      this.characterFocus = { width: maxX - minX, height: maxY - minY, meanHeight: totalHeight / this.actors.size, worldBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() } };
    } else {
      this.target.set(0, 1, 0);
      this.characterFocus = null;
    }
    this.resize();
  }

  resetCamera() { this.yaw = .28; this.pitch = DEFAULT_PITCH; this.zoom = 1; this.frameCharacters(); }

  setLighting(atmosphere = {}) {
    const settings = { ...STORYBOOK_PALETTE, ...atmosphere.lighting };
    this.lightingTarget = {
      sky: new THREE.Color(settings.sky), bounce: new THREE.Color(settings.bounce),
      sun: new THREE.Color(settings.sun), rim: new THREE.Color(settings.rim),
      hemisphereIntensity: settings.hemisphereIntensity, sunIntensity: settings.sunIntensity,
      rimIntensity: settings.rimIntensity, exposure: settings.exposure,
      stars: atmosphere.period === 'night' ? .66 : atmosphere.period === 'dusk' ? .32 : .1,
    };
    if (!this.lightingInitialized) { this.updateLighting(1, true); this.lightingInitialized = true; }
  }

  updateLighting(dt, immediate = false) {
    const target = this.lightingTarget;
    if (!target) return;
    const blend = immediate || this.reduced ? 1 : 1 - Math.exp(-dt * 3.2);
    this.hemisphere.color.lerp(target.sky, blend);
    this.hemisphere.groundColor.lerp(target.bounce, blend);
    this.sun.color.lerp(target.sun, blend); this.rim.color.lerp(target.rim, blend);
    this.hemisphere.intensity = THREE.MathUtils.lerp(this.hemisphere.intensity, target.hemisphereIntensity, blend);
    this.sun.intensity = THREE.MathUtils.lerp(this.sun.intensity, target.sunIntensity, blend);
    this.rim.intensity = THREE.MathUtils.lerp(this.rim.intensity, target.rimIntensity, blend);
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(this.renderer.toneMappingExposure, target.exposure, blend);
    const starMaterial = this.space.children[0]?.material;
    if (starMaterial) starMaterial.opacity = THREE.MathUtils.lerp(starMaterial.opacity, target.stars, blend);
  }

  setScene(worldId, cast = [], { studio = false } = {}) {
    this.clearInvention();
    if (this.world) { this.scene.remove(this.world.group); this.world.dispose(); }
    for (const actor of this.actors.values()) { this.scene.remove(actor.group); actor.dispose(); }
    this.actors.clear();
    this.actorFrames.clear();
    this.studio = studio;
    this.world = createWorld(worldId);
    this.setLighting(this.world.atmosphere);
    this.style.apply(this.world.group);
    this.scene.add(this.world.group);
    const spots = this.world.characterSpots || [{ x: -1.6, y: .05, z: 1.5 }, { x: 1.3, y: .05, z: 1 }, { x: 0, y: .05, z: 2.6 }];
    cast.forEach((config, index) => {
      const actor = config.characterId
        ? createDocumentCharacter({ characterId: config.characterId, scale: studio ? 1.3 : .78 })
        : createCharacter({ type: config.type || 'rabbit', color: config.color, scale: studio ? 1.3 : .78 });
      const restBounds = new THREE.Box3().setFromObject(actor.group);
      restBounds.min.divide(actor.group.scale); restBounds.max.divide(actor.group.scale);
      this.actorFrames.set(config.id, restBounds);
      this.style.apply(actor.group);
      const spot = studio ? { x: 0, y: .08, z: 1.2 } : spots[index % spots.length];
      const normal = this.world.surfaceNormal?.(spot.x, spot.z) || UP.clone();
      actor.group.position.copy(this.world.surfacePoint?.(spot.x, spot.z, spot.y) || new THREE.Vector3(spot.x, spot.y, spot.z));
      actor.group.quaternion.setFromUnitVectors(UP, normal);
      actor.group.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(UP, spot.rotation || (index % 2 ? -.22 : .18)));
      actor.group.userData.surfaceNormal = normal.toArray();
      actor.group.userData.surfaceHeight = spot.y;
      actor.group.userData.actorId = config.id;
      actor.group.userData.actorName = config.name;
      actor.group.userData.manner = config.manner;
      this.actors.set(config.id, actor);
      this.scene.add(actor.group);
    });
    this.worldId = worldId;
    this.resetCamera();
  }

  speak(id, speaking) {
    for (const [actorId, actor] of this.actors) actor.setAction(speaking && actorId === id ? 'talk' : 'listen');
  }

  act(action, expression = 'happy') {
    this.world?.react(action);
    for (const actor of this.actors.values()) {
      actor.setExpression(expression);
      actor.setAction(action === 'listen' ? 'listen' : actor.group.userData.manner === 'calm' ? 'wave' : 'hop');
    }
  }

  clearInvention() {
    if (!this.invention) return;
    this.scene.remove(this.invention);
    this.invention.traverse(object => {
      object.geometry?.dispose();
      if (object.material) object.material.dispose();
    });
    this.invention = null;
  }

  showInvention({ kind = 'rocket', primary = '#668293', accent = '#e5be70', upgrades = [] } = {}) {
    this.clearInvention();
    const group = new THREE.Group();
    const material = (color, surface) => {
      const value = new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: 0 });
      value.userData.handcraftedSurface = surface;
      return value;
    };
    const part = (geometry, color, x, y, z, rotation = 0, surface = 'paint') => {
      const mesh = new THREE.Mesh(geometry, material(color, surface));
      mesh.position.set(x, y, z); mesh.rotation.z = rotation;
      mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
    };
    if (kind === 'portal') {
      part(new THREE.TorusGeometry(.85, .15, 12, 48), accent, 0, 0, 0);
      const portal = part(new THREE.CircleGeometry(.76, 48), primary, 0, 0, -.03);
      portal.material.transparent = true; portal.material.opacity = .62;
      for (let i = 0; i < 8; i++) part(new THREE.SphereGeometry(.07, 10, 8), '#fff8d8', Math.sin(i) * .65, Math.cos(i) * .65, .04, 0, 'ink');
    } else if (kind === 'balloon' || kind === 'parachute') {
      const balloon = part(new THREE.SphereGeometry(.85, 24, 18, 0, Math.PI * 2, 0, kind === 'parachute' ? Math.PI / 2 : Math.PI), primary, 0, .8, 0, 0, 'fabric');
      balloon.scale.y = kind === 'parachute' ? .7 : 1.12;
      part(new THREE.CylinderGeometry(.35, .29, .4, 20), accent, 0, -.6, 0, 0, 'wood');
      for (const x of [-.25, .25]) part(new THREE.CylinderGeometry(.017, .017, .95, 6), '#efe5c9', x, -.05, 0, 0, 'fabric');
    } else if (kind === 'ladder') {
      for (const x of [-.42, .42]) part(new THREE.CylinderGeometry(.07, .07, 2.4, 10), primary, x, .1, 0, 0, 'wood');
      for (let i = 0; i < 7; i++) part(new THREE.CylinderGeometry(.05, .05, .84, 8), accent, 0, -.95 + i * .34, 0, Math.PI / 2, 'wood');
    } else {
      const body = part(new THREE.CapsuleGeometry(.45, 1.3, 8, 20), primary, 0, .15, 0);
      if (kind === 'submarine' || kind === 'vehicle') body.rotation.z = Math.PI / 2;
      part(new THREE.SphereGeometry(.19, 20, 16), '#bce0e0', 0, .35, .4).scale.z = .28;
      part(new THREE.TorusGeometry(.2, .04, 8, 24), accent, 0, .35, .4);
      for (const x of [-.52, .52]) part(new THREE.ConeGeometry(.22, .65, 3), accent, x, -.52, 0, x < 0 ? -.3 : .3);
      part(new THREE.ConeGeometry(.22, .55, 16), '#edb971', 0, -1, 0, Math.PI);
    }
    // Keep each successive idea visible on the same physical invention.
    if (upgrades.includes('navigation')) {
      const display = part(new THREE.BoxGeometry(.55, .38, .12), accent, .63, .68, .34);
      display.rotation.z = -.16;
      part(new THREE.BoxGeometry(.43, .26, .04), '#a3ded0', .63, .68, .43, 0, 'ink').rotation.z = -.16;
      part(new THREE.SphereGeometry(.085, 12, 10), '#fff3bc', .91, .97, .33, 0, 'ink');
    }
    if (upgrades.includes('thruster')) {
      for (const x of [-.7, .7]) {
        part(new THREE.CylinderGeometry(.14, .21, .45, 16), accent, x, -.62, -.18);
        part(new THREE.ConeGeometry(.14, .48, 16), '#e7a36d', x, -1.02, -.18, Math.PI);
      }
    }
    if (upgrades.includes('float')) {
      for (const x of [-.66, .66]) {
        const float = part(new THREE.CapsuleGeometry(.19, .74, 6, 16), '#a9d2d5', x, -.26, .13);
        float.rotation.x = Math.PI / 2;
        part(new THREE.TorusGeometry(.2, .04, 8, 20), accent, x, -.26, .33);
      }
    }
    if (upgrades.includes('rope')) {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(.37, .5, .2), new THREE.Vector3(.99, .18, .1), new THREE.Vector3(1.04, -.67, .11), new THREE.Vector3(.69, -.83, .2)]);
      part(new THREE.TubeGeometry(curve, 22, .035, 8, false), '#ecdfbb', 0, 0, 0, 0, 'fabric');
    }
    if (upgrades.includes('ladder')) {
      for (const x of [-1.04, -.64]) part(new THREE.CylinderGeometry(.04, .04, 1.35, 8), accent, x, .26, .42, 0, 'wood');
      for (let i = 0; i < 5; i++) part(new THREE.CylinderGeometry(.028, .028, .4, 8), '#eee1bf', -.84, -.27 + i * .25, .42, Math.PI / 2, 'wood');
    }
    if (upgrades.includes('paddles')) {
      for (const x of [-1, 1]) {
        part(new THREE.CylinderGeometry(.035, .035, .9, 8), accent, x * .75, .02, -.15, x * .8, 'wood');
        const blade = part(new THREE.SphereGeometry(.2, 14, 10), primary, x * 1.06, -.3, -.15, 0, 'wood');
        blade.scale.set(.8, 1.4, .22);
      }
    }
    if (upgrades.includes('sail')) {
      part(new THREE.CylinderGeometry(.035, .035, 1.6, 8), accent, -.15, .76, -.3, 0, 'wood');
      const sail = part(new THREE.ConeGeometry(.55, .98, 3), '#f2e8cc', .17, 1.06, -.3, 0, 'fabric');
      sail.scale.z = .15;
    }
    group.userData.upgrades = [...upgrades];
    // Keep the child's invention behind the cast at a readable prop scale.
    // It must not expand the camera fit or replace the people as the subject.
    const anchor = this.world?.surfacePoint?.(.62, -.7, 1.15) || new THREE.Vector3(.62, 1.1, -.7);
    group.position.copy(anchor);
    group.userData.restY = anchor.y;
    group.scale.setScalar(.62);
    this.invention = group;
    this.style?.apply(group);
    this.scene.add(group);
  }

  snapshot() { this.renderer.render(this.scene, this.camera); return this.renderer.domElement.toDataURL('image/png'); }

  stats() {
    const viewport = this.safeViewport;
    const project = point => {
      const projected = point.clone().project(this.camera);
      return { x: (projected.x + 1) * (viewport?.canvasWidth || 0) / 2, y: (1 - projected.y) * (viewport?.canvasHeight || 0) / 2 };
    };
    const projectedBounds = object => {
      object.updateWorldMatrix(true, true);
      const points = boxCorners(new THREE.Box3().setFromObject(object)).map(project);
      const left = Math.min(...points.map(point => point.x)), right = Math.max(...points.map(point => point.x));
      const top = Math.min(...points.map(point => point.y)), bottom = Math.max(...points.map(point => point.y));
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    };
    const projectedActors = [...this.actors].map(([id, actor]) => {
      const bounds = projectedBounds(actor.group);
      return {
        id, ...bounds,
        foot: project(new THREE.Vector3().applyMatrix4(actor.group.matrixWorld)),
        head: project(new THREE.Vector3(0, this.actorFrames.get(id)?.max.y || actor.group.userData.restHeight || 2.2, 0).applyMatrix4(actor.group.matrixWorld)),
        insideSafeViewport: Boolean(viewport && bounds.left >= viewport.left && bounds.right <= viewport.right && bounds.top >= viewport.top && bounds.bottom <= viewport.bottom),
      };
    });
    return {
      world: this.worldId, actors: [...this.actors.keys()],
      calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, geometries: this.renderer.info.memory.geometries,
      camera: this.camera.position.toArray(), orbit: { yaw: this.yaw, pitch: this.pitch, zoom: this.zoom },
      frame: { projection: this.camera.projectionMatrix.toArray(), view: this.camera.matrixWorldInverse.toArray() },
      focus: { target: this.target.toArray(), ...this.characterFocus, projectedActors, projectedInvention: this.invention ? projectedBounds(this.invention) : null },
      safeViewport: viewport ? { ...viewport, insets: { ...viewport.insets } } : null,
      lighting: { period: this.world?.atmosphere?.period || 'day', sky: this.hemisphere.color.getHexString(), bounce: this.hemisphere.groundColor.getHexString(), sun: this.sun.color.getHexString(), rim: this.rim.color.getHexString(), hemisphereIntensity: this.hemisphere.intensity, sunIntensity: this.sun.intensity, rimIntensity: this.rim.intensity, exposure: this.renderer.toneMappingExposure },
      planet: this.world?.planet ? { radius: this.world.planet.radius, center: this.world.planet.center.toArray() } : null,
      actorSurfaces: [...this.actors].map(([id, actor]) => ({ id, foot: actor.group.position.toArray(), normal: actor.group.userData.surfaceNormal, height: actor.group.userData.surfaceHeight, up: UP.clone().applyQuaternion(actor.group.quaternion).toArray() })),
      invention: Boolean(this.invention), upgrades: this.invention?.userData.upgrades || [],
    };
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.world?.dispose();
    for (const actor of this.actors.values()) actor.dispose();
    this.clearInvention();
    this.space.children[0]?.geometry.dispose(); this.space.children[0]?.material.dispose();
    this.style.dispose();
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
