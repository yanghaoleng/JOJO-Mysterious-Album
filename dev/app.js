import { firstLightWorldCommands, firstLightModelChoice } from './content/stories/first-light-models.js';
import { AnswerSupport, isVagueAnswer } from './answer-support.js';
import { prepareCreation } from './features/creation-service.js';
import { createGameSession } from './runtime/game-session.js';
import { resolveSceneIndex, stampProgress, nextSceneIndex } from './runtime/story-progress.js';
import { renderChoices } from './presentation/choice-list.js';
import { createDialoguePlayer } from './presentation/dialogue-player.js';
import { journey, rememberJourney } from './curiosity-journey.js';
import { DioramaStage } from './stage.js';
import { CHARACTER_CATALOG } from './models.js';
import { WORLD_CATALOG } from './worlds.js';
import { STORIES, getStory } from './stories.js';
import { StoryVoice, requestJSON } from './voice.js';
import { moonRequest, sceneRequest } from './story-api.js';
import { describeInvention } from './inventions.js';
import { mountProductIcons } from '../vendor/ui-icons.js';
import { getNpc } from '../src/story-npcs/catalog.js';
import { localResult, PRIVATE } from '../src/wow-local-turn.js';
import { firstLightReply, acceptLightReply, safeLightWords, lightMemory } from './content/stories/first-light.js';
import { WOW_PROPS, wowVisualState } from './wow-story.js';
import { createWowPresentation } from './wow-visuals.js';
import { chapterDecorationProgress, chapterLayoutOptions, newJourneySeed, savedJourneySeed } from './journey-layout.js';
import { ReadAlong } from './read-along.js';
import { createVoiceInput } from '../src/voice-input-control.js';

const $ = id => document.getElementById(id);
const reading = new ReadAlong($('speech-text'));
const endingReading = new ReadAlong($('ending-line'));
const voiceInput = createVoiceInput({
  button: $('mic-button'), transcript: $('heard'), status: $('voice-feedback'),
  sanitize: text => PRIVATE.test(text) ? '听见你的话了，个人信息就不展示啦。' : text,
});
let voiceTransport = 'off', voiceCapture = null;
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
let wowPresentation = null, wowRequest = null, mountedStoryScene = null;
let game;
let stage, story, state, phase = 'home', epoch = 0, busy = false, pendingChoices = [], setupStep = 0;
let shownChoices = false, shownText = false, replyOpen = false, menuOpen = false, noticeTimer, frameRequest;
let studio = { type: 'dog', color: '#c99561', name: '小团', size: 100, expression: 'happy', action: 'idle', world: 'orchard' };

function choiceFirst() {
  if (phase === 'setup') return true;
  const scene = story?.scenes[state?.sceneIndex];
  return scene && (scene.inputMode === 'choice' || (!scene.freeInput && story?.id !== 'wow'));
}
const answerSupport = new AnswerSupport({
  available: () => phase === 'question' && !busy && !choiceFirst() && !shownChoices && !shownText && !menuOpen && !$('bag-dialog').open && !document.hidden && !document.body.dataset.encounter,
  reveal: () => { setReplyMode('choices'); notify('可以继续说，也可以选一个小主意。'); },
});
function beginAnswer() {
  answerSupport.stop();
  setReplyMode(choiceFirst() ? 'choices' : null);
  if (!choiceFirst()) answerSupport.start();
  renderVoiceInput();
}

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
const defaultState = () => ({ sceneIndex: 0, setupDone: false, companion: { type: 'rabbit', color: '#eee3d5', name: '小团' }, inventory: [], inventions: [], creations: [], wowEntries: [], playerName: '', firstWords: '', completed: false, ...(story?.id === 'wow' ? { journeySeed: newJourneySeed() } : {}) });
function savedState() {
  const saved = readStorage(`story.${story.id}`, null);
  if (!saved || !Number.isInteger(saved.sceneIndex) || !Array.isArray(saved.inventory) || !Array.isArray(saved.inventions)) return null;
  if (story.firstLight && saved.scriptVersion !== story.version) {
    if (!readStorage('story.wow.before-first-light', null)) store('story.wow.before-first-light', saved);
    return null;
  }
  const type = CHARACTER_CATALOG.some(item => item.id === saved.companion?.type) ? saved.companion.type : 'rabbit';
  return { ...defaultState(), ...saved, sceneIndex: resolveSceneIndex(story, saved), ...(story.id === 'wow' ? { journeySeed: savedJourneySeed(saved) } : {}), wowEntries: Array.isArray(saved.wowEntries) ? saved.wowEntries.filter(entry => story.scenes.some(scene => scene.id === entry?.id) && typeof entry.answer === 'string') : [], playerName: String(saved.playerName || '').slice(0,12), firstWords: String(saved.firstWords || '').slice(0,160), companion: { type, color: /^#[0-9a-f]{6}$/i.test(saved.companion?.color) ? saved.companion.color : '#eee3d5', name: String(saved.companion?.name || '小团').slice(0, 10), manner: saved.companion?.manner === 'lively' ? 'lively' : 'calm' } };
}
function persist() { if (story && state) store(`story.${story.id}`, stampProgress(story, state)); }
function storyCast(scene) {
  if (story?.id !== 'wow') return [...scene.cast, { ...state.companion, id: 'companion' }];
  // Serializable asset references preserve the same sculpt through a chapter.
  // Only the opening window becomes a different actor.
  if (story.firstLight) return scene.cast;
  const modelKey = scene.chapter === 1 && scene.chapterScene < 4 ? 'wow:window' : `wow:momo:${scene.chapter}`;
  return scene.cast.map(actor => ({ ...actor, modelKey }));
}
function rememberMountedScene(scene) { mountedStoryScene = { storyId: story.id, chapter: scene.chapter, world: scene.world }; game?.bind(scene, storyCast(scene)); }
function syncWowPresentation(lit = false) {
  if (story?.id !== 'wow') return;
  if (!wowPresentation) wowPresentation = createWowPresentation(stage);
  const visualState = wowVisualState(story.scenes[state.sceneIndex], state, lit);
  stage.onCuriosityTheme = applyEnvironmentTheme;
  stage.setCuriosityProgress(visualState.progress, { decorationProgress: chapterDecorationProgress(story.scenes[state.sceneIndex].chapter, state), explorationFloor: story.firstLight ? 0 : .78 });
  wowPresentation.set(visualState);
}

function syncFirstLightModels(scene, animate = false) {
  if (!story?.firstLight || !game) return;
  const commands = firstLightWorldCommands(story, scene, state.wowEntries || []);
  const ids = new Set(commands.map(c=>c.id));
  const existing = game.runtime.state.worlds[scene.world]?.entities || {};
  const cleanup = Object.keys(existing).filter(id=>id.startsWith('fl-') && !ids.has(id)).map(id=>({type:'entity.remove',id}));
  const result=game.dispatch([...cleanup,...commands], 'script');
  if(!result.ok) throw new Error(result.error);
  if(animate) game.dispatch([...ids].map(id=>({type:'entity.animate',id,animation:'activate'})), 'script');
}

async function handleWowAnswer(raw) {
  if (busy || phase !== 'question') return;
  const answer = String(raw || '').trim().slice(0, 160);
  if (!answer) return;
  const scene = story.scenes[state.sceneIndex], token = epoch;
  const payload = { chapter:scene.chapter, kind:scene.wow.kind, answer, prompt:scene.question, momo:scene.wow.momo, ...(story.firstLight ? {policy:'first-light',sceneId:scene.id} : {}) };
  const nickname = scene.wow.kind === 'nickname' ? answer.replace(/^(?:我叫|叫我|你叫我|我的名字是)\s*/u, '').trim().slice(0, 12) : '';
  if (scene.wow.kind === 'nickname' && (/\d{7,}|学校|住址|地址|电话|手机|身份证/u.test(answer) || !nickname)) { notify('给自己起一个短短的冒险昵称吧，比如“小星星”。'); return; }
  const fallback = story.firstLight ? firstLightReply(scene, answer) : scene.wow.kind === 'nickname'
    ? { accepted:true, reaction:`好，${nickname}，我记住啦。我们一起看看房间。`, source:'local', visual:{shape:'star', color:'#efd36e'} }
    : localResult(payload);
  if (!fallback.accepted) { setReplyMode('choices'); notify(fallback.reaction); return; }
  answerSupport.stop();
  busy = true; phase = 'responding'; voice.listen(false); setReplyMode(null);
  renderVoiceInput();
  $('speaker').textContent = scene.cast[0].name;
  reading.setText(scene.wow.kind === 'create' ? '你的钥匙正在一点点长出来……' : '我在认真听你说……');
  syncWowPresentation(true);
  const pulseStarted = performance.now();
  if (story.firstLight) { wowPresentation?.pulse(); syncFirstLightModels(scene,true); }
  const controller = new AbortController(); wowRequest = controller;
  let result;
  try { result = (scene.wow.kind === 'nickname' || (story.firstLight && (scene.inputMode === 'choice' || !safeLightWords(answer) || answer === '先安静看看'))) ? fallback : await requestJSON('/api/wow-turn', payload, 13000, controller.signal); }
  catch { if (controller.signal.aborted || token !== epoch) return; result = fallback; }
  finally { if (wowRequest === controller) wowRequest = null; }
  if (token !== epoch || controller.signal.aborted) return;
  if (story.firstLight) result = acceptLightReply(result, fallback, answer);
  if (typeof result?.accepted !== 'boolean' || typeof result?.reaction !== 'string') result = fallback;
  if (!result.accepted) { phase='question';busy=false;notify(result.reaction);renderAnswerOptions();resumeListening();return; }
  const shapes = ['star','moon','leaf','heart','cloud','fish'];
  const visual = {shape:shapes.includes(result.visual?.shape)?result.visual.shape:fallback.visual.shape,color:/^#[0-9a-f]{6}$/i.test(result.visual?.color || '')?result.visual.color:fallback.visual.color};
  const entry = {id:scene.id,chapter:scene.chapter,kind:scene.wow.kind,answer:story.firstLight ? (safeLightWords(answer) || '一束暖暖的光') : nickname || answer,reaction:result.reaction,source:result.source==='ai'?'ai':'local'};
  state.wowEntries = [...state.wowEntries.filter(item=>item.id!==scene.id),entry];
  if (nickname) state.playerName = nickname;
  else if (story.firstLight) { if (scene.inputMode === 'voice' && !state.firstWords) state.firstWords = entry.answer; }
  else if (!state.firstWords) state.firstWords = answer;
  if (scene.wow.kind === 'create') state.inventions = [...state.inventions.filter(item=>item.chapter!==scene.chapter),{chapter:scene.chapter,scene:scene.title,visual:{...visual,kind:'wow-key',name:`第${scene.chapter}把想象钥匙`,details:answer}}];
  if (scene.wow.kind === 'color' && !state.inventory.some(item=>item.id===`wow-color-${scene.chapter}`)) state.inventory.push({id:`wow-color-${scene.chapter}`,name:scene.wow.colorName,color:scene.wow.color,description:answer});
  if (story.firstLight && scene.id === 'first-light-page' && !state.inventory.some(item=>item.id==='first-light-page')) state.inventory.push({id:'first-light-page',name:'第一束好奇的光 · 绘本第 1 页',description:state.firstWords || '一束安静的光'});
  persist(); updateBag(); syncWowPresentation(true); game?.emit('answer.accepted', { sceneId: scene.id, modelChoice: story.firstLight ? firstLightModelChoice(scene,entry.answer) : '' });
  syncFirstLightModels(scene,true);
  await speakLine({speaker:scene.questionSpeaker || 'wow',text:entry.reaction,source:entry.source},token);
  if (token !== epoch) return;
  if (story.firstLight) await wait(Math.max(0, 3400 - (performance.now() - pulseStarted)));
  if (token !== epoch) return;
  await advanceScene();
}

function downloadWowMemory() {
  const escape = value => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const content = state.wowEntries.map(entry=>`<article><h2>第${entry.chapter}章 · ${escape(story.scenes.find(scene=>scene.id===entry.id)?.title||'')}</h2><blockquote>${escape(entry.answer)}</blockquote><p>${escape(entry.reaction)}</p></article>`).join('');
  download(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>第一束好奇的光</title><style>body{max-width:720px;margin:40px auto;padding:20px;font:16px/1.8 system-ui;background:#fcfaf4;color:#314555}h2{font-size:18px}article{border-bottom:1px solid #ddd;padding:16px 0;break-inside:avoid}blockquote{border-left:3px solid #d7b659;padding-left:20px;margin-left:0;overflow-wrap:anywhere}</style><h1>第一束好奇的光</h1><p>绘本第 1 页 · 点亮者：小小追光员。你的第一句话：</p><blockquote>${escape(state.firstWords)}</blockquote>${content}</html>`,'第一束好奇的光.html','text/html;charset=utf-8');
  notify('旅程已整理好，可以打开下载的纪念册阅读或打印。');
}
const voice = new StoryVoice({
  speechProfile: () => story?.id === 'wow' ? 'wow-child' : '',
  onState(value) {
    voiceTransport = value;
    renderVoiceInput();
  },
  onAnswer: text => handleAnswer(text, 'voice'),
  onLevel: level => voiceInput.setLevel(level),
  onCapture: update => showVoiceFeedback(update),
  onError: message => notify(message),
});

const CAPTURE_LABELS = {
  listening: '麦克风已打开，等你说话', receiving: '收到声音了，继续说吧',
  transcribing: '声音已收到，正在转成文字…', transcript: '已识别，伙伴正在听你的想法',
  quiet: '暂时没有检测到说话声，可以靠近一点再试', paused: '麦克风已暂停',
};
function renderVoiceInput() {
  const capture = voiceCapture?.state;
  const persistent = ['error', 'quiet', 'short', 'empty', 'paused'].includes(capture);
  const answerable = ['question', 'setup'].includes(phase) && !busy;
  const mode = persistent ? capture
    : voiceTransport === 'requesting' ? 'requesting'
      : voiceTransport === 'speaking' ? 'speaking'
        : capture === 'transcribing' ? 'transcribing'
          : voiceTransport === 'thinking' || busy ? 'thinking'
            : voiceTransport === 'listening' ? capture === 'receiving' ? 'receiving' : 'listening'
              : voice.enabled ? 'paused' : 'setup';
  voiceInput.setState(mode, {
    message: voiceCapture?.message || CAPTURE_LABELS[capture] || '',
    disabled: !answerable || ['requesting', 'thinking', 'speaking'].includes(mode),
    pressed: Boolean(voice.enabled || voice.opening),
  });
  // Capture diagnostics survive generic transport off/listening callbacks.
  // In particular, a successful transcript is not an ASR error or a new input.
  $('voice-feedback').dataset.state = capture || mode;
  $('mic-button').dataset.captureState = capture || '';
  $('answer-dock').hidden = document.body.dataset.view !== 'story' || !['question', 'setup', 'responding', 'narrating', 'transition'].includes(phase);
  $('reply-more').hidden = !answerable || choiceFirst();
  $('mic-button').hidden = Boolean(choiceFirst());
  scheduleFraming();
}
function resetVoiceInput() {
  voiceCapture = null; voiceTransport = 'off'; voiceInput.reset();
  delete $('mic-button').dataset.captureState;
}
function showVoiceFeedback(update) {
  answerSupport.capture(update);
  voiceCapture = update;
  if (update.state === 'receiving') voiceInput.clearTranscript();
  if (update.text) voiceInput.setTranscript(update.text);
  renderVoiceInput();
}

function resumeListening() {
  voice.listen(['question', 'setup'].includes(phase) && !choiceFirst() && !busy && !menuOpen && !shownText && !$('bag-dialog').open && !document.hidden && !document.body.dataset.encounter);
}

function scheduleFraming() {
  cancelAnimationFrame(frameRequest);
  frameRequest = requestAnimationFrame(() => {
    if (!stage) return;
    const visibleBottom = Math.min(innerHeight, (window.visualViewport?.height || innerHeight) + (window.visualViewport?.offsetTop || 0));
    document.body.style.setProperty('--keyboard-offset', `${Math.max(0, innerHeight - visibleBottom)}px`);
    const bounds = $('stage').getBoundingClientRect();
    if (document.body.dataset.view === 'story') {
      const top = Math.max(document.querySelector('.topbar').getBoundingClientRect().bottom, $('scene-caption').getBoundingClientRect().bottom, story?.firstLight ? 138 : 0);
      const bottom = Math.min($('story-panel').getBoundingClientRect().top, visibleBottom);
      stage.setViewportInsets?.({ top: Math.max(0, top - bounds.top + 22), bottom: Math.max(0, bounds.bottom - bottom + 20), left: 20, right: 20 });
    } else stage.setViewportInsets?.({ top: 20, bottom: document.body.dataset.view === 'studio' ? 48 : 36, left: 18, right: 18 });
  });
}

function setWorld(worldId, cast, options) {
  mountedStoryScene = null;
  wowPresentation?.dispose(); wowPresentation = null;
  const scene = story?.id === 'wow' && state ? story.scenes[state.sceneIndex] : null;
  const decorations = scene && !options?.studio ? chapterLayoutOptions(scene.chapter, state.journeySeed) : null;
  const explorationKey = scene ? `chapter-${scene.chapter}:${worldId}` : worldId;
  const exploration = story?.exploration && state && !options?.studio ? {
    storyId: story.id,
    creations: (state.creations || []).filter(item => item.world === worldId),
    canInteract: () => !busy && voiceTransport !== 'speaking' && ['ready','question','complete','creation-review'].includes(phase) && !menuOpen && !$('bag-dialog').open,
    onInteraction: open => { if (open) { answerSupport.stop(); voice.listen(false); } else { voice.skip(); if (phase === 'question') answerSupport.start(); resumeListening(); } },
    onEvent: (name, payload) => game?.emit(name, payload),
    onCommands: commands => game?.dispatch(commands),
    onSpeech: (text, npc) => { void voice.say(text, npc.voice || getNpc(npc.id)?.voiceKey || 'bubble', () => {}, npc.yellow ? '' : npc.id); },
    saved: state.explorations?.[explorationKey] || (story.id === 'wow' && scene?.chapter === 1 ? state.exploration : null),
    getName: () => state.playerName,
    onSave: position => { state.explorations = { ...state.explorations, [explorationKey]: position }; persist(); },
  } : null;
  stage.storyFraming = story?.firstLight ? {width:8.4,height:7.3,meanHeight:3.7,targetHeight:2.1} : null;
  stage.setScene(worldId, cast, { ...options, decorations, exploration });
  const environment = stage.world?.atmosphere;
  if (environment) applyEnvironmentTheme(environment);
  scheduleFraming();
}

function applyEnvironmentTheme(environment) {
    document.body.dataset.curiosity = String(Boolean(environment.curiosity));
    document.body.dataset.period = environment.period;
    for (const key of ['base', 'glow', 'horizon']) document.body.style.setProperty(`--sky-${key}`, environment[key]);
    for (const key of ['ink', 'muted', 'accent', 'paper']) document.body.style.setProperty(`--${key}`, environment[key]);
    document.querySelector('meta[name="theme-color"]').content = environment.base;
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
  if (!mode && !busy && ['setup', 'question'].includes(phase) && choiceFirst()) mode = 'choices';
  if (mode && menuOpen) setStoryMenu(false);
  replyOpen = Boolean(mode);
  shownChoices = mode === 'choices'; shownText = mode === 'text';
  renderAnswerOptions();
  if (shownText) $('answer-input').focus({ preventScroll: true });
  else if (restoreFocus) (choiceFirst() ? $('choices').querySelector('button') : $('reply-more'))?.focus({ preventScroll: true });
  resumeListening();
}

function speakerInfo(id) {
  if (story?.id === 'wow' && id === 'guide') return { id, name: '星星窗', voice: 'bubble' };
  if (id === 'companion') return { id, name: state?.companion?.name || '小团', voice: story?.companionVoice || 'bubble' };
  const actor = story?.scenes[state.sceneIndex]?.cast.find(actor => actor.id === id);
  const profile = actor?.characterId && getNpc(actor.characterId);
  return profile ? { ...actor, name: profile.name, voice: profile.voiceKey } : actor || { id: 'guide', name: '河湾', voice: 'moss' };
}

const dialoguePlayer = createDialoguePlayer({
  voice, getStage: () => stage, getEpoch: () => epoch,
  getDisplay: () => phase === 'complete' ? endingReading : reading, resolveSpeaker: speakerInfo,
  interpolate: text => text.replaceAll('{playerName}', state.playerName || '小伙伴').replaceAll('{firstWords}', state.firstWords || '一束安静的光').replaceAll('{skyColor}', lightMemory(state.wowEntries, 'gugu-feeling', '暖暖的')).replaceAll('{skyThing}', lightMemory(state.wowEntries, 'gugu-question', '小星星')),
  speaker: $('speaker'), card: $('speech-card'),
});
const speakLine = (line, token = epoch) => dialoguePlayer.line(line, token);
const dialogue = (lines, token = epoch) => dialoguePlayer.sequence(lines, token);

function showView(view) {
  stage?.setCameraDriftEnabled(view === 'story');
  document.body.dataset.view = view;
  $('home-panel')?.toggleAttribute('hidden', view !== 'home');
  $('story-panel').hidden = view !== 'story';
  $('studio-panel').hidden = view !== 'studio';
  $('scene-caption').hidden = view !== 'story';
  $('story-tools').hidden = view !== 'story';
  $('original-link')?.toggleAttribute('hidden', view !== 'home');
  $('stage-hint').hidden = view === 'story';
  $('camera-reset').hidden = view !== 'studio';
  $('ending').hidden = true;
  $('speech-card').hidden = false;
  $('story-topline')?.removeAttribute('hidden');
  requestAnimationFrame(() => { stage.resize(); scheduleFraming(); });
}

function route() {
  answerSupport.stop();
  game?.dispose(); game = null;
  $('creation-review').hidden = true;
  epoch++; wowRequest?.abort(); wowRequest = null; voice.stop(); busy = false; shownChoices = shownText = replyOpen = false;
  dialoguePlayer.cancel(); reading.clear(); endingReading.clear();
  resetVoiceInput();
  setStoryMenu(false);
  $('transition').classList.remove('closed');
  if ($('bag-dialog').open) $('bag-dialog').close();
  const params = new URLSearchParams(location.search);
  if (params.get('mode') === 'studio') { openStudio(); return; }
  const id = params.get('story');
  if (id && STORIES.some(item => item.id === id)) { openStory(getStory(id)); return; }
  location.replace('../');
}

function navigate(url) { history.pushState(null, '', url); route(); scrollTo({ top: 0, behavior: 'instant' }); }

function openStory(selected) {
  busy = false; $('transition').classList.remove('closed');
  resetVoiceInput();
  story = selected; document.body.dataset.firstLight=String(!!story.firstLight); state = savedState() || defaultState(); phase = 'ready';
  game?.dispose();
  game = createGameSession({
    story, stage, saved: state.worldState, legacyCreations: state.creations,
    onChange: snapshot => { state.worldState = snapshot; state.creations = snapshot.creations; persist(); updateBag(); },
  });
  state.worldState = game.runtime.snapshot; state.creations = state.worldState.creations;
  if (story.id === 'wow') persist();
  showView('story');
  document.title = `${story.title} · 萌萌星`;
  $('scene-title').textContent = story.title;
  $('chapter-name').textContent = story.age || '';
  $('objective').textContent = story.subtitle;
  $('speaker').textContent = story.scenes[0].cast[0].name;
  reading.setText(story.premise || story.subtitle);
  if (story.id === 'moon' && journey().debate?.idea) reading.setText(`上一站你说：“${journey().debate.idea}”我们把这个想法带来了。现在造一件能让朋友继续好奇的作品吧。`);
  $('speech-card').dataset.speaking = 'false';
  $('answer-dock').hidden = true; $('story-start').hidden = false;
  $('resume-note').textContent = state.setupDone && !state.completed ? '上次走到的地方还在，继续一起走。' : '说出你的想法，也可以随时点选。';
  $('start-story').textContent = state.setupDone && !state.completed ? '继续故事' : '开始对话';
  if (story.id === 'wow' && state.completed) {
    $('resume-note').textContent = '第一束光和你的话，都留在这台设备的绘本里了。';
    $('start-story').textContent = '查看我的旅程';
  }
  if(story.id==='moon'&&state.completed){$('resume-note').textContent='你造的世界还在。继续散步，或者回来加一个新点子。';$('start-story').textContent='回到我的造物世界';}
  setWorld(story.scenes[state.sceneIndex].world, storyCast(story.scenes[state.sceneIndex]));
  rememberMountedScene(story.scenes[state.sceneIndex]);
  syncFirstLightModels(story.scenes[state.sceneIndex]);
  syncWowPresentation();
  if (!['wow','moon'].includes(story.id) && state.inventions.length) stage.showInvention(state.inventions.at(-1).visual);
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
  if(story.id==='moon'&&state.completed){await finishStory();return;}
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
  phase = 'narrating'; busy = true; renderVoiceInput();
  $('chapter-name').textContent = '认识今天的小伙伴';
  $('scene-title').textContent = story.title;
  $('objective').textContent = '三个小选择，一位新朋友。';
  setWorld('cove', [{ id: 'guide', type: 'otter', name: '河湾' }, { id: 'companion', ...state.companion }]);
  const token = epoch;
  await speakLine({ speaker: 'guide', text: SETUP[setupStep].question }, token);
  if (token !== epoch) return;
  phase = 'setup'; busy = false; pendingChoices = SETUP[setupStep].choices;
  renderAnswerOptions(); beginAnswer();
}

function renderAnswerOptions() {
  document.body.dataset.reply = shownText ? 'text' : shownChoices ? 'choices' : 'none';
  renderVoiceInput();
  renderChoices($('choices'), pendingChoices, choice => {
    voiceCapture = null; voiceInput.setTranscript(choice.label); void choose(choice);
  }, { className: 'choice-button' });
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
  if (story?.interaction === 'curiosity' && phase === 'question') return handleWowAnswer(choice.label);
  if ((story?.scenes[state?.sceneIndex]?.interaction || story?.interaction) === 'creation' && phase === 'question') return handleAnswer(choice.label);
  if (busy || !['question', 'setup'].includes(phase)) return;
  void voice.unlock();
  const wasSetup = phase === 'setup', token = epoch;
  answerSupport.stop();
  busy = true; phase = 'responding'; voice.listen(false); renderVoiceInput();
  setReplyMode(null);
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
  if (scene.nickname && !state.playerName && choice.label) {
    state.playerName = choice.label.replace(/^(?:我叫|叫我|你叫我|我的名字是|我是)\s*/u, '').trim().slice(0, 12) || state.playerName;
    persist();
  }
  if (scene.freeInput && !customResult && !scene.final) rememberInvention(choice.label);
  if (choice.reward && !state.inventory.some(item => item.id === choice.reward.id)) state.inventory.push(choice.reward);
  updateBag(); stage.act(choice.action || 'celebrate', choice.expression || 'happy');
  game?.emit('answer.accepted', { choiceId: choice.id || '', sceneId: scene.id });
  await speakLine({ speaker: choice.speaker || scene.cast[0].id, text: customResult || choice.result }, token);
  if (token !== epoch) return;
  await dialogue(scene.closing, token);
  if (token !== epoch) return;
  await advanceScene(choice);
}

async function advanceScene(choice) {
  const index = nextSceneIndex(story, state.sceneIndex, choice);
  if (index < 0) await finishStory(); else await enterScene(index);
}

async function enterScene(index) {
  if (mountedStoryScene) game?.emit('scene.exit', { sceneId: story.scenes[state.sceneIndex].id });
  $('creation-review').hidden = true;
  const token = epoch;
  const scene = story.scenes[index];
  const sameChapter = mountedStoryScene?.storyId === story.id && mountedStoryScene.chapter === scene.chapter;
  const keepWorld = sameChapter && mountedStoryScene.world === scene.world && stage.worldId === scene.world;
  const circularTransition = !sameChapter;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  busy = true; phase = 'transition'; voice.listen(false); renderVoiceInput();
  if (circularTransition) {
    $('transition').classList.add('closed');
    await wait(reduced ? 0 : 540);
  } else $('transition').classList.remove('closed');
  if (token !== epoch) return;
  state.sceneIndex = index; persist();
  if (scene.wow?.prop && !state.inventory.some(item => item.id === scene.wow.prop)) state.inventory.push({ ...WOW_PROPS[scene.wow.prop] });
  if (scene.wow) { persist(); updateBag(); }
  if (keepWorld) stage.setCast(storyCast(scene));
  else setWorld(scene.world, storyCast(scene));
  rememberMountedScene(scene);
  syncWowPresentation();
  game?.emit('scene.enter', { sceneId: scene.id });
  syncFirstLightModels(scene);
  if (!keepWorld && !['wow','moon'].includes(story.id) && state.inventions.length) stage.showInvention(state.inventions.at(-1).visual);
  $('scene-title').textContent = scene.title;
  const chapter = story.chapters.find(item => item.number === scene.chapter);
  $('chapter-name').textContent = `第${['一', '二', '三', '四', '五', '六'][scene.chapter - 1]}章 · ${chapter?.title || ''}`;
  $('objective').textContent = scene.objective;
  reading.setText(''); $('speaker').textContent = '';
  $('transition').classList.remove('closed');
  if (circularTransition) await wait(reduced ? 0 : 480);
  if (token !== epoch) return;
  phase = 'narrating'; await dialogue(scene.dialogue, token);
  if (token !== epoch) return;
  await speakLine({ speaker: scene.questionSpeaker || scene.cast[0].id, text: scene.question }, token);
  if (token !== epoch) return;
  phase = 'question'; busy = false; pendingChoices = scene.choices;
  $('answer-input').value = ''; renderAnswerOptions(); beginAnswer();
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

async function handleAnswer(raw, source = 'text') {
  if (busy || document.body.dataset.encounter || !['question', 'setup'].includes(phase)) return;
  const text = String(raw || '').trim().slice(0, 180);
  if (!text) return;
  if (source !== 'voice') { voiceCapture = null; renderVoiceInput(); }
  voiceInput.setTranscript(text);
  if (!story?.firstLight && isVagueAnswer(text)) { notify('慢慢想，也可以看看下面的小主意。'); return; }
  if (story?.id === 'wow' && phase === 'question') return handleWowAnswer(text);
  if (/\d{7,}|身份证|我住在|我的学校|我家地址|手机号码/.test(text)) { notify('这些不用告诉我。说说你想怎样帮伙伴吧。'); return; }
  if (/^(嗯+|啊+|哦+|等一下|不知道|我想想|没想好)[。！!]*$/.test(text)) { notify('我会等你，想好了再慢慢说。'); return; }
  if (phase === 'setup') {
    const choice = matchChoice(text, pendingChoices);
    if (choice) await choose(choice);
    else { setReplyMode('choices'); notify('也可以从下面挑一个你喜欢的。'); }
    return;
  }
  const scene = story.scenes[state.sceneIndex], token = epoch;
  if ((scene.interaction || story.interaction) === 'creation') return createWorldObject(text, token);
  if (scene.nickname) {
    const nickname = text.replace(/^(?:我叫|叫我|你叫我|我的名字是|我是)\s*/u, '').trim().slice(0, 12);
    if (!nickname || /\d{7,}|身份证|我住在|我的学校|我家地址|手机号码/.test(text)) { notify('给自己起一个短短的冒险昵称吧，比如“小星星”。'); return; }
    state.playerName = nickname; persist();
    await choose({ speaker: 'companion', result: `好，${nickname}，我记住啦。我们一起看看房间。`, action: 'celebrate', expression: 'happy' });
    return;
  }
  answerSupport.stop();
  busy = true; voice.listen(false); setReplyMode(null); renderVoiceInput();
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
      if (!result.shouldRespond || result.privacyRedirect) { setReplyMode('choices'); notify(result.listeningPrompt || '再说说你想造什么。'); return; }
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

async function createWorldObject(text, token) {
  const scene = story.scenes[state.sceneIndex];
  const proposal = prepareCreation({ text, scene, creations: game.runtime.snapshot.creations,
    position: () => stage.exploration?.creationPosition(), id: `creation-${Date.now()}-${state.creations.length}` });
  if (!proposal.ok) { setReplyMode('choices'); notify(proposal.message); return; }
  answerSupport.stop(); busy = true; phase = 'responding'; voice.listen(false); setReplyMode(null); renderVoiceInput();
  const result = game.dispatch(proposal.commands);
  if (!result.ok) { busy = false; phase = 'question'; beginAnswer(); notify('这件作品还没放好，请再试一次。'); return; }
  rememberJourney('moon', { created: state.creations.length, lastWork: proposal.record.name });
  game.emit('creation.saved', { creationId: proposal.record.id, modifying: proposal.modifying });
  await speakLine({ speaker: scene.inventionSpeaker, text: `${proposal.modifying ? '改好了' : '做出来了'}！${proposal.record.response}` }, token);
  if (token !== epoch) return;
  busy = false; phase = 'creation-review'; renderVoiceInput(); $('creation-review').hidden = false;
  $('creation-next').textContent = nextSceneIndex(story, state.sceneIndex) < 0 ? '把这段旅程收好' : '带着发现去下一站';
}

function continueCreating() {
  $('ending').hidden=true;$('speech-card').hidden=false;$('creation-review').hidden=true;
  const scene=story.scenes[state.sceneIndex];phase='question';busy=false;
  pendingChoices=scene.choices;reading.setText('还想造什么？也可以说“给刚才的作品加……”');renderAnswerOptions();beginAnswer();resumeListening();
}

async function finishStory() {
  const token = epoch;
  phase = 'complete'; busy = false; voice.listen(false); state.completed = true; persist();
  game?.emit('story.completed');
  stage.act('celebrate'); $('answer-dock').hidden = true; $('story-start').hidden = true; $('speech-card').hidden = true;
  $('ending').hidden = false; $('ending-title').textContent = story.ending.title;
  const endingLine = story.ending.companionLine.replaceAll('{firstWords}', state.firstWords || '一束安静的光').replaceAll('{skyColor}', lightMemory(state.wowEntries, 'gugu-feeling', '暖暖的')).replaceAll('{skyThing}', lightMemory(state.wowEntries, 'gugu-question', '小星星')).replaceAll('{playerName}', state.playerName || '小伙伴');
  $('ending-text').textContent = story.ending.text;
  $('save-memory').textContent = '收进我的图鉴'; $('save-memory').disabled = false;
  if (story.id === 'wow') $('save-memory').textContent = '下载我的旅程';
  $('journey-next').hidden = story.id !== 'wow';
  $('return-creating').hidden = story.id !== 'moon';
  if(story.id==='wow')rememberJourney('wow',{completed:true,question:state.firstWords || state.wowEntries.findLast(entry=>entry.id==='star-wish')?.answer || '宇宙里还有什么值得发现？'});
  await speakLine({ speaker: story.id === 'wow' ? 'wow' : 'companion', text: endingLine }, token);
}

function updateBag() {
  $('bag-count').textContent = String((state?.inventory.length || 0) + (state?.inventions.length || 0) + (state?.creations?.length || 0));
}
function openBag() {
  const content = $('bag-content'); content.replaceChildren();
  const items = [...state.inventory, ...state.inventions.map(item => ({ name: item.visual.name, description: `${item.scene}：${item.visual.details || '一路带着的小发明'}` })), ...(state.creations||[]).map(item=>({name:item.name,description:item.idea,creation:item}))];
  if (!items.length) { const p = document.createElement('p'); p.textContent = '还没有小道具。沿路遇到的礼物会收在这里。'; content.append(p); }
  items.forEach(item => {
    const section = document.createElement('section'); section.className = 'bag-item';
    const h = document.createElement('h3'); h.textContent = item.name;
    const p = document.createElement('p'); p.textContent = item.description;
    section.append(h,p);
    if(item.creation){const button=document.createElement('button');button.type='button';button.className='quiet-button';button.textContent='去看看这件作品';button.onclick=async()=>{
      $('bag-dialog').close();setStoryMenu(false);$('story-start').hidden=true;$('ending').hidden=true;$('speech-card').hidden=false;
      const i=story.scenes.findIndex(scene=>scene.id===item.creation.scene);if(i<0)return;
      const token=epoch;await enterScene(i);if(token===epoch)stage.exploration?.visitCreation(item.creation.id);
    };section.append(button);}
    content.append(section);
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
  $('creation-again').onclick = continueCreating;
  $('return-creating').onclick = continueCreating;
  $('creation-next').onclick = () => { $('creation-review').hidden=true;void advanceScene(); };
  $('restart').onclick = () => { epoch++; wowRequest?.abort(); wowRequest = null; voice.stop(); setStoryMenu(false); setReplyMode(null); state = defaultState(); persist(); openStory(story); };
  $('open-story-menu').onclick = () => setStoryMenu(!menuOpen);
  $('scene-reset').onclick = () => { stage.resetCamera(); setStoryMenu(false, true); };
  $('camera-reset').onclick = () => stage.resetCamera();
  $('speech-card').onclick = () => voice.skip();
  $('mic-button').onclick = async () => {
    const retry = voiceCapture?.state === 'error';
    if (!retry && (voice.enabled || voice.opening)) { voice.pause(); return; }
    if (!['question', 'setup'].includes(phase) || busy) return;
    if (retry) voice.pause();
    resetVoiceInput();
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
  addEventListener('pagehide', () => { answerSupport.stop(); wowRequest?.abort(); wowRequest = null; voice.stop(); });
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
  window.__DEV_STORY__ = { get status() { return { runtime: game ? { token: game.runtime.token, revision: game.runtime.state.revision, log: game.runtime.log } : null, phase, busy, storyId: story?.id || null, sceneIndex: state?.sceneIndex, setupStep, completed: Boolean(state?.completed), inventory: state?.inventory.map(item => item.id) || [], inventions: state?.inventions.map(item => item.visual.kind) || [], studio: { ...studio }, wow: story?.id === 'wow' ? { entries: state.wowEntries.length, firstWords: state.firstWords, pulseRemaining: stage.scene.getObjectByName('wow-story-props')?.userData.pulseRemaining, presentation: stage.scene.getObjectByName('wow-story-props')?.userData.state } : null, stage: stage.stats(), voice: { enabled: voice.enabled, opening: Boolean(voice.opening), recording: voice.recording, samples: voice.samples || 0, voicedSeconds: voice.voiced || 0, contextState: voice.context?.state || 'closed' } }; } };
} catch (error) {
  console.error(error);
  $('stage-loading').querySelector('p').textContent = '这个浏览器暂时无法打开立体场景，请换一个支持 WebGL 的浏览器。';
}
