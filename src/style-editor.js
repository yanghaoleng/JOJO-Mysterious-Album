import * as THREE from 'three';
import { Sketch } from './sketch.js';
import { setHand, setRender, U } from './part.js';
import { SoftStorySketch } from './soft-story-sketch.js?v=20260828-style-editor';
import { newRecipe, ensureParams, buildCharacter } from './rig.js';
import { createAnimator } from './anim.js';
import { storyCharacterTemplateById } from './story-character-templates.js';
import { mountAppNavigation } from './app-navigation.js?v=20260828-style-editor';
import { trackAnalytics } from './analytics.js';
import {
  CURRENT_RENDER_STYLE,
  ORIGINAL_RENDER_STYLE,
  cloneRenderStyle,
  loadAppliedRenderStyle,
  normalizeRenderStyle,
  saveAppliedRenderStyle,
} from './render-style-config.js';

const $ = id => document.getElementById(id);
const META_STORAGE_KEY = 'mengmeng-render-style-meta-v1';

const CONTROL_GROUPS = [
  {
    title: '笔触',
    controls: [
      ['stroke.smoothness', '线条平滑', 0, 1, .01, 'percent'],
      ['stroke.wobble', '手绘摆动', 0, 1, .01, 'percent'],
      ['stroke.width', '主线粗细', .55, 1.8, .01, 'times'],
      ['stroke.opacity', '主线浓度', .25, 1, .01, 'percent'],
      ['stroke.softWidth', '柔边宽度', 1, 2.6, .01, 'times'],
      ['stroke.softOpacity', '柔边浓度', 0, .5, .01, 'percent'],
      ['stroke.grain', '纸笔颗粒', 0, 1, .01, 'percent'],
    ],
  },
  {
    title: '色块',
    controls: [
      ['fill.opacity', '填色浓度', .4, 1, .01, 'percent'],
      ['fill.saturation', '颜色鲜度', .45, 1.45, .01, 'times'],
      ['fill.brightness', '整体明度', .72, 1.3, .01, 'times'],
    ],
  },
  {
    title: '高光',
    controls: [
      ['highlight.strength', '高光强度', 0, .65, .01, 'percent'],
      ['highlight.size', '高光范围', .25, 1.4, .01, 'times'],
      ['highlight.x', '左右位置', 0, 1, .01, 'percent'],
      ['highlight.y', '上下位置', 0, 1, .01, 'percent'],
      ['highlight.spread', '过渡范围', .1, .85, .01, 'percent'],
      ['highlight.gloss', '表面亮泽', 0, .45, .01, 'percent'],
    ],
  },
  {
    title: '体积阴影',
    controls: [
      ['formShadow.strength', '阴影强度', 0, .55, .01, 'percent'],
      ['formShadow.start', '阴影起点', 0, .8, .01, 'percent'],
      ['formShadow.darkness', '暗部深浅', .35, .95, .01, 'percent'],
    ],
  },
  {
    title: '角色投影',
    controls: [
      ['castShadow.opacity', '投影浓度', 0, .5, .01, 'percent'],
      ['castShadow.offsetX', '向后偏移', -24, 30, 1, 'pixel'],
      ['castShadow.offsetY', '向下偏移', -12, 34, 1, 'pixel'],
      ['castShadow.blur', '边缘虚化', 0, 24, 1, 'pixel'],
      ['castShadow.scale', '投影面积', .82, 1.3, .01, 'times'],
    ],
  },
  {
    title: '渲染细腻度',
    controls: [
      ['render.quality', '画面倍率', 1, 2.5, .1, 'times'],
    ],
  },
];

function appliedVersionName() {
  try {
    const value = JSON.parse(localStorage.getItem(META_STORAGE_KEY) || 'null');
    return String(value?.name || '').trim().slice(0, 28) || '当前柔绘版';
  } catch {
    return '当前柔绘版';
  }
}

const appliedStyle = loadAppliedRenderStyle();
let draftStyle = cloneRenderStyle(appliedStyle);
let sourceStyle = cloneRenderStyle(appliedStyle);
let sourceName = appliedVersionName();
let versions = [];
let currentFilter = 'official';
let rebuildFrame = 0;
let toastTimer = 0;

const getPath = (object, path) => path.split('.').reduce((value, key) => value[key], object);
const setPath = (object, path, value) => {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((value, key) => value[key], object);
  target[last] = value;
};

function formatValue(value, format) {
  if (format === 'percent') return `${Math.round(value * 100)}%`;
  if (format === 'pixel') return `${Math.round(value)} px`;
  return `${Number(value).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×`;
}

function showToast(message) {
  const toast = $('editor-toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2300);
}

function makePreviewRecipe(style) {
  const template = storyCharacterTemplateById('bean-dog');
  const recipe = newRecipe(template.seed);
  recipe.species = template.species;
  recipe.base = template.base;
  recipe.media = style.media;
  recipe.color = 'color';
  ensureParams(recipe);
  Object.assign(recipe.parts.extras.params, {
    mark: 'none', mod: 'none', tears: false, freckles: false, spots: true,
    whiskers: false, studs: false, bandage: false, blush: true, glasses: false,
    antenna: false, accidents: false, smudge: false, eraser: false,
  });
  Object.assign(recipe.parts.brows.params, { on: false });
  Object.assign(recipe.parts.hair.params, { style: 'bald' });
  for (const slot of ['held', 'offhand', 'worn']) {
    if (recipe.parts[slot]?.params) recipe.parts[slot].params.family = 'none';
  }
  for (const [part, values] of Object.entries(template.parts || {})) {
    if (recipe.parts[part]?.params) Object.assign(recipe.parts[part].params, values);
  }
  Object.assign(recipe.parts.skull.params, { skinOn: true, skinIdx: 7, plain: false, shroud: false, hollows: false });
  Object.assign(recipe.parts.torso.params, { clothOn: true, clothIdx: 2 });
  Object.assign(recipe.parts.extras.params, { accentIdx: 1 });
  return recipe;
}

function addSoftShadow(face, config) {
  const bounds = new THREE.Box3().setFromObject(face.group);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(116, 112, 10, 128, 128, 118);
  gradient.addColorStop(0, `rgba(48,76,59,${Math.min(.72, config.opacity * 1.58)})`);
  gradient.addColorStop(.54, `rgba(48,76,59,${Math.min(.42, config.opacity * .83)})`);
  gradient.addColorStop(1, 'rgba(48,76,59,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: config.opacity > 0 ? .9 : 0 });
  const shadow = new THREE.Sprite(material);
  shadow.position.set(
    center.x + size.x * (config.offsetX / 76),
    center.y - size.y * (config.offsetY / 123),
    -.4,
  );
  shadow.scale.set(
    Math.max(.6, size.x * config.scale),
    Math.max(.8, size.y * (1 + (config.scale - 1) / 3)),
    1,
  );
  shadow.renderOrder = -12;
  shadow.userData.dispose = () => { texture.dispose(); material.dispose(); };
  face.group.add(shadow);
  return shadow;
}

class StylePreview {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-2.2, 2.2, 2.45, -1.95, .1, 30);
    this.camera.position.set(0, .2, 9);
    this.camera.lookAt(0, .2, 0);
    this.clock = new THREE.Clock();
    this.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.face = null;
    this.holder = null;
    this.animator = null;
    this.options = { boil: true, blink: true, gaze: true, sway: true, breath: true, talk: false, amp: .62, phase: .4 };
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    addEventListener('resize', this.resize, { passive: true });
    this.resize();
    requestAnimationFrame(this.tick);
  }

  resize(quality = draftStyle.render.quality) {
    const rect = this.canvas.getBoundingClientRect();
    const requestedQuality = Number.isFinite(quality) ? quality : draftStyle.render.quality;
    this.renderer.setPixelRatio(Math.min(requestedQuality, Math.max(1, devicePixelRatio || 1)));
    this.renderer.setSize(Math.max(300, Math.round(rect.width)), Math.max(330, Math.round(rect.height)), false);
    const aspect = Math.max(.65, rect.width / Math.max(1, rect.height));
    this.camera.left = -2.25 * aspect;
    this.camera.right = 2.25 * aspect;
    this.camera.updateProjectionMatrix();
    if (this.holder && this.characterScale) {
      this.holder.scale.setScalar(this.characterScale * (aspect < .9 ? 1.08 : 1.28));
    }
  }

  rebuild(style) {
    const normalized = normalizeRenderStyle(style);
    setRender({ u: 176, frames: 1 });
    setHand((width, height) => normalized.engine === 'original'
      ? new Sketch(width, height)
      : new SoftStorySketch(width, height, normalized));
    if (this.face) {
      this.face.group.userData.editorShadow?.userData.dispose?.();
      this.face.dispose();
    }
    if (this.holder) this.scene.remove(this.holder);
    this.face = buildCharacter(makePreviewRecipe(normalized));
    const shadow = addSoftShadow(this.face, normalized.castShadow);
    this.face.group.userData.editorShadow = shadow;
    this.holder = new THREE.Group();
    this.face.group.position.y = this.face.F.B.floorY / U;
    this.holder.add(this.face.group);
    this.characterScale = (2.15 / 1.4) * (.58 / (this.face.F.s / U));
    this.holder.position.set(0, -1.02, 0);
    this.scene.add(this.holder);
    this.animator = createAnimator(() => this.face, this.options);
    this.animator.setPose('idle');
    this.resize(normalized.render.quality);
    $('preview-loading').hidden = true;
  }

  tick() {
    requestAnimationFrame(this.tick);
    const dt = Math.min(.04, this.clock.getDelta());
    if (!this.reduceMotion) this.animator?.update(this.clock.elapsedTime, dt);
    this.renderer.render(this.scene, this.camera);
  }
}

const preview = new StylePreview($('style-preview'));

function renderControls() {
  const groups = CONTROL_GROUPS.map((group, groupIndex) => {
    const details = document.createElement('details');
    details.className = 'control-group';
    details.open = groupIndex === 0;
    const summary = document.createElement('summary');
    summary.textContent = group.title;
    const body = document.createElement('div');
    body.className = 'control-group-body';
    for (const [path, labelText, min, max, step, format] of group.controls) {
      const field = document.createElement('div');
      field.className = 'range-field';
      const label = document.createElement('label');
      const id = `control-${path.replace('.', '-')}`;
      label.htmlFor = id;
      label.textContent = labelText;
      const output = document.createElement('output');
      output.htmlFor = id;
      output.dataset.outputFor = path;
      const input = document.createElement('input');
      input.id = id;
      input.type = 'range';
      input.min = min;
      input.max = max;
      input.step = step;
      input.dataset.stylePath = path;
      input.dataset.format = format;
      input.addEventListener('input', () => {
        if (draftStyle.engine === 'original') {
          draftStyle.engine = 'soft';
          draftStyle.media = 'storybook';
          showToast('已从最初版转成可编辑的柔绘版本');
        }
        setPath(draftStyle, path, Number(input.value));
        draftStyle = normalizeRenderStyle(draftStyle);
        sourceName = '自定义草稿';
        $('working-version').textContent = sourceName;
        output.value = formatValue(getPath(draftStyle, path), format);
        schedulePreview();
      });
      field.append(label, output, input);
      body.append(field);
    }
    details.append(summary, body);
    return details;
  });
  $('style-controls').replaceChildren(...groups);
  syncControlValues();
}

function syncControlValues() {
  document.querySelectorAll('[data-style-path]').forEach(input => {
    const value = getPath(draftStyle, input.dataset.stylePath);
    input.value = value;
    const output = document.querySelector(`[data-output-for="${input.dataset.stylePath}"]`);
    if (output) output.value = formatValue(value, input.dataset.format);
  });
}

function schedulePreview() {
  cancelAnimationFrame(rebuildFrame);
  rebuildFrame = requestAnimationFrame(() => {
    try {
      preview.rebuild(draftStyle);
    } catch (error) {
      console.error('Style preview failed', error);
      $('preview-loading').hidden = false;
      $('preview-loading').textContent = '这一组参数暂时没有画出来';
    }
  });
}

function loadVersion(version) {
  draftStyle = cloneRenderStyle(version.config);
  sourceStyle = cloneRenderStyle(version.config);
  sourceName = version.name;
  $('working-version').textContent = sourceName;
  syncControlValues();
  schedulePreview();
  trackAnalytics(`style_load_${version.category}`, { depth: 2 });
  showToast(`已载入“${version.name}”`);
  scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function renderVersionLibrary() {
  const target = $('version-library');
  const filtered = versions.filter(version => version.category === currentFilter);
  if (!filtered.length) {
    target.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'library-state';
    empty.textContent = currentFilter === 'community'
      ? '社区版本库现在还是空的。你可以保存第一套真实版本。'
      : '官方预设暂时没有读取到，请稍后再试。';
    target.append(empty);
    return;
  }
  const cards = filtered.map(version => {
    const card = document.createElement('article');
    card.className = 'version-card';
    const header = document.createElement('header');
    const title = document.createElement('h3');
    title.textContent = version.name;
    const category = document.createElement('span');
    category.className = 'category';
    category.textContent = version.category === 'official' ? '官方' : '社区';
    header.append(title, category);
    const author = document.createElement('p');
    author.className = 'version-author';
    author.textContent = `创作者：${version.author}`;
    const description = document.createElement('p');
    description.className = 'version-description';
    description.textContent = version.description || '这位创作者没有留下说明。';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-load';
    button.textContent = '载入并继续调整';
    button.addEventListener('click', () => loadVersion(version));
    card.append(header, author, description, button);
    return card;
  });
  target.replaceChildren(...cards);
}

async function loadVersions() {
  try {
    const response = await fetch('/api/render-styles', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('version_library_unavailable');
    const payload = await response.json();
    versions = Array.isArray(payload.styles) ? payload.styles : [];
  } catch {
    versions = [
      { id: 'original', name: '最初手绘版', author: '萌萌星', description: '保留最初的水彩、颗粒和不规则笔触。', category: 'official', config: ORIGINAL_RENDER_STYLE },
      { id: 'current-soft', name: '当前柔绘版', author: '萌萌星', description: '圆润线条、柔和高光、体积阴影和朝后投影。', category: 'official', config: CURRENT_RENDER_STYLE },
    ];
    showToast('服务器版本库暂时没有连上，仍可调整官方预设');
  }
  renderVersionLibrary();
}

async function saveCommunityVersion(event) {
  event.preventDefault();
  const button = $('submit-style');
  const status = $('save-status');
  status.className = 'save-status';
  status.textContent = '正在保存到服务器';
  button.disabled = true;
  try {
    const response = await fetch('/api/render-styles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: $('style-name').value,
        author: $('style-author').value,
        description: $('style-description').value,
        config: draftStyle,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'save_failed');
    versions.push(payload.style);
    currentFilter = 'community';
    document.querySelectorAll('[data-version-filter]').forEach(tab => {
      const active = tab.dataset.versionFilter === currentFilter;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    renderVersionLibrary();
    $('save-dialog').close();
    $('save-form').reset();
    trackAnalytics('style_save_community', { depth: 4 });
    showToast('已保存到服务器的社区版本库');
  } catch (error) {
    const messages = {
      style_name_required: '请填写至少两个字的版本名称。',
      style_rate_limited: '这一小时保存得有点多，请稍后再试。',
      invalid_style_config: '参数内容不完整，请重新调整后再试。',
    };
    status.className = 'save-status is-error';
    status.textContent = messages[error.message] || '暂时没有保存成功，请检查网络后再试。';
  } finally {
    button.disabled = false;
  }
}

mountAppNavigation($('style-navigation'), { homeHref: './?mode=debug', homeLabel: '返回角色模拟器' });
$('working-version').textContent = sourceName;
renderControls();
schedulePreview();
void loadVersions();

$('reset-current').addEventListener('click', () => {
  draftStyle = cloneRenderStyle(sourceStyle);
  $('working-version').textContent = sourceName;
  syncControlValues();
  schedulePreview();
  showToast(`已恢复“${sourceName}”`);
});

$('apply-style').addEventListener('click', () => {
  saveAppliedRenderStyle(draftStyle);
  try { localStorage.setItem(META_STORAGE_KEY, JSON.stringify({ name: sourceName, appliedAt: Date.now() })); } catch { /* no metadata */ }
  trackAnalytics('style_apply_to_lab', { depth: 5 });
  showToast('已经应用，正在返回角色模拟器');
  setTimeout(() => { location.href = './?mode=debug'; }, 420);
});

$('open-save').addEventListener('click', () => {
  $('style-name').value = sourceName === '自定义草稿' ? '' : `${sourceName}调整版`;
  $('save-status').textContent = '';
  $('save-dialog').showModal();
  setTimeout(() => $('style-name').focus(), 60);
});
$('close-save').addEventListener('click', () => $('save-dialog').close());
$('save-dialog').addEventListener('click', event => {
  if (event.target === $('save-dialog')) $('save-dialog').close();
});
$('save-form').addEventListener('submit', saveCommunityVersion);

document.querySelectorAll('[data-version-filter]').forEach(tab => {
  tab.addEventListener('click', () => {
    currentFilter = tab.dataset.versionFilter;
    document.querySelectorAll('[data-version-filter]').forEach(item => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
    });
    renderVersionLibrary();
  });
});
