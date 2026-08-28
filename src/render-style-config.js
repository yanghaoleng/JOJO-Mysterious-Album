export const RENDER_STYLE_STORAGE_KEY = 'mengmeng-render-style-v1';

export const DRAWN_MEDIA_IDS = Object.freeze([
  'storybook', 'watercolor', 'graphite', 'ink', 'oil', 'chalk', 'marker',
  'gothic', 'renaissance', 'baroque', 'ukiyoe', 'impressionism',
  'expressionism', 'cubism', 'dadaism', 'surrealism',
]);

export const GLOSS_MATERIAL_IDS = Object.freeze([
  'glossy', 'rubber', 'ceramic', 'pearl', 'flocked', 'wood',
  'wool', 'resin', 'chrome', 'crazed', 'skin',
]);

export const GLOSS_PALETTE_IDS = Object.freeze([
  'dusk', 'meadow', 'harbour', 'denim', 'mist', 'bloom', 'orchard',
  'lagoon', 'melon', 'ember', 'moss', 'apricot', 'skin',
]);

const ORIGINAL_CHARACTER_STYLE = {
  system: 'drawn',
  engine: 'original',
  media: 'watercolor',
  stroke: { smoothness: 0, wobble: 1, width: .8, opacity: .62, softWidth: 1, softOpacity: 0, grain: .72 },
  fill: { opacity: .72, saturation: .9, brightness: 1 },
  highlight: { strength: 0, size: .88, x: .34, y: .12, spread: .48, gloss: 0 },
  formShadow: { strength: 0, start: .38, darkness: .68 },
  castShadow: { opacity: 0, offsetX: 0, offsetY: 0, blur: 0, scale: 1 },
  render: { quality: 1.5 },
  gloss: { material: 'glossy', palette: 'meadow', detail: .5, turn: 0 },
};

const CURRENT_CHARACTER_STYLE = {
  system: 'drawn',
  engine: 'soft',
  media: 'storybook',
  stroke: { smoothness: .72, wobble: .36, width: 1, opacity: .82, softWidth: 1.5, softOpacity: .18, grain: 0 },
  fill: { opacity: 1, saturation: 1, brightness: 1 },
  highlight: { strength: .3, size: .88, x: .34, y: .12, spread: .48, gloss: .18 },
  formShadow: { strength: .2, start: .38, darkness: .68 },
  castShadow: { opacity: .24, offsetX: 13, offsetY: 16, blur: 10, scale: 1.06 },
  render: { quality: 2 },
  gloss: { material: 'glossy', palette: 'meadow', detail: .5, turn: 0 },
};

const ORIGINAL_BACKGROUND_STYLE = {
  color: { saturation: 1, brightness: 1, contrast: 1, hue: 0, tint: '#f1ead8', tintStrength: 0 },
  paint: { opacity: 1, grain: 0 },
  depth: { haze: 0, blur: 0 },
};

const CURRENT_BACKGROUND_STYLE = {
  color: { saturation: .94, brightness: 1.02, contrast: .96, hue: 0, tint: '#f1ead8', tintStrength: 0 },
  paint: { opacity: 1, grain: .08 },
  depth: { haze: .035, blur: 0 },
};

export const ORIGINAL_RENDER_STYLE = Object.freeze({
  schemaVersion: 3,
  character: ORIGINAL_CHARACTER_STYLE,
  background: ORIGINAL_BACKGROUND_STYLE,
});

export const CURRENT_RENDER_STYLE = Object.freeze({
  schemaVersion: 3,
  character: CURRENT_CHARACTER_STYLE,
  background: CURRENT_BACKGROUND_STYLE,
});

const LIMITS = Object.freeze({
  'character.stroke.smoothness': [0, 1],
  'character.stroke.wobble': [0, 1],
  'character.stroke.width': [.55, 1.8],
  'character.stroke.opacity': [.25, 1],
  'character.stroke.softWidth': [1, 2.6],
  'character.stroke.softOpacity': [0, .5],
  'character.stroke.grain': [0, 1],
  'character.fill.opacity': [.4, 1],
  'character.fill.saturation': [.45, 1.45],
  'character.fill.brightness': [.72, 1.3],
  'character.highlight.strength': [0, .65],
  'character.highlight.size': [.25, 1.4],
  'character.highlight.x': [0, 1],
  'character.highlight.y': [0, 1],
  'character.highlight.spread': [.1, .85],
  'character.highlight.gloss': [0, .45],
  'character.formShadow.strength': [0, .55],
  'character.formShadow.start': [0, .8],
  'character.formShadow.darkness': [.35, .95],
  'character.castShadow.opacity': [0, .5],
  'character.castShadow.offsetX': [-24, 30],
  'character.castShadow.offsetY': [-12, 34],
  'character.castShadow.blur': [0, 24],
  'character.castShadow.scale': [.82, 1.3],
  'character.render.quality': [1, 2.5],
  'character.gloss.detail': [.25, .75],
  'character.gloss.turn': [-.45, .45],
  'background.color.saturation': [.4, 1.5],
  'background.color.brightness': [.75, 1.3],
  'background.color.contrast': [.65, 1.4],
  'background.color.hue': [-30, 30],
  'background.color.tintStrength': [0, .72],
  'background.paint.opacity': [.45, 1],
  'background.paint.grain': [0, .6],
  'background.depth.haze': [0, .45],
  'background.depth.blur': [0, 3],
});

const copy = value => JSON.parse(JSON.stringify(value));
const getPath = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
const setPath = (object, path, value) => {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((current, key) => current[key], object);
  target[last] = value;
};

function sourceFor(value) {
  const source = value && typeof value === 'object' ? value : CURRENT_RENDER_STYLE;
  if (source.character && source.background) return source;
  return {
    schemaVersion: 1,
    character: source,
    background: source.engine === 'original' ? ORIGINAL_BACKGROUND_STYLE : CURRENT_BACKGROUND_STYLE,
  };
}

function normalizedHex(value, fallback) {
  const clean = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(clean) ? clean : fallback;
}

export function normalizeRenderStyle(value) {
  const source = sourceFor(value);
  const normalized = copy(CURRENT_RENDER_STYLE);
  const character = source.character || {};
  normalized.character.system = character.system === 'gloss' ? 'gloss' : 'drawn';
  normalized.character.engine = character.engine === 'original' ? 'original' : 'soft';
  const requestedMedia = String(character.media || '');
  normalized.character.media = DRAWN_MEDIA_IDS.includes(requestedMedia)
    ? requestedMedia
    : normalized.character.engine === 'original' ? 'watercolor' : 'storybook';
  const requestedMaterial = String(character.gloss?.material || '');
  const requestedPalette = String(character.gloss?.palette || '');
  normalized.character.gloss.material = GLOSS_MATERIAL_IDS.includes(requestedMaterial) ? requestedMaterial : 'glossy';
  normalized.character.gloss.palette = GLOSS_PALETTE_IDS.includes(requestedPalette) ? requestedPalette : 'meadow';
  normalized.background.color.tint = normalizedHex(source.background?.color?.tint, CURRENT_BACKGROUND_STYLE.color.tint);
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

function tintOverlay(color, strength) {
  const red = parseInt(color.slice(1, 3), 16);
  const green = parseInt(color.slice(3, 5), 16);
  const blue = parseInt(color.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${strength})`;
}

export function applyRenderStyleCssVars(root, value) {
  if (!root?.style) return;
  const style = normalizeRenderStyle(value);
  const shadow = style.character.castShadow;
  const background = style.background;
  root.style.setProperty('--character-shadow-x', `${shadow.offsetX}px`);
  root.style.setProperty('--character-shadow-y', `${shadow.offsetY}px`);
  root.style.setProperty('--character-shadow-blur', `${shadow.blur}px`);
  root.style.setProperty('--character-shadow-color', `rgba(42, 61, 48, ${shadow.opacity})`);
  root.style.setProperty('--background-saturation', String(background.color.saturation));
  root.style.setProperty('--background-brightness', String(background.color.brightness));
  root.style.setProperty('--background-contrast', String(background.color.contrast));
  root.style.setProperty('--background-hue', `${background.color.hue}deg`);
  root.style.setProperty('--background-tint-overlay', tintOverlay(background.color.tint, background.color.tintStrength));
  root.style.setProperty('--background-opacity', String(background.paint.opacity));
  root.style.setProperty('--background-grain', String(background.paint.grain));
  root.style.setProperty('--background-haze', String(background.depth.haze));
  root.style.setProperty('--background-blur', `${background.depth.blur}px`);
}

export function cloneRenderStyle(value = CURRENT_RENDER_STYLE) {
  return normalizeRenderStyle(value);
}

export { LIMITS as RENDER_STYLE_LIMITS };
