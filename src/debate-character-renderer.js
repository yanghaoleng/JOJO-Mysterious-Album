import * as THREE from 'three';
import { Sketch } from './sketch.js';
import { setHand, setRender, U } from './part.js';
import { SoftStorySketch } from './soft-story-sketch.js?v=20260831-default-drawn';
import { applyRenderStyleCssVars, loadAppliedRenderStyle } from './render-style-config.js?v=20260831-default-drawn';
import { newRecipe, ensureParams, buildCharacter } from './rig.js';
import { createAnimator } from './anim.js';

const style = loadAppliedRenderStyle();
applyRenderStyleCssVars(document.documentElement, style);
setRender({ u: 176, frames: 2 });
setHand((width, height) => style.character.engine === 'original'
  ? new Sketch(width, height)
  : new SoftStorySketch(width, height, style.character));
THREE.ColorManagement.enabled = false;

function recipeFor(template) {
  const recipe = newRecipe(template.seed);
  Object.assign(recipe, { templateId: template.id, species: template.species, base: template.base, media: style.character.media, color: 'color' });
  ensureParams(recipe);
  Object.assign(recipe.parts.extras.params, {
    mark: 'none', mod: 'none', tears: false, freckles: false, spots: false,
    whiskers: false, studs: false, bandage: false, blush: true, glasses: false,
    antenna: false, accidents: false, smudge: false, eraser: false,
  });
  recipe.parts.brows.params.on = false;
  recipe.parts.hair.params.style = 'bald';
  for (const slot of ['held', 'offhand', 'worn']) if (recipe.parts[slot]?.params) recipe.parts[slot].params.family = 'none';
  for (const [part, values] of Object.entries(template.parts || {})) if (recipe.parts[part]?.params) Object.assign(recipe.parts[part].params, values);
  const eyes = recipe.parts.eyes.params;
  if (['hollow', 'sunken', 'xcross', 'spiral'].includes(eyes.type)) eyes.type = 'sparkle';
  eyes.scale = Math.min(1.55, eyes.scale || 1);
  eyes.glint = true;
  Object.assign(recipe.parts.skull.params, { construction: false, fur: false, skinScrib: false, hollows: false });
  return recipe;
}

export class DebateCharacterRenderer {
  constructor(canvas, template) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, Math.max(1, devicePixelRatio || 1)));
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-2, 2, 2, -2, .1, 30);
    this.camera.position.set(0, .2, 9);
    this.camera.lookAt(0, .2, 0);
    this.clock = new THREE.Clock();
    this.options = { boil: true, blink: true, gaze: true, sway: true, breath: true, talk: false, amp: .8, phase: Math.random() * 4 };
    this.face = buildCharacter(recipeFor(template));
    this.holder = new THREE.Group();
    this.face.group.position.y = this.face.F.B.floorY / U;
    this.holder.add(this.face.group);
    const scale = (2.15 / 1.4) * (.58 / (this.face.F.s / U));
    this.holder.scale.setScalar(scale * 1.12);
    this.holder.position.y = -1.12;
    this.scene.add(this.holder);
    this.animator = createAnimator(() => this.face, this.options);
    this.animator.setPose('idle');
    this.running = true;
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    addEventListener('resize', this.resize, { passive: true });
    this.resize();
    requestAnimationFrame(this.tick);
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(120, Math.round(rect.width || 210));
    const height = Math.max(140, Math.round(rect.height || 230));
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.camera.left = -2 * aspect;
    this.camera.right = 2 * aspect;
    this.camera.updateProjectionMatrix();
  }
  setState(kind = 'idle') {
    this.options.talk = kind === 'talking';
    this.animator.setFace(kind === 'talking' ? 'happy' : kind === 'thinking' ? 'sleepy' : 'idle');
    this.animator.setPose(kind === 'thinking' ? 'sit' : 'idle');
  }
  tick() {
    if (!this.running) return;
    requestAnimationFrame(this.tick);
    const dt = Math.min(.04, this.clock.getDelta());
    this.animator.update(this.clock.elapsedTime, dt);
    if (!this.canvas.closest('[hidden]')) this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.running = false;
    removeEventListener('resize', this.resize);
    this.face?.dispose?.();
    this.renderer.dispose();
  }
}
