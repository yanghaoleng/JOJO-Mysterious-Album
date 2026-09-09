/** Node-only stage ownership, texture-frame and raycast regressions.
 * Uses the real stage prototype/Three objects without constructing WebGL.
 * The tiny Canvas2D double only supplies known alpha pixels; this is not a
 * rendered UI/microphone test. Run: node src/ink-planet-stage.test.mjs
 */
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { InkPlanetStage } from './ink-planet-stage.js';

function canvas(width = 16, height = 16, alpha = () => 255) {
  const c = { width, height };
  let source = null;
  c.alpha = alpha;
  c.getContext = () => ({
    drawImage(image) { source = image; }, clearRect() {},
    getImageData(x, y, w, h) {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const sx = source ? Math.floor((x + i) * source.width / c.width) : x + i;
        const sy = source ? Math.floor((y + j) * source.height / c.height) : y + j;
        const opacity = (source || c).alpha?.(sx, sy) ?? 255;
        data.set([240, 232, 216, opacity], (j * w + i) * 4);
      }
      return { data, width: w, height: h };
    },
  });
  return c;
}
const originalDocument = globalThis.document;
globalThis.document = { createElement: tag => { assert.equal(tag, 'canvas'); return canvas(); } };
const results = [];
function test(name, run) {
  try { run(); results.push({ name, pass: true }); }
  catch (error) { results.push({ name, pass: false, error: error.message }); }
}
function stageDouble() {
  const stage = Object.create(InkPlanetStage.prototype);
  Object.assign(stage, {
    scene: new THREE.Scene(), actors: new Map(), actorFrames: new Map(), borrowed: new Map(),
    style: { apply: group => group }, inkSpace: { update() {} },
    setLighting() {}, resetCamera() {},
    raycaster: new THREE.Raycaster(), pointer: new THREE.Vector2(),
    renderer: { domElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }) } },
    camera: new THREE.OrthographicCamera(-2, 2, 2, -2, .1, 30),
    touched: [], onTouch(id) { this.touched.push(id); },
  });
  stage.camera.position.set(0, 0, 10); stage.camera.lookAt(0, 0, 0); stage.camera.updateMatrixWorld(true);
  return stage;
}
const stateOf = holder => ({ parent: holder.parent, position: holder.position.toArray(), quaternion: holder.quaternion.toArray(), scale: holder.scale.toArray() });

test('borrow/restoration preserves holder identity, transforms, original materials and resources', () => {
  const stage = stageDouble(), parent = new THREE.Group(), holder = new THREE.Group(); parent.add(holder);
  holder.position.set(2, -3, .4); holder.rotation.set(.1, -.2, .05); holder.scale.set(1.1, 1.3, .9);
  const original = stateOf(holder), light = new THREE.DirectionalLight(); holder.add(light);
  const sourceTexture = new THREE.CanvasTexture(canvas());
  const source = new THREE.MeshBasicMaterial({ map: sourceTexture, transparent: true, depthWrite: false });
  const other = new THREE.MeshStandardMaterial({ color: '#abcdab' });
  const geometry = new THREE.PlaneGeometry(2, 2), mesh = new THREE.Mesh(geometry, [source, other]); holder.add(mesh);
  const originalMaterials = mesh.material;
  let originalDisposals = 0, ownedDisposals = 0;
  for (const resource of [sourceTexture, source, other, geometry]) resource.addEventListener('dispose', () => originalDisposals++);
  stage.setStoryScene({ id: 'orchard-bush' }, [{ id: 'npc', holder }]);
  assert.equal(stage.borrowed.get('npc').holder, holder);
  assert.notEqual(holder.parent, parent); assert.equal(light.visible, false);
  assert.notEqual(mesh.material[0], source); assert.equal(mesh.material[1], other);
  const saved = stage.borrowed.get('npc');
  const ownedCount = saved.clones.size + saved.textures.size;
  for (const resource of [...saved.clones, ...saved.textures]) resource.addEventListener('dispose', () => ownedDisposals++);
  stage.releaseActors(); stage.releaseActors();
  assert.deepEqual(stateOf(holder), original);
  assert.equal(light.visible, true); assert.equal(mesh.material, originalMaterials);
  assert.equal(originalDisposals, 0); assert.equal(ownedDisposals, ownedCount);
  assert.equal(stage.actors.size, 0); assert.equal(stage.borrowed.size, 0); assert.equal(stage.actorFrames.size, 0);
  stage.world.dispose(); sourceTexture.dispose(); source.dispose(); other.dispose(); geometry.dispose();
});

test('animated source swaps and same-texture version updates propagate once to copies', () => {
  const stage = stageDouble(), holder = new THREE.Group();
  const a = new THREE.CanvasTexture(canvas()), b = new THREE.CanvasTexture(canvas());
  const source = new THREE.MeshBasicMaterial({ map: a, transparent: true });
  const geometry = new THREE.PlaneGeometry(2, 2), mesh = new THREE.Mesh(geometry, source); holder.add(mesh);
  let calls = 0;
  stage.setStoryScene({ id: 'creaky-bridge' }, [{ id: 'npc', holder, update: () => calls++ }]);
  const copy = mesh.material, actor = stage.actors.get('npc');
  assert.notEqual(copy.map, a); assert.equal(copy.map.image, a.image);
  source.map = b; source.opacity = .41; actor.update(1, .016);
  assert.equal(calls, 1); assert.equal(copy.map.image, b.image); assert.equal(copy.opacity, .41);
  const version = copy.map.version;
  b.needsUpdate = true; actor.update(2, .016);
  assert.ok(copy.map.version > version, 'Same CanvasTexture changed but clone.version did not advance');
  const uploaded = copy.map.version; actor.update(3, .016);
  assert.equal(copy.map.version, uploaded, 'Unchanged texture was unnecessarily uploaded again');
  stage.releaseActors(); assert.equal(mesh.material, source); assert.equal(source.map, b);
  stage.world.dispose(); a.dispose(); b.dispose(); source.dispose(); geometry.dispose();
});

function addActor(stage, id, { z = 0, visible = true, map = null, parentVisible = true } = {}) {
  const group = new THREE.Group(), nested = new THREE.Group();
  group.position.z = z; group.visible = visible; group.userData.actorId = id; nested.visible = parentVisible;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ map, transparent: !!map, side: THREE.DoubleSide }));
  group.add(nested); nested.add(mesh); group.updateMatrixWorld(true);
  stage.actors.set(id, { group, setAction() {} });
  return group;
}
function cleanPick(stage) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  for (const group of [...stage.actors.values()].map(a => a.group).concat(stage.world ? [stage.world.group] : [])) group.traverse(node => {
    if (!node.isMesh) return; geometries.add(node.geometry); materials.add(node.material); if (node.material.map) textures.add(node.material.map);
  });
  for (const resource of [...geometries, ...materials, ...textures]) resource.dispose();
}
for (const hidden of ['group', 'ancestor']) test(`raycast ignores a hidden ${hidden} in front of a visible actor`, () => {
  const stage = stageDouble();
  addActor(stage, 'front', { z: 1, visible: hidden !== 'group', parentVisible: hidden !== 'ancestor' });
  addActor(stage, 'back');
  stage.pick({ clientX: 100, clientY: 100 });
  assert.deepEqual(stage.touched, ['back']); cleanPick(stage);
});
test('transparent alpha at the hit UV lets clicks reach the visible actor behind', () => {
  const stage = stageDouble();
  addActor(stage, 'blank-front', { z: 1, map: new THREE.CanvasTexture(canvas(16, 16, () => 0)) });
  addActor(stage, 'back');
  stage.pick({ clientX: 100, clientY: 100 });
  assert.deepEqual(stage.touched, ['back']); cleanPick(stage);
});
test('opaque scenery blocks actor hits but hidden scenery does not', () => {
  const stage = stageDouble(); addActor(stage, 'back');
  const blocker = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial()); blocker.position.z = 2;
  stage.world = { group: new THREE.Group() }; stage.world.group.add(blocker); stage.world.group.updateMatrixWorld(true);
  stage.pick({ clientX: 100, clientY: 100 }); assert.deepEqual(stage.touched, []);
  blocker.visible = false; stage.pick({ clientX: 100, clientY: 100 }); assert.deepEqual(stage.touched, ['back']); cleanPick(stage);
});
test('alpha-aware framing is finite and narrower than an otherwise empty portrait canvas', () => {
  const stage = stageDouble(), holder = new THREE.Group();
  const map = new THREE.CanvasTexture(canvas(16, 16, (x, y) => x >= 6 && x <= 9 && y >= 2 && y <= 13 ? 255 : 0));
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map, transparent: true })); holder.add(mesh);
  stage.setStoryScene({ id: 'orchard-bush' }, [{ id: 'npc', holder }]);
  const size = stage.actorFrames.get('npc').getSize(new THREE.Vector3());
  assert.ok(size.toArray().every(Number.isFinite)); assert.ok(size.x < 1); assert.equal(size.y, 2.08);
  stage.releaseActors(); stage.world.dispose(); map.dispose(); mesh.material.dispose(); mesh.geometry.dispose();
});
test('default framing keeps borrowed actors inside mobile/desktop safe viewports across scene radii', () => {
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    const stage = stageDouble();
    delete stage.resetCamera;
    stage.container = { getBoundingClientRect: () => ({ width, height }) };
    stage.renderer.setSize = () => {};
    stage.viewportInsets = { top: 150, bottom: 130, left: 18, right: 18 };
    stage.target = new THREE.Vector3(); stage.zoom = 1; stage.yaw = .12; stage.pitch = .23;
    for (const sceneId of ['orchard-bush', 'warm-bakery', 'creaky-bridge', 'two-houses', 'moon-hill', 'moon-underwater', 'moon-pocket', 'moon-clouds', 'moon-landing']) {
      const resources = [];
      const entries = ['npc', 'companion-0', 'pet'].map(id => {
        const holder = new THREE.Group();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, .25), new THREE.MeshBasicMaterial());
        holder.add(mesh); resources.push(mesh.geometry, mesh.material); return { id, holder };
      });
      stage.setStoryScene({ id: sceneId }, entries);
      for (const [id, actor] of stage.actors) {
        const local = stage.actorFrames.get(id); actor.group.updateMatrixWorld(true);
        for (let i = 0; i < 8; i++) {
          const point = new THREE.Vector3(i & 1 ? local.max.x : local.min.x, i & 2 ? local.max.y : local.min.y, i & 4 ? local.max.z : local.min.z)
            .applyMatrix4(actor.group.matrixWorld).project(stage.camera);
          const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2;
          assert.ok(x >= 18 && x <= width - 18 && y >= 150 && y <= height - 130 && Math.abs(point.z) <= 1,
            `${sceneId}/${width}/${id} default camera clipped actor at ${x}, ${y}`);
        }
      }
      stage.releaseActors(); for (const resource of resources) resource.dispose();
    }
    stage.world.dispose();
  }
});
globalThis.document = originalDocument;
console.log(JSON.stringify({ pass: results.every(r => r.pass), results }, null, 2));
if (results.some(r => !r.pass)) process.exitCode = 1;
