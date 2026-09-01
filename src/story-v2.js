import * as THREE from 'three';
import { Sketch } from './sketch.js';
import { setHand, setRender, U } from './part.js';
import { SoftStorySketch } from './soft-story-sketch.js?v=20260831-default-drawn';
import { applyRenderStyleCssVars, loadAppliedRenderStyle, RENDER_STYLE_STORAGE_KEY } from './render-style-config.js?v=20260831-default-drawn';
import { newRecipe, ensureParams, buildCharacter } from './rig.js';
import { createAnimator } from './anim.js';
import {
  configureRendererForCharacterSystem,
  createGlossCharacter,
  glossPlacement,
} from './gloss-character-renderer.js?v=20260828-style-editor-v2';
import { storyBySlug } from './story-blueprints.js?v=20260901-two-stories';
import { paintSceneCanvas, sceneById } from './lab-scenes.js?v=20260901-grounded-guide';
import { storyCharacterTemplateById } from './story-character-templates.js';
import { trackAnalytics } from './analytics.js';
import { installUISFX, playUISFX } from './ui-sfx.js?v=20260831-always-on';
import { mountAppNavigation } from './app-navigation.js?v=20260828-style-editor';
import { SeedRealtimeSpeech } from './seed-realtime-speech.js?v=20260827-ios-clean-audio';
import {
  setVoiceInputControlLevel,
  setVoiceInputControlState,
} from './voice-input-control.js?v=20260828-waveform-loader';
import {
  mountSpeechBubble,
  setSpeechBubbleText,
  skipSpeechBubble,
} from '../vendor/calligraph-bubble.js?v=20260827-user-bubble';

installUISFX();

const activeRenderStyle = loadAppliedRenderStyle();
const requestedStory = new URLSearchParams(location.search).get('story') || 'doudou';
const story = storyBySlug(requestedStory);
const CHAPTERS = story.chapters;
const INTERVIEW_QUESTIONS = story.interviewQuestions;
const ITEMS = story.items;
const SCENES = story.scenes;
const STORY_ID = story.id;
document.documentElement.dataset.renderSystem = activeRenderStyle.character.system;
document.documentElement.dataset.renderEngine = activeRenderStyle.character.engine;
document.documentElement.dataset.renderMedia = activeRenderStyle.character.media;
setRender({ u: 176, frames: 2 });
setHand((width, height) => activeRenderStyle.character.engine === 'original'
  ? new Sketch(width, height)
  : new SoftStorySketch(width, height, activeRenderStyle.character));
applyRenderStyleCssVars(document.documentElement, activeRenderStyle);
THREE.ColorManagement.enabled = false;

const $ = id => document.getElementById(id);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const panels = ['cover-panel', 'interview-panel', 'ritual-panel', 'quest-panel', 'ending-panel'];
const STORY_STORAGE_KEY = 'mengmeng-story-adventures';
const MAX_INTERVIEW_ANSWER = 180;

const state = {
  guide: story.guide,
  questionIndex: 0,
  profile: {},
  heard: [],
  petHints: [],
  petTemplate: null,
  pet: null,
  petName: '',
  petVoice: 'star',
  inventory: [],
  sceneIndex: 0,
  choices: [],
  inventions: [],
  petIntroduced: false,
  petOffset: { x: 0, y: 0 },
  busy: false,
};

function configureStoryPage() {
  document.title = `${story.title} | 萌萌星的奇妙图鉴`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', story.intro);
  document.body.dataset.story = story.slug;
  document.body.dataset.analyticsPage = story.analytics;
  $('cover-title').textContent = story.title;
  $('cover-copy').textContent = story.intro;
  $('cover-illustration').src = story.cover;
  $('cover-illustration').alt = story.slug === 'moon'
    ? '山丘上的望远镜、远处月亮和一个模糊未定的发明轮廓简笔画'
    : '红苹果树、小路、小桥和远处红屋顶房子的简笔画，草丛里有一个模糊的小动物轮廓';
  for (const chapter of CHAPTERS) {
    const dot = document.querySelector(`[data-chapter-dot="${chapter.number}"]`);
    if (dot) dot.textContent = chapter.title;
  }
  $('ending-label').textContent = story.ending.label;
  $('ending-title').textContent = story.ending.title;
  $('backpack-title').textContent = story.slug === 'moon' ? '登月工具包' : '豆豆线索包';
  $('empty-inventory').textContent = story.slug === 'moon'
    ? '工具包还是空的。第一枚任务章会在望远镜山丘出现。'
    : '线索包还是空的。第一件东西会在红苹果园出现。';
  $('mic-button').setAttribute('aria-describedby', 'story-privacy');
}

let activeAudio = null;
let activeAudioFinish = null;
let activeTtsRequest = 0;
let activeTtsController = null;
let storyRealtimeSpeech = new SeedRealtimeSpeech();
let speechSkipId = 0;
let activeBubbleKind = '';
let activeRecognition = null;
let activePcmCapture = null;
let toastTimer = 0;

const guideVoiceSession = {
  active: false,
  paused: true,
  manualPause: false,
  processing: false,
  speaking: false,
  recognition: null,
  capture: null,
  restartTimer: 0,
  pendingAnswer: '',
};

const bubblePages = {
  guide: { pages: [], index: 0, label: '' },
  npc: { pages: [], index: 0, label: '' },
  pet: { pages: [], index: 0, label: '' },
};

let dialogueSequence = null;
let dialogueSequenceId = 0;
let activeSceneSpeaker = 'npc';
let petWalkId = 0;

// Keep a single audio context unlocked from the child's first deliberate tap.
// Later streamed replies can then play without relying on a delayed HTMLAudio
// autoplay permission.
document.addEventListener('pointerdown', () => { void storyRealtimeSpeech.unlock(); }, { capture: true });
document.addEventListener('keydown', () => { void storyRealtimeSpeech.unlock(); }, { capture: true });

const petTapLines = [
  '我在这里。',
  '我听见你啦。',
  '要一起往前走吗？',
  '我们再看看眼前的线索。',
];

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function splitBubblePages(text, limit = 15) {
  const source = String(text || '').replace(/\s+/g, '').trim();
  if (!source) return [''];
  const sentences = source.match(/[^，。！？；]+[，。！？；]?/g) || [source];
  const pages = [];
  let page = '';
  for (const sentence of sentences) {
    const pieces = [];
    for (let offset = 0; offset < sentence.length; offset += limit) pieces.push(sentence.slice(offset, offset + limit));
    for (const piece of pieces) {
      if (page && page.length + piece.length > limit) {
        pages.push(page);
        page = piece;
      } else {
        page += piece;
      }
    }
  }
  if (page) pages.push(page);
  return pages;
}

function estimatedSpeechTime(text) {
  return Math.min(7200, Math.max(1200, 620 + Array.from(String(text || '')).length * 168));
}

function bubbleElement(kind) {
  if (kind === 'guide') return $('interview-question');
  if (kind === 'pet') return $('pet-bubble-text');
  return $('npc-bubble-text');
}

function hasVisibleBubbleContent(text) {
  return String(text || '').replace(/[\s\p{P}]/gu, '').length > 0;
}

function animateBubbleText(element, text, { waiting = false, durationMs = 0, complete = false } = {}) {
  const value = String(text || '').trim();
  element.setAttribute('aria-label', value);
  const shell = element.closest('[data-bubble-shell]');
  if (shell) {
    shell.dataset.text = value;
    shell.hidden = !hasVisibleBubbleContent(value);
  }
  setSpeechBubbleText(element.dataset.bubbleKey, value, {
    waiting,
    durationMs,
    complete: complete || !value,
  });
}

function renderBubblePage(kind, options = {}) {
  const model = bubblePages[kind];
  const text = model.pages[model.index] || '';
  if (kind === 'guide') {
    animateBubbleText($('interview-question'), text, options);
    return;
  }
  if (kind === 'pet') {
    $('pet-thought').hidden = false;
    animateBubbleText($('pet-thought'), text, options);
    return;
  }
  $('npc-speech').hidden = false;
  animateBubbleText($('npc-bubble-text'), text, options);
}

function setBubble(kind, text, label = '', { waiting = false, durationMs = 0, complete = true } = {}) {
  bubblePages[kind] = { pages: [String(text || '')], index: 0, label };
  renderBubblePage(kind, { waiting, durationMs, complete });
  if (kind === 'npc') requestAnimationFrame(() => requestAnimationFrame(anchorStageSpeech));
}

function activeSpeakerElement() {
  if (activeSceneSpeaker === 'companion') {
    return document.querySelector('[data-companion="0"]:not([hidden]) canvas');
  }
  return $('npc-character');
}

function anchorStageSpeech() {
  const bubble = $('npc-speech');
  const target = activeSpeakerElement();
  const stage = $('world-stage');
  if (!bubble || bubble.hidden || !target || target.closest('[hidden]')) return;
  const stageRect = stage.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  if (!targetRect.width || !targetRect.height) return;
  const halfBubble = Math.min((bubble.getBoundingClientRect().width || 260) / 2, stageRect.width / 2 - 12);
  const idealX = targetRect.left - stageRect.left + targetRect.width / 2;
  const x = Math.max(halfBubble + 12, Math.min(stageRect.width - halfBubble - 12, idealX));
  const y = Math.max(86, targetRect.top - stageRect.top + targetRect.height * .16);
  bubble.style.left = `${Math.round(x)}px`;
  bubble.style.top = `${Math.round(y)}px`;
}

function startBubbleTimeline(kind, text, durationMs) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    completeBubble(kind);
    return;
  }
  animateBubbleText(bubbleElement(kind), text, { durationMs });
}

function completeBubble(kind) {
  const element = bubbleElement(kind);
  skipSpeechBubble(element.dataset.bubbleKey);
}

function advanceBubble() {
  return false;
}

async function speakBubblePage(kind, text, voice) {
  const skipId = speechSkipId;
  activeBubbleKind = kind;
  const fallbackDuration = estimatedSpeechTime(text);
  let timelineStartedAt = 0;
  let timelineDuration = fallbackDuration;
  setBubble(kind, text, '', { waiting: true, complete: false });
  const played = await playTts(text, voice, {
    pet: kind === 'pet',
    npc: kind === 'npc',
    onTimeline: durationMs => {
      timelineDuration = durationMs;
      timelineStartedAt = performance.now();
      startBubbleTimeline(kind, text, durationMs);
    },
  });
  if (speechSkipId !== skipId) {
    completeBubble(kind);
    if (activeBubbleKind === kind) activeBubbleKind = '';
    return false;
  }
  if (!timelineStartedAt) {
    timelineStartedAt = performance.now();
    startBubbleTimeline(kind, text, fallbackDuration);
  }
  if (!played) {
    const remaining = Math.max(0, timelineDuration - (performance.now() - timelineStartedAt));
    if (remaining) await delay(remaining);
  }
  completeBubble(kind);
  if (activeBubbleKind === kind) activeBubbleKind = '';
  return played;
}

function skipCurrentSpeech(kind = '') {
  const currentKind = activeBubbleKind || kind;
  if (!currentKind && !activeAudio && !activeTtsController) return false;
  speechSkipId += 1;
  if (currentKind) completeBubble(currentKind);
  activeBubbleKind = '';
  stopAudio();
  void playUISFX('skip-next', { volume: 0.12 });
  return true;
}

function presentDialogueSequence(steps, onComplete) {
  const id = ++dialogueSequenceId;
  const filteredSteps = steps.filter(step => step?.text);
  dialogueSequence = { id, steps: filteredSteps, onComplete };
  void (async () => {
    for (const step of filteredSteps) {
      if (dialogueSequenceId !== id) return;
      step.onShow?.();
      if (step.delayBefore) await delay(matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : step.delayBefore);
      for (const page of splitBubblePages(step.text)) {
        if (dialogueSequenceId !== id) return;
        guideVoiceSession.speaking = true;
        setGuideVoiceUi('speaking', '字幕正在跟着语音出现');
        await speakBubblePage(step.kind, page, step.voice);
        if (dialogueSequenceId !== id) return;
        await delay(matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 220);
      }
    }
    if (dialogueSequenceId !== id) return;
    dialogueSequence = null;
    onComplete?.();
  })();
}

function showPanel(id, phase) {
  for (const panelId of panels) $(panelId).hidden = panelId !== id;
  document.body.dataset.phase = phase;
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

function setBusy(busy) {
  state.busy = busy;
  for (const button of document.querySelectorAll('#interview-panel button')) button.disabled = busy;
}

function renderStoryBackdrop(scene) {
  const canvas = $('story-scene-backdrop');
  const config = sceneById(scene.sceneId);
  document.body.dataset.scene = scene.id;
  document.body.dataset.place = config.id;
  document.body.dataset.sceneBackdrop = config.id;
  canvas.dataset.sceneId = config.id;
  paintSceneCanvas(canvas, config.id, activeRenderStyle.background);
}

class PetRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(activeRenderStyle.character.render.quality, Math.max(1, devicePixelRatio || 1)));
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-2.2, 2.2, 2.5, -1.7, .1, 30);
    this.camera.position.set(0, .3, 9);
    this.camera.lookAt(0, .3, 0);
    this.clock = new THREE.Clock();
    this.face = null;
    this.holder = null;
    this.animator = null;
    this.options = { boil: true, blink: true, gaze: true, sway: true, breath: true, talk: false, amp: .95, phase: .4 };
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    addEventListener('resize', this.resize, { passive: true });
    this.resize();
    requestAnimationFrame(this.tick);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(220, Math.round(rect.width || 420));
    const height = Math.max(240, Math.round(rect.height || 520));
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.camera.left = -2.25 * aspect;
    this.camera.right = 2.25 * aspect;
    this.camera.top = 2.25;
    this.camera.bottom = -2.25;
    this.camera.updateProjectionMatrix();
  }

  build(pet) {
    const template = storyCharacterTemplateById(pet.templateId);
    const recipe = makeStoryGuideRecipe({ ...template, seed: pet.seed });
    const palette = {
      moss: { skin: 7, cloth: 2, hair: 2, accent: 1 },
      sky: { skin: 6, cloth: 6, hair: 3, accent: 1 },
      coral: { skin: 5, cloth: 3, hair: 4, accent: 0 },
      moon: { skin: 6, cloth: 6, hair: 3, accent: 2 },
    }[pet.palette] || { skin: 7, cloth: 2, hair: 2, accent: 1 };

    Object.assign(recipe.parts.skull.params, { skinOn: true, skinIdx: palette.skin, plain: false });
    Object.assign(recipe.parts.torso.params, { clothOn: true, clothIdx: palette.cloth });
    Object.assign(recipe.parts.hair.params, { colIdx: palette.hair });
    Object.assign(recipe.parts.extras.params, { accentIdx: palette.accent });

    recipe.parts.extras.params.tears = false;
    recipe.parts.extras.params.accidents = false;
    recipe.parts.extras.params.smudge = false;
    recipe.parts.extras.params.eraser = false;
    recipe.parts.extras.params.blush = true;
    if (pet.feature === 'listening-ears') {
      recipe.parts.crest.params.len = Math.max(1.7, recipe.parts.crest.params.len || 1);
      recipe.parts.eyes.params.type = 'dot';
    } else if (pet.feature === 'bright-eyes') {
      recipe.parts.eyes.params.type = 'sparkle';
      recipe.parts.eyes.params.scale = Math.max(1.15, recipe.parts.eyes.params.scale || 1);
    } else if (pet.feature === 'soft-tail') {
      recipe.parts.tail.params.style = 'puff';
    } else {
      recipe.parts.extras.params.freckles = true;
      recipe.parts.extras.params.spots = true;
    }

    this.buildRecipe(recipe, { scaleMultiplier: .92, offsetY: -1.02 });
  }

  buildRecipe(recipe, { scaleMultiplier = 1.42, offsetY = -1.15 } = {}) {
    if (this.face) this.face.dispose();
    if (this.holder) this.scene.remove(this.holder);

    configureRendererForCharacterSystem(this.renderer, activeRenderStyle.character.system);
    if (activeRenderStyle.character.system === 'gloss') {
      const gloss = createGlossCharacter(this.renderer, recipe, activeRenderStyle.character.gloss);
      this.face = gloss.face;
      this.animator = gloss.animator;
    } else {
      this.face = buildCharacter(recipe);
    }
    this.holder = new THREE.Group();
    if (this.face.kind === 'gloss') {
      const placement = glossPlacement(this.face, 0, scaleMultiplier * .82);
      this.face.group.position.y = placement.y;
      this.face.group.scale.setScalar(placement.scale);
    } else {
      this.face.group.position.y = this.face.F.B.floorY / U;
    }
    this.holder.add(this.face.group);
    if (this.face.kind !== 'gloss') {
      const scale = (2.15 / 1.4) * (.58 / (this.face.F.s / U));
      this.holder.scale.setScalar(scale * scaleMultiplier);
    }
    this.holder.position.set(0, offsetY, 0);
    this.scene.add(this.holder);
    if (this.face.kind !== 'gloss') this.animator = createAnimator(() => this.face, this.options);
    this.animator.setPose('idle');
    this.resize();
  }

  setTalking(talking) {
    this.options.talk = talking;
    if (talking) this.animator?.setFace('happy');
    else this.animator?.setFace('idle');
  }

  react(kind = 'idle') {
    if (!this.animator) return;
    if (kind === 'happy') this.animator.setFace('happy');
    if (kind === 'brave') this.animator.setPose('attack');
    if (kind === 'listen') this.animator.setFace('sleepy');
    if (kind === 'walk') this.animator.setPose('walk');
    setTimeout(() => {
      this.animator?.setFace('idle');
      if (kind === 'walk' || kind === 'brave') this.animator?.setPose('idle');
    }, kind === 'walk' ? 760 : 1400);
  }

  tick() {
    requestAnimationFrame(this.tick);
    const dt = Math.min(.04, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;
    this.animator?.update(elapsed, dt);
    if (!this.canvas.closest('[hidden]')) this.renderer.render(this.scene, this.camera);
  }
}

function makeStoryGuideRecipe(config) {
  const recipe = newRecipe(config.seed);
  recipe.templateId = config.id;
  recipe.group = config.group;
  recipe.species = config.species;
  recipe.base = config.base;
  recipe.media = activeRenderStyle.character.media;
  recipe.color = 'color';
  ensureParams(recipe);
  Object.assign(recipe.parts.extras.params, {
    mark: 'none', mod: 'none', tears: false, freckles: false, spots: false,
    whiskers: false, studs: false, bandage: false, blush: false, glasses: false,
    antenna: false, accidents: false, smudge: false, eraser: false,
  });
  Object.assign(recipe.parts.brows.params, { on: config.group === '人物' });
  Object.assign(recipe.parts.hair.params, { style: config.group === '人物' ? recipe.parts.hair.params.style : 'bald' });
  for (const slot of ['held', 'offhand', 'worn']) {
    if (recipe.parts[slot]?.params) recipe.parts[slot].params.family = 'none';
  }
  for (const [part, values] of Object.entries(config.parts || {})) {
    if (recipe.parts[part]?.params) Object.assign(recipe.parts[part].params, values);
  }
  const eyes = recipe.parts.eyes.params;
  if (['hollow', 'void', 'sunken', 'xcross', 'spiral', 'wide'].includes(eyes.type)) eyes.type = 'sparkle';
  eyes.scale = Math.min(1.16, eyes.scale || 1);
  eyes.sx = Math.min(.58, eyes.sx || .5);
  eyes.glint = true;
  Object.assign(recipe.parts.skull.params, {
    construction: false,
    fur: false,
    skinScrib: false,
    hollows: false,
  });
  recipe.templateId = config.id;
  return recipe;
}

const guideRenderer = new PetRenderer($('guide-canvas'));
const petRenderer = new PetRenderer($('pet-canvas'));
const npcRenderer = new PetRenderer($('npc-canvas'));
const companionRenderers = [
  new PetRenderer($('npc-companion-canvas-0')),
  new PetRenderer($('npc-companion-canvas-1')),
];
guideRenderer.buildRecipe(makeStoryGuideRecipe(story.guide.template), { scaleMultiplier: 1.56, offsetY: -1.08 });

function stopAudio() {
  activeTtsRequest += 1;
  storyRealtimeSpeech?.stop();
  if (activeTtsController) {
    activeTtsController.abort();
    activeTtsController = null;
  }
  if (activeAudioFinish) {
    const finish = activeAudioFinish;
    activeAudioFinish = null;
    finish(false);
    return;
  }
  if (!activeAudio) return;
  activeAudio.pause();
  activeAudio.src = '';
  activeAudio = null;
  petRenderer.setTalking(false);
  guideRenderer.setTalking(false);
  npcRenderer.setTalking(false);
  companionRenderers.forEach(renderer => renderer.setTalking(false));
  document.querySelectorAll('.npc-companion').forEach(button => button.classList.remove('is-talking'));
  $('npc-wrap').dataset.state = '';
}

async function playTts(text, voice, { pet = false, npc = false, onTimeline = null } = {}) {
  stopAudio();
  const requestId = activeTtsRequest;
  const npcVoiceRenderer = activeSceneSpeaker === 'companion' ? companionRenderers[0] : npcRenderer;
  let timelineStarted = false;
  const stopTalking = () => {
    if (pet) petRenderer.setTalking(false);
    else if (npc) {
      $('npc-wrap').dataset.state = '';
      npcVoiceRenderer.setTalking(false);
      document.querySelector('[data-companion="0"]')?.classList.remove('is-talking');
    } else guideRenderer.setTalking(false);
  };
  const startTalking = () => {
    if (pet) petRenderer.setTalking(true);
    else if (npc) {
      if (activeSceneSpeaker === 'npc') $('npc-wrap').dataset.state = 'speaking';
      npcVoiceRenderer.setTalking(true);
      if (activeSceneSpeaker === 'companion') document.querySelector('[data-companion="0"]')?.classList.add('is-talking');
    } else guideRenderer.setTalking(true);
  };
  storyRealtimeSpeech.onState = state => { if (state === 'idle') stopTalking(); };
  storyRealtimeSpeech.onError = error => {
    if (error?.name !== 'AbortError') document.documentElement.dataset.ttsSource = 'seed-realtime-retrying';
  };
  try {
    const played = await storyRealtimeSpeech.speak(String(text).slice(0, 120), voice, {
      onSegment: () => {
        if (requestId !== activeTtsRequest || timelineStarted) return;
        timelineStarted = true;
        document.documentElement.dataset.ttsSource = 'volc-seed-realtime';
        onTimeline?.(estimatedSpeechTime(text));
        startTalking();
      },
    });
    if (requestId !== activeTtsRequest) return false;
    if (!timelineStarted) onTimeline?.(estimatedSpeechTime(text));
    if (!played) document.documentElement.dataset.ttsSource = 'visual-only';
    stopTalking();
    return played;
  } catch (error) {
    if (error?.name !== 'AbortError') document.documentElement.dataset.ttsSource = 'visual-only';
    stopTalking();
    return false;
  }
}

function recognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function stopRecognition() {
  if (!activeRecognition) return;
  try { activeRecognition.stop(); } catch { /* already stopped */ }
  activeRecognition = null;
}

function encodePcmChunks(chunks, sourceRate) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const joined = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  const ratio = sourceRate / 16000;
  const pcm = new Int16Array(Math.floor(joined.length / ratio));
  for (let index = 0; index < pcm.length; index++) {
    const sample = Math.max(-1, Math.min(1, joined[Math.floor(index * ratio)] || 0));
    pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return new Uint8Array(pcm.buffer);
}

async function startPcmCapture() {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    stream.getTracks().forEach(track => track.stop());
    return null;
  }
  const context = new AudioContextClass();
  await context.resume();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const silent = context.createGain();
  const chunks = [];
  silent.gain.value = 0;
  processor.onaudioprocess = event => chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  source.connect(processor);
  processor.connect(silent);
  silent.connect(context.destination);
  return {
    async stop() {
      processor.onaudioprocess = null;
      try { source.disconnect(); processor.disconnect(); silent.disconnect(); } catch { /* already closed */ }
      stream.getTracks().forEach(track => track.stop());
      const sourceRate = context.sampleRate;
      await context.close().catch(() => {});
      return encodePcmChunks(chunks, sourceRate);
    },
  };
}

async function startContinuousPcmCapture() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('media unavailable');
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    stream.getTracks().forEach(track => track.stop());
    throw new Error('audio context unavailable');
  }
  const context = new AudioContextClass();
  await context.resume();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(1024, 1, 1);
  const silent = context.createGain();
  let chunks = [];
  let bufferedSamples = 0;
  let paused = true;
  let levelListener = () => {};
  const maxBufferedSamples = context.sampleRate * 45;
  silent.gain.value = 0;
  processor.onaudioprocess = event => {
    const chunk = new Float32Array(event.inputBuffer.getChannelData(0));
    if (paused) return;
    let sum = 0;
    for (let index = 0; index < chunk.length; index += 8) sum += chunk[index] * chunk[index];
    const rms = Math.sqrt(sum / Math.max(1, Math.ceil(chunk.length / 8)));
    // A short buffer gives the meter a ~23ms cadence. The gentle floor and
    // curve make quiet speech visible without making background noise look loud.
    const normalized = Math.max(0, Math.min(1, (rms - .004) / .06));
    levelListener(Math.pow(normalized, .72));
    chunks.push(chunk);
    bufferedSamples += chunk.length;
    while (bufferedSamples > maxBufferedSamples && chunks.length > 1) bufferedSamples -= chunks.shift().length;
  };
  source.connect(processor);
  processor.connect(silent);
  silent.connect(context.destination);
  stream.getAudioTracks().forEach(track => { track.enabled = false; });
  return {
    resume() {
      chunks = [];
      bufferedSamples = 0;
      paused = false;
      stream.getAudioTracks().forEach(track => { track.enabled = true; });
    },
    pause() {
      paused = true;
      levelListener(0);
      stream.getAudioTracks().forEach(track => { track.enabled = false; });
    },
    take() {
      paused = true;
      levelListener(0);
      const captured = chunks;
      chunks = [];
      bufferedSamples = 0;
      return encodePcmChunks(captured, context.sampleRate);
    },
    async close() {
      paused = true;
      levelListener(0);
      chunks = [];
      bufferedSamples = 0;
      processor.onaudioprocess = null;
      try { source.disconnect(); processor.disconnect(); silent.disconnect(); } catch { /* already closed */ }
      stream.getTracks().forEach(track => track.stop());
      await context.close().catch(() => {});
    },
    setLevelListener(listener) {
      levelListener = typeof listener === 'function' ? listener : () => {};
    },
  };
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  }
  return btoa(binary);
}

function writeSpeechStatus(status, message) {
  if (!status) return;
  if (status.id !== 'speech-status') {
    status.textContent = message;
    return;
  }
  const dot = document.createElement('i');
  dot.setAttribute('aria-hidden', 'true');
  status.replaceChildren(dot, document.createTextNode(message));
}

async function doubaoTranscript(pcm, status, fallbackText = '', maxLength = MAX_INTERVIEW_ANSWER) {
  if (!pcm || pcm.length < 1600) return '';
  const interviewMode = status?.id === 'speech-status';
  writeSpeechStatus(status, '豆包正在确认刚才听到的这句话');
  try {
    const response = await fetch('/api/asr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pcm: bytesToBase64(pcm) }),
    });
    if (!response.ok) throw new Error('asr unavailable');
    const result = await response.json();
    const transcript = String(result.transcript || '').trim().slice(0, maxLength);
    if (!transcript) throw new Error('empty transcript');
    document.documentElement.dataset.asrSource = 'doubao';
    writeSpeechStatus(status, interviewMode ? '豆包听清了，正在判断要继续听还是回应' : '豆包听见了，可以再改一改');
    return transcript;
  } catch {
    document.documentElement.dataset.asrSource = fallbackText.trim() ? 'browser-fallback' : 'unavailable';
    writeSpeechStatus(status, fallbackText.trim()
      ? (interviewMode ? '已经听见了，正在理解这句话' : '已经听见了，也可以在文字里再改一改')
      : (interviewMode ? '这次没有听清，我会继续听' : '这次没有听清，可以再试一次'));
    return '';
  }
}

function setGuideVoiceUi(mode, message) {
  const panel = $('voice-dock');
  const button = $('mic-button');
  const labels = {
    setup: '允许麦克风并开始故事',
    requesting: '正在打开麦克风',
    listening: '我在听，点一下暂停',
    thinking: '正在理解你的回答',
    speaking: '故事角色正在说话',
    paused: '继续听我说',
    error: '再试一次打开麦克风',
    complete: '故事已经讲完',
  };
  panel.dataset.voiceState = mode;
  document.body.dataset.voiceState = mode;
  setVoiceInputControlState(button, mode);
  button.setAttribute('aria-pressed', String(mode === 'listening'));
  button.setAttribute('aria-label', labels[mode] || labels.setup);
  button.title = labels[mode] || labels.setup;
  button.disabled = ['requesting', 'thinking', 'speaking', 'complete'].includes(mode);
  const phase = document.body.dataset.phase;
  $('guide-figure').dataset.state = phase === 'interview' && ['listening', 'thinking'].includes(mode) ? mode : '';
  if (phase === 'quest') {
    $('npc-wrap').dataset.state = ['listening', 'thinking', 'speaking'].includes(mode) ? mode : '';
    if (mode === 'thinking') setBubble('npc', story.slug === 'moon' ? '正在把你的办法画出来…' : '正在听懂你想怎么照顾豆豆…', '');
  }
  if (mode === 'speaking') showLiveAnswer();
  if (message) writeSpeechStatus($('speech-status'), message);
}

function showLiveAnswer(text = '') {
  const bubble = $('live-answer-bubble');
  const value = String(text).trim().slice(0, 80);
  const shouldEnter = bubble.hidden;
  const shouldShow = hasVisibleBubbleContent(value);
  bubble.hidden = !shouldShow;
  if (shouldShow) setSpeechBubbleText('story-user', value, { complete: true, enter: shouldEnter });
}

function createUserInputBubble(text, key) {
  const value = String(text || '').trim();
  const shell = document.createElement('span');
  shell.className = 'user-input-record character-bubble user-input-bubble';
  shell.dataset.bubbleShell = '';
  shell.dataset.bubbleKey = key;
  shell.dataset.bubbleMaxChars = '18';
  shell.dataset.text = value;
  shell.setAttribute('aria-label', value);
  shell.hidden = !hasVisibleBubbleContent(value);
  const content = document.createElement('span');
  content.className = 'character-bubble__text';
  content.dataset.calligraphBubble = '';
  content.dataset.bubbleKey = key;
  content.textContent = value;
  shell.appendChild(content);
  mountSpeechBubble(content);
  return shell;
}

function detachGuideRecognition() {
  const recognition = guideVoiceSession.recognition;
  guideVoiceSession.recognition = null;
  if (!recognition) return;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  try { recognition.abort(); } catch { /* already stopped */ }
}

function pauseGuideListening({ manual = false, mode = 'paused', message = '' } = {}) {
  guideVoiceSession.paused = true;
  if (manual) guideVoiceSession.manualPause = true;
  clearTimeout(guideVoiceSession.restartTimer);
  guideVoiceSession.capture?.pause();
  detachGuideRecognition();
  if (mode) setGuideVoiceUi(mode, message || (manual ? '已经暂停，点一下麦克风会继续听' : '角色说完后会继续听你说'));
}

function startGuideRecognition() {
  if (!guideVoiceSession.active || guideVoiceSession.paused || guideVoiceSession.processing || guideVoiceSession.speaking || guideVoiceSession.recognition) return;
  const Recognition = recognitionConstructor();
  if (!Recognition) return;
  const recognition = new Recognition();
  guideVoiceSession.recognition = recognition;
  recognition.lang = 'zh-CN';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = event => {
    let interim = '';
    let finalText = '';
    for (let index = event.resultIndex; index < event.results.length; index++) {
      const value = event.results[index][0].transcript;
      if (event.results[index].isFinal) finalText += value;
      else interim += value;
    }
    const heard = String(finalText || interim).trim().slice(0, MAX_INTERVIEW_ANSWER);
    if (heard) {
      showLiveAnswer(heard);
      writeSpeechStatus($('speech-status'), `正在听：${heard}`);
    }
    if (finalText.trim()) handleGuideUtterance(finalText.trim());
  };
  recognition.onerror = event => {
    const denied = event.error === 'not-allowed' || event.error === 'service-not-allowed';
    if (denied) {
      stopGuideVoiceSession();
      setGuideVoiceUi('error', '还没有获得麦克风许可，点麦克风可以再次尝试');
      return;
    }
    if (event.error !== 'aborted' && event.error !== 'no-speech') {
      writeSpeechStatus($('speech-status'), '刚才没有听清，我还在继续听');
    }
  };
  recognition.onend = () => {
    if (guideVoiceSession.recognition === recognition) guideVoiceSession.recognition = null;
    if (!guideVoiceSession.active || guideVoiceSession.paused || guideVoiceSession.processing || guideVoiceSession.speaking) return;
    clearTimeout(guideVoiceSession.restartTimer);
    guideVoiceSession.restartTimer = setTimeout(startGuideRecognition, 260);
  };
  try {
    recognition.start();
    document.documentElement.dataset.asrSource = 'browser-live';
  } catch {
    guideVoiceSession.recognition = null;
    clearTimeout(guideVoiceSession.restartTimer);
    guideVoiceSession.restartTimer = setTimeout(startGuideRecognition, 360);
  }
}

function resumeGuideListening({ preserveBubble = false, message = '正在听，你说完一句后我会自己回应' } = {}) {
  if (!guideVoiceSession.active || !guideVoiceSession.capture || guideVoiceSession.processing || guideVoiceSession.speaking) return;
  guideVoiceSession.paused = false;
  guideVoiceSession.manualPause = false;
  guideVoiceSession.capture.resume();
  if (!preserveBubble) showLiveAnswer('');
  setGuideVoiceUi('listening', message);
  startGuideRecognition();
}

async function stopGuideVoiceSession() {
  guideVoiceSession.active = false;
  guideVoiceSession.paused = true;
  guideVoiceSession.manualPause = false;
  guideVoiceSession.processing = false;
  guideVoiceSession.speaking = false;
  guideVoiceSession.pendingAnswer = '';
  clearTimeout(guideVoiceSession.restartTimer);
  detachGuideRecognition();
  const capture = guideVoiceSession.capture;
  guideVoiceSession.capture = null;
  await capture?.close().catch(() => {});
}

async function startGuideVoiceSession() {
  if (guideVoiceSession.active || state.busy) return;
  const Recognition = recognitionConstructor();
  if (!Recognition || !navigator.mediaDevices?.getUserMedia) {
    document.documentElement.dataset.asrSource = 'unavailable';
    setGuideVoiceUi('error', '这个浏览器暂时不能连续听，请换用支持语音识别的浏览器');
    void playUISFX('error');
    return;
  }
  stopAudio();
  $('mic-button').disabled = true;
  setGuideVoiceUi('requesting', '请在浏览器提示里允许使用麦克风，只需要这一次');
  try {
    guideVoiceSession.capture = await startContinuousPcmCapture();
    guideVoiceSession.capture.setLevelListener(level => setVoiceInputControlLevel($('mic-button'), level));
  } catch {
    $('mic-button').disabled = false;
    document.documentElement.dataset.asrSource = 'permission-denied';
    setGuideVoiceUi('error', '麦克风还未授权，点一下可以重新申请');
    void playUISFX('error');
    return;
  }
  guideVoiceSession.active = true;
  guideVoiceSession.paused = true;
  guideVoiceSession.manualPause = false;
  guideVoiceSession.pendingAnswer = '';
  guideVoiceSession.speaking = true;
  setBusy(true);
  void playUISFX('start', { volume: 0.14 });
  trackAnalytics(`${story.analytics}_voice_enabled`, { depth: 2 });
  if (document.body.dataset.phase === 'cover' && story.onboarding === 'direct') {
    await beginDirectStory();
    return;
  }
  if (document.body.dataset.phase === 'cover') await beginInterview();
  $('mic-button').disabled = false;
  presentDialogueSequence([
    { kind: 'guide', text: state.guide.hello, label: '先领一只小宠物', voice: state.guide.voice },
    {
      kind: 'guide', text: INTERVIEW_QUESTIONS[0].question, label: '第一个问题', voice: state.guide.voice,
      onShow: renderQuestion,
    },
  ], () => {
    setBusy(false);
    guideVoiceSession.speaking = false;
    if (guideVoiceSession.active && !guideVoiceSession.manualPause) resumeGuideListening();
  });
}

async function handleGuideUtterance(browserText) {
  if (!guideVoiceSession.active || guideVoiceSession.processing || state.busy) return;
  guideVoiceSession.processing = true;
  pauseGuideListening({ mode: 'thinking', message: '豆包正在确认刚才听到的这句话' });
  const pcm = guideVoiceSession.capture?.take();
  const browserAnswer = String(browserText).trim().slice(0, MAX_INTERVIEW_ANSWER);
  showLiveAnswer(browserAnswer);
  const corrected = await doubaoTranscript(pcm, $('speech-status'), browserAnswer);
  const currentAnswer = corrected || browserAnswer;
  const answer = [guideVoiceSession.pendingAnswer, currentAnswer].filter(Boolean).join('，').slice(0, MAX_INTERVIEW_ANSWER);
  showLiveAnswer(answer);
  const phase = document.body.dataset.phase;
  if (phase === 'interview') await submitInterviewAnswer(answer, { fromVoice: true });
  else if (phase === 'quest') await submitSceneAnswer(answer);
  else {
    guideVoiceSession.processing = false;
    if (guideVoiceSession.active && !guideVoiceSession.manualPause) resumeGuideListening();
  }
}

function toggleGuideVoice() {
  if (state.busy || guideVoiceSession.processing || guideVoiceSession.speaking) return;
  if (!guideVoiceSession.active) {
    startGuideVoiceSession();
    return;
  }
  if (guideVoiceSession.manualPause || guideVoiceSession.paused) {
    void playUISFX('start', { volume: 0.14 });
    resumeGuideListening();
  } else {
    pauseGuideListening({ manual: true });
    void playUISFX('stop', { volume: 0.14 });
  }
}

function fallbackTurn(question, answer, { forceRespond = false } = {}) {
  const value = String(answer);
  const compact = value.replace(/[，。！？、,.!?\s]/g, '');
  const filler = /^(嗯+|啊+|哦+|呃+|不知道|没想好|等一下|再想想|我?还?想一想|我想想|让我想想|听不清)$/;
  const keywordPool = {
    animal: ['兔', '小狗', '狗狗', '小猫', '猫咪', '猫'],
    color: ['红', '黄', '蓝', '绿', '紫', '粉', '白', '黑', '彩色', '金色', '草莓', '天空', '太阳'],
    name: ['叫', '名字', '团团', '跳跳', '毛球'],
  }[question.id] || [];
  const keywords = keywordPool.filter(keyword => value.includes(keyword)).slice(0, 3);
  const shouldRespond = forceRespond || !filler.test(compact) && (keywords.length > 0 || question.id === 'name' && compact.length >= 1 || compact.length >= 2);
  const templateId = /狗/.test(value) ? 'bean-dog' : /猫/.test(value) ? 'moon-cat' : 'snow-rabbit';
  const palette = /蓝|天空|海|水/.test(value) ? 'sky' : /红|草莓|粉|橙/.test(value) ? 'coral' : /紫|银|月|夜/.test(value) ? 'moon' : 'moss';
  const feature = templateId === 'snow-rabbit' ? 'listening-ears' : templateId === 'moon-cat' ? 'bright-eyes' : 'soft-tail';
  const profileValue = question.id === 'name'
    ? compact.replace(/^(?:它|小伙伴)?(?:叫|名字是)/, '').slice(0, 6) || '团团'
    : value.slice(0, 18);
  const reactions = {
    animal: `好，就先画成${templateId === 'bean-dog' ? '小狗' : templateId === 'moon-cat' ? '小猫' : '小兔子'}的样子。`,
    color: `记住了，最显眼的颜色是${value.slice(0, 10)}。`,
    name: `好，它就叫${profileValue}。这个名字一喊就能听清。`,
  };
  return {
    shouldRespond,
    keywords,
    listeningPrompt: keywords.length ? `听见了“${keywords.join('、')}”，你还可以接着说。` : '我还在听，你可以再说完整一点。',
    reaction: reactions[question.id] || `我记住了“${value.slice(0, 18)}”。`,
    heard: value.slice(0, 12),
    profileValue,
    questionId: question.id,
    petHint: { templateId, palette, feature },
    privacyRedirect: false,
  };
}

async function understandAnswer(question, answer, { forceRespond = false } = {}) {
  try {
    const response = await fetch('/api/story-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: question.id, question: question.question, answer, forceRespond }),
    });
    if (!response.ok) throw new Error('story turn unavailable');
    document.documentElement.dataset.storyAi = 'doubao';
    return response.json();
  } catch {
    document.documentElement.dataset.storyAi = 'deterministic-fallback';
    toast('图鉴员的远程耳朵暂时没连上，但你的回答仍然会改变小宠物。');
    return fallbackTurn(question, answer, { forceRespond });
  }
}

function renderGuide() {
  $('guide-name').textContent = state.guide.name;
  $('guide-figure').dataset.guide = state.guide.id;
  $('guide-figure').dataset.entry = state.guide.entrance || 'left';
  $('guide-canvas').setAttribute('aria-label', `角色模拟器里的${story.guide.template.name}，图鉴员${state.guide.name}`);
  requestAnimationFrame(() => {
    $('guide-figure').classList.add('is-entering');
    guideRenderer.resize();
    guideRenderer.react('happy');
  });
}

function renderQuestion() {
  const question = INTERVIEW_QUESTIONS[state.questionIndex];
  $('guide-speech').dataset.mode = 'question';
  setBubble('guide', question.question, '想听你说');
  guideVoiceSession.pendingAnswer = '';
  showLiveAnswer('');
  if (!guideVoiceSession.active) setGuideVoiceUi('setup', '麦克风还未授权，点一下开始');
  else if (guideVoiceSession.manualPause) setGuideVoiceUi('paused', '已经暂停，点一下麦克风会继续听');
}

function renderHeardNotes() {
  $('heard-notes').replaceChildren(...state.heard.map((note, index) => (
    createUserInputBubble(`记住：${note}`, `heard-${index}`)
  )));
}

async function beginInterview() {
  trackAnalytics(`${story.analytics}_start`, { depth: 1 });
  renderGuide();
  showPanel('interview-panel', 'interview');
}

async function beginDirectStory() {
  trackAnalytics(`${story.analytics}_start`, { depth: 1 });
  const preset = story.initialPet;
  const template = storyCharacterTemplateById(preset.templateId);
  state.petTemplate = template;
  state.pet = {
    seed: hashString(`${story.id}|${template.seed}`),
    templateId: template.id,
    templateName: template.name,
    species: template.species,
    palette: preset.palette,
    feature: preset.feature,
  };
  state.petName = preset.name;
  state.petVoice = pickPetVoice();
  petRenderer.build(state.pet);
  state.petIntroduced = false;
  await startQuest();
}

async function submitInterviewAnswer(raw, { fromVoice = false, forceRespond = false } = {}) {
  if (state.busy) return;
  const answer = String(raw || '').trim().replace(/[<>]/g, '').slice(0, MAX_INTERVIEW_ANSWER);
  if (!answer) {
    writeSpeechStatus($('speech-status'), '我还在听，你可以先说一点点');
    guideVoiceSession.processing = false;
    if (guideVoiceSession.active && !guideVoiceSession.manualPause) resumeGuideListening();
    return;
  }
  if (guideVoiceSession.active) {
    guideVoiceSession.processing = true;
    pauseGuideListening({ mode: 'thinking', message: '豆包正在理解你刚才说的内容' });
  }
  if (!fromVoice) showLiveAnswer(answer);
  setBusy(true);
  setGuideVoiceUi('thinking', '豆包正在理解你刚才说的内容');
  const question = INTERVIEW_QUESTIONS[state.questionIndex];
  const result = await understandAnswer(question, answer, { forceRespond });
  if (result.shouldRespond === false) {
    guideVoiceSession.pendingAnswer = answer;
    const keywords = Array.isArray(result.keywords) ? result.keywords.slice(0, 3) : [];
    const label = keywords.length ? `听见了：${keywords.join('、')}` : '我还在听';
    const listeningPrompt = String(result.listeningPrompt || '我还在听，你可以再说完整一点。').slice(0, 42);
    showLiveAnswer(answer, label);
    trackAnalytics(`${story.analytics}_listen_continue`, { depth: 2 + state.questionIndex });
    setBusy(false);
    guideVoiceSession.processing = false;
    guideVoiceSession.speaking = false;
    if (guideVoiceSession.active && !guideVoiceSession.manualPause) {
      resumeGuideListening({ preserveBubble: true, message: listeningPrompt });
    } else if (guideVoiceSession.active) {
      setGuideVoiceUi('paused', listeningPrompt);
    } else {
      setGuideVoiceUi('setup', listeningPrompt);
    }
    return;
  }
  guideVoiceSession.pendingAnswer = '';
  trackAnalytics(`${story.analytics}_interview_answer`, { depth: 2 + state.questionIndex });
  showLiveAnswer(answer, '听懂了');
  state.profile[question.id] = result.profileValue;
  if (result.heard) state.heard.push(result.heard);
  if (result.petHint) state.petHints.push({ ...result.petHint, questionId: question.id });
  $('guide-speech').dataset.mode = 'reaction';
  renderHeardNotes();
  guideVoiceSession.speaking = true;
  state.questionIndex++;
  const finished = state.questionIndex >= INTERVIEW_QUESTIONS.length;
  const steps = [{ kind: 'guide', text: result.reaction, label: '我听懂了', voice: state.guide.voice }];
  if (!finished) {
    steps.push({
      kind: 'guide', text: INTERVIEW_QUESTIONS[state.questionIndex].question,
      label: `第${state.questionIndex + 1}个问题`, voice: state.guide.voice, onShow: renderQuestion,
    });
  }
  presentDialogueSequence(steps, () => {
    guideVoiceSession.processing = false;
    guideVoiceSession.speaking = false;
    if (finished) {
      void finishInterview();
      return;
    }
    setBusy(false);
    if (guideVoiceSession.active && !guideVoiceSession.manualPause) resumeGuideListening();
    else if (guideVoiceSession.active) setGuideVoiceUi('paused', '已经暂停，点一下麦克风会继续听');
    else setGuideVoiceUi('setup', '麦克风还未授权，点一下开始');
  });
}

function petDescription(pet) {
  const feature = {
    'listening-ears': '一对会认真听的大耳朵',
    'bright-eyes': '一双很亮的眼睛',
    'soft-tail': '一条软软的尾巴',
    'star-freckles': '几颗特别的星星花纹',
  }[pet.feature];
  const palette = { moss: '绿色和暖黄色', sky: '蓝色和白色', coral: '粉色和橙色', moon: '紫色和银白色' }[pet.palette];
  return `${pet.templateName}，有${feature}，身上带着${palette}`;
}

async function finishInterview() {
  const animalHint = state.petHints.find(item => item.questionId === 'animal') || {};
  const colorHint = state.petHints.find(item => item.questionId === 'color') || {};
  const palette = colorHint.palette || 'moss';
  const feature = animalHint.feature || 'listening-ears';
  const templateId = animalHint.templateId || 'snow-rabbit';
  const template = storyCharacterTemplateById(templateId);
  state.petTemplate = template;
  const seedSource = `${template.id}|${Object.values(state.profile).join('|') || Date.now()}`;
  state.pet = {
    seed: hashString(seedSource), templateId: template.id, templateName: template.name,
    species: template.species, palette, feature,
  };
  state.petName = String(state.profile.name || '').replace(/[，。！？、,.!?\s]/g, '').replace(/^(?:它|小伙伴)?(?:叫|名字是)/, '').slice(0, 6) || template.name;
  state.petVoice = pickPetVoice();
  $('pet-stage').hidden = false;
  petRenderer.build(state.pet);
  requestAnimationFrame(() => {
    $('pet-stage').classList.add('show');
    $('pet-stage').dataset.entry = 'house';
    $('pet-stage').classList.add('is-entering');
    petRenderer.resize();
  });
  for (const seal of document.querySelectorAll('[data-seal]')) seal.classList.add('active');
  $('ritual-title').textContent = `今天陪你出发的是${template.name}`;
  $('ritual-copy').textContent = '它照着你的三个具体选择，长出了特别的样子。';
  $('ritual-status').textContent = petDescription(state.pet);
  showPanel('ritual-panel', 'assignment');
  petRenderer.react('listen');
  void playUISFX('complete');
  guideVoiceSession.speaking = true;
  presentDialogueSequence([
    { kind: 'pet', text: `你好，我叫${state.petName}。我已经照着你的选择长出来啦。`, label: '新伙伴', voice: state.petVoice },
    { kind: 'pet', text: '我准备好了。我们先去红苹果园，看看那只迷路的小狗需要什么。', label: '准备出发', voice: state.petVoice },
  ], () => {
    state.petIntroduced = true;
    setBusy(false);
    guideVoiceSession.processing = false;
    guideVoiceSession.speaking = false;
    void startQuest();
  });
}

function pickPetVoice() {
  const preferred = state.pet?.feature === 'listening-ears' ? 'moss' : state.pet?.species === 'dog' ? 'bubble' : 'star';
  return preferred === state.guide.voice ? 'star' : preferred;
}

function showPetThought(text, duration = 5200) {
  const thought = $('pet-thought');
  setBubble('pet', text, '');
  clearTimeout(showPetThought.timer);
  showPetThought.timer = setTimeout(() => { thought.hidden = true; }, duration);
}

async function movePetTo(clientX, clientY) {
  const walkId = ++petWalkId;
  const stage = $('world-stage').getBoundingClientRect();
  const pet = $('pet-stage').getBoundingClientRect();
  const deltaX = clientX - (pet.left + pet.width * .5);
  const deltaY = clientY - (pet.top + pet.height * .7);
  const start = { ...state.petOffset };
  const target = {
    x: Math.max(-stage.width * .34, Math.min(stage.width * .48, state.petOffset.x + deltaX)),
    y: Math.max(-stage.height * .24, Math.min(stage.height * .2, state.petOffset.y + deltaY)),
  };
  const distance = Math.hypot(target.x - start.x, target.y - start.y);
  const steps = Math.min(12, Math.max(2, Math.ceil(distance / 28)));
  const petStage = $('pet-stage');
  petStage.classList.add('is-walking');
  void playUISFX('forward', { volume: 0.1 });
  for (let step = 1; step <= steps; step++) {
    if (walkId !== petWalkId) return;
    const progress = step / steps;
    state.petOffset.x = start.x + (target.x - start.x) * progress;
    state.petOffset.y = start.y + (target.y - start.y) * progress;
    petStage.style.setProperty('--pet-shift-x', `${Math.round(state.petOffset.x)}px`);
    petStage.style.setProperty('--pet-shift-y', `${Math.round(state.petOffset.y)}px`);
    petRenderer.react('walk');
    await delay(matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 270);
  }
  if (walkId === petWalkId) petStage.classList.remove('is-walking');
}

function updateChapterProgress(chapter) {
  for (const dot of document.querySelectorAll('[data-chapter-dot]')) {
    const number = Number(dot.dataset.chapterDot);
    dot.classList.toggle('active', number === chapter);
    dot.classList.toggle('done', number < chapter);
  }
}

async function playTransition(action) {
  const root = document.body;
  root.classList.remove('scene-transition-closing', 'scene-transition-closed', 'scene-transition-opening');
  void root.offsetWidth;
  root.classList.add('scene-transition-closing');
  await delay(matchMedia('(prefers-reduced-motion: reduce)').matches ? 40 : 680);
  root.classList.remove('scene-transition-closing');
  root.classList.add('scene-transition-closed');
  await action();
  root.classList.remove('scene-transition-closed');
  root.classList.add('scene-transition-opening');
  await delay(matchMedia('(prefers-reduced-motion: reduce)').matches ? 40 : 760);
  root.classList.remove('scene-transition-opening');
}

function fallbackSceneTurn(scene, answer) {
  const compact = String(answer || '').replace(/[，。！？、,.!?\s]/g, '');
  const filler = /^(?:嗯+|啊+|哦+|呃+|不知道|没想好|等一下|再想想|我想想|让我想想)$/u;
  if (!compact || filler.test(compact)) {
    return { shouldRespond: false, choiceId: '', listeningPrompt: '我还在听，想到以后慢慢说。' };
  }
  let best = null;
  for (const choice of scene.choices) {
    const hints = [...(choice.voiceHints || []), choice.label, choice.id];
    const score = hints.reduce((total, hint) => total + (String(hint) && compact.includes(String(hint).replace(/\s/g, '')) ? String(hint).length : 0), 0);
    if (!best || score > best.score) best = { choice, score };
  }
  if (!best || best.score === 0) {
    return { shouldRespond: false, choiceId: '', listeningPrompt: '可以再说具体一点，你想先做什么？' };
  }
  return { shouldRespond: true, choiceId: best.choice.id, listeningPrompt: '', reaction: best.choice.result };
}

async function understandSceneAnswer(scene, answer) {
  try {
    const response = await fetch('/api/story-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'scene',
        sceneId: scene.id,
        question: scene.dialogue,
        answer,
        choices: scene.choices.map(({ id, label, result, trait, voiceHints }) => ({ id, label, result, trait, voiceHints })),
      }),
    });
    if (!response.ok) throw new Error('story scene unavailable');
    document.documentElement.dataset.storyAi = 'doubao';
    return response.json();
  } catch {
    document.documentElement.dataset.storyAi = 'deterministic-fallback';
    return fallbackSceneTurn(scene, answer);
  }
}

function fallbackDirectorTurn(scene, answer) {
  const compact = String(answer || '').replace(/[，。！？、,.!?\s]/g, '');
  if (!compact || /^(?:嗯+|啊+|哦+|呃+|不知道|没想好|等一下|再想想|我想想|让我想想)$/u.test(compact)) {
    return { shouldRespond: false, listeningPrompt: '先说一件要造或要改的东西，我会接着画。' };
  }
  const kind = /传送|门|通道/.test(compact) ? 'portal'
    : /火箭|飞船|推进/.test(compact) ? 'rocket'
      : /潜水|船|气泡/.test(compact) ? 'submarine'
        : /梯|弹簧|绳/.test(compact) ? 'ladder'
          : /伞|降落/.test(compact) ? 'parachute'
            : /气球|热气球/.test(compact) ? 'balloon' : 'vehicle';
  const names = {
    portal: '折叠传送门', rocket: '月光火箭', submarine: '气泡潜航器',
    ladder: '弹簧折叠梯', parachute: '月面降落伞', balloon: '云层气球', vehicle: '自由组合飞行器',
  };
  const outcomes = {
    'moon-hill': '装置顺利启动，却把海面反光认成了月光。大家安全落进海底，第一条航线需要修正。',
    'moon-underwater': '新改造把大家送出海面，一阵上升气流又把整支小队轻轻兜进巨人的外套口袋。',
    'moon-pocket': '口袋里的纽扣和线都派上了用场。装置冲出袋口，一直升进厚厚的云层。',
    'moon-clouds': '导航功能找到了云层上方。装置穿过最后一团白云，月球表面已经清楚可见。',
    'moon-landing': '着陆装置放慢速度，轻轻碰到月面。所有人站稳以后，第一枚脚印留了下来。',
  };
  return {
    shouldRespond: true,
    reaction: `我把你的想法画成了“${names[kind]}”，关键部分来自你刚才说的办法。`,
    outcome: outcomes[scene.id],
    listeningPrompt: '',
    visual: {
      kind, name: names[kind], primary: '#5f718c', accent: '#d1a44b',
      details: compact.slice(0, 18), motion: kind === 'portal' ? 'pulse' : kind === 'submarine' ? 'drift' : 'lift',
    },
  };
}

async function understandDirectorAnswer(scene, answer) {
  try {
    const response = await fetch('/api/moon-director', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyId: story.id,
        sceneId: scene.id,
        sceneName: scene.name,
        question: scene.dialogue,
        destination: scene.director.destination,
        constraint: scene.director.constraint,
        previousInventions: state.inventions.slice(-3).map(item => item.visual?.name).filter(Boolean),
        answer,
      }),
    });
    if (!response.ok) throw new Error('moon director unavailable');
    document.documentElement.dataset.storyAi = 'doubao-director';
    return response.json();
  } catch {
    document.documentElement.dataset.storyAi = 'deterministic-director-fallback';
    toast('远程导演暂时没连上，但你的办法仍然会被画出来并带大家继续走。');
    return fallbackDirectorTurn(scene, answer);
  }
}

function sketchPath(ctx, points, color = '#343a34', width = 4, close = false) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      const wobble = pass ? ((index % 2) * 2 - 1) * 1.6 : 0;
      if (index === 0) ctx.moveTo(x + wobble, y - wobble);
      else ctx.lineTo(x + wobble, y - wobble);
    });
    if (close) ctx.closePath();
    ctx.strokeStyle = color;
    ctx.globalAlpha = pass ? .34 : .76;
    ctx.lineWidth = pass ? width * .55 : width;
    ctx.stroke();
  }
  ctx.restore();
}

function sketchEllipse(ctx, x, y, rx, ry, color, fill = '') {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, -.04, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.globalAlpha = .2;
    ctx.fill();
  }
  ctx.strokeStyle = color;
  ctx.globalAlpha = .78;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + 2, y - 1, rx - 3, ry + 2, .035, 0, Math.PI * 2);
  ctx.globalAlpha = .28;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();
}

function drawInvention(visual) {
  const figure = $('story-invention');
  const canvas = $('story-invention-canvas');
  const ctx = canvas.getContext('2d');
  const primary = /^#[0-9a-f]{6}$/i.test(visual.primary || '') ? visual.primary : '#5f718c';
  const accent = /^#[0-9a-f]{6}$/i.test(visual.accent || '') ? visual.accent : '#d1a44b';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(0, 8);
  ctx.fillStyle = 'rgba(247,241,228,.22)';
  ctx.beginPath();
  ctx.ellipse(320, 452, 205, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  if (visual.kind === 'portal') {
    sketchEllipse(ctx, 320, 250, 155, 182, primary, accent);
    sketchEllipse(ctx, 320, 250, 108, 137, accent, primary);
    sketchPath(ctx, [[188, 410], [452, 410], [480, 438], [160, 438], [188, 410]], primary, 6, true);
    for (let index = 0; index < 8; index++) {
      const a = index / 8 * Math.PI * 2;
      sketchEllipse(ctx, 320 + Math.cos(a) * 132, 250 + Math.sin(a) * 158, 8, 8, accent, accent);
    }
  } else if (visual.kind === 'rocket') {
    sketchPath(ctx, [[320, 58], [382, 132], [400, 330], [354, 395], [286, 395], [240, 330], [258, 132], [320, 58]], primary, 6, true);
    ctx.save(); ctx.globalAlpha = .2; ctx.fillStyle = primary; ctx.fill(); ctx.restore();
    sketchEllipse(ctx, 320, 205, 40, 40, accent, accent);
    sketchPath(ctx, [[255, 296], [195, 382], [278, 355]], primary, 6, true);
    sketchPath(ctx, [[385, 296], [445, 382], [362, 355]], primary, 6, true);
    sketchPath(ctx, [[292, 397], [320, 470], [348, 397]], accent, 8, true);
  } else if (visual.kind === 'submarine') {
    sketchEllipse(ctx, 320, 285, 190, 108, primary, primary);
    sketchPath(ctx, [[292, 180], [292, 125], [350, 125], [350, 178]], primary, 7);
    sketchPath(ctx, [[350, 125], [390, 105]], primary, 7);
    for (const x of [245, 320, 395]) sketchEllipse(ctx, x, 280, 27, 27, accent, accent);
    sketchPath(ctx, [[128, 285], [74, 250], [74, 320], [128, 285]], primary, 6, true);
    sketchPath(ctx, [[506, 285], [568, 230], [552, 300], [576, 354], [506, 285]], primary, 5, true);
  } else if (visual.kind === 'ladder') {
    sketchPath(ctx, [[238, 420], [276, 88]], primary, 9);
    sketchPath(ctx, [[402, 420], [364, 88]], primary, 9);
    for (let y = 120; y < 410; y += 48) sketchPath(ctx, [[272 - (y - 120) * .055, y], [368 + (y - 120) * .055, y]], accent, 6);
    sketchPath(ctx, [[220, 434], [260, 470], [300, 434], [340, 470], [380, 434], [420, 470]], primary, 7);
  } else if (visual.kind === 'parachute') {
    sketchPath(ctx, [[132, 220], [170, 118], [250, 62], [320, 48], [390, 62], [470, 118], [508, 220]], primary, 6);
    sketchPath(ctx, [[132, 220], [210, 204], [285, 220], [355, 204], [430, 220], [508, 220]], primary, 5);
    sketchPath(ctx, [[170, 214], [260, 360], [380, 360], [470, 214]], accent, 4);
    sketchPath(ctx, [[250, 356], [390, 356], [375, 438], [265, 438], [250, 356]], primary, 6, true);
  } else if (visual.kind === 'balloon') {
    for (const [x, y, r] of [[250, 155, 78], [340, 120, 88], [420, 175, 72], [300, 215, 70], [390, 230, 68]]) {
      sketchEllipse(ctx, x, y, r, r * 1.12, primary, accent);
      sketchPath(ctx, [[x, y + r], [320, 370]], accent, 2.5);
    }
    sketchPath(ctx, [[260, 365], [380, 365], [360, 447], [280, 447], [260, 365]], primary, 6, true);
  } else {
    sketchPath(ctx, [[175, 335], [225, 195], [330, 142], [448, 210], [482, 344], [420, 402], [242, 402], [175, 335]], primary, 7, true);
    sketchEllipse(ctx, 324, 260, 58, 58, accent, accent);
    sketchPath(ctx, [[190, 320], [118, 355], [190, 372]], primary, 6);
    sketchPath(ctx, [[460, 320], [535, 274], [526, 367], [460, 350]], primary, 6);
    sketchPath(ctx, [[250, 405], [220, 455], [285, 424]], accent, 6);
    sketchPath(ctx, [[390, 405], [420, 455], [355, 424]], accent, 6);
  }
  ctx.restore();
  $('story-invention-name').textContent = visual.name || '刚刚造好的发明';
  figure.dataset.motion = visual.motion || 'lift';
  figure.hidden = false;
  figure.classList.remove('is-revealed');
  void figure.offsetWidth;
  figure.classList.add('is-revealed');
  void playUISFX('complete', { volume: .16 });
}

async function startQuest() {
  $('chapter-progress').hidden = false;
  $('backpack-button').hidden = false;
  state.sceneIndex = 0;
  await playTransition(() => renderScene(SCENES[0]));
}

function renderSceneCast(scene) {
  $('npc-companions').hidden = scene.cast.length === 0;
  document.querySelectorAll('[data-companion]').forEach(button => {
    button.hidden = true;
    button.className = 'npc-companion';
    delete button.dataset.entry;
  });
  const mainTemplate = storyCharacterTemplateById(scene.npc.templateId);
  npcRenderer.buildRecipe(makeStoryGuideRecipe(mainTemplate), { scaleMultiplier: 1.32, offsetY: -1.02 });
  scene.cast.slice(0, 1).forEach((character, index) => {
    const button = document.querySelector(`[data-companion="${index}"]`);
    const template = storyCharacterTemplateById(character.templateId);
    button.dataset.line = character.line;
    button.dataset.name = character.name;
    button.dataset.voice = character.voice || 'bubble';
    button.dataset.entry = character.entrance || 'left';
    button.setAttribute('aria-label', `触摸${character.name}`);
    button.querySelector('span').textContent = character.name;
    companionRenderers[index].buildRecipe(makeStoryGuideRecipe(template), { scaleMultiplier: 1.32, offsetY: -1.02 });
  });
}

function enterMainCharacter(scene) {
  const npc = $('npc-wrap');
  npc.hidden = false;
  npc.dataset.entry = scene.npc.entrance || 'right';
  npc.classList.remove('is-entered', 'is-entering');
  void npc.offsetWidth;
  npc.classList.add('is-entering');
  setTimeout(() => {
    npc.classList.remove('is-entering');
    npc.classList.add('is-entered');
    anchorStageSpeech();
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 720);
}

function enterCompanion(scene, index = 0) {
  const character = scene.cast[index];
  const button = document.querySelector(`[data-companion="${index}"]`);
  if (!character || !button) return;
  $('npc-companions').hidden = false;
  button.hidden = false;
  button.dataset.entry = character.entrance || 'left';
  button.classList.remove('is-entered', 'is-entering');
  void button.offsetWidth;
  button.classList.add('is-entering');
  setTimeout(() => {
    button.classList.remove('is-entering');
    button.classList.add('is-entered');
    anchorStageSpeech();
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 720);
}

function enterPet() {
  const pet = $('pet-stage');
  pet.hidden = false;
  pet.dataset.entry = story.initialPet?.entrance || 'house';
  pet.classList.remove('show', 'is-entering');
  void pet.offsetWidth;
  pet.classList.add('show', 'is-entering');
  requestAnimationFrame(() => petRenderer.resize());
  setTimeout(() => pet.classList.remove('is-entering'), matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 760);
}

function setSceneSpeaker(scene, speaker = 'npc') {
  const companion = document.querySelector('[data-companion="0"]');
  const useCompanion = speaker === 'cast' && scene.cast[0] && !companion.hidden;
  activeSceneSpeaker = useCompanion ? 'companion' : 'npc';
  $('npc-speech').dataset.speaker = activeSceneSpeaker;
  $('npc-wrap').classList.toggle('is-listening', useCompanion);
  companion.classList.toggle('is-talking', useCompanion);
  const speakerName = useCompanion ? scene.cast[0].name : scene.npc.name;
  $('npc-speech').setAttribute('aria-label', `${speakerName}正在说话，轻触可以跳过`);
  requestAnimationFrame(() => requestAnimationFrame(anchorStageSpeech));
}

async function renderScene(scene) {
  state.busy = true;
  renderStoryBackdrop(scene);
  showPanel('quest-panel', 'quest');
  const chapter = CHAPTERS.find(item => item.number === scene.chapter);
  updateChapterProgress(scene.chapter);
  $('chapter-label').textContent = `第${['一', '二', '三'][scene.chapter - 1]}章 ${chapter.title}`;
  $('scene-title').textContent = scene.name;
  $('scene-objective').textContent = scene.objective;
  $('choice-result').hidden = true;
  $('npc-speech').hidden = true;

  const npc = $('npc-wrap');
  npc.hidden = true;
  npc.className = 'npc-wrap';
  delete npc.dataset.entry;
  $('npc-name').textContent = scene.npc.name;
  renderSceneCast(scene);
  await delay(240);
  petRenderer.react(scene.chapter === 3 ? 'brave' : 'idle');
  guideVoiceSession.speaking = true;
  const dialogue = [];
  if (!state.petIntroduced && story.initialPet) {
    dialogue.push({
      kind: 'pet', text: story.initialPet.intro, voice: state.petVoice, delayBefore: 620,
      onShow: () => enterPet(),
    });
    state.petIntroduced = true;
  }
  dialogue.push({
    kind: 'npc', text: scene.npc.intro, voice: scene.npc.voice || 'moss', delayBefore: 560,
    onShow: () => { enterMainCharacter(scene); setSceneSpeaker(scene, 'npc'); },
  });
  if (scene.cast[0]) {
    dialogue.push({
      kind: 'npc', text: scene.cast[0].intro, voice: scene.cast[0].voice || 'bubble', delayBefore: 520,
      onShow: () => { enterCompanion(scene, 0); setSceneSpeaker(scene, 'cast'); },
    });
  }
  dialogue.push(...scene.conversation.map(step => ({
    kind: 'npc',
    text: step.text,
    voice: step.speaker === 'cast' ? scene.cast[0]?.voice || 'bubble' : scene.npc.voice || 'moss',
    onShow: () => setSceneSpeaker(scene, step.speaker),
  })));
  dialogue.push({
    kind: 'npc', text: scene.dialogue, voice: scene.npc.voice || 'moss',
    onShow: () => setSceneSpeaker(scene, 'npc'),
  });
  presentDialogueSequence(dialogue, () => {
    setSceneSpeaker(scene, 'npc');
    state.busy = false;
    guideVoiceSession.processing = false;
    guideVoiceSession.speaking = false;
    if (guideVoiceSession.active && !guideVoiceSession.manualPause) resumeGuideListening({ preserveBubble: true, message: '正在听你的回答' });
  });
}

function inventoryEntry(id) {
  return state.inventory.find(entry => entry.id === id);
}

function collectItem(id) {
  if (!id || inventoryEntry(id)) return;
  state.inventory.push({ id, used: false });
  updateBackpack();
  $('backpack-button').classList.remove('got-item');
  void $('backpack-button').offsetWidth;
  $('backpack-button').classList.add('got-item');
  void playUISFX('reward');
}

function useItem(id) {
  const entry = inventoryEntry(id);
  if (entry) entry.used = true;
  updateBackpack();
  void playUISFX('send');
}

function createItemVisual(item, className = '') {
  if (item.image) {
    const image = document.createElement('img');
    image.src = item.image;
    image.alt = item.name;
    image.className = className;
    return image;
  }
  const mark = document.createElement('span');
  mark.className = `inventory-mark${className ? ` ${className}` : ''}`;
  mark.textContent = item.mark || item.name.slice(0, 1);
  mark.style.setProperty('--item-color', item.color || '#57704c');
  mark.setAttribute('aria-label', item.name);
  return mark;
}

function updateBackpack() {
  const quickItems = $('backpack-quick-items');
  const quickNodes = state.inventory.slice(-3).map(entry => {
    const item = ITEMS[entry.id];
    const visual = createItemVisual(item, 'quick-item-visual');
    visual.title = `${item.name}${entry.used ? '（已使用）' : ''}`;
    visual.classList.toggle('used', entry.used);
    return visual;
  });
  while (quickNodes.length < 3) {
    const empty = document.createElement('span');
    empty.className = 'backpack-empty-slot';
    quickNodes.push(empty);
  }
  quickItems.replaceChildren(...quickNodes);
  const list = $('inventory-list');
  list.replaceChildren(...state.inventory.map(entry => {
    const item = ITEMS[entry.id];
    const row = document.createElement('article');
    row.className = `inventory-item${entry.used ? ' used' : ''}`;
    const image = createItemVisual(item, 'inventory-item-visual');
    const copy = document.createElement('div');
    const name = document.createElement('b');
    name.textContent = `${item.name}${entry.used ? '，已经送出或使用' : ''}`;
    const description = document.createElement('span');
    description.textContent = item.description;
    const usage = document.createElement('p');
    usage.textContent = `可以这样用：${item.use}`;
    copy.append(name, description, usage);
    row.append(image, copy);
    return row;
  }));
  $('empty-inventory').hidden = state.inventory.length > 0;
}

async function submitSceneAnswer(raw) {
  if (state.busy) return;
  const answer = String(raw || '').trim().replace(/[<>]/g, '').slice(0, MAX_INTERVIEW_ANSWER);
  if (!answer) {
    guideVoiceSession.processing = false;
    resumeGuideListening({ message: '我还在听，你可以慢慢说' });
    return;
  }
  const scene = SCENES[state.sceneIndex];
  setSceneSpeaker(scene, 'npc');
  setBubble('npc', `我听见了“${answer.slice(0, 18)}”`, '正在想');
  setGuideVoiceUi('thinking', `${scene.npc.name}正在理解你想做什么`);
  const result = scene.mode === 'director'
    ? await understandDirectorAnswer(scene, answer)
    : await understandSceneAnswer(scene, answer);
  if (result.shouldRespond === false) {
    setBubble('npc', result.listeningPrompt || '先说一件想做、想造或想改变的事。', '我还在听');
    guideVoiceSession.processing = false;
    if (guideVoiceSession.active && !guideVoiceSession.manualPause) resumeGuideListening({ preserveBubble: true, message: result.listeningPrompt || '我还在听，你可以再说具体一点' });
    return;
  }
  if (scene.mode === 'director') {
    await resolveDirectorTurn(scene, result, answer);
    return;
  }
  const choice = scene.choices.find(item => item.id === result.choiceId);
  if (!choice) {
    setBubble('npc', '我还没听懂你想先做什么，可以换一种说法。', '再告诉我一点');
    guideVoiceSession.processing = false;
    resumeGuideListening({ preserveBubble: true, message: '可以换一种说法，再告诉我你想先做什么' });
    return;
  }
  await resolveSceneChoice(scene, choice, result.reaction || choice.result);
}

async function resolveDirectorTurn(scene, result, answer) {
  if (state.busy) return;
  state.busy = true;
  trackAnalytics(`${story.analytics}_invention`, { depth: 8 + state.sceneIndex });
  const visual = result.visual || fallbackDirectorTurn(scene, answer).visual;
  state.inventions.push({ scene: scene.id, answer: answer.slice(0, 80), visual });
  drawInvention(visual);
  $('choice-result').hidden = false;
  $('result-copy').hidden = false;
  $('result-copy').textContent = result.reaction;
  if (scene.reward) {
    const item = ITEMS[scene.reward];
    collectItem(scene.reward);
    const rewardVisual = createItemVisual(item, 'reward-item-visual');
    $('reward-image').replaceWith(rewardVisual);
    rewardVisual.id = 'reward-image';
    $('reward-name').textContent = `得到 ${item.name}`;
    $('reward-short').textContent = item.short;
    $('reward-row').hidden = false;
  } else {
    $('reward-row').hidden = true;
  }
  guideVoiceSession.speaking = true;
  setSceneSpeaker(scene, 'npc');
  presentDialogueSequence([
    { kind: 'npc', text: result.reaction, voice: scene.npc.voice || 'moss', onShow: () => setSceneSpeaker(scene, 'npc') },
    { kind: 'npc', text: result.outcome, voice: scene.npc.voice || 'moss', onShow: () => setSceneSpeaker(scene, 'npc') },
    { kind: 'pet', text: scene.petLine, voice: state.petVoice },
  ], () => {
    guideVoiceSession.processing = false;
    guideVoiceSession.speaking = false;
    if (scene.final) {
      state.busy = false;
      void playTransition(finishStory);
      return;
    }
    state.sceneIndex += 1;
    state.busy = false;
    void playTransition(() => renderScene(SCENES[state.sceneIndex]));
  });
}

async function resolveSceneChoice(scene, choice, reaction) {
  if (state.busy) return;
  state.busy = true;
  trackAnalytics(`${story.analytics}_scene_choice`, { depth: 8 + state.sceneIndex });
  state.choices.push({ scene: scene.id, choice: choice.id, trait: choice.trait });
  $('result-copy').textContent = reaction;
  $('result-copy').hidden = true;
  $('choice-result').hidden = false;
  guideVoiceSession.speaking = true;
  if (scene.consume) useItem(scene.consume);
  if (scene.reward) {
    const item = ITEMS[scene.reward];
    collectItem(scene.reward);
    const rewardVisual = createItemVisual(item, 'reward-item-visual');
    $('reward-image').replaceWith(rewardVisual);
    rewardVisual.id = 'reward-image';
    $('reward-name').textContent = `得到 ${item.name}`;
    $('reward-short').textContent = item.short;
    $('reward-row').hidden = false;
  } else {
    $('reward-row').hidden = true;
  }
  petRenderer.react(choice.trait === 'listen' ? 'listen' : choice.trait === 'bold' ? 'brave' : 'happy');
  setSceneSpeaker(scene, 'npc');
  presentDialogueSequence([
    { kind: 'npc', text: reaction, label: '你的办法成功了', voice: scene.npc.voice || 'moss', onShow: () => setSceneSpeaker(scene, 'npc') },
    { kind: 'pet', text: scene.petLine, label: state.petName, voice: state.petVoice },
  ], () => {
    guideVoiceSession.processing = false;
    guideVoiceSession.speaking = false;
    if (scene.final) {
      state.busy = false;
      void playTransition(finishStory);
      return;
    }
    state.sceneIndex += 1;
    state.busy = false;
    void playTransition(() => renderScene(SCENES[state.sceneIndex]));
  });
}

function dominantTrait() {
  const groups = {
    listen: '你会先听清楚，再想办法。',
    together: '你喜欢叫上朋友一起帮忙。',
    care: '你一直都在照顾身边的朋友。',
    bold: '轮到你开口时，你愿意勇敢地说出来。',
    patient: '你愿意慢一点，等朋友准备好。',
    make: '你喜欢拍手、找图，把办法真的做出来。',
  };
  const counts = new Map();
  for (const choice of state.choices) counts.set(choice.trait, (counts.get(choice.trait) || 0) + 1);
  const trait = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'together';
  return groups[trait] || groups.together;
}

async function finishStory() {
  trackAnalytics(`${story.analytics}_complete`, { depth: 20 });
  stopAudio();
  await stopGuideVoiceSession();
  $('npc-wrap').hidden = true;
  $('npc-companions').hidden = true;
  $('npc-speech').hidden = true;
  updateChapterProgress(4);
  showPanel('ending-panel', 'ending');
  if (story.slug === 'moon') {
    const names = state.inventions.map(item => item.visual?.name).filter(Boolean);
    $('ending-copy').textContent = `你和${state.petName}从山丘出发，绕到海底、巨人口袋和云层，最后抵达月球。${names.length ? `一路造过：${names.join('、')}。` : ''}每次偏航以后，你都没有丢掉最初的目标。`;
    $('pet-ending-line').textContent = `${state.petName}说：“${story.ending.petLine}”`;
    $('ending-memory').replaceChildren(...state.inventions.map((item, index) => (
      createUserInputBubble(`${item.visual?.name || '新发明'}：${item.answer}`, `ending-invention-${index}`)
    )));
  } else {
    $('ending-copy').textContent = `${state.petName}和你从红苹果园出发，先照顾豆豆，再画下线索、陪它过桥，最后找到红屋顶和骨头门牌。${dominantTrait()}`;
    $('pet-ending-line').textContent = `${state.petName}说：“${story.ending.petLine}”`;
    $('ending-memory').replaceChildren(...state.heard.map((note, index) => (
      createUserInputBubble(`最初选择：${note}`, `ending-memory-${index}`)
    )));
  }
  petRenderer.react('happy');
  showPetThought(story.slug === 'moon' ? '登月计划完成。我们的发明也一起到啦！' : '豆豆到家啦！它正在门口向大家摇尾巴。');
  setGuideVoiceUi('complete', '故事讲完了，麦克风已经安静关闭');
  void playUISFX('achievement');
}

function saveEnding() {
  const record = {
    storyId: STORY_ID,
    completedAt: new Date().toISOString(),
    guide: state.guide.id,
    pet: { ...state.pet, name: state.petName, voice: state.petVoice },
    profile: state.profile,
    choices: state.choices,
    inventions: state.inventions,
    items: state.inventory,
  };
  try {
    const existing = JSON.parse(localStorage.getItem(STORY_STORAGE_KEY) || '[]');
    const list = Array.isArray(existing) ? existing : [];
    list.push(record);
    localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(list.slice(-12)));
    $('save-ending').disabled = true;
    $('save-ending').textContent = '已经收进图鉴';
    toast('这次冒险只保存在当前设备。');
    void playUISFX('success');
  } catch {
    toast('这次没能保存，但刚才完成的旅程不会被改变。');
    void playUISFX('error');
  }
}

$('mic-button').addEventListener('click', toggleGuideVoice);
for (const [id, kind] of [['guide-speech', 'guide'], ['npc-speech', 'npc'], ['pet-thought', 'pet']]) {
  const bubble = $(id);
  bubble.addEventListener('click', event => {
    event.stopPropagation();
    skipCurrentSpeech(kind);
  });
  bubble.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    skipCurrentSpeech(kind);
  });
}
$('guide-figure').addEventListener('click', () => {
  guideRenderer.react('happy');
  void playUISFX('select', { volume: 0.12 });
});
$('npc-wrap').addEventListener('click', event => {
  event.stopPropagation();
  if (!state.busy) setBubble('npc', '我在听，你慢慢说。');
  $('npc-wrap').classList.remove('is-tapped');
  void $('npc-wrap').offsetWidth;
  $('npc-wrap').classList.add('is-tapped');
  void playUISFX('select', { volume: 0.12 });
});
$('npc-wrap').addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    $('npc-wrap').click();
  }
});
$('pet-stage').addEventListener('click', event => {
  event.stopPropagation();
  if (state.busy) return;
  showPetThought(petTapLines[Math.floor(Math.random() * petTapLines.length)]);
  petRenderer.react('happy');
  void playUISFX('select', { volume: 0.12 });
});
$('npc-companions').addEventListener('click', event => {
  const button = event.target.closest('[data-companion]');
  if (!button || state.busy) return;
  event.stopPropagation();
  const scene = SCENES[state.sceneIndex];
  setSceneSpeaker(scene, 'cast');
  pauseGuideListening({ mode: 'speaking', message: `${button.dataset.name}正在回应你` });
  button.classList.add('is-talking');
  void playUISFX('select', { volume: 0.12 });
  void speakBubblePage('npc', button.dataset.line, button.dataset.voice).then(() => {
    button.classList.remove('is-talking');
    setSceneSpeaker(scene, 'npc');
    if (guideVoiceSession.active && !guideVoiceSession.manualPause) resumeGuideListening({ preserveBubble: true });
  });
});
$('pet-stage').addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    $('pet-stage').click();
  }
});
$('world-stage').addEventListener('click', event => {
  if (!$('pet-stage').hidden && !state.busy) void movePetTo(event.clientX, event.clientY);
});
$('backpack-button').addEventListener('click', () => $('backpack-dialog').showModal());
$('close-backpack').addEventListener('click', () => $('backpack-dialog').close());
$('backpack-dialog').addEventListener('click', event => {
  if (event.target === $('backpack-dialog')) {
    $('backpack-dialog').close();
    void playUISFX('close');
  }
});
$('save-ending').addEventListener('click', saveEnding);
mountAppNavigation($('story-navigation'), {
  homeHref: './',
});

configureStoryPage();
renderStoryBackdrop(SCENES[0]);
addEventListener('resize', () => requestAnimationFrame(anchorStageSpeech), { passive: true });
addEventListener('beforeunload', () => {
  stopRecognition();
  stopGuideVoiceSession();
});
addEventListener('storage', event => {
  if (event.key === RENDER_STYLE_STORAGE_KEY) location.reload();
});
updateBackpack();
setGuideVoiceUi('setup', '麦克风还未授权，点一下开始');
document.documentElement.dataset.storyReady = 'true';
window.__storyV2 = {
  story, state, activeRenderStyle, ITEMS, SCENES, guideRenderer, petRenderer, renderScene, renderStoryBackdrop, collectItem, finishStory,
  beginInterview, submitInterviewAnswer, finishInterview, submitSceneAnswer, resolveSceneChoice,
  resolveDirectorTurn, drawInvention, setVoiceState: setGuideVoiceUi, setBubble, advanceBubble, skipCurrentSpeech, movePetTo,
};
