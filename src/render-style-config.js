export const RENDER_STYLE_STORAGE_KEY = 'mengmeng-render-style-v1';

export const ORIGINAL_RENDER_STYLE = Object.freeze({
  schemaVersion: 1,
  engine: 'original',
  media: 'watercolor',
  stroke: { smoothness: 0, wobble: 1, width: .8, opacity: .62, softWidth: 1, softOpacity: 0, grain: .72 },
  fill: { opacity: .72, saturation: .9, brightness: 1 },
  highlight: { strength: 0, size: .88, x: .34, y: .12, spread: .48, gloss: 0 },
  formShadow: { strength: 0, start: .38, darkness: .68 },
  castShadow: { opacity: 0, offsetX: 0, offsetY: 0, blur: 0, scale: 1 },
  render: { quality: 1.5 },
});

export const CURRENT_RENDER_STYLE = Object.freeze({
  schemaVersion: 1,
  engine: 'soft',
  media: 'storybook',
  stroke: { smoothness: .72, wobble: .36, width: 1, opacity: .82, softWidth: 1.5, softOpacity: .18, grain: 0 },
  fill: { opacity: 1, saturation: 1, brightness: 1 },
  highlight: { strength: .3, size: .88, x: .34, y: .12, spread: .48, gloss: .18 },
  formShadow: { strength: .2, start: .38, darkness: .68 },
  castShadow: { opacity: .24, offsetX: 13, offsetY: 16, blur: 10, scale: 1.06 },
  render: { quality: 2 },
});

const LIMITS = Object.freeze({
  'stroke.smoothness': [0, 1],
  'stroke.wobble': [0, 1],
  'stroke.width': [.55, 1.8],
  'stroke.opacity': [.25, 1],
  'stroke.softWidth': [1, 2.6],
  'stroke.softOpacity': [0, .5],
  'stroke.grain': [0, 1],
  'fill.opacity': [.4, 1],
  'fill.saturation': [.45, 1.45],
  'fill.brightness': [.72, 1.3],
  'highlight.strength': [0, .65],
  'highlight.size': [.25, 1.4],
  'highlight.x': [0, 1],
  'highlight.y': [0, 1],
  'highlight.spread': [.1, .85],
  'highlight.gloss': [0, .45],
  'formShadow.strength': [0, .55],
  'formShadow.start': [0, .8],
  'formShadow.darkness': [.35, .95],
  'castShadow.opacity': [0, .5],
  'castShadow.offsetX': [-24, 30],
  'castShadow.offsetY': [-12, 34],
  'castShadow.blur': [0, 24],
  'castShadow.scale': [.82, 1.3],
  'render.quality': [1, 2.5],
});

const copy = value => JSON.parse(JSON.stringify(value));

const getPath = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
const setPath = (object, path, value) => {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((value, key) => value[key], object);
  target[last] = value;
};

export function normalizeRenderStyle(value) {
  const source = value && typeof value === 'object' ? value : CURRENT_RENDER_STYLE;
  const normalized = copy(CURRENT_RENDER_STYLE);
  normalized.engine = source.engine === 'original' ? 'original' : 'soft';
  normalized.media = normalized.engine === 'original' ? 'watercolor' : 'storybook';
  for (const [path, [minimum, maximum]] of Object.entries(LIMITS)) {
    const candidate = Number(getPath(source, path));
    const fallback = getPath(CURRENT_RENDER_STYLE, path);
    setPath(normalized, path, Math.max(minimum, Math.min(maximum, Number.isFinite(candidate) ? candidate : fallback)));
  }
  return normalized;
}

export function loadAppliedRenderStyle(storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem(RENDER_STYLE_STORAGE_KEY);
    return value ? normalizeRenderStyle(JSON.parse(value)) : normalizeRenderStyle(CURRENT_RENDER_STYLE);
  } catch {
    return normalizeRenderStyle(CURRENT_RENDER_STYLE);
  }
}

export function saveAppliedRenderStyle(value, storage = globalThis.localStorage) {
  const normalized = normalizeRenderStyle(value);
  try { storage?.setItem(RENDER_STYLE_STORAGE_KEY, JSON.stringify(normalized)); } catch { /* preview still works */ }
  return normalized;
}

export function applyRenderStyleCssVars(root, value) {
  if (!root?.style) return;
  const style = normalizeRenderStyle(value);
  const shadow = style.castShadow;
  root.style.setProperty('--character-shadow-x', `${shadow.offsetX}px`);
  root.style.setProperty('--character-shadow-y', `${shadow.offsetY}px`);
  root.style.setProperty('--character-shadow-blur', `${shadow.blur}px`);
  root.style.setProperty('--character-shadow-color', `rgba(42, 61, 48, ${shadow.opacity})`);
}

export function cloneRenderStyle(value = CURRENT_RENDER_STYLE) {
  return normalizeRenderStyle(value);
}

export { LIMITS as RENDER_STYLE_LIMITS };
