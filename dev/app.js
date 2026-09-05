import { DioramaStage } from './stage.js';
import { CHARACTER_CATALOG } from './models.js';
import { WORLD_CATALOG } from './worlds.js';
import { STORIES, getStory } from './stories.js';
import { StoryVoice, requestJSON } from './voice.js';
import { moonRequest, sceneRequest } from './story-api.js';
import { describeInvention } from './inventions.js';
import { mountProductIcons } from '../vendor/ui-icons.js';

const $ = id => document.getElementById(id);
const STORAGE = 'jma.dev.clay.v1';
const COLORS = [
  { id: 'cream', name: '奶油白', color: '#eee3d5', hints: ['白', '奶油'] },
  { id: 'honey', name: '蜂蜜金', color: '#c99561', hints: ['黄', '金', '橙'] },
  { id: 'moss', name: '嫩叶绿', color: '#93af83', hints: ['绿', '叶', '草'] },
  { id: 'sky', name: '晴空蓝', color: '#90b6c5', hints: ['蓝', '天空', '海'] },
  { id: 'rose', name: '桃花粉', color: '#d7a9a5', hints: ['粉', '红', '桃'] },
];
const EXPRESSIONS = { happy: '开心', curious: '好奇', sad: '有点难过', surprised: '惊喜' };
const ACTIONS = { idle: '放松', wave: '打招呼', hop: '跳一跳', listen: '认真听', talk: '说句话', walk: '迈小步' };
let stage, story, state, phase = 'home', epoch = 0, busy = false, pendingChoices = [], setupStep = 0;
let shownChoices = false, shownText = false, noticeTimer;
let studio = { type: 'dog', color: '#c99561', name: '小团', size: 100, expression: 'happy', action: 'idle', world: 'orchard' };

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(`${STORAGE}.${key}`)) ?? fallback; } catch { return fallback; }
}
function store(key, value) {
  try { localStorage.setItem(`${STORAGE}.${key}`, JSON.stringify(value)); return true; }
  catch { notify('这台设备暂时无法保存，仍然可以继续玩。'); return false; }
}
function notify(message) {
  $('notice').textContent = message; $('notice').dataset.visible = 'true';
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('notice').dataset.visible = 'false'; }, 4200);
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const defaultState = () => ({ sceneIndex: 0, setupDone: false, companion: { type: 'rabbit', color: '#eee3d5', name: '小团' }, inventory: [], inventions: [], completed: false });
function savedState() {
  const saved = readStorage(`story.${story.id}`, null);
  if (!saved || !Number.isInteger(saved.sceneIndex) || saved.sceneIndex < 0 || saved.sceneIndex >= story.scenes.length || !Array.isArray(saved.inventory) || !Array.isArray(saved.inventions)) return null;
  const type = CHARACTER_CATALOG.some(item => item.id === saved.companion?.type) ? saved.companion.type : 'rabbit';
  return { ...defaultState(), ...saved, companion: { type, color: /^#[0-9a-f]{6}$/i.test(saved.companion?.color) ? saved.companion.color : '#eee3d5', name: String(saved.companion?.name || '小团').slice(0, 10), manner: saved.companion?.manner === 'lively' ? 'lively' : 'calm' } };
}
function persist() { store(`story.${story.id}`, state); }
const voice = new StoryVoice({
  onState(value) {
    $('mic-button').dataset.state = value;
    $('mic-button').setAttribute('aria-pressed', String(Boolean(voice.enabled || voice.opening)));
    const labels = { requesting: '正在打开', listening: '我在听', thinking: '想一想', speaking: '听它说', off: voice.enabled ? '继续说说' : '和它说说' };
    $('mic-label').textContent = labels[value] || labels.off;
    $('mic-button').setAttribute('aria-label', voice.enabled || voice.opening ? '暂停麦克风' : '打开麦克风回答');
  },
  onAnswer: text => handleAnswer(text),
  onLevel: level => $('mic-button').style.setProperty('--level', level.toFixed(2)),
  onError: message => { notify(message); if (['question', 'setup'].includes(phase)) { shownChoices = true; renderAnswerOptions(); } },
});

function speakerInfo(id) {
  if (id === 'companion') return { id, name: state?.companion?.name || '小团', voice: 'bubble' };
  return story?.scenes[state.sceneIndex]?.cast.find(actor => actor.id === id) || { id: 'guide', name: '河湾', voice: 'moss' };
}

async function speakLine(line, token = epoch) {
  if (token !== epoch) return;
  const info = speakerInfo(line.speaker);
  $('speaker').textContent = info.name;
  $('speech-text').textContent = line.text;
  $('speech-card').dataset.speaking = 'true';
  stage.speak(line.speaker, true);
  await voice.say(line.text, info.voice);
  if (token === epoch) {
    $('speech-card').dataset.speaking = 'false'; stage.speak(line.speaker, false);
  }
}

async function dialogue(lines, token = epoch) {
  for (const line of lines) { if (token !== epoch) return; await speakLine(line, token); }
}

function showView(view) {
  document.body.dataset.view = view;
  $('home-panel').hidden = view !== 'home';
  $('story-panel').hidden = view !== 'story';
  $('studio-panel').hidden = view !== 'studio';
  $('scene-caption').hidden = view !== 'story';
  $('restart').hidden = view !== 'story';
  $('original-link').hidden = view !== 'home';
  $('stage-hint').hidden = view === 'story';
  $('camera-reset').hidden = view === 'home';
  $('ending').hidden = true;
  $('speech-card').hidden = false;
  $('story-topline')?.removeAttribute('hidden');
  requestAnimationFrame(() => stage.resize());
}

function route() {
  epoch++; voice.stop(); busy = false; shownChoices = shownText = false;
  $('transition').classList.remove('closed');
  if ($('bag-dialog').open) $('bag-dialog').close();
  const params = new URLSearchParams(location.search);
  if (params.get('mode') === 'studio') { openStudio(); return; }
  const id = params.get('story');
  if (id && STORIES.some(item => item.id === id)) { openStory(getStory(id)); return; }
  phase = 'home'; story = null; showView('home');
  stage.setScene('orchard', [{ id: 'dog', type: 'dog', name: '豆豆' }, { id: 'rabbit', type: 'rabbit', name: '雪团' }, { id: 'frog', type: 'frog', name: '小荷' }]);
  document.title = '萌萌星 · 立体故事工坊';
}

function navigate(url) { history.pushState(null, '', url); route(); scrollTo({ top: 0, behavior: 'instant' }); }

function openStory(selected) {
  story = selected; state = savedState() || defaultState(); phase = 'ready';
  showView('story');
  document.title = `${story.title} · 萌萌星`;
  $('scene-title').textContent = story.title;
  $('chapter-name').textContent = story.age || '';
  $('objective').textContent = story.subtitle;
  $('speaker').textContent = story.scenes[0].cast[0].name;
  $('speech-text').textContent = story.premise || story.subtitle;
  $('speech-card').dataset.speaking = 'false';
  $('answer-dock').hidden = true; $('story-start').hidden = false;
  $('resume-note').textContent = state.setupDone && !state.completed ? '上次走到的地方还在，继续一起走。' : '说出你的想法，也可以随时点选。';
  $('start-story').textContent = state.setupDone && !state.completed ? '继续故事' : '开始对话';
  stage.setScene(story.scenes[state.sceneIndex].world, [...story.scenes[state.sceneIndex].cast, { ...state.companion, id: 'companion' }]);
  if (state.inventions.length) stage.showInvention(state.inventions.at(-1).visual);
  updateBag();
}

const SETUP = [
  { question: '选个伙伴吧。小兔、小狗，还是小猫？', choices: [
    { id: 'rabbit', label: '长耳朵小兔', hints: ['兔', '长耳朵'] }, { id: 'dog', label: '垂耳朵小狗', hints: ['狗', '豆豆'] }, { id: 'cat', label: '卷尾巴小猫', hints: ['猫', '卷尾'] },
  ] },
  { question: '你想让伙伴穿上什么颜色？', choices: COLORS.map(item => ({ id: item.id, label: item.name, hints: item.hints })) },
  { question: '你喜欢它安静陪着，还是一起蹦蹦跳跳？', choices: [
    { id: 'calm', label: '安静陪着我', hints: ['安静', '陪', '慢', '听'] }, { id: 'lively', label: '一起蹦蹦跳跳', hints: ['跳', '跑', '活泼', '玩'] },
  ] },
];

async function startStory() {
  if (phase !== 'ready' || busy) return;
  void voice.unlock(); $('story-start').hidden = true;
  if (state.completed) state = defaultState();
  if (!state.setupDone && story.onboarding === 'direct') {
    state.companion = { type: story.companion, color: story.color, name: story.companionName, manner: 'calm' };
    state.setupDone = true;
  }
  if (state.setupDone) await enterScene(state.sceneIndex);
  else { setupStep = 0; await setupQuestion(); }
}

async function setupQuestion() {
  phase = 'narrating'; busy = true; $('answer-dock').hidden = true;
  $('chapter-name').textContent = '认识今天的小伙伴';
  $('scene-title').textContent = story.title;
  $('objective').textContent = '三个小选择，一位新朋友。';
  stage.setScene('cove', [{ id: 'guide', type: 'otter', name: '河湾' }, { id: 'companion', ...state.companion }]);
  const token = epoch;
  await speakLine({ speaker: 'guide', text: SETUP[setupStep].question }, token);
  if (token !== epoch) return;
  phase = 'setup'; busy = false; pendingChoices = SETUP[setupStep].choices;
  renderAnswerOptions(); voice.listen(true);
}

function renderAnswerOptions() {
  $('answer-dock').hidden = !['question', 'setup'].includes(phase);
  $('choices').replaceChildren();
  pendingChoices.forEach(choice => {
    const button = document.createElement('button'); button.className = 'choice-button';
    button.dataset.choice = choice.id; button.textContent = choice.label;
    button.addEventListener('click', () => choose(choice)); $('choices').append(button);
  });
  $('choices').hidden = !shownChoices;
  $('show-choices').setAttribute('aria-expanded', String(shownChoices));
  $('text-form').hidden = !shownText;
  $('show-text').setAttribute('aria-expanded', String(shownText));
  $('show-choices').textContent = story?.id === 'moon' && phase === 'question' ? '找点灵感' : '看看办法';
  $('answer-input').placeholder = story?.id === 'moon' && phase === 'question' ? '你想造或改什么？' : '把你的想法写在这里';
}

async function choose(choice, customResult) {
  if (busy || !['question', 'setup'].includes(phase)) return;
  void voice.unlock();
  const wasSetup = phase === 'setup', token = epoch;
  busy = true; phase = 'responding'; voice.listen(false); $('answer-dock').hidden = true;
  $('heard').hidden = true;
  if (wasSetup) {
    let response;
    if (setupStep === 0) { state.companion.type = choice.id; response = `好，${choice.label}来陪你。`; }
    if (setupStep === 1) { state.companion.color = COLORS.find(color => color.id === choice.id).color; response = `穿上${choice.label}，一眼就认出它。`; }
    if (setupStep === 2) { state.companion.manner = choice.id; response = choice.id === 'calm' ? '我会慢慢陪着你，听你说完。' : '我们一起试一试，也可以停下来休息。'; }
    stage.setScene('cove', [{ id: 'guide', type: 'otter', name: '河湾' }, { id: 'companion', ...state.companion }]);
    stage.act('celebrate');
    await speakLine({ speaker: 'companion', text: response }, token);
    if (token !== epoch) return;
    setupStep++;
    if (setupStep < SETUP.length) await setupQuestion();
    else { state.setupDone = true; persist(); await enterScene(0); }
    return;
  }
  const scene = story.scenes[state.sceneIndex];
  if (scene.freeInput && !customResult && !scene.final) rememberInvention(choice.label);
  if (choice.reward && !state.inventory.some(item => item.id === choice.reward.id)) state.inventory.push(choice.reward);
  updateBag(); stage.act(choice.action || 'celebrate', choice.expression || 'happy');
  await speakLine({ speaker: choice.speaker || scene.cast[0].id, text: customResult || choice.result }, token);
  if (token !== epoch) return;
  await dialogue(scene.closing, token);
  if (token !== epoch) return;
  if (scene.final || state.sceneIndex === story.scenes.length - 1) await finishStory();
  else await enterScene(state.sceneIndex + 1);
}

async function enterScene(index) {
  const token = epoch;
  busy = true; phase = 'transition'; voice.listen(false); $('answer-dock').hidden = true;
  $('transition').classList.add('closed'); await wait(matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 540);
  if (token !== epoch) return;
  state.sceneIndex = index; persist();
  const scene = story.scenes[index];
  stage.setScene(scene.world, [...scene.cast, { ...state.companion, id: 'companion' }]);
  if (state.inventions.length) stage.showInvention(state.inventions.at(-1).visual);
  $('scene-title').textContent = scene.title;
  const chapter = story.chapters.find(item => item.number === scene.chapter);
  $('chapter-name').textContent = `第${['一', '二', '三'][scene.chapter - 1]}章 · ${chapter?.title || ''}`;
  $('objective').textContent = scene.objective;
  $('speech-text').textContent = ''; $('speaker').textContent = '';
  $('transition').classList.remove('closed');
  await wait(matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 480);
  if (token !== epoch) return;
  phase = 'narrating'; await dialogue(scene.dialogue, token);
  if (token !== epoch) return;
  await speakLine({ speaker: scene.cast[0].id, text: scene.question }, token);
  if (token !== epoch) return;
  phase = 'question'; busy = false; pendingChoices = scene.choices;
  $('answer-input').value = ''; renderAnswerOptions(); voice.listen(true);
}

function matchChoice(text, choices) {
  let best = null, score = 0;
  for (const choice of choices) {
    const next = [choice.label, ...(choice.hints || [])].reduce((sum, hint) => sum + (text.includes(hint) ? hint.length : 0), 0);
    if (next > score) { score = next; best = choice; }
  }
  return best;
}

function fallbackInvention(text) {
  return describeInvention(text, state.inventions.at(-1)?.visual, story.scenes[state.sceneIndex].world);
}

function rememberInvention(text, visual) {
  const result = visual || fallbackInvention(text);
  state.inventions.push({ scene: story.scenes[state.sceneIndex].title, visual: result });
  state.inventions = state.inventions.slice(-6);
  stage.showInvention(result); updateBag();
  return result;
}

async function handleAnswer(raw) {
  if (busy || !['question', 'setup'].includes(phase)) return;
  const text = String(raw || '').trim().slice(0, 180);
  if (!text) return;
  if (/\d{7,}|身份证|我住在|我的学校|我家地址|手机号码/.test(text)) { notify('这些不用告诉我。说说你想怎样帮伙伴吧。'); return; }
  if (/^(嗯+|啊+|哦+|等一下|不知道|我想想|没想好)[。！!]*$/.test(text)) { notify('我会等你，想好了再慢慢说。'); return; }
  $('heard').textContent = `听见了：${text}`; $('heard').hidden = false;
  if (phase === 'setup') {
    const choice = matchChoice(text, pendingChoices);
    if (choice) await choose(choice);
    else { shownChoices = true; renderAnswerOptions(); notify('也可以从下面挑一个你喜欢的。'); }
    return;
  }
  const scene = story.scenes[state.sceneIndex], token = epoch;
  busy = true; voice.listen(false); $('mic-label').textContent = '想一想';
  try {
    if (scene.freeInput) {
      let result;
      if (scene.final) result = { shouldRespond: true, outcome: scene.inventionResult };
      else {
        try {
          result = await requestJSON('/api/moon-director', moonRequest(scene, state.inventions, text));
        } catch { result = { shouldRespond: true, outcome: scene.inventionResult, visual: fallbackInvention(text) }; }
      }
      if (token !== epoch) return;
      if (!result.shouldRespond || result.privacyRedirect) { notify(result.listeningPrompt || '再说说你想造什么。'); return; }
      if (!scene.final) {
        const visual = describeInvention(text, state.inventions.at(-1)?.visual, scene.world, result.visual);
        rememberInvention(text, visual);
      }
      busy = false;
      await choose({ speaker: scene.inventionSpeaker, result: scene.inventionResult, action: scene.inventionAction, expression: scene.inventionExpression, reward: scene.inventionReward }, String(result.outcome || scene.inventionResult).slice(0, 90));
    } else {
      let result;
      const local = matchChoice(text, scene.choices);
      if (local) result = { shouldRespond: true, choiceId: local.id };
      else {
        try { result = await requestJSON('/api/story-turn', sceneRequest(scene, text)); }
        catch { result = { shouldRespond: false }; }
      }
      if (token !== epoch) return;
      const choice = scene.choices.find(item => item.id === result.choiceId);
      if (result.shouldRespond && !result.privacyRedirect && choice) { busy = false; await choose(choice); }
      else { shownChoices = true; renderAnswerOptions(); notify(result.listeningPrompt || '再具体说说，也可以点一个办法。'); }
    }
  } finally {
    if (token === epoch && phase === 'question') { busy = false; voice.listen(true); }
  }
}

async function finishStory() {
  const token = epoch;
  phase = 'complete'; busy = false; voice.listen(false); state.completed = true; persist();
  stage.act('celebrate'); $('answer-dock').hidden = true; $('story-start').hidden = true; $('speech-card').hidden = true;
  $('ending').hidden = false; $('ending-title').textContent = story.ending.title;
  $('ending-text').textContent = story.ending.text; $('ending-line').textContent = story.ending.companionLine;
  $('save-memory').textContent = '收进我的图鉴'; $('save-memory').disabled = false;
  await voice.say(story.ending.companionLine, 'bubble', () => stage.speak('companion', true));
  if (token === epoch) stage.speak('companion', false);
}

function updateBag() {
  $('bag-count').textContent = String((state?.inventory.length || 0) + (state?.inventions.length || 0));
}
function openBag() {
  const content = $('bag-content'); content.replaceChildren();
  const items = [...state.inventory, ...state.inventions.map(item => ({ name: item.visual.name, description: `${item.scene}：${item.visual.details || '一路带着的小发明'}` }))];
  if (!items.length) { const p = document.createElement('p'); p.textContent = '还没有小道具。沿路遇到的礼物会收在这里。'; content.append(p); }
  items.forEach(item => {
    const section = document.createElement('section'); section.className = 'bag-item';
    const h = document.createElement('h3'); h.textContent = item.name;
    const p = document.createElement('p'); p.textContent = item.description;
    section.append(h, p); content.append(section);
  });
  voice.listen(false); $('bag-dialog').showModal();
}

function updateStudio() {
  const actor = stage.actors.get('studio');
  actor?.setColor(studio.color); actor?.setExpression(studio.expression); actor?.setAction(studio.action);
  actor?.group.scale.setScalar(1.3 * studio.size / 100);
  $('size-output').textContent = `${studio.size}%`;
  $('character-name').value = studio.name;
  $('character-size').value = studio.size;
  document.querySelectorAll('[data-type]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.type === studio.type)));
  document.querySelectorAll('[data-color]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === studio.color)));
  document.querySelectorAll('[data-expression]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.expression === studio.expression)));
  document.querySelectorAll('[data-action]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.action === studio.action)));
  document.querySelectorAll('[data-world]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.world === studio.world)));
}
function rebuildStudio() { stage.setScene(studio.world, [{ id: 'studio', type: studio.type, name: studio.name, color: studio.color }], { studio: true }); updateStudio(); }
function openStudio() {
  phase = 'studio'; showView('studio'); document.title = '角色模拟器 · 萌萌星';
  rebuildStudio(); renderSaved();
}
function renderSaved() {
  $('saved-characters').replaceChildren();
  const saved = readStorage('characters', []);
  if (!Array.isArray(saved)) return;
  saved.slice(-5).reverse().forEach(item => {
    if (!CHARACTER_CATALOG.some(type => type.id === item.type)) return;
    const button = document.createElement('button'); button.className = 'saved-character';
    button.textContent = `${String(item.name || '小团').slice(0, 10)} · ${CHARACTER_CATALOG.find(type => type.id === item.type).name}`;
    const hint = document.createElement('span'); hint.textContent = '继续编辑'; button.append(hint);
    button.onclick = () => { studio = { ...studio, ...item, size: Math.max(75, Math.min(125, Number(item.size) || 100)), world: WORLD_CATALOG.some(world => world.id === item.world) ? item.world : 'orchard' }; rebuildStudio(); notify('伙伴回来了。'); };
    $('saved-characters').append(button);
  });
}

function download(data, filename, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function initializeControls() {
  STORIES.forEach(item => {
    const link = document.createElement('a'); link.className = 'story-link'; link.href = `?story=${item.id}`;
    const title = document.createElement('strong'); title.textContent = item.title;
    const subtitle = document.createElement('small'); subtitle.textContent = `${item.age} · ${item.subtitle}`;
    const arrow = document.createElement('b'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    link.append(title, subtitle, arrow); $('story-list').append(link);
    link.onmouseenter = () => { if (phase === 'home') stage.setScene(item.scenes[0].world, item.scenes[0].cast); };
  });
  CHARACTER_CATALOG.forEach(item => {
    const button = document.createElement('button'); button.className = 'type-button'; button.dataset.type = item.id; button.textContent = item.name;
    button.title = item.description; button.onclick = () => { studio.type = item.id; studio.color = item.color; rebuildStudio(); }; $('character-types').append(button);
  });
  COLORS.forEach(item => {
    const button = document.createElement('button'); button.className = 'color-swatch'; button.dataset.color = item.color; button.style.background = item.color;
    button.setAttribute('aria-label', item.name); button.onclick = () => { studio.color = item.color; updateStudio(); }; $('color-swatches').append(button);
  });
  for (const [container, items, dataKey] of [['expressions', EXPRESSIONS, 'expression'], ['actions', ACTIONS, 'action']]) Object.entries(items).forEach(([id, label]) => {
    const button = document.createElement('button'); button.dataset[dataKey] = id; button.textContent = label;
    button.onclick = () => { studio[dataKey] = id; updateStudio(); }; $(container).append(button);
  });
  WORLD_CATALOG.forEach(item => {
    const button = document.createElement('button'); button.dataset.world = item.id; button.textContent = item.name;
    button.onclick = () => { studio.world = item.id; rebuildStudio(); }; $('world-options').append(button);
  });
  document.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => {
    document.querySelectorAll('[data-tab]').forEach(tab => { tab.setAttribute('aria-selected', String(tab === button)); $(`${tab.dataset.tab}-controls`).hidden = tab !== button; });
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || link.id === 'original-link') return;
    const url = new URL(link.href);
    if (url.origin === location.origin && url.pathname === location.pathname) { event.preventDefault(); navigate(url); }
  });
  $('start-story').onclick = startStory;
  $('restart').onclick = () => { epoch++; voice.stop(); state = defaultState(); persist(); openStory(story); };
  $('camera-reset').onclick = () => stage.resetCamera();
  $('speech-card').onclick = () => voice.skip();
  $('mic-button').onclick = async () => {
    if (voice.enabled || voice.opening) { voice.pause(); return; }
    if (!['question', 'setup'].includes(phase) || busy) return;
    voice.listen(true); await voice.enable();
  };
  $('show-choices').onclick = () => { shownChoices = !shownChoices; renderAnswerOptions(); };
  $('show-text').onclick = () => { shownText = !shownText; renderAnswerOptions(); if (shownText) $('answer-input').focus(); };
  $('text-form').onsubmit = event => { event.preventDefault(); void handleAnswer($('answer-input').value); };
  $('bag-button').onclick = openBag;
  $('close-bag').onclick = () => $('bag-dialog').close();
  $('bag-dialog').addEventListener('close', () => voice.listen(['question', 'setup'].includes(phase)));
  $('save-memory').onclick = () => {
    const memories = readStorage('memories', []);
    if (store('memories', [...(Array.isArray(memories) ? memories : []), { story: story.id, title: story.title, date: new Date().toISOString(), companion: state.companion, inventory: state.inventory, inventions: state.inventions }].slice(-20))) {
      $('save-memory').textContent = '已经收好啦'; $('save-memory').disabled = true; notify('这段旅行已经收进这台设备的图鉴。');
    }
  };
  $('character-name').oninput = event => { studio.name = event.target.value.trim().slice(0, 10) || '小团'; };
  $('character-size').oninput = event => { studio.size = Number(event.target.value); updateStudio(); };
  $('save-character').onclick = () => {
    const saved = readStorage('characters', []);
    if (store('characters', [...(Array.isArray(saved) ? saved : []).filter(item => item.name !== studio.name), studio].slice(-8))) { renderSaved(); notify('伙伴已经保存，下次还在这里。'); }
  };
  $('download-character').onclick = () => {
    const model = stage.actors.get('studio').group.toJSON();
    model.object.userData = { ...model.object.userData, creator: '萌萌星立体故事工坊', recipe: { ...studio } };
    download(JSON.stringify(model), `${studio.name.replace(/[^\p{L}\p{N}_-]/gu, '') || '小团'}-3D模型.json`);
    notify('实体模型已导出，可用 Three.js ObjectLoader 打开。');
  };
  $('preview-voice').onclick = async () => {
    if (busy) { voice.skip(); return; }
    const token = epoch;
    busy = true; void voice.unlock(); stage.actors.get('studio').setAction('talk');
    await voice.say(`你好，我是${studio.name}。今天想一起去哪里？`, 'bubble');
    if (token !== epoch) return;
    busy = false; updateStudio();
  };
  addEventListener('popstate', route);
  addEventListener('pagehide', () => voice.stop());
  document.addEventListener('visibilitychange', () => { if (document.hidden) voice.pause(); });
}

try {
  mountProductIcons();
  stage = new DioramaStage($('stage'), id => {
    if (phase === 'studio') notify(`${studio.name}和你打招呼啦。`);
    else if (phase === 'question') { stage.actors.get(id)?.setExpression('curious'); notify(`${speakerInfo(id).name}正在认真听。`); }
  });
  initializeControls(); route(); $('stage-loading').classList.add('is-ready');
  // Read-only diagnostics for release verification; never changes story progress.
  window.__DEV_STORY__ = { get status() { return { phase, busy, storyId: story?.id || null, sceneIndex: state?.sceneIndex, setupStep, completed: Boolean(state?.completed), inventory: state?.inventory.map(item => item.id) || [], inventions: state?.inventions.map(item => item.visual.kind) || [], studio: { ...studio }, stage: stage.stats(), voice: { enabled: voice.enabled, opening: Boolean(voice.opening), recording: voice.recording, samples: voice.samples || 0, voicedSeconds: voice.voiced || 0, contextState: voice.context?.state || 'closed' } }; } };
} catch (error) {
  console.error(error);
  $('stage-loading').querySelector('p').textContent = '这个浏览器暂时无法打开立体场景，请换一个支持 WebGL 的浏览器。';
}
