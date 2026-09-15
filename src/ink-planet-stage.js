import * as THREE from '../vendor/three.module.js';
import { DioramaStage } from '../dev/stage.js';
import { createWorld, WORLD_CATALOG } from '../dev/worlds.js';
import { createInkPlanetStyle, applyInkAtmosphere } from './ink-planet-materials.js';
import { createInkPlanetSpace } from './ink-planet-space.js';
import { createInkPlanetLines } from './ink-planet-lines.js';

const UP = new THREE.Vector3(0, 1, 0);
const alphaBounds = new WeakMap();

// Old portrait planes include generous transparent margins for drawing and
// expressions. Frame the visible ink, not those rectangular texture canvases.
function visibleActorBounds(holder) {
  const bounds = new THREE.Box3();
  holder.updateWorldMatrix(true, true);
  holder.traverseVisible(mesh => {
    if (!mesh.isMesh || !mesh.geometry) return;
    mesh.geometry.computeBoundingBox();
    const local = mesh.geometry.boundingBox.clone();
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const source = material?.map?.image;
    if (mesh.geometry.type === 'PlaneGeometry' && source?.width && source?.height) {
      if (!alphaBounds.has(source)) {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1, 160 / Math.max(source.width, source.height));
        canvas.width = Math.max(1, Math.round(source.width * ratio));
        canvas.height = Math.max(1, Math.round(source.height * ratio));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let crop = null;
        try {
          ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let x0 = canvas.width, y0 = canvas.height, x1 = -1, y1 = -1;
          for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
            if (data[(y * canvas.width + x) * 4 + 3] < 40) continue;
            x0 = Math.min(x0, x); y0 = Math.min(y0, y);
            x1 = Math.max(x1, x); y1 = Math.max(y1, y);
          }
          crop = x1 >= 0 ? [x0 / canvas.width, 1 - (y1 + 1) / canvas.height, (x1 + 1) / canvas.width, 1 - y0 / canvas.height] : [];
        } catch { /* A non-readable optional texture uses its geometry bounds. */ }
        alphaBounds.set(source, crop);
      }
      const crop = alphaBounds.get(source);
      if (crop?.length === 0) return;
      if (crop) {
        const size = local.getSize(new THREE.Vector3()), origin = local.min.clone();
        local.min.x = origin.x + size.x * crop[0]; local.min.y = origin.y + size.y * crop[1];
        local.max.x = origin.x + size.x * crop[2]; local.max.y = origin.y + size.y * crop[3];
      }
    }
    bounds.union(local.applyMatrix4(mesh.matrixWorld));
  });
  return bounds;
}
const WORLD_BY_SCENE = Object.freeze({
  'orchard-bush': 'orchard', 'warm-bakery': 'bakery', 'creaky-bridge': 'bridge',
  'two-houses': 'home', 'doudou-home': 'home', 'moon-hill': 'observatory',
  'moon-underwater': 'reef', 'moon-pocket': 'pocket', 'moon-clouds': 'cloud',
  'moon-landing': 'moon',
});

/** The original story owns its characters and animation; this stage borrows
 * their meshes only while a scene is visible. Nothing is regenerated or saved. */
export class InkPlanetStage extends DioramaStage {
  constructor(container, onTouch = () => {}) {
    super(container, onTouch);
    this.style.dispose();
    this.style = createInkPlanetStyle();
    this.scene.remove(this.space);
    this.space.children[0]?.geometry.dispose();
    this.space.children[0]?.material.dispose();
    this.inkSpace = createInkPlanetSpace({ reducedMotion: this.reduced });
    this.space = this.inkSpace.group;
    this.scene.add(this.space);
    this.borrowed = new Map();
    this.ready = true;
    this.renderer.domElement.setAttribute('aria-label', '水墨小星球：拖动调整视角，双指或滚轮缩放，轻触角色互动');
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '0', 'Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home' || event.key === '0') { this.resetCamera(); return; }
      if (event.key === 'ArrowLeft') this.yaw -= .09;
      if (event.key === 'ArrowRight') this.yaw += .09;
      if (event.key === 'ArrowUp') this.pitch -= .05;
      if (event.key === 'ArrowDown') this.pitch += .05;
      if (event.key === '+') this.zoom = Math.min(1.45, this.zoom + .08);
      if (event.key === '-') this.zoom = Math.max(.8, this.zoom - .08);
      this.resize();
    });
    this.setViewportInsets({ top: 112, bottom: 135, left: 20, right: 20 });
  }

  updateCamera() {
    // Keep the camera on the inhabited hemisphere, not beneath the soil or
    // behind the original paper-ink characters. The orbit target never drifts.
    this.yaw = THREE.MathUtils.clamp(this.yaw, -.85, .85);
    this.pitch = THREE.MathUtils.clamp(this.pitch, .08, .72);
    this.zoom = THREE.MathUtils.clamp(this.zoom, .8, 1.45);
    super.updateCamera();
    // Original ink puppets turn toward the viewer on the globe's tangent;
    // their faces must not collapse to thin edges during an orbit. Solid NPCs
    // retain their true 3D orientation, and every character keeps its footing.
    for (const actor of this.actors.values()) {
      if (!actor.inkMount) continue;
      const toward = this.camera.position.clone().sub(actor.group.position)
        .applyQuaternion(actor.group.quaternion.clone().invert());
      actor.inkMount.rotation.y = Math.atan2(toward.x, toward.z);
    }
    if (this.ready) this.container.dispatchEvent(new CustomEvent('inkplanet:viewchange'));
  }

  pick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const visible = object => {
      for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return false;
      return true;
    };
    const hits = this.raycaster.intersectObjects([...this.actors.values()].map(actor => actor.group), true);
    const hit = hits.find(candidate => {
      if (!visible(candidate.object)) return false;
      const material = Array.isArray(candidate.object.material) ? candidate.object.material[candidate.face?.materialIndex || 0] : candidate.object.material;
      if (!material?.visible || material.opacity <= .05) return false;
      const source = material.map?.image;
      if (candidate.uv && material.transparent && source?.getContext) {
        const uv = candidate.uv.clone(); material.map.transformUv(uv);
        const x = THREE.MathUtils.clamp(Math.floor(uv.x * source.width), 0, source.width - 1);
        const y = THREE.MathUtils.clamp(Math.floor(uv.y * source.height), 0, source.height - 1);
        try { if (source.getContext('2d').getImageData(x, y, 1, 1).data[3] < 30) return false; } catch { /* Optional non-readable image. */ }
      }
      return true;
    });
    if (!hit) return;
    const blocker = this.world && this.raycaster.intersectObject(this.world.group, true).find(candidate => visible(candidate.object) && !candidate.object.material?.transparent);
    if (blocker && blocker.distance < hit.distance - .025) return;
    let object = hit.object;
    while (object && !object.userData.actorId) object = object.parent;
    if (object) this.onTouch(object.userData.actorId);
  }

  resetCamera() {
    this.yaw = .12;
    this.pitch = .23;
    this.zoom = 1;
    this.frameCharacters();
  }

  resetView() { this.resetCamera(); }

  resize() {
    this.zoom = THREE.MathUtils.clamp(this.zoom, .8, 1.45);
    super.resize();
    const rect = this.container.getBoundingClientRect();
    this.inkLines?.resize(rect.width, rect.height);
  }

  setLighting(atmosphere) {
    super.setLighting(applyInkAtmosphere(atmosphere));
    this.inkSpace?.setAtmosphere(atmosphere);
    for (const key of ['base', 'glow', 'horizon', 'ink', 'muted', 'accent', 'paper']) {
      if (atmosphere[key]) this.container.style.setProperty(`--planet-${key}`, atmosphere[key]);
    }
    this.container.dataset.period = atmosphere.period;
  }

  updateLighting(dt, immediate = false) {
    const target = this.lightingTarget;
    if (!target) return;
    const blend = immediate || this.reduced ? 1 : 1 - Math.exp(-dt * 3.2);
    this.hemisphere.color.lerp(target.sky, blend);
    this.hemisphere.groundColor.lerp(target.bounce, blend);
    this.sun.color.lerp(target.sun, blend);
    this.rim.color.lerp(target.rim, blend);
    for (const [light, key] of [[this.hemisphere, 'hemisphereIntensity'], [this.sun, 'sunIntensity'], [this.rim, 'rimIntensity']]) {
      light.intensity = THREE.MathUtils.lerp(light.intensity, target[key], blend);
    }
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(this.renderer.toneMappingExposure, target.exposure, blend);
  }

  releaseActors() {
    for (const [id, saved] of this.borrowed || []) {
      const actor = this.actors.get(id);
      actor?.group.removeFromParent();
      saved.holder.removeFromParent();
      if (saved.parent) saved.parent.add(saved.holder);
      saved.holder.position.copy(saved.position);
      saved.holder.quaternion.copy(saved.quaternion);
      saved.holder.scale.copy(saved.scale);
      for (const [light, visible] of saved.lights) light.visible = visible;
      for (const [mesh, material] of saved.materials) mesh.material = material;
      for (const material of saved.clones) material.dispose();
      for (const texture of saved.textures) texture.dispose();
    }
    this.borrowed?.clear();
    this.actors.clear();
    this.actorFrames.clear();
  }

  setStoryScene(scene, entries = []) {
    this.releaseActors();
    this.clearInvention();
    this.inkLines?.dispose();
    if (this.world) { this.world.group.removeFromParent(); this.world.dispose(); }
    this.worldId = WORLD_CATALOG.some(world => world.id === scene.worldId)
      ? scene.worldId : WORLD_BY_SCENE[scene.id] || 'orchard';
    this.world = createWorld(this.worldId);
    this.style.apply(this.world.group);
    this.inkLines = createInkPlanetLines();
    this.inkLines.apply(this.world.group);
    this.scene.add(this.world.group);
    this.setLighting(this.world.atmosphere);
    const worldUpdate = this.world.update;
    this.world.update = (time, dt) => {
      worldUpdate(time, dt);
      this.inkSpace.update(time, dt, this.camera, this.target);
    };

    const list = entries.filter(entry => entry.holder);
    // The story's main NPC and the child's companion sit close together in
    // front of the scenery. Supporting actors do not steal the camera fit.
    const spread = list.length > 2 ? 1.55 : 1.85;
    list.forEach((entry, index) => {
      const holder = entry.holder;
      const saved = {
        holder, parent: holder.parent, position: holder.position.clone(),
        quaternion: holder.quaternion.clone(), scale: holder.scale.clone(),
        lights: [], materials: [], clones: new Set(), textures: new Set(), textureCopies: new Map(), textureVersions: new Map(), animatedMaterials: [],
      };
      // Embedded studio lights belong to individual portraits, not to the
      // shared world. Basic hand-drawn textures keep their original colours.
      holder.traverse(object => {
        if (object.isLight) { saved.lights.push([object, object.visible]); object.visible = false; }
        if (!object.isMesh) return;
        const source = Array.isArray(object.material) ? object.material : [object.material];
        if (!source.some(material => material.isMeshBasicMaterial && material.map)) return;
        saved.materials.push([object, object.material]);
        const copies = source.map(material => {
          if (!material.isMeshBasicMaterial || !material.map) return material;
          const copy = material.clone();
          copy.map = material.map.clone(); copy.map.colorSpace = THREE.SRGBColorSpace;
          copy.toneMapped = false;
          copy.needsUpdate = true;
          saved.clones.add(copy); saved.textures.add(copy.map);
          saved.textureCopies.set(material.map, copy.map);
          saved.textureVersions.set(material.map, material.map.version);
          saved.animatedMaterials.push([material, copy]);
          return copy;
        });
        object.material = Array.isArray(object.material) ? copies : copies[0];
      });
      const group = new THREE.Group();
      const mount = new THREE.Group();
      mount.add(holder); group.add(mount);
      group.updateMatrixWorld(true);
      const bounds = visibleActorBounds(holder);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const height = entry.id === 'pet' ? 1.8 : 2.08;
      const fit = height / Math.max(.1, size.y);
      mount.scale.setScalar(fit);
      mount.position.set(-center.x * fit, -bounds.min.y * fit, -center.z * fit);
      const x = (index - (list.length - 1) / 2) * spread;
      // In the bridge chapter the cast waits on the near bank, in front of
      // the railings, so the child's companion never has a rail across its face.
      const z = (this.worldId === 'bridge' ? 3.35 : 2.5) - Math.abs(x) * .08;
      const normal = this.world.surfaceNormal(x, z);
      group.position.copy(this.world.surfacePoint(x, z, .045));
      group.quaternion.setFromUnitVectors(UP, normal);
      Object.assign(group.userData, {
        actorId: entry.id, actorName: entry.character?.name || entry.id,
        surfaceNormal: normal.toArray(), surfaceHeight: .045,
      });
      this.scene.add(group);
      group.visible = entry.visible !== false;
      const update = (time, dt) => {
        entry.update?.(time, dt);
        // The original animator swaps the source material's canvas frame.
        // Keep our colour-correct copies live, including lazily drawn mouths.
        for (const [source, copy] of saved.animatedMaterials) {
          if (!saved.textureCopies.has(source.map)) {
            const texture = source.map.clone(); texture.colorSpace = THREE.SRGBColorSpace;
            saved.textureCopies.set(source.map, texture); saved.textures.add(texture);
          }
          copy.map = saved.textureCopies.get(source.map);
          if (saved.textureVersions.get(source.map) !== source.map.version) {
            copy.map.needsUpdate = true;
            saved.textureVersions.set(source.map, source.map.version);
          }
          copy.opacity = source.opacity;
        }
      };
      this.actors.set(entry.id, { group, update, inkMount: saved.animatedMaterials.length ? mount : null, setAction: () => {}, dispose: () => {} });
      this.actorFrames.set(entry.id, new THREE.Box3(new THREE.Vector3(-size.x * fit / 2, 0, -size.z * fit / 2), new THREE.Vector3(size.x * fit / 2, height, size.z * fit / 2)));
      this.borrowed.set(entry.id, saved);
    });
    this.resetCamera();
  }

  setActorVisible(id, visible) {
    const actor = this.actors.get(id);
    if (actor) actor.group.visible = visible;
  }

  getActorScreenPoint(id, heightFraction = 1) {
    const actor = this.actors.get(id);
    if (!actor) return { x: 0, y: 0, visible: false };
    actor.group.updateWorldMatrix(true, false);
    const point = new THREE.Vector3(0, (this.actorFrames.get(id)?.max.y || 2) * heightFraction, 0).applyMatrix4(actor.group.matrixWorld).project(this.camera);
    const { width, height } = this.container.getBoundingClientRect();
    return { x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2, visible: actor.group.visible && point.z >= -1 && point.z <= 1 };
  }

  stats() {
    const stats = super.stats();
    const viewport = this.safeViewport;
    if (viewport) stats.focus.projectedActors = [...this.actors].map(([id, actor]) => {
      const box = visibleActorBounds(actor.group);
      const points = Array.from({ length: 8 }, (_, i) => new THREE.Vector3(
        i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z,
      ).project(this.camera));
      const left = (Math.min(...points.map(p => p.x)) + 1) * viewport.canvasWidth / 2;
      const right = (Math.max(...points.map(p => p.x)) + 1) * viewport.canvasWidth / 2;
      const top = (1 - Math.max(...points.map(p => p.y))) * viewport.canvasHeight / 2;
      const bottom = (1 - Math.min(...points.map(p => p.y))) * viewport.canvasHeight / 2;
      return { id, left, right, top, bottom, width: right - left, height: bottom - top,
        head: this.getActorScreenPoint(id, 1), foot: this.getActorScreenPoint(id, 0),
        insideSafeViewport: left >= viewport.left && right <= viewport.right && top >= viewport.top && bottom <= viewport.bottom,
      };
    });
    return { ...stats, edition: 'ink-planet', space: this.inkSpace?.diagnostics?.() };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.inkLines?.dispose();
    this.releaseActors();
    this.inkSpace.dispose();
    // super.dispose handles all remaining GPU resources; space was disposed
    // above and is temporarily empty to avoid disposing its children twice.
    this.space = new THREE.Group();
    super.dispose();
    // Each stage exclusively owns its WebGL context. Repeated 2D/3D toggles
    // must release it immediately instead of waiting for browser collection.
    this.renderer.forceContextLoss();
  }
}
