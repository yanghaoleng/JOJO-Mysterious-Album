import * as THREE from 'three';
import { setRender, U } from './part.js';
import { newRecipe, ensureParams, buildCharacter } from './rig.js';
import { createAnimator } from './anim.js';
import { CHAPTERS, GUIDES, INTERVIEW_QUESTIONS, ITEMS, SCENES, STORY_ID } from './story-blueprints.js';
import { trackAnalytics } from './analytics.js';

setRender({ u: 176, frames: 2 });
THREE.ColorManagement.enabled = false;

const $ = id => document.getElementById(id);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const panels = ['cover-panel', 'interview-panel', 'assignment-panel', 'ritual-panel', 'quest-panel', 'ending-panel'];
const STORY_STORAGE_KEY = 'mengmeng-story-v2-draft';

const state = {
  guide: GUIDES[Math.floor(Math.random() * GUIDES.length)],
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
  busy: false,
};

let activeAudio = null;
let activeRecognition = null;
let activePcmCapture = null;
let toastTimer = 0;

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
  for (const button of document.querySelectorAll('#interview-panel button, #answer-form button')) button.disabled = busy;
  $('answer-input').disabled = busy;
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
    if (this.face) this.face.dispose();
    if (this.holder) this.scene.remove(this.holder);

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

    this.face = buildCharacter(recipe);
    this.holder = new THREE.Group();
    this.face.group.position.y = this.face.F.B.floorY / U;
    this.holder.add(this.face.group);
    const scale = (2.15 / 1.4) * (.58 / (this.face.F.s / U));
    this.holder.scale.setScalar(scale * 1.42);
    this.holder.position.set(0, -1.15, 0);
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
    setTimeout(() => this.animator?.setFace('idle'), 1400);
  }

  tick() {
    requestAnimationFrame(this.tick);
    const dt = Math.min(.04, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;
    this.animator?.update(elapsed, dt);
    this.renderer.render(this.scene, this.camera);
  }
}

const petRenderer = new PetRenderer($('pet-canvas'));

function stopAudio() {
  if (!activeAudio) return;
  activeAudio.pause();
  activeAudio.src = '';
  activeAudio = null;
  petRenderer.setTalking(false);
}

async function playTts(text, voice, { pet = false } = {}) {
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
    await new Promise(resolve => {
      const finish = () => {
        if (activeAudio === audio) activeAudio = null;
        if (pet) petRenderer.setTalking(false);
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
      const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const joined = new Float32Array(total);
      let offset = 0;
      for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
      const ratio = sourceRate / 16000;
      const pcm = new Int16Array(Math.floor(joined.length / ratio));
      for (let index = 0; index < pcm.length; index++) {
        const sample = Math.max(-1, Math.min(1, joined[Math.floor(index * ratio)] || 0));
        pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      return new Uint8Array(pcm.buffer);
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

async function doubaoTranscript(pcm, input, status) {
  if (!pcm || pcm.length < 1600) return false;
  status.textContent = '豆包正在确认刚才听到的这句话';
  try {
    const response = await fetch('/api/asr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pcm: bytesToBase64(pcm) }),
    });
    if (!response.ok) throw new Error('asr unavailable');
    const result = await response.json();
    const transcript = String(result.transcript || '').trim().slice(0, Number(input.maxLength) || 180);
    if (!transcript) throw new Error('empty transcript');
    input.value = transcript;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.documentElement.dataset.asrSource = 'doubao';
    status.textContent = '豆包听见了，可以再改一改，或者直接告诉它。';
    return true;
  } catch {
    document.documentElement.dataset.asrSource = input.value.trim() ? 'browser-fallback' : 'unavailable';
    status.textContent = input.value.trim() ? '已经听见了，也可以在文字里再改一改。' : '这次没有听清，可以再试一次或改用打字。';
    return false;
  }
}

async function listenInto(input, status, button) {
  if (activeRecognition) {
    status.textContent = '正在收好这句话，请稍等一下';
    try { activeRecognition.stop(); } catch { /* already stopped */ }
    return;
  }
  stopAudio();
  const Recognition = recognitionConstructor();
  if (!Recognition) {
    status.textContent = '这个浏览器暂时不能直接识别语音，可以在旁边打字。';
    input.focus();
    document.documentElement.dataset.asrSource = 'unavailable';
    return;
  }

  const recognition = new Recognition();
  const buttonLabel = button.querySelector('b');
  const idleLabel = buttonLabel?.textContent || '';
  activeRecognition = recognition;
  recognition.lang = 'zh-CN';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  let denied = false;
  let capture = null;
  try {
    capture = await startPcmCapture();
    activePcmCapture = capture;
  } catch {
    denied = true;
  }
  if (denied) {
    activeRecognition = null;
    status.textContent = '没有获得麦克风许可，可以改用打字。';
    return;
  }
  button.setAttribute('aria-pressed', 'true');
  if (buttonLabel) buttonLabel.textContent = '再按一下说完';
  status.textContent = '正在听，你可以慢慢说；再按一下就会收好这句话';
  document.documentElement.dataset.asrSource = 'browser-live';

  recognition.onresult = event => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
    input.value = transcript.trim().slice(0, Number(input.maxLength) || 180);
    status.textContent = event.results[event.results.length - 1].isFinal ? '听见了，可以再改一改，或者直接告诉它。' : `正在听：${input.value}`;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  recognition.onerror = event => {
    denied = event.error === 'not-allowed' || event.error === 'service-not-allowed';
    status.textContent = denied ? '没有获得麦克风许可，可以改用打字。' : '这次没有听清，可以再试一次或改用打字。';
  };
  recognition.onend = async () => {
    button.setAttribute('aria-pressed', 'false');
    if (buttonLabel) buttonLabel.textContent = idleLabel;
    if (activeRecognition === recognition) activeRecognition = null;
    if (activePcmCapture === capture) activePcmCapture = null;
    const pcm = await capture?.stop().catch(() => null);
    if (!denied && pcm) await doubaoTranscript(pcm, input, status);
    else if (!input.value.trim() && status.textContent.startsWith('正在')) status.textContent = '没有听到完整的一句，可以再试一次。';
  };
  try { recognition.start(); } catch {
    activeRecognition = null;
    if (activePcmCapture === capture) activePcmCapture = null;
    await capture?.stop().catch(() => null);
    if (buttonLabel) buttonLabel.textContent = idleLabel;
    status.textContent = '麦克风还在准备，请等一下再试。';
  }
}

function fallbackTurn(question, answer) {
  const value = String(answer);
  const species = /一起|伙伴|热闹|跑|玩/.test(value) ? 'dog' : /安静|慢|看看|听/.test(value) ? 'cat' : 'human';
  const palette = /星|月|太空|夜/.test(value) ? 'moon' : /海|水|雨|蓝/.test(value) ? 'sky' : /花|暖|红|太阳/.test(value) ? 'coral' : 'moss';
  const feature = /听|安静|声音/.test(value) ? 'listening-ears' : /看|观察|发现/.test(value) ? 'bright-eyes' : /一起|朋友|陪/.test(value) ? 'soft-tail' : 'star-freckles';
  return {
    reaction: `我记住了“${value.slice(0, 18)}”。它会变成小伙伴身上的一个秘密。`,
    heard: value.slice(0, 12),
    profileValue: value.slice(0, 18),
    questionId: question.id,
    petHint: { species, palette, feature },
    privacyRedirect: false,
  };
}

async function understandAnswer(question, answer) {
  try {
    const response = await fetch('/api/story-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: question.id, question: question.question, answer }),
    });
    if (!response.ok) throw new Error('story turn unavailable');
    document.documentElement.dataset.storyAi = 'doubao';
    return response.json();
  } catch {
    document.documentElement.dataset.storyAi = 'deterministic-fallback';
    toast('图鉴员的远程耳朵暂时没连上，但你的回答仍然会改变小宠物。');
    return fallbackTurn(question, answer);
  }
}

function renderGuide() {
  $('guide-avatar').textContent = state.guide.mark;
  $('guide-name').textContent = state.guide.name;
  $('guide-manner').textContent = state.guide.manner;
}

function renderQuestion() {
  const question = INTERVIEW_QUESTIONS[state.questionIndex];
  $('question-count').textContent = `${state.questionIndex + 1} / ${INTERVIEW_QUESTIONS.length}`;
  $('interview-question').textContent = question.question;
  $('question-hint').textContent = question.hint;
  $('guide-reaction').textContent = '';
  $('answer-input').value = '';
  $('speech-status').textContent = '还没有开始听';
  const quick = $('quick-answers');
  quick.replaceChildren(...question.quick.map(label => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => submitInterviewAnswer(label));
    return button;
  }));
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
  await playTts(`${state.guide.hello}${INTERVIEW_QUESTIONS[0].question}`, state.guide.voice);
}

async function submitInterviewAnswer(raw) {
  if (state.busy) return;
  const answer = String(raw || '').trim().replace(/[<>]/g, '').slice(0, 180);
  if (!answer) {
    $('speech-status').textContent = '先说一点点，或者点一个你喜欢的回答。';
    $('answer-input').focus();
    return;
  }
  stopRecognition();
  trackAnalytics('echo_interview_answer', { depth: 2 + state.questionIndex });
  setBusy(true);
  $('speech-status').textContent = '豆包正在理解你刚才说的内容';
  const question = INTERVIEW_QUESTIONS[state.questionIndex];
  const result = await understandAnswer(question, answer);
  state.profile[question.id] = result.profileValue;
  if (result.heard) state.heard.push(result.heard);
  if (result.petHint) state.petHints.push(result.petHint);
  $('guide-reaction').textContent = result.reaction;
  renderHeardNotes();
  $('speech-status').textContent = result.privacyRedirect ? '这部分不会被记进小宠物配方。' : '已经记进这次的小宠物配方。';
  await playTts(result.reaction, state.guide.voice);
  state.questionIndex++;
  setBusy(false);
  if (state.questionIndex >= INTERVIEW_QUESTIONS.length) finishInterview();
  else {
    renderQuestion();
    await playTts(INTERVIEW_QUESTIONS[state.questionIndex].question, state.guide.voice);
  }
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

function finishInterview() {
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
  $('assignment-copy').textContent = `${state.guide.name}把刚才听见的偏好折进一张小小签领页。纸上出现了${petDescription(state.pet)}。`;
  $('pet-reasons').replaceChildren(...state.heard.map(note => {
    const chip = document.createElement('span');
    chip.textContent = note;
    return chip;
  }));
  showPanel('assignment-panel', 'assignment');
  petRenderer.react('listen');
}

function pickPetVoice() {
  const preferred = state.pet?.feature === 'listening-ears' ? 'moss' : state.pet?.species === 'dog' ? 'bubble' : 'star';
  return preferred === state.guide.voice ? 'star' : preferred;
}

function updateRitualReady() {
  const ready = $('pet-name-input').value.trim() && $('first-hello-input').value.trim();
  $('wake-pet').disabled = !ready || state.busy;
}

async function wakePet() {
  if (state.busy) return;
  const name = $('pet-name-input').value.trim().replace(/[<>]/g, '').slice(0, 8);
  const hello = $('first-hello-input').value.trim().replace(/[<>]/g, '').slice(0, 80);
  if (!name || !hello) return;
  state.busy = true;
  trackAnalytics('echo_pet_wake', { depth: 7 });
  state.petName = name;
  state.petVoice = pickPetVoice();
  $('wake-pet').disabled = true;
  const seals = [...document.querySelectorAll('[data-seal]')];
  const lines = [`名字写好了。${name}知道你在叫它。`, '它听见了你的第一句问候。', '现在，把自己的声音还给它。'];
  for (let i = 0; i < seals.length; i++) {
    seals[i].classList.add('active');
    $('ritual-status').textContent = lines[i];
    petRenderer.react(i === 1 ? 'listen' : 'happy');
    await delay(520);
  }
  const reply = `我听见你了。我叫${name}。我的声音还很小，不过我想和你一起去找不见了的回声。`;
  showPetThought(reply);
  await playTts(reply, state.petVoice, { pet: true });
  state.busy = false;
  await delay(260);
  startQuest();
}

function showPetThought(text, duration = 5200) {
  const thought = $('pet-thought');
  thought.textContent = text;
  thought.hidden = false;
  clearTimeout(showPetThought.timer);
  showPetThought.timer = setTimeout(() => { thought.hidden = true; }, duration);
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
  action();
  await delay(460);
  transition.classList.remove('play');
}

function startQuest() {
  $('chapter-progress').hidden = false;
  $('backpack-button').hidden = false;
  state.sceneIndex = 0;
  playTransition(() => renderScene(SCENES[0]));
}

function renderScene(scene) {
  document.body.dataset.place = scene.place;
  showPanel('quest-panel', 'quest');
  const chapter = CHAPTERS.find(item => item.number === scene.chapter);
  updateChapterProgress(scene.chapter);
  $('chapter-label').textContent = `第${['一', '二', '三'][scene.chapter - 1]}章 ${chapter.title}`;
  $('scene-title').textContent = scene.name;
  $('scene-objective').textContent = scene.objective;
  $('entrance-line').textContent = scene.entranceLine;
  $('dialogue-speaker').textContent = scene.npc.name;
  $('scene-dialogue').textContent = scene.dialogue;
  $('choice-result').hidden = true;

  const npc = $('npc-wrap');
  npc.hidden = true;
  npc.className = 'npc-wrap';
  $('npc-mark').textContent = scene.npc.mark;
  $('npc-name').textContent = scene.npc.name;
  setTimeout(() => {
    npc.classList.add(`enter-${scene.npc.entrance}`);
    npc.hidden = false;
  }, 240);

  $('scene-choices').replaceChildren(...scene.choices.map(choice => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = choice.label;
    button.addEventListener('click', () => chooseSceneOption(scene, choice));
    return button;
  }));
  petRenderer.react(scene.chapter === 3 ? 'brave' : 'idle');
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
}

function useItem(id) {
  const entry = inventoryEntry(id);
  if (entry) entry.used = true;
  updateBackpack();
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

async function chooseSceneOption(scene, choice) {
  if (state.busy) return;
  state.busy = true;
  trackAnalytics('echo_scene_choice', { depth: 8 + state.sceneIndex });
  state.choices.push({ scene: scene.id, choice: choice.id, trait: choice.trait });
  for (const button of $('scene-choices').querySelectorAll('button')) button.disabled = true;
  $('result-copy').textContent = choice.result;
  $('choice-result').hidden = false;
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
  playTts(scene.petLine, state.petVoice, { pet: true });
  $('continue-scene').textContent = scene.final ? '看看灯塔记住了什么' : '继续往前走';
  state.busy = false;
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

function finishStory() {
  trackAnalytics('echo_complete', { depth: 20 });
  stopAudio();
  $('npc-wrap').hidden = true;
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
  } catch {
    toast('这次没能保存，但灯塔已经在故事里亮起来了。');
  }
}

$('begin-button').addEventListener('click', beginInterview);
$('mic-button').addEventListener('click', () => listenInto($('answer-input'), $('speech-status'), $('mic-button')));
$('answer-form').addEventListener('submit', event => {
  event.preventDefault();
  submitInterviewAnswer($('answer-input').value);
});
$('accept-pet').addEventListener('click', () => {
  showPanel('ritual-panel', 'ritual');
  petRenderer.react('happy');
});
$('pet-name-input').addEventListener('input', updateRitualReady);
$('first-hello-input').addEventListener('input', updateRitualReady);
$('ritual-mic').addEventListener('click', () => listenInto($('first-hello-input'), $('ritual-status'), $('ritual-mic')));
$('wake-pet').addEventListener('click', wakePet);
$('continue-scene').addEventListener('click', () => {
  if (state.busy) return;
  const scene = SCENES[state.sceneIndex];
  if (scene.final) {
    playTransition(finishStory);
    return;
  }
  state.sceneIndex++;
  playTransition(() => renderScene(SCENES[state.sceneIndex]));
});
$('backpack-button').addEventListener('click', () => $('backpack-dialog').showModal());
$('close-backpack').addEventListener('click', () => $('backpack-dialog').close());
$('backpack-dialog').addEventListener('click', event => {
  if (event.target === $('backpack-dialog')) $('backpack-dialog').close();
});
$('save-ending').addEventListener('click', saveEnding);
$('play-again').addEventListener('click', () => location.reload());
$('restart-button').addEventListener('click', () => location.reload());

paintPaperGrain();
addEventListener('resize', paintPaperGrain, { passive: true });
updateBackpack();
document.documentElement.dataset.storyReady = 'true';
window.__storyV2 = { state, ITEMS, SCENES, petRenderer, renderScene, collectItem, finishStory };
