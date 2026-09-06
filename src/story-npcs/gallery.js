import * as THREE from '../../vendor/three.module.js';
import { NPC_CATALOG, getNpc } from './catalog.js';
import { createDocumentCharacter } from './factory.js';
import { createStorybookStyle, STORYBOOK_PALETTE } from '../../dev/storybook.js';
import { StoryVoice } from '../../dev/voice.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
if (params.get('from') === 'dev') $('back').href = './dev/';
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = STORYBOOK_PALETTE.exposure;
renderer.setClearColor(0, 0);
$('preview').append(renderer.domElement);
const camera = new THREE.OrthographicCamera(-2, 2, 1.5, -1.5, .1, 30);
camera.position.set(0, 1.55, 7); camera.lookAt(0, 1.1, 0);
scene.add(new THREE.HemisphereLight(STORYBOOK_PALETTE.sky, STORYBOOK_PALETTE.bounce, 2));
const key = new THREE.DirectionalLight(STORYBOOK_PALETTE.sun, 2.4); key.position.set(-3, 5, 5); scene.add(key);
const rim = new THREE.DirectionalLight(STORYBOOK_PALETTE.rim, 1); rim.position.set(4, 3, -4); scene.add(rim);
let model, style, current, yaw = .13, speaking = false, token = 0, last = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const voice = new StoryVoice({ onState: () => {}, onAnswer: () => {}, onLevel: () => {}, onError: () => {} });
function stopVoice() { token++; voice.skip(); speaking = false; model?.setAction('idle'); $('listen').setAttribute('aria-pressed', 'false'); $('listen').innerHTML = '听它打个招呼 <span aria-hidden="true">▷</span>'; }
function resize() {
  const { width, height } = $('preview').getBoundingClientRect();
  if (!width || !height) return;
  const ratio = width / height;
  const bounds = model ? new THREE.Box3().setFromObject(model.group) : null;
  const size = bounds?.getSize(new THREE.Vector3());
  const half = Math.max(1.31, (size?.x || 2) / ratio * .57);
  camera.left = -half * ratio; camera.right = half * ratio; camera.top = half; camera.bottom = -half;
  camera.updateProjectionMatrix(); renderer.setSize(width, height);
}
function choose(id, updateUrl = true) {
  const profile = getNpc(id) || NPC_CATALOG[0];
  stopVoice(); style?.dispose(); if (model) scene.remove(model.group); model?.dispose();
  current = profile; yaw = .13;
  model = createDocumentCharacter({ characterId: profile.id });
  style = createStorybookStyle(); style.apply(model.group); scene.add(model.group);
  $('name').textContent = profile.name; $('family').textContent = profile.family;
  $('basis').textContent = profile.visualBasis === 'reference-3d' ? '参考角色设定 · 绘本 3D' : profile.visualBasis === 'document-image' ? '参考文档插图 · 绘本 3D' : '根据文字设定 · 绘本 3D 演绎';
  for (const [element, field] of [['personality','personality'],['sample','sampleLine'],['style','speakingStyle'],['appearance','appearance'],['adaptation','adaptationNotes']]) $(element).textContent = profile[field] || '';
  $('voice-status').textContent = '合成音色演绎 · 点击试听，无需打开麦克风';
  $('counter').textContent = `${NPC_CATALOG.indexOf(profile) + 1} / ${NPC_CATALOG.length}`;
  document.body.dataset.characterId = profile.id;
  document.title = `${profile.name} · 故事里的朋友`;
  for (const button of $('characters').children) button.setAttribute('aria-pressed', String(button.dataset.characterId === profile.id));
  if (updateUrl) { const url = new URL(location.href); url.searchParams.set('character', profile.id); history.replaceState(null, '', url); }
  resize();
}
for (const profile of NPC_CATALOG) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = profile.name; button.dataset.characterId = profile.id;
  button.onclick = () => choose(profile.id); $('characters').append(button);
}
$('search').oninput = event => { const query = event.target.value.trim().toLocaleLowerCase(); let visible = 0;
  for (const button of $('characters').children) { const p = getNpc(button.dataset.characterId); button.hidden = !`${p.name} ${p.family}`.toLocaleLowerCase().includes(query); if (!button.hidden) visible++; }
  $('empty').hidden = Boolean(visible);
};
function step(delta) { const index = NPC_CATALOG.indexOf(current); choose(NPC_CATALOG[(index + delta + NPC_CATALOG.length) % NPC_CATALOG.length].id); }
$('previous').onclick = () => step(-1); $('next').onclick = () => step(1);
$('listen').onclick = async () => {
  if (speaking) { stopVoice(); return; }
  const session = ++token; speaking = true;
  $('listen').setAttribute('aria-pressed', 'true'); $('listen').textContent = '停止试听 □';
  $('voice-status').textContent = '正在准备它的声音…';
  try { await voice.unlock(); } catch { /* A native speech fallback remains available. */ }
  if (session !== token) return;
  model.setAction('talk'); $('voice-status').textContent = '正在试听；网络不可用时使用设备朗读。';
  await voice.say(current.sampleLine, current.voiceKey, () => {}, current.id);
  if (session === token) { stopVoice(); $('voice-status').textContent = '听完啦，还想认识谁？'; }
};
let pointer;
renderer.domElement.addEventListener('pointerdown', event => { pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw }; });
renderer.domElement.addEventListener('pointermove', event => { if (!pointer || event.pointerId !== pointer.id) return; const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y; if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) { renderer.domElement.setPointerCapture(event.pointerId); yaw = pointer.yaw + dx * .012; } });
for (const type of ['pointerup','pointercancel','lostpointercapture']) renderer.domElement.addEventListener(type, () => { pointer = null; });
new ResizeObserver(resize).observe($('preview'));
choose(params.get('character'), false);
const frame = now => { const dt = Math.min((now - last) / 1000, .05); last = now; if (document.hidden) return; model.group.rotation.y = yaw; model.update(reduced ? 0 : now / 1000, dt); renderer.render(scene, camera); };
renderer.setAnimationLoop(frame);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopVoice(); });
window.addEventListener('pagehide', event => { stopVoice(); voice.stop(); renderer.setAnimationLoop(null); if (!event.persisted) { style.dispose(); model.dispose(); renderer.dispose(); } });
window.addEventListener('pageshow', event => { if (event.persisted) { last = performance.now(); resize(); renderer.setAnimationLoop(frame); } });
