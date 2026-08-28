import * as THREE from 'three';
import { buildGloss, ensureGParams, newGRecipe } from './gloss/grig.js';
import { createGlossFace } from './gloss/gface.js';
import { makeMaterialFactory, studioEnv } from './gloss/gmedia.js';
import { setGlossDetail } from './gloss/gshape.js';

const rendererResources = new WeakMap();

const TEMPLATE_SPECIES = Object.freeze({
  'bean-dog': 'bear',
  'moon-cat': 'cat',
  'snow-rabbit': 'bunny',
  'honey-bear': 'bear',
  'curl-fox': 'cat',
  'bamboo-panda': 'bear',
  'pond-frog': 'slime',
  'book-owl': 'wildcard',
  'forest-deer': 'wildcard',
  'leaf-hedgehog': 'monster',
  'river-otter': 'bear',
  'cloud-alpaca': 'wildcard',
  'trail-explorer': 'humanoid',
  'quiet-painter': 'humanoid',
  'cloud-inventor': 'humanoid',
});

function resourcesFor(renderer) {
  let resources = rendererResources.get(renderer);
  if (!resources) {
    const environment = studioEnv(renderer);
    resources = { environment, materialFor: makeMaterialFactory(environment) };
    rendererResources.set(renderer, resources);
  }
  return resources;
}

function glossSpecies(source) {
  const templateId = source?.templateId || source?.id || '';
  if (TEMPLATE_SPECIES[templateId]) return TEMPLATE_SPECIES[templateId];
  if (source?.group === '人物') return 'humanoid';
  if (source?.species === 'cat') return 'cat';
  if (source?.species === 'dog') return 'bear';
  if (source?.species === 'nightmare') return 'monster';
  if (source?.species === 'human' && source?.base === 'biped') return 'humanoid';
  return 'wildcard';
}

export function makeGlossRecipe(source, style) {
  const recipe = newGRecipe(Number(source?.seed) || 21081);
  recipe.species = glossSpecies(source);
  recipe.material = style.material;
  recipe.palette = recipe.species === 'humanoid' ? 'skin' : style.palette;
  ensureGParams(recipe);
  return recipe;
}

export function configureRendererForCharacterSystem(renderer, system) {
  if (!renderer) return;
  if (system === 'gloss') {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  }
}

export function createGlossCharacter(renderer, source, style) {
  setGlossDetail(style.detail);
  const recipe = makeGlossRecipe(source, style);
  const built = buildGloss(recipe, { materialFor: resourcesFor(renderer).materialFor });
  built.group.rotation.y = style.turn;
  built.group.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  const life = createGlossFace(built, { gaze: true });
  let pose = 'idle';

  const animator = {
    setFace(id) {
      const map = { sleepy: 'sad', brave: 'angry', listen: 'sad' };
      life.setFace(map[id] || id);
    },
    setPose(id) {
      pose = id || 'idle';
      if (pose === 'attack') life.setFace('angry');
      else if (pose === 'play' || pose === 'run') life.setFace('happy');
      else if (pose === 'sleep' || pose === 'sit') life.setFace('sad');
      else life.setFace('idle');
    },
    setGaze() {},
    clearGaze() {},
    update(t, dt) {
      const offset = life.update(t, dt);
      const bounce = pose === 'play' || pose === 'run' ? Math.abs(Math.sin(t * 5.2)) * built.L.s * .045 : 0;
      built.head.position.set(offset.x, built.head.userData.restY + offset.y + bounce, 0);
      built.head.rotation.set(offset.pitch, offset.yaw, offset.rot);
      const breath = 1 + Math.sin(t * 1.8) * .006;
      built.head.scale.set(1 / Math.sqrt(breath), breath, 1 / Math.sqrt(breath));
    },
  };

  const face = {
    kind: 'gloss',
    group: built.group,
    headGroup: built.head,
    bounds: built.bounds,
    built,
    dispose() {
      built.group.traverse(object => object.geometry?.dispose?.());
    },
  };
  return { face, animator, recipe };
}

export function glossPlacement(face, floorY, sceneScale = 1) {
  const fit = Math.min(1.18, 1.92 / Math.max(.1, face.bounds.h));
  const scale = sceneScale * fit;
  return { scale, y: floorY - face.bounds.minY * scale };
}
