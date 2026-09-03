import { STORY_CHARACTER_TEMPLATES } from './story-character-templates.js';
import { SeedRealtimeSpeech } from './seed-realtime-speech.js?v=20260827-ios-clean-audio';
import { installUISFX, playUISFX } from './ui-sfx.js?v=20260831-always-on';
import { mountAppNavigation } from './app-navigation.js?v=20260828-style-editor';
import { trackAnalytics } from './analytics.js';
import { DebateCharacterRenderer } from './debate-character-renderer.js?v=20260903-debate';

installUISFX();
mountAppNavigation(document.getElementById('debate-navigation'), { homeHref: './' });

const $ = id => document.getElementById(id);
const VOICES = ['bright', 'gentle', 'bubble', 'moss', 'star', 'clever', 'sweet', 'clear', 'soft', 'caring', 'lively', 'neighbor'];
const templates = STORY_CHARACTER_TEMPLATES.map((item, index) => ({ ...item, voice: VOICES[index % VOICES.length] }));
const state = { selected: [templates[4].id, templates[7].id], result: null, index: 0, paused: false, ended: false, playId: 0 };
let characterRenderers = [];
const speech = new SeedRealtimeSpeech({ onError: () => setStatus('角色声音暂时没连上，文字讨论仍会继续。') });

function setStatus(text = '') { $('status').textContent = text; }
function template(id) { return templates.find(item => item.id === id) || templates[0]; }
function renderPicker() {
  $('character-picker').replaceChildren(...templates.map(item => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'character-option';
    const order = state.selected.indexOf(item.id);
    button.setAttribute('aria-pressed', String(order >= 0));
    button.dataset.order = order >= 0 ? String(order + 1) : '';
    const icon = item.parts?.crest?.style === 'bunny' ? '🐰' : item.species === 'dog' ? '🐶' : item.species === 'cat' ? '🐱' : '✨';
    button.innerHTML = `<span aria-hidden="true">${icon}</span><small>${item.name}</small>`;
    button.addEventListener('click', () => {
      const found = state.selected.indexOf(item.id);
      if (found >= 0) state.selected.splice(found, 1);
      else if (state.selected.length < 2) state.selected.push(item.id);
      else state.selected = [state.selected[1], item.id];
      renderPicker();
    });
    return button;
  }));
}

function setupStage() {
  characterRenderers.forEach(renderer => renderer.dispose());
  characterRenderers = [];
  state.selected.forEach((id, index) => {
    const item = template(id); const host = $(index ? 'speaker-b' : 'speaker-a');
    host.querySelector('b').textContent = item.name;
    characterRenderers.push(new DebateCharacterRenderer(host.querySelector('canvas'), item));
  });
  $('turn-progress').replaceChildren(...state.result.turns.map(() => document.createElement('i')));
  $('topic-text').textContent = state.result.topic;
}

function finishPlayback() {
  state.ended = true; speech.stop();
  characterRenderers.forEach(renderer => renderer.setState('idle'));
  $('theatre').hidden = true; $('reflection').hidden = false;
  $('closing-question').textContent = state.result.closingQuestion;
  $('reflection').scrollIntoView({ behavior: 'smooth' });
  trackAnalytics('debate_heard_both_sides', { depth: 4 });
}

async function playCurrent() {
  const playId = ++state.playId;
  if (state.paused || state.ended) return;
  const turn = state.result?.turns[state.index];
  if (!turn) return finishPlayback();
  const person = template(turn.speakerId);
  const side = state.selected.indexOf(turn.speakerId);
  $('speaker-a').classList.toggle('active', side === 0);
  $('speaker-b').classList.toggle('active', side === 1);
  characterRenderers.forEach((renderer, index) => renderer.setState(index === side ? 'talking' : 'thinking'));
  $('speech-name').textContent = person.name;
  $('speech-text').textContent = turn.text;
  $('round-label').textContent = `${{ opening: '开场想法', response: '换个角度回应', closing: '最后提醒' }[turn.phase]} · ${state.index + 1}/6`;
  [...$('turn-progress').children].forEach((dot, index) => dot.classList.toggle('done', index <= state.index));
  void playUISFX('select', { volume: .08 });
  await speech.unlock();
  await speech.speak(turn.text, person.voice);
  if (playId !== state.playId || state.paused || state.ended) return;
  state.index += 1;
  setTimeout(() => { if (playId === state.playId) void playCurrent(); }, 420);
}

async function startDebate(event) {
  event.preventDefault();
  const question = $('question').value.trim();
  if (!question || state.selected.length !== 2) return setStatus('请写下一个问题，并选择两个不同的角色。');
  $('start-debate').disabled = true; setStatus('两个角色正在整理不同的想法……');
  await speech.unlock();
  try {
    const speakers = state.selected.map(id => { const item = template(id); return { id, name: item.name, hint: item.hint }; });
    const response = await fetch('/api/debate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, speakers }) });
    if (!response.ok) throw new Error(`debate_${response.status}`);
    const result = await response.json();
    if (result.allowed === false) return setStatus(result.safeMessage || '换一个适合一起讨论的问题吧。');
    state.result = result; state.index = 0; state.paused = false; state.ended = false;
    $('setup').hidden = true; $('theatre').hidden = false; setStatus(''); setupStage();
    trackAnalytics('debate_started', { depth: 2 });
    void playCurrent();
  } catch (error) {
    console.error(error); setStatus('观点小剧场暂时没连上，请稍后再试。');
  } finally { $('start-debate').disabled = false; }
}

$('debate-form').addEventListener('submit', startDebate);
document.querySelectorAll('[data-question]').forEach(button => {
  button.addEventListener('click', () => {
    $('question').value = button.dataset.question;
    document.querySelectorAll('[data-question]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    setStatus('问题已经选好了，还可以继续修改。');
    $('question').focus({ preventScroll: true });
    trackAnalytics('debate_suggested_question_selected', { depth: 1 });
  });
});
$('question').addEventListener('input', () => {
  document.querySelectorAll('[data-question]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.question === $('question').value.trim())));
});
$('toggle-play').addEventListener('click', () => {
  state.paused = !state.paused;
  $('toggle-play').textContent = state.paused ? '继续' : '暂停';
  if (state.paused) { state.playId += 1; speech.stop(); } else void playCurrent();
});
$('skip-turn').addEventListener('click', () => { state.playId += 1; speech.stop(); state.index += 1; void playCurrent(); });
$('end-debate').addEventListener('click', finishPlayback);
$('reflection-form').addEventListener('submit', event => {
  event.preventDefault(); const opinion = $('child-opinion').value.trim();
  $('reflection').hidden = true; $('ending').hidden = false;
  $('common-ground').textContent = state.result.commonGround;
  $('opinion-response').textContent = opinion ? '谢谢你也放进了自己的想法。你不需要马上选出唯一答案，可以带着这些理由继续观察。' : '不急着回答也可以。能听见不同理由，本身就是一次认真思考。';
  trackAnalytics('debate_completed', { depth: 6 });
});
$('restart').addEventListener('click', () => {
  speech.stop(); state.result = null; state.index = 0; state.ended = false;
  $('ending').hidden = true; $('setup').hidden = false; $('child-opinion').value = ''; setStatus('');
  scrollTo({ top: 0, behavior: 'smooth' });
});

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
$('question-mic').addEventListener('click', () => {
  if (!Recognition) return setStatus('这个浏览器暂时不能直接听写，可以用键盘写下问题。');
  const recognition = new Recognition(); recognition.lang = 'zh-CN'; recognition.interimResults = true;
  recognition.onstart = () => { $('question-mic').textContent = '⏹'; setStatus('正在听你说问题……'); };
  recognition.onresult = event => { $('question').value = [...event.results].map(item => item[0].transcript).join('').slice(0, 80); };
  recognition.onerror = () => setStatus('没有听清楚，可以再试一次或直接打字。');
  recognition.onend = () => { $('question-mic').textContent = '🎙️'; if ($('question').value.trim()) setStatus('问题已经写好了，可以开始。'); };
  recognition.start();
});

renderPicker();
trackAnalytics('debate_open', { depth: 1 });
addEventListener('pagehide', () => characterRenderers.forEach(renderer => renderer.dispose()), { once: true });
