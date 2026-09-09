import { DioramaStage } from './stage.js';
import { CHARACTER_CATALOG } from './models.js';
import { WORLD_CATALOG } from './worlds.js';
import { STORIES, getStory } from './stories.js';
import { StoryVoice, requestJSON } from './voice.js';
import { moonRequest, sceneRequest } from './story-api.js';
import { describeInvention } from './inventions.js';
import { mountProductIcons } from '../vendor/ui-icons.js';
import { getNpc } from '../src/story-npcs/catalog.js';
import { localResult } from '../src/wow-local-turn.js';
import { WOW_PROPS, wowVisualState } from './wow-story.js';
import { createWowPresentation } from './wow-visuals.js';

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
let wowPresentation = null, wowRequest = null;
let stage, story, state, phase = 'home', epoch = 0, busy = false, pendingChoices = [], setupStep = 0;
let shownChoices = false, shownText = false, replyOpen = false, menuOpen = false, noticeTimer, frameRequest;
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
const defaultState = () => ({ sceneIndex: 0, setupDone: false, companion: { type: 'rabbit', color: '#eee3d5', name: '小团' }, inventory: [], inventions: [], wowEntries: [], firstWords: '', completed: false });
function savedState() {
  const saved = readStorage(`story.${story.id}`, null);
  if (!saved || !Number.isInteger(saved.sceneIndex) || saved.sceneIndex < 0 || saved.sceneIndex >= story.scenes.length || !Array.isArray(saved.inventory) || !Array.isArray(saved.inventions)) return null;
  const type = CHARACTER_CATALOG.some(item => item.id === saved.companion?.type) ? saved.companion.type : 'rabbit';
  return { ...defaultState(), ...saved, wowEntries: Array.isArray(saved.wowEntries) ? saved.wowEntries.filter(entry => story.scenes.some(scene => scene.id === entry?.id) && typeof entry.answer === 'string') : [], firstWords: String(saved.firstWords || '').slice(0,160), companion: { type, color: /^#[0-9a-f]{6}$/i.test(saved.companion?.color) ? saved.companion.color : '#eee3d5', name: String(saved.companion?.name || '小团').slice(0, 10), manner: saved.companion?.manner === 'lively' ? 'lively' : 'calm' } };
}
function persist() { store(`story.${story.id}`, state); }
function storyCast(scene) { return story?.id === 'wow' ? scene.cast : [...scene.cast, { ...state.companion, id:'companion' }]; }
function syncWowPresentation(lit = false) {
  if (story?.id !== 'wow') return;
  if (!wowPresentation) wowPresentation = createWowPresentation(stage);
  wowPresentation.set(wowVisualState(story.scenes[state.sceneIndex], state, lit));
}

async function handleWowAnswer(raw) {
  if (busy || phase !== 'question') return;
  const answer = String(raw || '').trim().slice(0, 160);
  if (!answer) return;
  const scene = story.scenes[state.sceneIndex], token = epoch;
  const payload = { chapter:scene.chapter, kind:scene.wow.kind, answer, prompt:scene.question, momo:scene.wow.momo };
  const fallback = localResult(payload);
  if (!fallback.accepted) { notify(fallback.reaction); return; }
  busy = true; phase = 'responding'; voice.listen(false); setReplyMode(null);
  $('heard').hidden = true; $('answer-dock').hidden = true;
  $('speaker').textContent = scene.cast[0].name;
  $('speech-text').textContent = scene.wow.kind === 'create' ? '你的钥匙正在一点点长出来……' : '我在认真听你说……';
  syncWowPresentation(true);
  const controller = new AbortController(); wowRequest = controller;
  let result;
  try { result = await requestJSON('/api/wow-turn', payload, 13000, controller.signal); }
  catch { if (controller.signal.aborted || token !== epoch) return; result = fallback; }
  finally { if (wowRequest === controller) wowRequest = null; }
  if (token !== epoch || controller.signal.aborted) return;
  if (typeof result?.accepted !== 'boolean' || typeof result?.reaction !== 'string') result = fallback;
  if (!result.accepted) { phase='question';busy=false;notify(result.reaction);renderAnswerOptions();resumeListening();return; }
  const shapes = ['star','moon','leaf','heart','cloud','fish'];
  const visual = {shape:shapes.includes(result.visual?.shape)?result.visual.shape:fallback.visual.shape,color:/^#[0-9a-f]{6}$/i.test(result.visual?.color || '')?result.visual.color:fallback.visual.color};
  const entry = {id:scene.id,chapter:scene.chapter,answer,reaction:result.reaction,source:result.source==='ai'?'ai':'local'};
  state.wowEntries = [...state.wowEntries.filter(item=>item.id!==scene.id),entry];
  if (!state.firstWords) state.firstWords = answer;
  if (scene.wow.kind === 'create') state.inventions = [...state.inventions.filter(item=>item.chapter!==scene.chapter),{chapter:scene.chapter,scene:scene.title,visual:{...visual,kind:'wow-key',name:`第${scene.chapter}把想象钥匙`,details:answer}}];
  if (scene.wow.kind === 'color' && !state.inventory.some(item=>item.id===`wow-color-${scene.chapter}`)) state.inventory.push({id:`wow-color-${scene.chapter}`,name:scene.wow.colorName,color:scene.wow.color,description:answer});
  persist(); updateBag(); syncWowPresentation(true); stage.actors.get('wow')?.setExpression('happy');
  await speakLine({speaker:scene.questionSpeaker || 'wow',text:entry.reaction,source:entry.source},token);
  if (token !== epoch) return;
  if (scene.final) await finishStory(); else await enterScene(state.sceneIndex+1);
}

function downloadWowMemory() {
  const escape = value => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const content = state.wowEntries.map(entry=>`<article><h2>第${entry.chapter}章 · ${escape(story.scenes.find(scene=>scene.id===entry.id)?.title||'')}</h2><blockquote>${escape(entry.answer)}</blockquote><p>${escape(entry.reaction)}</p></article>`).join('');
  download(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>我的立体哇呜旅程</title><style>body{max-width:720px;margin:40px auto;padding:20px;font:16px/1.8 system-ui;background:#fcfaf4;color:#314555}h2{font-size:18px}article{border-bottom:1px solid #ddd;padding:16px 0;break-inside:avoid}blockquote{border-left:3px solid #d7b659;padding-left:20px;margin-left:0;overflow-wrap:anywhere}</style><h1>我的立体哇呜旅程</h1><p>六位朋友，六种颜色。故事从这句话开始：</p><blockquote>${escape(state.firstWords)}</blockquote>${content}</html>`,'我的立体哇呜旅程.html','text/html;charset=utf-8');
  notify('旅程已整理好，可以打开下载的纪念册阅读或打印。');
}
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
  onError: message => { notify(message); if (['question', 'setup'].includes(phase)) setReplyMode('choices'); },
});

function resumeListening() {
  voice.listen(['question', 'setup'].includes(phase) && !busy && !menuOpen && !shownText && !$('bag-dialog').open && !document.hidden);
}

function scheduleFraming() {
  cancelAnimationFrame(frameRequest);
  frameRequest = requestAnimationFrame(() => {
    if (!stage) return;
    const visibleBottom = Math.min(innerHeight, (window.visualViewport?.height || innerHeight) + (window.visualViewport?.offsetTop || 0));
    document.body.style.setProperty('--keyboard-offset', `${Math.max(0, innerHeight - visibleBottom)}px`);
    const bounds = $('stage').getBoundingClientRect();
    if (document.body.dataset.view === 'story') {
      const top = Math.max(document.querySelector('.topbar').getBoundingClientRect().bottom, $('scene-caption').getBoundingClientRect().bottom);
      const bottom = Math.min($('story-panel').getBoundingClientRect().top, visibleBottom);
      stage.setViewportInsets?.({ top: Math.max(0, top - bounds.top + 22), bottom: Math.max(0, bounds.bottom - bottom + 20), left: 20, right: 20 });
    } else stage.setViewportInsets?.({ top: 20, bottom: document.body.dataset.view === 'studio' ? 48 : 36, left: 18, right: 18 });
  });
}

function setWorld(worldId, cast, options) {
  wowPresentation?.dispose(); wowPresentation = null;
  stage.setScene(worldId, cast, options);
  const environment = stage.world?.atmosphere;
  if (environment) {
    document.body.dataset.period = environment.period;
    for (const key of ['base', 'glow', 'horizon']) document.body.style.setProperty(`--sky-${key}`, environment[key]);
    for (const key of ['ink', 'muted', 'accent', 'paper']) document.body.style.setProperty(`--${key}`, environment[key]);
    document.querySelector('meta[name="theme-color"]').content = environment.base;
  }
  scheduleFraming();
}

function setStoryMenu(open, restoreFocus = false) {
  menuOpen = Boolean(open);
  if (menuOpen && replyOpen) setReplyMode(null);
  $('story-menu').hidden = !menuOpen;
  $('open-story-menu').setAttribute('aria-expanded', String(menuOpen));
  if (restoreFocus) $('open-story-menu').focus({ preventScroll: true });
  resumeListening();
}

function setReplyMode(mode, restoreFocus = false) {
  if (mode && menuOpen) setStoryMenu(false);
  replyOpen = Boolean(mode);
  shownChoices = mode === 'choices'; shownText = mode === 'text';
  renderAnswerOptions();
  if (shownText) $('answer-input').focus({ preventScroll: true });
  else if (restoreFocus) $('reply-more').focus({ preventScroll: true });
  resumeListening();
}

function speakerInfo(id) {
  if (story?.id === 'wow' && id === 'guide') return { id, name: '星星窗', voice: 'bubble' };
  if (id === 'companion') return { id, name: state?.companion?.name || '小团', voice: 'bubble' };
  const actor = story?.scenes[state.sceneIndex]?.cast.find(actor => actor.id === id);
  const profile = actor?.characterId && getNpc(actor.characterId);
  return profile ? { ...actor, name: profile.name, voice: profile.voiceKey } : actor || { id: 'guide', name: '河湾', voice: 'moss' };
}

async function speakLine(line, token = epoch) {
  if (token !== epoch) return;
  const info = speakerInfo(line.speaker);
  const text = story?.id === 'wow' ? line.text.replaceAll('{firstWords}', state.firstWords || '你好，我在这里。') : line.text;
  $('speaker').textContent = info.name + (line.source === 'local' ? ' · 本地回应' : line.source === 'ai' ? ' · AI 回应' : '');
  $('speech-text').textContent = text;
  $('speech-card').dataset.speaking = 'true';
  stage.speak(line.speaker, true);
  const chunks = Array.from(text).reduce((parts, char) => { if (!parts.length || parts.at(-1).length + char.length > 110) parts.push(''); parts[parts.length - 1] += char; return parts; }, []);
  for (const chunk of chunks) { if (token !== epoch) return; await voice.say(chunk, info.voice, () => {}, info.characterId); }
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
  $('story-tools').hidden = view !== 'story';
  $('original-link').hidden = view !== 'home';
  $('stage-hint').hidden = view === 'story';
  $('camera-reset').hidden = view !== 'studio';
  $('ending').hidden = true;
  $('speech-card').hidden = false;
  $('story-topline')?.removeAttribute('hidden');
  requestAnimationFrame(() => { stage.resize(); scheduleFraming(); });
}

function route() {
  epoch++; wowRequest?.abort(); wowRequest = null; voice.stop(); busy = false; shownChoices = shownText = replyOpen = false;
  setStoryMenu(false);
  $('transition').classList.remove('closed');
  if ($('bag-dialog').open) $('bag-dialog').close();
  const params = new URLSearchParams(location.search);
  if (params.get('mode') === 'studio') { openStudio(); return; }
  const id = params.get('story');
  if (id && STORIES.some(item => item.id === id)) { openStory(getStory(id)); return; }
  phase = 'home'; story = null; showView('home');
  setWorld('orchard', [{ id: 'dog', type: 'dog', name: '豆豆' }, { id: 'rabbit', type: 'rabbit', name: '雪团' }, { id: 'frog', type: 'frog', name: '小荷' }]);
  document.title = '萌萌星 · 立体故事工坊';
}

function navigate(url) { history.pushState(null, '', url); route(); scrollTo({ top: 0, behavior: 'instant' }); }

function openStory(selected) {
  busy = false; $('transition').classList.remove('closed');
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
  if (story.id === 'wow' && state.completed) {
    $('resume-note').textContent = '六种颜色都在这里，你的旅程也保存好了。';
    $('start-story').textContent = '查看我的旅程';
  }
  setWorld(story.scenes[state.sceneIndex].world, storyCast(story.scenes[state.sceneIndex]));
  syncWowPresentation();
  if (story.id !== 'wow' && state.inventions.length) stage.showInvention(state.inventions.at(-1).visual);
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
  if (story.id === 'wow') {
    if (state.completed) { await finishStory(); return; }
    while (state.wowEntries.some(entry => entry.id === story.scenes[state.sceneIndex].id)) {
      if (story.scenes[state.sceneIndex].final) { await finishStory(); return; }
      state.sceneIndex++;
    }
  }
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
  setWorld('cove', [{ id: 'guide', type: 'otter', name: '河湾' }, { id: 'companion', ...state.companion }]);
  const token = epoch;
  await speakLine({ speaker: 'guide', text: SETUP[setupStep].question }, token);
  if (token !== epoch) return;
  phase = 'setup'; busy = false; pendingChoices = SETUP[setupStep].choices;
  renderAnswerOptions(); resumeListening();
}

function renderAnswerOptions() {
  document.body.dataset.reply = shownText ? 'text' : shownChoices ? 'choices' : 'none';
  $('answer-dock').hidden = !['question', 'setup'].includes(phase);
  $('choices').replaceChildren();
  pendingChoices.forEach(choice => {
    const button = document.createElement('button'); button.className = 'choice-button';
    button.dataset.choice = choice.id; button.textContent = choice.label;
    button.addEventListener('click', () => choose(choice)); $('choices').append(button);
  });
  $('choices').hidden = !shownChoices;
  $('reply-options').hidden = !replyOpen;
  $('reply-more').setAttribute('aria-expanded', String(replyOpen));
  $('reply-more').setAttribute('aria-label', replyOpen ? '收起回答方式' : '更多回答方式');
  $('show-choices').setAttribute('aria-expanded', String(shownChoices));
  $('text-form').hidden = !shownText;
  $('show-text').setAttribute('aria-expanded', String(shownText));
  $('show-choices').textContent = story?.id === 'moon' && phase === 'question' ? '找点灵感' : '看看办法';
  $('answer-input').placeholder = story?.id === 'moon' && phase === 'question' ? '你想造或改什么？' : '把你的想法写在这里';
  scheduleFraming();
}

async function choose(choice, customResult) {
  if (story?.id === 'wow' && phase === 'question') return handleWowAnswer(choice.label);
  if (busy || !['question', 'setup'].includes(phase)) return;
  void voice.unlock();
  const wasSetup = phase === 'setup', token = epoch;
  busy = true; phase = 'responding'; voice.listen(false); $('answer-dock').hidden = true;
  setReplyMode(null);
  $('heard').hidden = true;
  if (wasSetup) {
    let response;
    if (setupStep === 0) { state.companion.type = choice.id; response = `好，${choice.label}来陪你。`; }
    if (setupStep === 1) { state.companion.color = COLORS.find(color => color.id === choice.id).color; response = `穿上${choice.label}，一眼就认出它。`; }
    if (setupStep === 2) { state.companion.manner = choice.id; response = choice.id === 'calm' ? '我会慢慢陪着你，听你说完。' : '我们一起试一试，也可以停下来休息。'; }
    setWorld('cove', [{ id: 'guide', type: 'otter', name: '河湾' }, { id: 'companion', ...state.companion }]);
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
  if (scene.wow?.prop && !state.inventory.some(item => item.id === scene.wow.prop)) state.inventory.push({ ...WOW_PROPS[scene.wow.prop] });
  if (scene.wow) { persist(); updateBag(); }
  setWorld(scene.world, storyCast(scene));
  syncWowPresentation();
  if (story.id !== 'wow' && state.inventions.length) stage.showInvention(state.inventions.at(-1).visual);
  $('scene-title').textContent = scene.title;
  const chapter = story.chapters.find(item => item.number === scene.chapter);
  $('chapter-name').textContent = `第${['一', '二', '三', '四', '五', '六'][scene.chapter - 1]}章 · ${chapter?.title || ''}`;
  $('objective').textContent = scene.objective;
  $('speech-text').textContent = ''; $('speaker').textContent = '';
  $('transition').classList.remove('closed');
  await wait(matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 480);
  if (token !== epoch) return;
  phase = 'narrating'; await dialogue(scene.dialogue, token);
  if (token !== epoch) return;
  await speakLine({ speaker: scene.questionSpeaker || scene.cast[0].id, text: scene.question }, token);
  if (token !== epoch) return;
  phase = 'question'; busy = false; pendingChoices = scene.choices;
  $('answer-input').value = ''; renderAnswerOptions(); resumeListening();
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
  if (story?.id === 'wow' && phase === 'question') return handleWowAnswer(text);
  if (/\d{7,}|身份证|我住在|我的学校|我家地址|手机号码/.test(text)) { notify('这些不用告诉我。说说你想怎样帮伙伴吧。'); return; }
  if (/^(嗯+|啊+|哦+|等一下|不知道|我想想|没想好)[。！!]*$/.test(text)) { notify('我会等你，想好了再慢慢说。'); return; }
  $('heard').textContent = `${shownText ? '你的想法' : '听见了'}：${text}`; $('heard').hidden = false;
  if (phase === 'setup') {
    const choice = matchChoice(text, pendingChoices);
    if (choice) await choose(choice);
    else { setReplyMode('choices'); notify('也可以从下面挑一个你喜欢的。'); }
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
      else { setReplyMode('choices'); notify(result.listeningPrompt || '再具体说说，也可以点一个办法。'); }
    }
  } finally {
    if (token === epoch && phase === 'question') { busy = false; resumeListening(); }
  }
}

async function finishStory() {
  const token = epoch;
  phase = 'complete'; busy = false; voice.listen(false); state.completed = true; persist();
  stage.act('celebrate'); $('answer-dock').hidden = true; $('story-start').hidden = true; $('speech-card').hidden = true;
  $('ending').hidden = false; $('ending-title').textContent = story.ending.title;
  const endingLine = story.ending.companionLine.replaceAll('{firstWords}', state.firstWords || '你好，我在这里。');
  $('ending-text').textContent = story.ending.text; $('ending-line').textContent = endingLine;
  $('save-memory').textContent = '收进我的图鉴'; $('save-memory').disabled = false;
  if (story.id === 'wow') { $('save-memory').textContent = '下载我的旅程'; await speakLine({ speaker: 'wow', text: endingLine }, token); }
  else { await voice.say(endingLine, 'bubble', () => stage.speak('companion', true)); if (token === epoch) stage.speak('companion', false); }
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
  setStoryMenu(false); voice.listen(false); $('bag-dialog').showModal();
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
function rebuildStudio() { setWorld(studio.world, [{ id: 'studio', type: studio.type, name: studio.name, color: studio.color }], { studio: true }); updateStudio(); stage.frameCharacters?.(); }
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
    link.onmouseenter = () => { if (phase === 'home') setWorld(item.scenes[0].world, item.scenes[0].cast); };
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
  $('restart').onclick = () => { epoch++; wowRequest?.abort(); wowRequest = null; voice.stop(); setStoryMenu(false); setReplyMode(null); state = defaultState(); persist(); openStory(story); };
  $('open-story-menu').onclick = () => setStoryMenu(!menuOpen);
  $('scene-reset').onclick = () => { stage.resetCamera(); setStoryMenu(false, true); };
  $('camera-reset').onclick = () => stage.resetCamera();
  $('speech-card').onclick = () => voice.skip();
  $('mic-button').onclick = async () => {
    if (voice.enabled || voice.opening) { voice.pause(); return; }
    if (!['question', 'setup'].includes(phase) || busy) return;
    voice.listen(true); await voice.enable();
  };
  $('reply-more').onclick = () => setReplyMode(replyOpen ? null : 'choices');
  $('close-replies').onclick = () => setReplyMode(null, true);
  $('show-choices').onclick = () => setReplyMode('choices');
  $('show-text').onclick = () => setReplyMode('text');
  $('text-form').onsubmit = event => { event.preventDefault(); void handleAnswer($('answer-input').value); };
  $('bag-button').onclick = openBag;
  $('close-bag').onclick = () => $('bag-dialog').close();
  $('bag-dialog').addEventListener('close', () => { resumeListening(); if (document.body.dataset.view === 'story') $('open-story-menu').focus({ preventScroll: true }); });
  $('save-memory').onclick = () => {
    if (story?.id === 'wow') { downloadWowMemory(); return; }
    const memories = readStorage('memories', []);
    if (store('memories', [...(Array.isArray(memories) ? memories : []), { story: story.id, title: story.title, date: new Date().toISOString(), companion: state.companion, inventory: state.inventory, inventions: state.inventions }].slice(-20))) {
      $('save-memory').textContent = '已经收好啦'; $('save-memory').disabled = true; notify('这段旅行已经收进这台设备的图鉴。');
    }
  };
  $('character-name').oninput = event => { studio.name = event.target.value.trim().slice(0, 10) || '小团'; };
  $('character-size').oninput = event => { studio.size = Number(event.target.value); updateStudio(); stage.frameCharacters?.(); };
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
  addEventListener('resize', scheduleFraming);
  window.visualViewport?.addEventListener('resize', scheduleFraming);
  window.visualViewport?.addEventListener('scroll', scheduleFraming);
  const panelObserver = new ResizeObserver(scheduleFraming);
  panelObserver.observe($('story-panel')); panelObserver.observe($('scene-caption'));
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || $('bag-dialog').open) return;
    if (replyOpen) { event.preventDefault(); setReplyMode(null, true); }
    else if (menuOpen) { event.preventDefault(); setStoryMenu(false, true); }
  });
  document.addEventListener('pointerdown', event => {
    if (!menuOpen || event.target.closest('#story-tools')) return;
    setStoryMenu(false);
    if (event.target.closest('#stage')) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  addEventListener('pagehide', () => { wowRequest?.abort(); wowRequest = null; voice.stop(); });
  addEventListener('pageshow', event => { if (event.persisted && story?.id === 'wow') route(); });
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
  window.__DEV_STORY__ = { get status() { return { phase, busy, storyId: story?.id || null, sceneIndex: state?.sceneIndex, setupStep, completed: Boolean(state?.completed), inventory: state?.inventory.map(item => item.id) || [], inventions: state?.inventions.map(item => item.visual.kind) || [], studio: { ...studio }, wow: story?.id === 'wow' ? { entries: state.wowEntries.length, firstWords: state.firstWords, presentation: stage.scene.getObjectByName('wow-story-props')?.userData.state } : null, stage: stage.stats(), voice: { enabled: voice.enabled, opening: Boolean(voice.opening), recording: voice.recording, samples: voice.samples || 0, voicedSeconds: voice.voiced || 0, contextState: voice.context?.state || 'closed' } }; } };
} catch (error) {
  console.error(error);
  $('stage-loading').querySelector('p').textContent = '这个浏览器暂时无法打开立体场景，请换一个支持 WebGL 的浏览器。';
}
