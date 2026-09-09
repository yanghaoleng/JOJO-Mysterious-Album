import { WOW_STORY } from '../src/wow-story-data.js';

export function hashSeed(value) {
  return [...String(value)].reduce((seed, character) => Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261) || 1;
}

export function newJourneySeed() {
  return globalThis.crypto?.getRandomValues(new Uint32Array(1))[0] || hashSeed(`${Date.now()}:${Math.random()}`);
}

export function savedJourneySeed(saved) {
  if (Number.isInteger(saved?.journeySeed) && saved.journeySeed > 0 && saved.journeySeed <= 0xffffffff) return saved.journeySeed;
  // Older saves acquire a deterministic layout before it is persisted. A
  // reload cannot reshuffle it even if storage is temporarily unavailable.
  return hashSeed(JSON.stringify(['wow-layout-1', saved?.sceneIndex, saved?.firstWords, saved?.wowEntries, saved?.inventory]));
}

export function chapterLayoutOptions(chapter, journeySeed) {
  const source = WOW_STORY.chapters.find(item => item.id === chapter);
  const steps = source.scenes.length;
  return { seed: hashSeed(`${journeySeed}:chapter:${chapter}:layout:1`), chapter, steps };
}

export function chapterDecorationProgress(chapter, state) {
  const scenes = WOW_STORY.chapters.find(item => item.id === chapter).scenes;
  const allowed = new Set(scenes.map(scene => scene.id));
  return new Set((state.wowEntries || []).filter(entry => allowed.has(entry?.id) && typeof entry.answer === 'string').map(entry => entry.id)).size / scenes.length;
}

export function makeDecorationLayout(worldId, { seed, steps }) {
  let randomState = seed >>> 0;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const kinds = worldId === 'reef' ? ['seaweed', 'coral', 'stone'] : worldId === 'cloud' ? ['cloud', 'flower', 'stone'] : worldId === 'observatory' ? ['star', 'stone', 'grass'] : ['flower', 'grass', 'stone', 'bush'];
  const frontCount = steps + 4 + Math.floor(random() * 5), backCount = 4 + Math.floor(random() * 4);
  const slots = Array.from({ length: 20 }, (_, index) => ({ x: -2.85 + (index % 5) * .76, z: 2.65 + Math.floor(index / 5) * .43 }));
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  const items = [];
  const next = (index, region) => ({
    id: `${worldId}-growing-${region}-${index}`, region,
    kind: kinds[Math.floor(random() * kinds.length)], size: .65 + random() * .4,
    step: index < steps && region === 'front' ? index + 1 : 1 + Math.floor(random() * steps),
    phase: random() * 12, period: 9 + random() * 5, delay: random() * .18,
  });
  for (let i = 0; i < frontCount; i++) {
    const item = next(i, 'front'), slot = slots[i];
    items.push({ ...item, x: slot.x + (random() - .5) * .14, z: slot.z + (random() - .5) * .12 });
  }
  for (let i = 0; i < backCount; i++) {
    const item = next(i, 'back');
    const polar = 1.55 + random() * 1.18, longitude = i * 2.3999632297 + random() * .6;
    items.push({ ...item, normal: [Math.sin(polar) * Math.cos(longitude), Math.cos(polar), Math.sin(polar) * Math.sin(longitude)] });
  }
  return { version: 1, seed, steps, items: items.map(item => ({ ...item, at: item.step / steps })) };
}
