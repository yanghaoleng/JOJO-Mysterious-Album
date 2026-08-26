import * as THREE from 'three';
import { setRender, U } from './part.js';
import { newRecipe, ensureParams, buildCharacter } from './rig.js';
import { createAnimator } from './anim.js';
import { CHAPTERS, GUIDES, INTERVIEW_QUESTIONS, ITEMS, SCENES, STORY_GUIDE_TEMPLATE, STORY_ID } from './story-blueprints.js?v=20260826-voice-world';
import { trackAnalytics } from './analytics.js';
import { installUISFX, playUISFX } from './ui-sfx.js';

installUISFX();

setRender({ u: 176, frames: 2 });
THREE.ColorManagement.enabled = false;

const $ = id => document.getElementById(id);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const panels = ['cover-panel', 'interview-panel', 'ritual-panel', 'quest-panel', 'ending-panel'];
const STORY_STORAGE_KEY = 'mengmeng-story-v2-draft';
const MAX_INTERVIEW_ANSWER = 180;

const state = {
  guide: GUIDES.find(guide => guide.id === STORY_GUIDE_TEMPLATE.id) || GUIDES[0],
  questionIndex: 0,
  profile: {},
  heard: [],
  petHints: [],
  pet: null,
  petName: '',
  petVoice: 'star',
  inventory: [],
  sceneIndex: 0,
  choices: [],
  ritualStep: 'name',
  ritualHello: '',
  petOffset: { x: 0, y: 0 },
  busy: false,
};

let activeAudio = null;
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

const petTapLines = [
  '我在这里。',
  '我听见你啦。',
  '要一起往前走吗？',
  '这边好像有一点新声音。',
];

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mostCommon(values, fallback) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || fallback;
}

function splitBubblePages(text, limit = 24) {
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

function renderBubblePage(kind) {
  const model = bubblePages[kind];
  const more = model.index < model.pages.length - 1;
  if (kind === 'guide') {
    $('guide-bubble-state').textContent = model.label;
    $('interview-question').textContent = model.pages[model.index] || '';
    $('guide-bubble-more').classList.toggle('show', more);
    $('guide-speech').classList.remove('bubble-refresh');
    void $('guide-speech').offsetWidth;
    $('guide-speech').classList.add('bubble-refresh');
    return;
  }
  if (kind === 'pet') {
    $('pet-thought').hidden = false;
    $('pet-thought').textContent = model.pages[model.index] || '';
    $('pet-thought').classList.toggle('has-more', more);
    return;
  }
  $('npc-speech').hidden = false;
  $('npc-bubble-state').textContent = model.label;
  $('npc-bubble-text').textContent = model.pages[model.index] || '';
  $('npc-bubble-more').classList.toggle('show', more);
}

function setBubble(kind, text, label) {
  bubblePages[kind] = { pages: splitBubblePages(text), index: 0, label };
  renderBubblePage(kind);
}

function advanceBubble(kind) {
  const model = bubblePages[kind];
  if (kind === 'pet' && $('pet-thought').hidden) return false;
  if (kind === 'npc' && ($('npc-wrap').hidden || $('npc-speech').hidden)) return false;
  if (!model || model.index >= model.pages.length - 1) return false;
  model.index += 1;
  renderBubblePage(kind);
  void playUISFX('forward', { volume: 0.12 });
  return true;
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

function paintPaperGrain() {
  const canvas = $('paper-grain');
  const context = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  context.clearRect(0, 0, canvas.width, canvas.height);
  const dots = Math.round(innerWidth * innerHeight / 760);
  for (let i = 0; i < dots; i++) {
    const alpha = .07 + Math.random() * .1;
    context.fillStyle = `rgba(${82 + Math.random() * 38 | 0},${76 + Math.random() * 32 | 0},${63 + Math.random() * 24 | 0},${alpha})`;
    const size = (.4 + Math.random() * .9) * dpr;
    context.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, size, size);
  }
}

class PetRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2.2, Math.max(1.5, devicePixelRatio || 1)));
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
    const recipe = newRecipe(pet.seed);
    recipe.species = pet.species;
    recipe.base = pet.species === 'human' ? 'biped' : 'quad';
    recipe.media = 'watercolor';
    recipe.color = 'color';
    ensureParams(recipe);

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

    this.buildRecipe(recipe);
  }

  buildRecipe(recipe, { scaleMultiplier = 1.42, offsetY = -1.15 } = {}) {
    if (this.face) this.face.dispose();
    if (this.holder) this.scene.remove(this.holder);

    this.face = buildCharacter(recipe);
    this.holder = new THREE.Group();
    this.face.group.position.y = this.face.F.B.floorY / U;
    this.holder.add(this.face.group);
    const scale = (2.15 / 1.4) * (.58 / (this.face.F.s / U));
    this.holder.scale.setScalar(scale * scaleMultiplier);
    this.holder.position.set(0, offsetY, 0);
    this.scene.add(this.holder);
    this.animator = createAnimator(() => this.face, this.options);
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
    this.renderer.render(this.scene, this.camera);
  }
}

function makeStoryGuideRecipe(config) {
  const recipe = newRecipe(config.seed);
  recipe.species = config.species;
  recipe.base = config.base;
  recipe.media = 'watercolor';
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
  recipe.templateId = config.id;
  return recipe;
}

const guideRenderer = new PetRenderer($('guide-canvas'));
const petRenderer = new PetRenderer($('pet-canvas'));
guideRenderer.buildRecipe(makeStoryGuideRecipe(STORY_GUIDE_TEMPLATE), { scaleMultiplier: 1.56, offsetY: -1.08 });

function stopAudio() {
  if (!activeAudio) return;
  activeAudio.pause();
  activeAudio.src = '';
  activeAudio = null;
  petRenderer.setTalking(false);
  guideRenderer.setTalking(false);
  $('npc-wrap').dataset.state = '';
}

async function playTts(text, voice, { pet = false, npc = false } = {}) {
  stopAudio();
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: String(text).slice(0, 120), voice }),
    });
    if (!response.ok) throw new Error('voice unavailable');
    document.documentElement.dataset.ttsSource = response.headers.get('X-TTS-Provider') || 'server';
    const audio = new Audio(URL.createObjectURL(await response.blob()));
    activeAudio = audio;
    if (pet) petRenderer.setTalking(true);
    else if (npc) $('npc-wrap').dataset.state = 'speaking';
    else guideRenderer.setTalking(true);
    await new Promise(resolve => {
      const finish = () => {
        if (activeAudio === audio) activeAudio = null;
        if (pet) petRenderer.setTalking(false);
        else if (npc) $('npc-wrap').dataset.state = '';
        else guideRenderer.setTalking(false);
        URL.revokeObjectURL(audio.src);
        resolve();
      };
      audio.addEventListener('ended', finish, { once: true });
      audio.addEventListener('error', finish, { once: true });
      audio.play().catch(finish);
    });
    return true;
  } catch {
    if (pet) petRenderer.setTalking(false);
    else if (npc) $('npc-wrap').dataset.state = '';
    else guideRenderer.setTalking(false);
    document.documentElement.dataset.ttsSource = 'visual-only';
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
  const processor = context.createScriptProcessor(4096, 1, 1);
  const silent = context.createGain();
  let chunks = [];
  let bufferedSamples = 0;
  let paused = true;
  const maxBufferedSamples = context.sampleRate * 45;
  silent.gain.value = 0;
  processor.onaudioprocess = event => {
    if (paused) return;
    const chunk = new Float32Array(event.inputBuffer.getChannelData(0));
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
      stream.getAudioTracks().forEach(track => { track.enabled = false; });
    },
    take() {
      paused = true;
      const captured = chunks;
      chunks = [];
      bufferedSamples = 0;
      return encodePcmChunks(captured, context.sampleRate);
    },
    async close() {
      paused = true;
      chunks = [];
      bufferedSamples = 0;
      processor.onaudioprocess = null;
      try { source.disconnect(); processor.disconnect(); silent.disconnect(); } catch { /* already closed */ }
      stream.getTracks().forEach(track => track.stop());
      await context.close().catch(() => {});
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
  const interviewMode = status.id === 'speech-status';
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
  const bubbleStates = {
    setup: '等待麦克风',
    requesting: '正在准备耳朵',
    listening: '正在听',
    thinking: '正在想',
    speaking: '正在说',
    paused: '安静等你',
    error: '需要麦克风',
    complete: '故事完成',
  };
  panel.dataset.voiceState = mode;
  document.body.dataset.voiceState = mode;
  button.setAttribute('aria-pressed', String(mode === 'listening'));
  button.setAttribute('aria-label', labels[mode] || labels.setup);
  button.title = labels[mode] || labels.setup;
  button.disabled = ['requesting', 'thinking', 'speaking', 'complete'].includes(mode);
  const phase = document.body.dataset.phase;
  $('guide-figure').dataset.state = phase === 'interview' && ['listening', 'thinking'].includes(mode) ? mode : '';
  if (phase === 'interview') $('guide-bubble-state').textContent = bubbleStates[mode] || bubbleStates.setup;
  if (phase === 'quest') {
    $('npc-wrap').dataset.state = ['listening', 'thinking', 'speaking'].includes(mode) ? mode : '';
    if (!bubblePages.npc.label || ['listening', 'thinking'].includes(mode)) {
      $('npc-bubble-state').textContent = bubbleStates[mode] || bubbleStates.setup;
    }
  }
  if (mode === 'speaking') showLiveAnswer();
  if (message) writeSpeechStatus($('speech-status'), message);
}

function showLiveAnswer(text = '', label = '我听到') {
  const bubble = $('live-answer-bubble');
  const value = String(text).trim().slice(0, 80);
  bubble.hidden = !value;
  $('live-answer-state').textContent = label;
  $('live-answer-text').textContent = value;
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
  if (mode) setGuideVoiceUi(mode, message || (manual ? '已经暂停，点一下就会继续听' : '先等图鉴员说完，它会自动继续听'));
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
  void playUISFX('start', { volume: 0.14 });
  trackAnalytics('echo_voice_enabled', { depth: 2 });
  if (document.body.dataset.phase === 'cover') await beginInterview();
  setGuideVoiceUi('speaking', `${state.guide.name}先问一句，话音结束后会自动开始听`);
  await playTts(`${state.guide.hello}${INTERVIEW_QUESTIONS[state.questionIndex].question}`, state.guide.voice);
  guideVoiceSession.speaking = false;
  $('mic-button').disabled = false;
  resumeGuideListening();
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
  else if (phase === 'ritual') await submitRitualAnswer(answer);
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
    theme: ['动物', '猫', '狗', '狐狸', '太空', '星星', '飞船', '森林', '植物', '海', '雨'],
    approach: ['看', '观察', '推', '打开', '敲门', '等', '叫', '伙伴', '一起'],
    companion: ['陪', '坐', '玩', '问', '听', '抱', '一起', '安静'],
    comfort: ['声音', '太大', '没看懂', '没看明白', '慢', '自己选', '累', '害怕'],
  }[question.id] || [];
  const keywords = keywordPool.filter(keyword => value.includes(keyword)).slice(0, 3);
  const shouldRespond = forceRespond || !filler.test(compact) && (keywords.length > 0 || compact.length >= 3);
  const species = /一起|伙伴|热闹|跑|玩/.test(value) ? 'dog' : /安静|慢|看看|听/.test(value) ? 'cat' : 'human';
  const palette = /星|月|太空|夜/.test(value) ? 'moon' : /海|水|雨|蓝/.test(value) ? 'sky' : /花|暖|红|太阳/.test(value) ? 'coral' : 'moss';
  const feature = /听|安静|声音/.test(value) ? 'listening-ears' : /看|观察|发现/.test(value) ? 'bright-eyes' : /一起|朋友|陪/.test(value) ? 'soft-tail' : 'star-freckles';
  return {
    shouldRespond,
    keywords,
    listeningPrompt: keywords.length ? `听见了“${keywords.join('、')}”，你还可以接着说。` : '我还在听，你可以再说完整一点。',
    reaction: `我记住了“${value.slice(0, 18)}”。它会变成小伙伴身上的一个秘密。`,
    heard: value.slice(0, 12),
    profileValue: value.slice(0, 18),
    questionId: question.id,
    petHint: { species, palette, feature },
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
  $('guide-canvas').setAttribute('aria-label', `角色模拟器里的卷尾小狐狸，图鉴员${state.guide.name}`);
  requestAnimationFrame(() => {
    guideRenderer.resize();
    guideRenderer.react('happy');
  });
}

function renderQuestion() {
  const question = INTERVIEW_QUESTIONS[state.questionIndex];
  $('question-count').textContent = `${state.questionIndex + 1} / ${INTERVIEW_QUESTIONS.length}`;
  $('guide-speech').dataset.mode = 'question';
  setBubble('guide', question.question, '想听你说');
  guideVoiceSession.pendingAnswer = '';
  showLiveAnswer('');
  if (!guideVoiceSession.active) setGuideVoiceUi('setup', '麦克风还未授权，点一下开始');
  else if (guideVoiceSession.manualPause) setGuideVoiceUi('paused', '已经暂停，点一下就会继续听');
}

function renderHeardNotes() {
  $('heard-notes').replaceChildren(...state.heard.map(note => {
    const chip = document.createElement('span');
    chip.textContent = `记住：${note}`;
    return chip;
  }));
}

async function beginInterview() {
  trackAnalytics('echo_start', { depth: 1 });
  renderGuide();
  showPanel('interview-panel', 'interview');
  renderQuestion();
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
    trackAnalytics('echo_listen_continue', { depth: 2 + state.questionIndex });
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
  trackAnalytics('echo_interview_answer', { depth: 2 + state.questionIndex });
  showLiveAnswer(answer, '听懂了');
  state.profile[question.id] = result.profileValue;
  if (result.heard) state.heard.push(result.heard);
  if (result.petHint) state.petHints.push(result.petHint);
  $('guide-speech').dataset.mode = 'reaction';
  setBubble('guide', result.reaction, '回应你');
  renderHeardNotes();
  guideVoiceSession.speaking = true;
  setGuideVoiceUi('speaking', result.privacyRedirect ? '这部分不会被记进小宠物配方' : `${state.guide.name}正在回应你`);
  await playTts(result.reaction, state.guide.voice);
  state.questionIndex++;
  if (state.questionIndex >= INTERVIEW_QUESTIONS.length) {
    setBusy(false);
    guideVoiceSession.processing = false;
    guideVoiceSession.speaking = false;
    await finishInterview();
    return;
  }
  renderQuestion();
  setGuideVoiceUi('speaking', `${state.guide.name}在问下一个问题，说完会自动继续听`);
  await playTts(INTERVIEW_QUESTIONS[state.questionIndex].question, state.guide.voice);
  setBusy(false);
  guideVoiceSession.processing = false;
  guideVoiceSession.speaking = false;
  if (guideVoiceSession.active && !guideVoiceSession.manualPause) resumeGuideListening();
  else if (guideVoiceSession.active) setGuideVoiceUi('paused', '已经暂停，点一下就会继续听');
  else setGuideVoiceUi('setup', '麦克风还未授权，点一下开始');
}

function petDescription(pet) {
  const species = { cat: '安静机灵的小兽', dog: '愿意一起行动的小兽', human: '像一团会走路的想象' }[pet.species];
  const feature = {
    'listening-ears': '长着一对特别会听的大耳朵',
    'bright-eyes': '有一双总能先发现线索的亮眼睛',
    'soft-tail': '有一条靠近朋友时会轻轻摆动的软尾巴',
    'star-freckles': '脸上留着几颗从回答里落下来的星斑',
  }[pet.feature];
  return `${species}，${feature}`;
}

async function finishInterview() {
  const species = mostCommon(state.petHints.map(item => item.species), 'cat');
  const palette = mostCommon(state.petHints.map(item => item.palette), 'moss');
  const feature = mostCommon(state.petHints.map(item => item.feature), 'listening-ears');
  const seedSource = Object.values(state.profile).join('|') || String(Date.now());
  state.pet = { seed: hashString(seedSource), species, palette, feature };
  $('pet-stage').hidden = false;
  petRenderer.build(state.pet);
  requestAnimationFrame(() => {
    $('pet-stage').classList.add('show');
    petRenderer.resize();
  });
  state.ritualStep = 'name';
  for (const seal of document.querySelectorAll('[data-seal]')) seal.classList.remove('active');
  $('ritual-title').textContent = '你想给它取什么名字？';
  $('ritual-copy').textContent = '直接说出名字就好。它会认真记住你叫它的声音。';
  $('ritual-status').textContent = `${state.guide.name}从你的回答里找到了${petDescription(state.pet)}。`;
  showPanel('ritual-panel', 'ritual');
  petRenderer.react('listen');
  showPetThought('它愿意跟你走。');
  void playUISFX('complete');
  guideVoiceSession.speaking = true;
  setGuideVoiceUi('speaking', `${state.guide.name}正在把新伙伴介绍给你`);
  await playTts(`我找到了一位新伙伴。它是${petDescription(state.pet)}。你想给它取什么名字？`, state.guide.voice);
  guideVoiceSession.processing = false;
  guideVoiceSession.speaking = false;
  if (guideVoiceSession.active && !guideVoiceSession.manualPause) resumeGuideListening({ message: '正在听，直接说出你想叫它的名字' });
}

function pickPetVoice() {
  const preferred = state.pet?.feature === 'listening-ears' ? 'moss' : state.pet?.species === 'dog' ? 'bubble' : 'star';
  return preferred === state.guide.voice ? 'star' : preferred;
}

function extractPetName(answer) {
  const source = String(answer || '')
    .replace(/[<>]/g, '')
    .replace(/^(?:我想|那就|我觉得|要不|可以)?(?:叫|喊|取名(?:叫|为)?|名字(?:叫|是)?)(?:它|他|她)?/u, '')
    .replace(/^(?:就|为|成|做|是)+/u, '')
    .split(/[，。！？、,.!?\s]/u)[0]
    .replace(/[“”"']/g, '')
    .trim();
  return source.slice(0, 8);
}

async function submitRitualAnswer(raw) {
  const answer = String(raw || '').trim().replace(/[<>]/g, '').slice(0, MAX_INTERVIEW_ANSWER);
  showLiveAnswer(answer);
  if (!answer || /^(?:嗯+|啊+|不知道|没想好|等一下|我想想)[。！]?$/u.test(answer)) {
    $('ritual-status').textContent = '没关系，我会一直等你慢慢想。';
    guideVoiceSession.processing = false;
    if (guideVoiceSession.active && !guideVoiceSession.manualPause) resumeGuideListening({ preserveBubble: true, message: '我还在听，想到名字以后直接说出来' });
    return;
  }
  if (state.ritualStep === 'name') {
    const name = extractPetName(answer);
    if (!name) {
      guideVoiceSession.processing = false;
      resumeGuideListening({ preserveBubble: true, message: '这次没有听清名字，可以再说一次' });
      return;
    }
    state.petName = name;
    state.ritualStep = 'hello';
    document.querySelector('[data-seal="name"]')?.classList.add('active');
    $('ritual-title').textContent = `${name}听见自己的名字了`;
    $('ritual-copy').textContent = `现在对${name}说第一句话。问候、邀请，或者你此刻最想说的话都可以。`;
    $('ritual-status').textContent = '第一枚声印亮起来了。';
    petRenderer.react('happy');
    void playUISFX('progress-step', { volume: 0.14 });
    guideVoiceSession.speaking = true;
    setGuideVoiceUi('speaking', `${state.guide.name}正在告诉你下一步`);
    await playTts(`${name}听见自己的名字了。现在请直接对它说第一句话吧。`, state.guide.voice);
    guideVoiceSession.processing = false;
    guideVoiceSession.speaking = false;
    if (guideVoiceSession.active && !guideVoiceSession.manualPause) resumeGuideListening({ message: `正在听，把第一句话说给${name}` });
    return;
  }
  state.ritualHello = answer.slice(0, 80);
  await wakePet();
}

async function wakePet() {
  if (state.busy || !state.petName || !state.ritualHello) return;
  const name = state.petName;
  const hello = state.ritualHello;
  state.busy = true;
  trackAnalytics('echo_pet_wake', { depth: 7 });
  state.petVoice = pickPetVoice();
  const seals = [...document.querySelectorAll('[data-seal]')];
  const lines = [`名字写好了。${name}知道你在叫它。`, '它听见了你的第一句问候。', '现在，把自己的声音还给它。'];
  for (let i = 0; i < seals.length; i++) {
    seals[i].classList.add('active');
    $('ritual-status').textContent = lines[i];
    petRenderer.react(i === 1 ? 'listen' : 'happy');
    void playUISFX('progress-step', { volume: 0.14 });
    await delay(520);
  }
  const reply = `我听见你了。我叫${name}。我的声音还很小，不过我想和你一起去找不见了的回声。`;
  showPetThought(`我听见你了。一起去找回声吧！`);
  void playUISFX('wake');
  guideVoiceSession.speaking = true;
  setGuideVoiceUi('speaking', `${name}第一次开口说话`);
  await playTts(reply, state.petVoice, { pet: true });
  state.busy = false;
  guideVoiceSession.processing = false;
  guideVoiceSession.speaking = false;
  await delay(260);
  await startQuest();
}

function showPetThought(text, duration = 5200) {
  const thought = $('pet-thought');
  setBubble('pet', text, '');
  clearTimeout(showPetThought.timer);
  showPetThought.timer = setTimeout(() => { thought.hidden = true; }, duration);
}

function movePetTo(clientX, clientY) {
  const stage = $('world-stage').getBoundingClientRect();
  const pet = $('pet-stage').getBoundingClientRect();
  const deltaX = clientX - (pet.left + pet.width * .5);
  const deltaY = clientY - (pet.top + pet.height * .7);
  state.petOffset.x = Math.max(-stage.width * .34, Math.min(stage.width * .48, state.petOffset.x + deltaX));
  state.petOffset.y = Math.max(-stage.height * .24, Math.min(stage.height * .2, state.petOffset.y + deltaY));
  $('pet-stage').style.setProperty('--pet-shift-x', `${Math.round(state.petOffset.x)}px`);
  $('pet-stage').style.setProperty('--pet-shift-y', `${Math.round(state.petOffset.y)}px`);
  $('pet-stage').classList.add('is-walking');
  petRenderer.react('walk');
  void playUISFX('forward', { volume: 0.1 });
  clearTimeout(movePetTo.timer);
  movePetTo.timer = setTimeout(() => $('pet-stage').classList.remove('is-walking'), 820);
}

function updateChapterProgress(chapter) {
  for (const dot of document.querySelectorAll('[data-chapter-dot]')) {
    const number = Number(dot.dataset.chapterDot);
    dot.classList.toggle('active', number === chapter);
    dot.classList.toggle('done', number < chapter);
  }
}

async function playTransition(action) {
  const transition = $('ink-transition');
  transition.classList.remove('play');
  void transition.offsetWidth;
  transition.classList.add('play');
  await delay(320);
  await action();
  await delay(460);
  transition.classList.remove('play');
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

async function startQuest() {
  $('chapter-progress').hidden = false;
  $('backpack-button').hidden = false;
  state.sceneIndex = 0;
  await playTransition(() => renderScene(SCENES[0]));
}

async function renderScene(scene) {
  state.busy = true;
  document.body.dataset.place = scene.place;
  showPanel('quest-panel', 'quest');
  const chapter = CHAPTERS.find(item => item.number === scene.chapter);
  updateChapterProgress(scene.chapter);
  $('chapter-label').textContent = `第${['一', '二', '三'][scene.chapter - 1]}章 ${chapter.title}`;
  $('scene-title').textContent = scene.name;
  $('scene-objective').textContent = scene.objective;
  $('choice-result').hidden = true;
  $('world-tap-hint').hidden = true;

  const npc = $('npc-wrap');
  npc.hidden = true;
  npc.className = 'npc-wrap';
  $('npc-mark').textContent = scene.npc.mark;
  $('npc-name').textContent = scene.npc.name;
  await delay(240);
  npc.classList.add(`enter-${scene.npc.entrance}`);
  npc.hidden = false;
  setBubble('npc', scene.dialogue, scene.npc.name);
  petRenderer.react(scene.chapter === 3 ? 'brave' : 'idle');
  guideVoiceSession.speaking = true;
  setGuideVoiceUi('speaking', `${scene.npc.name}正在说话，结束后会自动继续听`);
  await playTts(`${scene.entranceLine}${scene.dialogue}`, scene.npc.voice || 'moss', { npc: true });
  state.busy = false;
  guideVoiceSession.processing = false;
  guideVoiceSession.speaking = false;
  $('world-tap-hint').hidden = false;
  if (guideVoiceSession.active && !guideVoiceSession.manualPause) resumeGuideListening({ message: '正在听，说出你想怎么做' });
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

function updateBackpack() {
  $('backpack-count').textContent = String(state.inventory.filter(entry => !entry.used).length);
  const list = $('inventory-list');
  list.replaceChildren(...state.inventory.map(entry => {
    const item = ITEMS[entry.id];
    const row = document.createElement('article');
    row.className = `inventory-item${entry.used ? ' used' : ''}`;
    const image = document.createElement('img');
    image.src = item.image;
    image.alt = item.name;
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
  setBubble('npc', `我听见了“${answer.slice(0, 18)}”`, '正在想');
  setGuideVoiceUi('thinking', `${scene.npc.name}正在理解你想做什么`);
  const result = await understandSceneAnswer(scene, answer);
  if (result.shouldRespond === false) {
    setBubble('npc', result.listeningPrompt || '我还在听，你可以再说具体一点。', '我还在听');
    guideVoiceSession.processing = false;
    if (guideVoiceSession.active && !guideVoiceSession.manualPause) resumeGuideListening({ preserveBubble: true, message: result.listeningPrompt || '我还在听，你可以再说具体一点' });
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

async function resolveSceneChoice(scene, choice, reaction) {
  if (state.busy) return;
  state.busy = true;
  trackAnalytics('echo_scene_choice', { depth: 8 + state.sceneIndex });
  state.choices.push({ scene: scene.id, choice: choice.id, trait: choice.trait });
  $('result-copy').textContent = reaction;
  $('choice-result').hidden = false;
  setBubble('npc', reaction, '故事发生了');
  guideVoiceSession.speaking = true;
  setGuideVoiceUi('speaking', '你的话正在改变这个场景');
  const reactionSpoken = await playTts(reaction, scene.npc.voice || 'moss', { npc: true });
  if (scene.consume) useItem(scene.consume);
  if (scene.reward) {
    const item = ITEMS[scene.reward];
    collectItem(scene.reward);
    $('reward-image').src = item.image;
    $('reward-image').alt = item.name;
    $('reward-name').textContent = `得到 ${item.name}`;
    $('reward-short').textContent = item.short;
    $('reward-row').hidden = false;
  } else {
    $('reward-row').hidden = true;
  }
  showPetThought(scene.petLine);
  petRenderer.react(choice.trait === 'listen' ? 'listen' : choice.trait === 'bold' ? 'brave' : 'happy');
  const petSpoken = await playTts(scene.petLine, state.petVoice, { pet: true });
  await delay(reactionSpoken && petSpoken ? 900 : 3200);
  guideVoiceSession.processing = false;
  guideVoiceSession.speaking = false;
  if (scene.final) {
    state.busy = false;
    await playTransition(finishStory);
    return;
  }
  state.sceneIndex += 1;
  state.busy = false;
  await playTransition(() => renderScene(SCENES[state.sceneIndex]));
}

function dominantTrait() {
  const groups = {
    listen: '你常常先听清楚，再决定怎样帮忙。',
    together: '你喜欢让伙伴一起参与，而不是替它完成。',
    care: '你一路都在照顾东西和话语真正属于谁。',
    bold: '需要开口的时候，你愿意把第一句话说出来。',
    patient: '你知道等待也可以是一种行动。',
    make: '你喜欢把线索变成可以动手解决的问题。',
  };
  const counts = new Map();
  for (const choice of state.choices) counts.set(choice.trait, (counts.get(choice.trait) || 0) + 1);
  const trait = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'together';
  return groups[trait] || groups.together;
}

async function finishStory() {
  trackAnalytics('echo_complete', { depth: 20 });
  stopAudio();
  await stopGuideVoiceSession();
  $('npc-wrap').hidden = true;
  $('world-tap-hint').hidden = true;
  updateChapterProgress(4);
  showPanel('ending-panel', 'ending');
  $('ending-copy').textContent = `${state.petName}和你把灯塔种子种在最高的一页。${dominantTrait()}回声回到了原来的句子里，新的声音也得到了一条不着急的小路。`;
  $('pet-ending-line').textContent = `${state.petName}说：“我的声音不是别人发给我的礼物，是我们一路听、一路选，慢慢长出来的。”`;
  $('ending-memory').replaceChildren(...state.heard.map(note => {
    const chip = document.createElement('span');
    chip.textContent = `最初说过：${note}`;
    return chip;
  }));
  petRenderer.react('happy');
  showPetThought('下一次，我们会去一张还没有画出来的图鉴。');
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
    toast('这次没能保存，但灯塔已经在故事里亮起来了。');
    void playUISFX('error');
  }
}

$('mic-button').addEventListener('click', toggleGuideVoice);
$('guide-speech').addEventListener('click', () => advanceBubble('guide'));
$('guide-speech').addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    advanceBubble('guide');
  }
});
$('guide-figure').addEventListener('click', () => {
  guideRenderer.react('happy');
  void playUISFX('select', { volume: 0.12 });
});
$('npc-wrap').addEventListener('click', event => {
  event.stopPropagation();
  if (!advanceBubble('npc')) setBubble('npc', '我在听，你慢慢说。', '听见你了');
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
  if (advanceBubble('pet')) return;
  showPetThought(petTapLines[Math.floor(Math.random() * petTapLines.length)]);
  petRenderer.react('happy');
  void playUISFX('select', { volume: 0.12 });
});
$('pet-stage').addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    $('pet-stage').click();
  }
});
$('place-object').addEventListener('click', event => {
  event.stopPropagation();
  const object = $('place-object');
  object.classList.remove('is-tapped');
  void object.offsetWidth;
  object.classList.add('is-tapped');
  toast('场景轻轻回应了一下。');
  void playUISFX('open', { volume: 0.12 });
});
$('place-object').addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    $('place-object').click();
  }
});
$('world-stage').addEventListener('click', event => {
  if (document.body.dataset.phase === 'interview' && advanceBubble('guide')) return;
  if (document.body.dataset.phase === 'quest' && advanceBubble('npc')) return;
  if (advanceBubble('pet')) return;
  if (!$('pet-stage').hidden) movePetTo(event.clientX, event.clientY);
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
$('play-again').addEventListener('click', () => location.reload());
$('restart-button').addEventListener('click', () => location.reload());

paintPaperGrain();
addEventListener('resize', paintPaperGrain, { passive: true });
addEventListener('beforeunload', () => {
  stopRecognition();
  stopGuideVoiceSession();
});
updateBackpack();
setGuideVoiceUi('setup', '麦克风还未授权，点一下开始');
document.documentElement.dataset.storyReady = 'true';
window.__storyV2 = {
  state, ITEMS, SCENES, guideRenderer, petRenderer, renderScene, collectItem, finishStory,
  beginInterview, submitInterviewAnswer, finishInterview, submitRitualAnswer, submitSceneAnswer, resolveSceneChoice,
  setVoiceState: setGuideVoiceUi, setBubble, advanceBubble, movePetTo,
};
