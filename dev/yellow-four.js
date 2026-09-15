import * as THREE from '../vendor/three.module.js';
import { createYellowFour } from './yellow-four-models.js';

const stage = document.querySelector('#stage');
const notice = document.querySelector('#notice');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-6, 6, 4, -4, .1, 80);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
} catch {
  document.querySelector('#loading').textContent = '暂时无法打开立体场景，请使用支持 WebGL 的浏览器。';
  for (const button of document.querySelectorAll('button')) button.disabled = true;
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('role', 'img');
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', '黄牛、圆滚滚、叫叫和袋鼠的立体合照，可以拖动或用方向键旋转，使用加减键缩放');
stage.append(renderer.domElement);
scene.add(new THREE.HemisphereLight('#fff8da', '#bd955b', 1.9));
const key = new THREE.DirectionalLight('#fff4d4', 2.6);
key.position.set(-5, 9, 7); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: .1, far: 30 });
key.shadow.normalBias = .035; key.shadow.bias = -.0001;
scene.add(key);
const fill = new THREE.DirectionalLight('#fffbed', 1.2); fill.position.set(6, 5, -3); scene.add(fill);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .14 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -.018; floor.receiveShadow = true; scene.add(floor);

const actors = createYellowFour();
const placements = [[-3.40, 0, .0], [-1.15, 0, .10], [1.04, 0, .42], [3.03, 0, -.02]];
actors.forEach((actor, index) => {
  actor.group.position.set(...placements[index]);
  actor.group.rotation.y = [-.04, 0, -.07, -.12][index];
  scene.add(actor.group);
});
const bounds = new THREE.Box3();
actors.forEach(actor => bounds.union(new THREE.Box3().setFromObject(actor.group)));
const target = new THREE.Vector3(0, 1.58, 0);
let yaw = 0, pitch = .11, zoom = 1, pose = 'group', lastFrame = 0, animationTime = 0;
const greetings = new Map();

function updateCamera() {
  const distance = 15;
  camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * distance,
    target.y + Math.sin(pitch) * distance, target.z + Math.cos(yaw) * Math.cos(pitch) * distance);
  camera.lookAt(target);
}
function resize() {
  const { width, height } = stage.getBoundingClientRect();
  if (!width || !height) return;
  const aspect = width / height;
  const halfWidth = Math.max(5.25, 2.45 * aspect) / zoom;
  camera.left = -halfWidth; camera.right = halfWidth;
  camera.top = halfWidth / aspect; camera.bottom = -halfWidth / aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  updateCamera(); renderer.render(scene, camera);
}
new ResizeObserver(resize).observe(stage);
resize();

function updateActors(time, dt) {
  actors.forEach((actor, i) => {
    const waving = (greetings.get(actor.id) || 0) > time;
    actor.setAction(waving ? 'wave' : pose === 'group' ? 'idle' : pose);
    actor.update(reducedMotion ? 0 : time, dt);
    if (pose === 'group' && !waving) {
      // Each limb pivots at the actual shoulder; hold an open, friendly group pose.
      const rotations = [[0, 1.06], [-1.02, 1.05], [-.45, .48], [-.75, .02]][i];
      actor.arms.forEach((arm, side) => { arm.rotation.z = rotations[side]; });
    }
    actor.rig.rotation.z += !reducedMotion && pose === 'hop' ? Math.sin(time * 4.3 + i * .5) * .025 : 0;
  });
}
renderer.setAnimationLoop(now => {
  const dt = Math.min((now - lastFrame) / 1000 || 1 / 60, .05); lastFrame = now;
  if (document.hidden) return;
  animationTime += dt;
  updateActors(animationTime, dt);
  renderer.render(scene, camera);
});
document.querySelector('#loading').hidden = true;
stage.dataset.ready = 'true';

function greet(id) {
  const actor = actors.find(item => item.id === id); if (!actor) return;
  greetings.set(id, animationTime + 3);
  notice.textContent = `${actor.name}：嗨！今天一起闪闪发黄。`;
  document.querySelectorAll('[data-actor]').forEach(button => button.classList.toggle('active', button.dataset.actor === id));
}
document.querySelectorAll('[data-actor]').forEach(button => button.addEventListener('click', () => greet(button.dataset.actor)));
document.querySelectorAll('[data-pose]').forEach(button => button.addEventListener('click', () => {
  pose = button.dataset.pose; greetings.clear();
  document.querySelectorAll('[data-pose]').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
  notice.textContent = { group: '靠近一点，这一张谁也不能少。', wave: '你好呀！来自四巨头的集体问候。', hop: '快乐太多，已经站不住了。' }[pose];
}));
document.querySelector('#reset').addEventListener('click', () => { yaw = 0; pitch = .11; zoom = 1; resize(); notice.textContent = '全员看镜头，咔嚓。'; });

const pointers = new Map();
let drag, pinch, moved = false, hadPinch = false;
const canvas = renderer.domElement;
const raycaster = new THREE.Raycaster();
canvas.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'ArrowLeft') yaw -= .15;
  if (event.key === 'ArrowRight') yaw += .15;
  if (event.key === 'ArrowUp') pitch = Math.min(1.1, pitch + .1);
  if (event.key === 'ArrowDown') pitch = Math.max(-.15, pitch - .1);
  if (event.key === '+' || event.key === '=') zoom = Math.min(2, zoom + .1);
  if (event.key === '-') zoom = Math.max(.65, zoom - .1);
  if (event.key === 'Home') { yaw = 0; pitch = .11; zoom = 1; }
  resize();
});
canvas.addEventListener('pointerdown', event => {
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  canvas.setPointerCapture(event.pointerId);
  if (pointers.size === 1) { moved = false; hadPinch = false; drag = { x: event.clientX, y: event.clientY, yaw, pitch }; }
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom }; hadPinch = true; drag = null;
  }
});
canvas.addEventListener('pointermove', event => {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2 && pinch) {
    const [a, b] = [...pointers.values()];
    zoom = THREE.MathUtils.clamp(pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.distance), .65, 2);
    resize(); return;
  }
  if (!drag) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  moved ||= Math.hypot(dx, dy) > 6;
  yaw = drag.yaw - dx * .006;
  pitch = THREE.MathUtils.clamp(drag.pitch + dy * .004, -.15, 1.1); updateCamera();
});
canvas.addEventListener('pointerup', event => {
  if (!moved && !hadPinch && drag) {
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera);
    const hit = raycaster.intersectObjects(actors.map(actor => actor.group), true)[0];
    let object = hit?.object;
    while (object && !object.userData.actorId) object = object.parent;
    if (object) greet(object.userData.actorId);
  }
  pointers.delete(event.pointerId); drag = null; pinch = null;
});
const cancelPointer = event => { pointers.delete(event.pointerId); drag = null; pinch = null; hadPinch = true; };
canvas.addEventListener('pointercancel', cancelPointer);
canvas.addEventListener('lostpointercapture', cancelPointer);
canvas.addEventListener('wheel', event => {
  event.preventDefault(); zoom = THREE.MathUtils.clamp(zoom - event.deltaY * .001, .65, 2); resize();
}, { passive: false });

document.querySelector('#save').addEventListener('click', () => {
  const button = document.querySelector('#save'); button.disabled = true;
  const originalSize = renderer.getSize(new THREE.Vector2());
  const originalRatio = renderer.getPixelRatio();
  const frustum = [camera.left, camera.right, camera.top, camera.bottom];
  let snapshot;
  try {
    // Export the same view and pose, with the full group framed in a wide print.
    renderer.setPixelRatio(1); renderer.setSize(2400, 1150, false);
    camera.left = -5.5 / zoom; camera.right = 5.5 / zoom;
    camera.top = 5.5 / zoom * 1150 / 2400; camera.bottom = -camera.top;
    camera.updateProjectionMatrix(); renderer.render(scene, camera);
    snapshot = document.createElement('canvas'); snapshot.width = 2400; snapshot.height = 1600;
    const ctx = snapshot.getContext('2d');
    ctx.fillStyle = '#faf2d8'; ctx.fillRect(0, 0, 2400, 1600);
    ctx.textAlign = 'center'; ctx.fillStyle = '#493414'; ctx.font = '900 132px "PingFang SC", sans-serif';
    ctx.fillText('黄色4巨头', 1200, 220);
    ctx.font = '32px "PingFang SC", sans-serif'; ctx.fillStyle = '#927950'; ctx.fillText('一个颜色，四种可爱。', 1200, 290);
    ctx.drawImage(canvas, 0, 290, 2400, 1150);
    ctx.font = '600 33px "PingFang SC", sans-serif'; ctx.fillStyle = '#735327';
    ctx.fillText('黄牛    /    圆滚滚    /    叫叫    /    袋鼠', 1200, 1500);
  } catch {
    button.disabled = false;
    notice.textContent = '合照没有生成成功，请再试一次。';
    return;
  } finally {
    [camera.left, camera.right, camera.top, camera.bottom] = frustum;
    camera.updateProjectionMatrix(); renderer.setPixelRatio(originalRatio);
    renderer.setSize(originalSize.x, originalSize.y, false); renderer.render(scene, camera);
  }
  snapshot.toBlob(blob => {
    button.disabled = false;
    if (!blob) { notice.textContent = '合照没有保存成功，请再试一次。'; return; }
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = '黄色四巨头.png'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    notice.textContent = '合照已生成，正在下载。';
  }, 'image/png');
});

addEventListener('pagehide', event => {
  if (event.persisted) return;
  renderer.setAnimationLoop(null);
  actors.forEach(actor => actor.dispose()); renderer.dispose();
}, { once: true });
