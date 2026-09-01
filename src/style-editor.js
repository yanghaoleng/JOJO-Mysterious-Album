import * as THREE from 'three';
import { Sketch } from './sketch.js';
import { setHand, setRender, U } from './part.js';
import { SoftStorySketch } from './soft-story-sketch.js?v=20260831-default-drawn';
import { newRecipe, ensureParams, buildCharacter } from './rig.js';
import { createAnimator } from './anim.js';
import { paintSceneThumbnail } from './lab-scenes.js?v=20260901-grounded-guide';
import { storyCharacterTemplateById } from './story-character-templates.js';
import { mountAppNavigation } from './app-navigation.js?v=20260828-style-editor-v2';
import { trackAnalytics } from './analytics.js';
import {
  configureRendererForCharacterSystem,
  createGlossCharacter,
} from './gloss-character-renderer.js?v=20260831-default-drawn';
import {
  CURRENT_RENDER_STYLE,
  ORIGINAL_RENDER_STYLE,
  GLOSS_MATERIAL_IDS,
  GLOSS_PALETTE_IDS,
  cloneRenderStyle,
  loadAppliedRenderStyle,
  normalizeRenderStyle,
  saveAppliedRenderStyle,
} from './render-style-config.js?v=20260831-default-drawn';

const $ = id => document.getElementById(id);
const META_STORAGE_KEY = 'mengmeng-render-style-meta-v2';
const SOURCE_COMMIT = '5857b1e1cae2713d6714ad7dd7f89626bb242f0f';
const SOURCE_ROOT = 'https://github.com/albertobeiz/kindergrimm';
const PREVIEW_TEMPLATES = ['bean-dog', 'moon-cat', 'snow-rabbit', 'honey-bear', 'curl-fox', 'river-otter'];

const MATERIAL_LABELS = {
  glossy: '亮面软胶', rubber: '磨砂橡胶', ceramic: '陶瓷', pearl: '珠光', flocked: '植绒',
  wood: '木质', wool: '针织', resin: '树脂', chrome: '金属镜面', crazed: '开片陶瓷', skin: '柔肤',
};
const PALETTE_LABELS = {
  dusk: '暮色', meadow: '草地', harbour: '港湾', denim: '丹宁', mist: '薄雾', bloom: '花簇',
  orchard: '果园', lagoon: '泻湖', melon: '甜瓜', ember: '余烬', moss: '苔藓', apricot: '杏子', skin: '肤色',
};

const CONTROL_GROUPS = [
  {
    scope: 'character', system: 'drawn', title: '笔触',
    controls: [
      ['character.stroke.smoothness', '线条平滑', 0, 1, .01, 'percent'],
      ['character.stroke.wobble', '手绘摆动', 0, 1, .01, 'percent'],
      ['character.stroke.width', '主线粗细', .55, 1.8, .01, 'times'],
      ['character.stroke.opacity', '主线浓度', .25, 1, .01, 'percent'],
      ['character.stroke.softWidth', '柔边宽度', 1, 2.6, .01, 'times'],
      ['character.stroke.softOpacity', '柔边浓度', 0, .5, .01, 'percent'],
      ['character.stroke.grain', '纸笔颗粒', 0, 1, .01, 'percent'],
    ],
  },
  {
    scope: 'character', system: 'drawn', title: '色块',
    controls: [
      ['character.fill.opacity', '填色浓度', .4, 1, .01, 'percent'],
      ['character.fill.saturation', '颜色鲜度', .45, 1.45, .01, 'times'],
      ['character.fill.brightness', '整体明度', .72, 1.3, .01, 'times'],
    ],
  },
  {
    scope: 'character', system: 'drawn', title: '高光',
    controls: [
      ['character.highlight.strength', '高光强度', 0, .65, .01, 'percent'],
      ['character.highlight.size', '高光范围', .25, 1.4, .01, 'times'],
      ['character.highlight.x', '左右位置', 0, 1, .01, 'percent'],
      ['character.highlight.y', '上下位置', 0, 1, .01, 'percent'],
      ['character.highlight.spread', '过渡范围', .1, .85, .01, 'percent'],
      ['character.highlight.gloss', '表面亮泽', 0, .45, .01, 'percent'],
    ],
  },
  {
    scope: 'character', system: 'drawn', title: '体积阴影',
    controls: [
      ['character.formShadow.strength', '阴影强度', 0, .55, .01, 'percent'],
      ['character.formShadow.start', '阴影起点', 0, .8, .01, 'percent'],
      ['character.formShadow.darkness', '暗部深浅', .35, .95, .01, 'percent'],
    ],
  },
  {
    scope: 'character', system: 'drawn', title: '角色投影',
    controls: [
      ['character.castShadow.opacity', '投影浓度', 0, .5, .01, 'percent'],
      ['character.castShadow.offsetX', '向后偏移', -24, 30, 1, 'pixel'],
      ['character.castShadow.offsetY', '向下偏移', -12, 34, 1, 'pixel'],
      ['character.castShadow.blur', '边缘虚化', 0, 24, 1, 'pixel'],
      ['character.castShadow.scale', '投影面积', .82, 1.3, .01, 'times'],
    ],
  },
  {
    scope: 'character', system: 'drawn', title: '渲染细腻度',
    controls: [['character.render.quality', '画面倍率', 1, 2.5, .1, 'times']],
  },
  {
    scope: 'character', system: 'gloss', title: '3D 塑形',
    selects: [
      ['character.gloss.material', '表面材质', GLOSS_MATERIAL_IDS, MATERIAL_LABELS],
      ['character.gloss.palette', '角色配色', GLOSS_PALETTE_IDS, PALETTE_LABELS],
    ],
    controls: [
      ['character.gloss.detail', '几何细腻度', .25, .75, .01, 'percent'],
      ['character.gloss.turn', '朝向角度', -.45, .45, .01, 'radian'],
      ['character.render.quality', '画面倍率', 1, 2.5, .1, 'times'],
    ],
  },
  {
    scope: 'background', title: '综合色彩',
    colors: [['background.color.tint', '背景染色']],
    controls: [
      ['background.color.tintStrength', '染色浓度', 0, .72, .01, 'percent'],
      ['background.color.saturation', '色彩鲜度', .4, 1.5, .01, 'times'],
      ['background.color.brightness', '背景明度', .75, 1.3, .01, 'times'],
      ['background.color.contrast', '明暗对比', .65, 1.4, .01, 'times'],
      ['background.color.hue', '色相偏移', -30, 30, 1, 'degree'],
    ],
  },
  {
    scope: 'background', title: '纸张与远景',
    controls: [
      ['background.paint.opacity', '洗色浓度', .45, 1, .01, 'percent'],
      ['background.paint.grain', '纸张颗粒', 0, .6, .01, 'percent'],
      ['background.depth.haze', '远景雾感', 0, .45, .01, 'percent'],
      ['background.depth.blur', '柔化程度', 0, 3, .05, 'pixel'],
    ],
  },
];

const MOVEMENTS = [
  ['gothic', '哥特画板', '1310', '#faf8f1', .14, .78, 1.04, 1.12, .08, 0, 0, '明亮石膏底、宝石色与清楚轮廓。'],
  ['renaissance', '文艺复兴', '1500', '#ba9e76', .24, .84, .93, 1.10, .18, .03, 0, '赭色底、古典体积与温暖明暗。'],
  ['baroque', '巴洛克暗光', '1620', '#764c3a', .45, .72, .82, 1.28, .12, .02, .12, '深色画底和强烈聚光形成戏剧感。'],
  ['ukiyoe', '浮世绘', '1830', '#f0e7cd', .25, .88, 1.02, .95, .14, 0, 0, '和纸底、平涂色块与木版线条。'],
  ['impressionism', '印象派日光', '1874', '#fcfaf4', .10, 1.18, 1.08, .92, .08, .02, 0, '高明度、断续色触与带颜色的阴影。'],
  ['expressionism', '表现主义木刻', '1910', '#e9e2d2', .20, 1.15, .96, 1.25, .22, .02, .06, '粗砺木刻痕迹和更强烈的情绪色彩。'],
  ['cubism', '立体主义', '1911', '#bab9a7', .25, .62, .96, 1.16, .16, .02, 0, '低饱和画布与几何切面。'],
  ['dadaism', '达达拼贴', '1918', '#e7dab7', .26, .75, .98, 1.18, .32, .02, .04, '旧纸张、拼贴痕迹与偶然构成。'],
  ['surrealism', '超现实主义', '1929', '#e2e3dd', .15, .92, 1.02, 1.08, .10, .10, .20, '平滑画底、冷静体积与梦境空气。'],
];

function movementConfig(row) {
  const [id, , , tint, tintStrength, saturation, brightness, contrast, grain, haze, blur] = row;
  const style = cloneRenderStyle(ORIGINAL_RENDER_STYLE);
  style.character.system = 'drawn';
  style.character.engine = 'original';
  style.character.media = id;
  Object.assign(style.background.color, { tint, tintStrength, saturation, brightness, contrast });
  Object.assign(style.background.paint, { grain });
  Object.assign(style.background.depth, { haze, blur });
  return normalizeRenderStyle(style);
}

function githubFallbackVersions() {
  const movementVersions = MOVEMENTS.map(row => ({
    id: `github-${row[0]}`,
    name: row[1],
    author: 'albertobeiz',
    description: `${row[2]} · ${row[11]}`,
    category: 'github',
    config: movementConfig(row),
    source: {
      repo: 'albertobeiz/kindergrimm',
      url: `${SOURCE_ROOT}/blob/${SOURCE_COMMIT}/src/styles/${row[0]}.js`,
      commit: SOURCE_COMMIT,
    },
  }));
  const gloss = cloneRenderStyle(CURRENT_RENDER_STYLE);
  gloss.character.system = 'gloss';
  gloss.character.gloss = { material: 'glossy', palette: 'meadow', detail: .5, turn: 0 };
  gloss.background.color.saturation = .96;
  gloss.background.color.contrast = 1.04;
  return [...movementVersions, {
    id: 'github-gloss-3d',
    name: 'Gloss 3D 塑形版',
    author: 'albertobeiz',
    description: '独立的 3D 几何、材质与表情体系。启用后，角色模拟器和故事角色会一起切换。',
    category: 'github',
    config: normalizeRenderStyle(gloss),
    source: {
      repo: 'albertobeiz/kindergrimm',
      url: `${SOURCE_ROOT}/tree/${SOURCE_COMMIT}/src/gloss`,
      commit: SOURCE_COMMIT,
    },
  }];
}

function appliedVersionName() {
  try {
    const value = JSON.parse(localStorage.getItem(META_STORAGE_KEY) || 'null');
    return String(value?.name || '').trim().slice(0, 28) || '默认手绘版';
  } catch {
    return '默认手绘版';
  }
}

const appliedStyle = loadAppliedRenderStyle();
let draftStyle = cloneRenderStyle(appliedStyle);
let sourceStyle = cloneRenderStyle(appliedStyle);
let sourceName = appliedVersionName();
let versions = [];
let sourceAudit = null;
let currentFilter = 'official';
let activeScope = 'character';
let rebuildTimer = 0;
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
  if (format === 'pixel') return `${Number(value).toFixed(value % 1 ? 1 : 0)} px`;
  if (format === 'degree') return `${Math.round(value)}°`;
  if (format === 'radian') return `${Math.round(value * 57.2958)}°`;
  return `${Number(value).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×`;
}

function showToast(message) {
  const toast = $('editor-toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2300);
}

function makePreviewRecipe(templateId, characterStyle) {
  const template = storyCharacterTemplateById(templateId);
  const recipe = newRecipe(template.seed);
  recipe.templateId = template.id;
  recipe.group = template.group;
  recipe.species = template.species;
  recipe.base = template.base;
  recipe.media = characterStyle.media;
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
  canvas.width = canvas.height = 192;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(88, 86, 8, 96, 96, 88);
  gradient.addColorStop(0, `rgba(48,76,59,${Math.min(.72, config.opacity * 1.58)})`);
  gradient.addColorStop(.54, `rgba(48,76,59,${Math.min(.42, config.opacity * .83)})`);
  gradient.addColorStop(1, 'rgba(48,76,59,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 192, 192);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: config.opacity > 0 ? .9 : 0 });
  const shadow = new THREE.Sprite(material);
  shadow.position.set(center.x + size.x * (config.offsetX / 76), center.y - size.y * (config.offsetY / 123), -.4);
  shadow.scale.set(Math.max(.6, size.x * config.scale), Math.max(.8, size.y * (1 + (config.scale - 1) / 3)), 1);
  shadow.renderOrder = -12;
  shadow.userData.dispose = () => { texture.dispose(); material.dispose(); };
  face.group.add(shadow);
  face.group.userData.editorShadow = shadow;
}

class StylePreviewGallery {
  constructor(canvas, backgroundCanvas) {
    this.canvas = canvas;
    this.backgroundCanvas = backgroundCanvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-6, 6, 2.25, -1.8, .1, 30);
    this.camera.position.set(0, .2, 10);
    this.camera.lookAt(0, .2, 0);
    this.clock = new THREE.Clock();
    this.items = [];
    this.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    new ResizeObserver(this.resize).observe($('preview-track'));
    this.resize();
    requestAnimationFrame(this.tick);
  }

  resize() {
    const rect = $('preview-track').getBoundingClientRect();
    const width = Math.max(600, Math.round(rect.width));
    const height = Math.max(300, Math.round(rect.height));
    const ratio = Math.min(1.5, Math.max(1, devicePixelRatio || 1), draftStyle.character.render.quality);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    const backgroundRatio = Math.min(1.25, ratio);
    this.backgroundCanvas.width = Math.round(width * backgroundRatio);
    this.backgroundCanvas.height = Math.round(height * backgroundRatio);
    this.updateBackground();
  }

  clear() {
    for (const item of this.items) {
      item.face.group.userData.editorShadow?.userData.dispose?.();
      item.face.dispose();
      this.scene.remove(item.holder);
    }
    this.items = [];
  }

  rebuild(style) {
    const normalized = normalizeRenderStyle(style);
    this.clear();
    configureRendererForCharacterSystem(this.renderer, normalized.character.system);
    if (normalized.character.system === 'drawn') {
      setRender({ u: 124, frames: 1 });
      setHand((width, height) => normalized.character.engine === 'original'
        ? new Sketch(width, height)
        : new SoftStorySketch(width, height, normalized.character));
    }
    PREVIEW_TEMPLATES.forEach((templateId, index) => {
      const recipe = makePreviewRecipe(templateId, normalized.character);
      let face;
      let animator;
      if (normalized.character.system === 'gloss') {
        const gloss = createGlossCharacter(this.renderer, recipe, normalized.character.gloss);
        face = gloss.face;
        animator = gloss.animator;
      } else {
        face = buildCharacter(recipe);
        animator = createAnimator(() => face, { boil: true, blink: true, gaze: true, sway: true, breath: true, talk: false, amp: .58, phase: index * .7 });
        animator.setPose('idle');
        addSoftShadow(face, normalized.character.castShadow);
      }
      const holder = new THREE.Group();
      const bounds = face.kind === 'gloss'
        ? face.bounds
        : (() => {
          face.group.position.y = face.F.B.floorY / U;
          const box = new THREE.Box3().setFromObject(face.group);
          const size = box.getSize(new THREE.Vector3());
          return { w: size.x, h: size.y, minY: box.min.y };
        })();
      const fit = Math.min(2.68 / Math.max(.1, bounds.h), 1.48 / Math.max(.1, bounds.w));
      if (face.kind === 'gloss') face.group.position.y = -bounds.minY;
      face.group.scale.setScalar(fit);
      holder.position.set(-5 + index * 2, -1.08, 0);
      holder.add(face.group);
      this.scene.add(holder);
      this.items.push({ face, holder, animator });
    });
    this.updateBackground();
    $('preview-loading').hidden = true;
    document.documentElement.dataset.previewSystem = normalized.character.system;
  }

  updateBackground() {
    if (!this.backgroundCanvas.width) return;
    paintSceneThumbnail(this.backgroundCanvas, 'meadow', draftStyle.background);
  }

  tick() {
    requestAnimationFrame(this.tick);
    const dt = Math.min(.04, this.clock.getDelta());
    if (!this.reduceMotion) {
      for (const item of this.items) item.animator?.update(this.clock.elapsedTime, dt);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

const preview = new StylePreviewGallery($('style-preview'), $('style-preview-background'));

function markDraft() {
  sourceName = '自定义草稿';
  $('working-version').textContent = sourceName;
}

function schedulePreview(scope = 'character') {
  if (scope === 'background') {
    preview.updateBackground();
    return;
  }
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    try {
      preview.rebuild(draftStyle);
    } catch (error) {
      console.error('Style preview failed', error);
      $('preview-loading').hidden = false;
      $('preview-loading').textContent = '这一组参数暂时没有画出来';
    }
  }, 80);
}

function handleValueChange(path, value) {
  if (path.startsWith('character.') && draftStyle.character.engine === 'original' && draftStyle.character.system === 'drawn') {
    draftStyle.character.engine = 'soft';
    if (draftStyle.character.media === 'watercolor') draftStyle.character.media = 'storybook';
    showToast('已打开柔绘参数，当前完整风格仍会保留');
  }
  setPath(draftStyle, path, value);
  draftStyle = normalizeRenderStyle(draftStyle);
  markDraft();
  schedulePreview(path.startsWith('background.') ? 'background' : 'character');
}

function renderSystemPicker() {
  const box = document.createElement('div');
  box.className = 'render-system-picker';
  const copy = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = '角色渲染体系';
  const hint = document.createElement('span');
  hint.textContent = '2D 与 3D 参数分开保存';
  copy.append(title, hint);
  const actions = document.createElement('div');
  actions.className = 'render-system-actions';
  [['drawn', '2D 手绘'], ['gloss', '3D Gloss']].forEach(([system, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'system-button';
    const selected = draftStyle.character.system === system;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = label;
    button.addEventListener('click', () => {
      if (draftStyle.character.system === system) return;
      draftStyle.character.system = system;
      draftStyle = normalizeRenderStyle(draftStyle);
      markDraft();
      renderControls();
      schedulePreview('character');
      showToast(system === 'gloss' ? '已切换到独立的 3D 渲染体系' : '已切回 2D 手绘体系');
    });
    actions.append(button);
  });
  box.append(copy, actions);
  return box;
}

function createRange(path, labelText, min, max, step, format) {
  const field = document.createElement('div');
  field.className = 'range-field';
  const label = document.createElement('label');
  const id = `control-${path.replaceAll('.', '-')}`;
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
    handleValueChange(path, Number(input.value));
    output.value = formatValue(getPath(draftStyle, path), format);
  });
  field.append(label, output, input);
  return field;
}

function createSelect(path, labelText, values, labels) {
  const field = document.createElement('label');
  field.className = 'select-field';
  const text = document.createElement('span');
  text.textContent = labelText;
  const select = document.createElement('select');
  select.dataset.stylePath = path;
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = labels[value] || value;
    select.append(option);
  }
  select.addEventListener('change', () => handleValueChange(path, select.value));
  field.append(text, select);
  return field;
}

function createColor(path, labelText) {
  const field = document.createElement('label');
  field.className = 'color-field';
  const text = document.createElement('span');
  text.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'color';
  input.dataset.stylePath = path;
  input.addEventListener('input', () => handleValueChange(path, input.value));
  field.append(text, input);
  return field;
}

function renderControls() {
  const nodes = [];
  if (activeScope === 'character') nodes.push(renderSystemPicker());
  const visibleGroups = CONTROL_GROUPS.filter(group => group.scope === activeScope
    && (!group.system || group.system === draftStyle.character.system));
  visibleGroups.forEach((group, groupIndex) => {
    const details = document.createElement('details');
    details.className = 'control-group';
    details.open = groupIndex === 0;
    const summary = document.createElement('summary');
    summary.textContent = group.title;
    const body = document.createElement('div');
    body.className = 'control-group-body';
    for (const [path, labelText, values, labels] of group.selects || []) body.append(createSelect(path, labelText, values, labels));
    for (const [path, labelText] of group.colors || []) body.append(createColor(path, labelText));
    for (const control of group.controls || []) body.append(createRange(...control));
    details.append(summary, body);
    nodes.push(details);
  });
  $('style-controls').replaceChildren(...nodes);
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

function loadVersion(version) {
  draftStyle = cloneRenderStyle(version.config);
  sourceStyle = cloneRenderStyle(version.config);
  sourceName = version.name;
  $('working-version').textContent = sourceName;
  renderControls();
  schedulePreview('character');
  trackAnalytics(`style_load_${version.category}`, { depth: 2 });
  showToast(`已载入“${version.name}”`);
  scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function validGithubUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'github.com' ? url.href : '';
  } catch {
    return '';
  }
}

function renderEmptyLibrary(target) {
  const empty = document.createElement('div');
  empty.className = 'library-state';
  const title = document.createElement('strong');
  if (currentFilter === 'github') {
    title.textContent = '社区源码预设暂时没有读取到';
    const detail = document.createElement('span');
    detail.textContent = sourceAudit?.message || '可以稍后重新打开，已应用的本地风格不会受影响。';
    empty.append(title, detail);
    const href = validGithubUrl(sourceAudit?.sourceUrl || `${SOURCE_ROOT}/tree/main/src/styles`);
    if (href) {
      const link = document.createElement('a');
      link.className = 'audit-source';
      link.href = href;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = '查看 GitHub 源码';
      empty.append(link);
    }
  } else if (currentFilter === 'custom') {
    title.textContent = '还没有保存过自己的版本';
    const detail = document.createElement('span');
    detail.textContent = '调整好人物与背景后，使用上方“保存为我的版本”。';
    empty.append(title, detail);
  } else {
    title.textContent = '官方预设暂时没有读取到';
    empty.append(title);
  }
  target.replaceChildren(empty);
}

function renderVersionLibrary() {
  const target = $('version-library');
  const filtered = versions.filter(version => version.category === currentFilter);
  if (!filtered.length) {
    renderEmptyLibrary(target);
    return;
  }
  const labels = { official: '官方', github: 'GitHub', custom: '我的' };
  const cards = filtered.map(version => {
    const card = document.createElement('article');
    card.className = 'version-card';
    const header = document.createElement('header');
    const title = document.createElement('h3');
    title.textContent = version.name;
    const category = document.createElement('span');
    category.className = 'category';
    category.textContent = labels[version.category] || '版本';
    header.append(title, category);
    const author = document.createElement('p');
    author.className = 'version-author';
    author.textContent = `创作者：${version.author}`;
    const description = document.createElement('p');
    description.className = 'version-description';
    description.textContent = version.description || '这位创作者没有留下说明。';
    card.append(header, author, description);
    const href = validGithubUrl(version.source?.url);
    if (href) {
      const source = document.createElement('p');
      source.className = 'version-source';
      const link = document.createElement('a');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = `来源：${version.source.repo || 'GitHub'}`;
      source.append(link);
      card.append(source);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-load';
    button.textContent = '载入并继续调整';
    button.addEventListener('click', () => loadVersion(version));
    card.append(button);
    return card;
  });
  target.replaceChildren(...cards);
}

async function loadVersions() {
  try {
    const response = await fetch('/api/render-styles', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('version_library_unavailable');
    const payload = await response.json();
    versions = Array.isArray(payload.styles) ? payload.styles.map(version => ({
      ...version,
      category: version.category === 'community' ? 'custom' : version.category,
      config: normalizeRenderStyle(version.config),
    })) : [];
    sourceAudit = payload.sourceAudit || payload.githubAudit || null;
  } catch {
    versions = [
      { id: 'original', name: '默认手绘版', author: '萌萌星', description: '保留水彩、颗粒和不规则笔触。', category: 'official', config: ORIGINAL_RENDER_STYLE },
      { id: 'current-soft', name: '当前柔绘版', author: '萌萌星', description: '圆润线条、柔和高光、体积阴影和朝后投影。', category: 'official', config: CURRENT_RENDER_STYLE },
      ...githubFallbackVersions(),
    ];
    sourceAudit = {
      message: '已内置来自上游 /styles 的 9 套 2D 风格与 /gloss 的 3D 风格。',
      sourceUrl: `${SOURCE_ROOT}/tree/${SOURCE_COMMIT}/src/styles`,
    };
    showToast('服务器版本库暂时没有连上，仍可使用内置源码预设');
  }
  renderVersionLibrary();
}

async function saveCustomVersion(event) {
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
    versions.push({ ...payload.style, category: 'custom' });
    currentFilter = 'custom';
    syncVersionTabs();
    renderVersionLibrary();
    $('save-dialog').close();
    $('save-form').reset();
    trackAnalytics('style_save_custom', { depth: 4 });
    showToast('已保存到服务器的我的版本');
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

function syncVersionTabs() {
  document.querySelectorAll('[data-version-filter]').forEach(tab => {
    const active = tab.dataset.versionFilter === currentFilter;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
}

function installPreviewScrolling() {
  const scroller = $('preview-scroll');
  let drag = null;
  scroller.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { x: event.clientX, scrollLeft: scroller.scrollLeft };
    scroller.classList.add('is-dragging');
    scroller.setPointerCapture(event.pointerId);
  });
  scroller.addEventListener('pointermove', event => {
    if (!drag) return;
    scroller.scrollLeft = drag.scrollLeft - (event.clientX - drag.x);
  });
  const stop = event => {
    if (!drag) return;
    drag = null;
    scroller.classList.remove('is-dragging');
    if (scroller.hasPointerCapture(event.pointerId)) scroller.releasePointerCapture(event.pointerId);
  };
  scroller.addEventListener('pointerup', stop);
  scroller.addEventListener('pointercancel', stop);
  scroller.addEventListener('wheel', event => {
    if (scroller.scrollWidth <= scroller.clientWidth || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    scroller.scrollLeft += event.deltaY;
  }, { passive: false });
}

mountAppNavigation($('style-navigation'), { homeHref: './?mode=debug', homeLabel: '返回角色模拟器' });
$('working-version').textContent = sourceName;
renderControls();
schedulePreview('character');
installPreviewScrolling();
void loadVersions();

$('reset-current').addEventListener('click', () => {
  draftStyle = cloneRenderStyle(sourceStyle);
  $('working-version').textContent = sourceName;
  renderControls();
  schedulePreview('character');
  showToast(`已恢复“${sourceName}”`);
});

$('apply-style').addEventListener('click', () => {
  saveAppliedRenderStyle(draftStyle);
  const appliedAt = Date.now();
  try { localStorage.setItem(META_STORAGE_KEY, JSON.stringify({ name: sourceName, appliedAt })); } catch { /* no metadata */ }
  trackAnalytics('style_apply_to_lab', { depth: 5 });
  showToast('已应用到角色模拟器和故事');
  setTimeout(() => { location.href = `./?mode=debug&style=${appliedAt}`; }, 420);
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
$('save-form').addEventListener('submit', saveCustomVersion);

document.querySelectorAll('[data-style-scope]').forEach(tab => {
  tab.addEventListener('click', () => {
    activeScope = tab.dataset.styleScope;
    document.querySelectorAll('[data-style-scope]').forEach(item => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
    });
    renderControls();
  });
});

document.querySelectorAll('[data-version-filter]').forEach(tab => {
  tab.addEventListener('click', () => {
    currentFilter = tab.dataset.versionFilter;
    syncVersionTabs();
    renderVersionLibrary();
  });
});
