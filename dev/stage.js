import * as THREE from '../vendor/three.module.js';
import { createCharacter } from './models.js';
import { createWorld } from './worlds.js';

const clamp = THREE.MathUtils.clamp;

export class DioramaStage {
  constructor(container, onTouch = () => {}) {
    this.container = container;
    this.onTouch = onTouch;
    this.actors = new Map();
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#eeede6');
    this.scene.fog = new THREE.Fog('#eeede6', 30, 70);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', '可以拖动旋转、点击角色的立体场景');
    this.renderer.domElement.setAttribute('role', 'img');
    container.append(this.renderer.domElement);
    this.camera = new THREE.OrthographicCamera(-8, 8, 7, -7, .1, 100);
    this.target = new THREE.Vector3(0, .65, 0);
    this.yaw = .28;
    this.pitch = .53;
    this.zoom = 1;
    this.studio = false;
    this.scene.add(new THREE.HemisphereLight('#fffcf1', '#8a9b84', 2.2));
    const key = new THREE.DirectionalLight('#fff0d3', 3.4);
    key.position.set(-7, 12, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    key.shadow.normalBias = .04;
    key.shadow.bias = -.00015;
    key.shadow.radius = 3;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#d5e4fa', 1.5);
    rim.position.set(8, 7, -6);
    this.scene.add(rim);
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#eeede6', roughness: 1 }));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -.73;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
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
      if (this.invention && !this.reduced) {
        this.invention.position.y = 1.2 + Math.sin(time * 1.4) * .10;
        this.invention.rotation.y += dt * .18;
      }
      this.renderer.render(this.scene, this.camera);
    });
  }

  installPointer() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', event => {
      this.drag = { x: event.clientX, y: event.clientY, yaw: this.yaw, pitch: this.pitch, moved: false };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!this.drag) return;
      const dx = event.clientX - this.drag.x;
      const dy = event.clientY - this.drag.y;
      this.drag.moved ||= Math.hypot(dx, dy) > 7;
      this.yaw = this.drag.yaw - dx * .007;
      this.pitch = clamp(this.drag.pitch + dy * .004, .25, 1.15);
      this.updateCamera();
    });
    canvas.addEventListener('pointerup', event => {
      if (!this.drag?.moved) this.pick(event);
      this.drag = null;
    });
    canvas.addEventListener('pointercancel', () => { this.drag = null; });
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.zoom = clamp(this.zoom - event.deltaY * .001, .75, 1.55);
      this.resize();
    }, { passive: false });
  }

  pick(event) {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([...this.actors.values()].map(actor => actor.group), true);
    if (!hits.length) return;
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
    const aspect = width / height;
    const viewWidth = this.studio ? 10.8 : 12.4;
    const halfH = Math.max(this.studio ? 4.4 : 5.1, viewWidth / aspect / 2) / this.zoom;
    Object.assign(this.camera, { left: -halfH * aspect, right: halfH * aspect, top: halfH, bottom: -halfH });
    this.camera.updateProjectionMatrix();
    this.updateCamera();
  }

  updateCamera() {
    const radius = 23;
    this.camera.position.set(
      Math.sin(this.yaw) * Math.cos(this.pitch) * radius,
      Math.sin(this.pitch) * radius + this.target.y,
      Math.cos(this.yaw) * Math.cos(this.pitch) * radius,
    );
    this.camera.lookAt(this.target);
  }

  resetCamera() { this.yaw = .28; this.pitch = .53; this.zoom = 1; this.resize(); }

  setScene(worldId, cast = [], { studio = false } = {}) {
    this.clearInvention();
    if (this.world) { this.scene.remove(this.world.group); this.world.dispose(); }
    for (const actor of this.actors.values()) { this.scene.remove(actor.group); actor.dispose(); }
    this.actors.clear();
    this.studio = studio;
    this.world = createWorld(worldId);
    this.scene.add(this.world.group);
    const spots = this.world.characterSpots || [{ x: -1.6, y: .05, z: 1.5 }, { x: 1.3, y: .05, z: 1 }, { x: 0, y: .05, z: 2.6 }];
    cast.forEach((config, index) => {
      const actor = createCharacter({ type: config.type || 'rabbit', color: config.color, scale: studio ? 1.3 : .78 });
      const spot = studio ? { x: 0, y: .08, z: 1.2 } : spots[index % spots.length];
      actor.group.position.set(spot.x, spot.y, spot.z);
      actor.group.rotation.y = spot.rotation || (index % 2 ? -.22 : .18);
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
    const material = color => new THREE.MeshStandardMaterial({ color, roughness: .52, metalness: .12 });
    const part = (geometry, color, x, y, z, rotation = 0) => {
      const mesh = new THREE.Mesh(geometry, material(color));
      mesh.position.set(x, y, z); mesh.rotation.z = rotation;
      mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
    };
    if (kind === 'portal') {
      part(new THREE.TorusGeometry(.85, .15, 12, 48), accent, 0, 0, 0);
      const portal = part(new THREE.CircleGeometry(.76, 48), primary, 0, 0, -.03);
      portal.material.transparent = true; portal.material.opacity = .62;
      for (let i = 0; i < 8; i++) part(new THREE.SphereGeometry(.07, 10, 8), '#fff8d8', Math.sin(i) * .65, Math.cos(i) * .65, .04);
    } else if (kind === 'balloon' || kind === 'parachute') {
      const balloon = part(new THREE.SphereGeometry(.85, 24, 18, 0, Math.PI * 2, 0, kind === 'parachute' ? Math.PI / 2 : Math.PI), primary, 0, .8, 0);
      balloon.scale.y = kind === 'parachute' ? .7 : 1.12;
      part(new THREE.CylinderGeometry(.35, .29, .4, 20), accent, 0, -.6, 0);
      for (const x of [-.25, .25]) part(new THREE.CylinderGeometry(.017, .017, .95, 6), '#efe5c9', x, -.05, 0);
    } else if (kind === 'ladder') {
      for (const x of [-.42, .42]) part(new THREE.CylinderGeometry(.07, .07, 2.4, 10), primary, x, .1, 0);
      for (let i = 0; i < 7; i++) part(new THREE.CylinderGeometry(.05, .05, .84, 8), accent, 0, -.95 + i * .34, 0, Math.PI / 2);
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
      part(new THREE.BoxGeometry(.43, .26, .04), '#a3ded0', .63, .68, .43).rotation.z = -.16;
      part(new THREE.SphereGeometry(.085, 12, 10), '#fff3bc', .91, .97, .33);
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
      part(new THREE.TubeGeometry(curve, 22, .035, 8, false), '#ecdfbb', 0, 0, 0);
    }
    if (upgrades.includes('ladder')) {
      for (const x of [-1.04, -.64]) part(new THREE.CylinderGeometry(.04, .04, 1.35, 8), accent, x, .26, .42);
      for (let i = 0; i < 5; i++) part(new THREE.CylinderGeometry(.028, .028, .4, 8), '#eee1bf', -.84, -.27 + i * .25, .42, Math.PI / 2);
    }
    if (upgrades.includes('paddles')) {
      for (const x of [-1, 1]) {
        part(new THREE.CylinderGeometry(.035, .035, .9, 8), accent, x * .75, .02, -.15, x * .8);
        const blade = part(new THREE.SphereGeometry(.2, 14, 10), primary, x * 1.06, -.3, -.15);
        blade.scale.set(.8, 1.4, .22);
      }
    }
    if (upgrades.includes('sail')) {
      part(new THREE.CylinderGeometry(.035, .035, 1.6, 8), accent, -.15, .76, -.3);
      const sail = part(new THREE.ConeGeometry(.55, .98, 3), '#f2e8cc', .17, 1.06, -.3);
      sail.scale.z = .15;
    }
    group.userData.upgrades = [...upgrades];
    group.position.set(0, 1.2, -.2);
    group.scale.setScalar(.85);
    this.invention = group;
    this.scene.add(group);
  }

  snapshot() { this.renderer.render(this.scene, this.camera); return this.renderer.domElement.toDataURL('image/png'); }

  stats() {
    return { world: this.worldId, actors: [...this.actors.keys()], calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, geometries: this.renderer.info.memory.geometries, camera: this.camera.position.toArray(), invention: Boolean(this.invention), upgrades: this.invention?.userData.upgrades || [] };
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.world?.dispose();
    for (const actor of this.actors.values()) actor.dispose();
    this.clearInvention();
    this.floor.geometry.dispose(); this.floor.material.dispose();
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
