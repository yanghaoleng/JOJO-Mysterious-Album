import { identityReady } from './anonymous-identity.js?v=20260920-user-id';

const VISITOR_KEY = 'mengmeng-visitor-v1';
const ENDPOINT = '/api/analytics/collect';

function randomId(prefix) {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${value.replaceAll('-', '')}`;
}

function persistentVisitor() {
  try {
    let value = localStorage.getItem(VISITOR_KEY);
    if (!value) {
      value = randomId('v');
      localStorage.setItem(VISITOR_KEY, value);
    }
    return value;
  } catch {
    return randomId('v');
  }
}

function safeName(value) {
  return String(value || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

function sourceContext() {
  try {
    const params = new URLSearchParams(location.search);
    const campaign = params.get('utm_source') || params.get('from') || '';
    if (campaign) return { source: safeName(campaign) || 'campaign', detail: safeName(params.get('utm_campaign') || '') };
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (!referrer || referrer.origin === location.origin) return { source: 'direct', detail: '' };
    return { source: safeName(referrer.hostname) || 'referrer', detail: safeName(referrer.hostname) };
  } catch {
    return { source: 'direct', detail: '' };
  }
}

function safeProperties(value) {
  if (!value || typeof value !== 'object') return {};
  const allowed = new Set(['correct', 'coverage', 'targetCount', 'matchedCount', 'durationMs', 'source', 'lessonId']);
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => {
    if (!allowed.has(key)) return false;
    return typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item)) || typeof item === 'string';
  }).map(([key, item]) => [key, typeof item === 'string' ? item.slice(0, 120) : item]));
}

const source = sourceContext();

const state = {
  visitorId: persistentVisitor(),
  sessionId: randomId('s'),
  viewId: randomId('p'),
  page: safeName(document.body.dataset.analyticsPage) || 'choose',
  chapter: safeName(document.body.dataset.analyticsChapter) || safeName(document.body.dataset.analyticsPage) || 'choose',
  source: source.source,
  sourceDetail: source.detail,
  startedAt: Date.now(),
  activeMs: 0,
  activeSince: 0,
  depth: 0,
  interactionCount: 0,
  events: [],
  timer: 0,
};

function pageIsActive() {
  return document.visibilityState === 'visible' && document.hasFocus();
}

function closeActiveSlice() {
  if (!state.activeSince) return;
  state.activeMs += Math.max(0, performance.now() - state.activeSince);
  state.activeSince = 0;
}

function openActiveSlice() {
  if (!state.activeSince && pageIsActive()) state.activeSince = performance.now();
}

function snapshot() {
  const liveSlice = state.activeSince ? Math.max(0, performance.now() - state.activeSince) : 0;
  return {
    visitorId: state.visitorId,
    sessionId: state.sessionId,
    viewId: state.viewId,
    page: state.page,
    chapter: state.chapter,
    source: state.source,
    sourceDetail: state.sourceDetail,
    startedAt: state.startedAt,
    activeMs: Math.round(state.activeMs + liveSlice),
    depth: state.depth,
    interactionCount: state.interactionCount,
    events: state.events.splice(0),
  };
}

async function flush({ beacon = false } = {}) {
  const body = JSON.stringify(snapshot());
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    return;
  }
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'same-origin',
    });
    if (!response.ok) throw new Error('analytics_unavailable');
  } catch {
    // Analytics must never interrupt the child's experience.
  }
}

function beginPage(page) {
  const next = safeName(page) || 'unknown';
  if (next === state.page) return;
  closeActiveSlice();
  flush();
  state.viewId = randomId('p');
  state.page = next;
  state.chapter = safeName(document.body.dataset.analyticsChapter) || next;
  state.startedAt = Date.now();
  state.activeMs = 0;
  state.activeSince = 0;
  state.depth = 0;
  state.interactionCount = 0;
  state.events = [];
  openActiveSlice();
  flush();
}

export function trackAnalytics(name, { depth = state.depth, chapter = state.chapter, properties = {} } = {}) {
  const eventName = safeName(name);
  if (!eventName) return;
  state.depth = Math.max(state.depth, Math.min(100, Number(depth) || 0));
  state.interactionCount += 1;
  state.events.push({
    id: randomId('e'),
    name: eventName,
    at: Date.now(),
    depth: state.depth,
    chapter: safeName(chapter) || state.chapter,
    properties: safeProperties(properties),
  });
  if (state.events.length >= 8) flush();
}

const clickIdEvents = {
  'start-adventure': ['story_start', 1],
  'custom-idea-toggle': ['story_custom_trait_open', 2],
  'custom-idea-submit': ['story_custom_trait_submit', 2],
  'confirm-name': ['story_name_confirm', 4],
  'enter-world': ['story_world_enter', 5],
  'guide-action': ['story_guide_action', 8],
  'save-card': ['story_card_save', 11],
  replay: ['story_replay', 11],
  'restart-interview': ['profile_restart', 1],
  'lab-random': ['lab_random_character', 2],
  'copy-recipe': ['lab_recipe_copy', 2],
  'script-replay': ['lab_script_replay', 4],
  'script-exit': ['lab_script_exit', 4],
};

document.addEventListener('click', event => {
  const modeChoice = event.target.closest('[data-mode-choice]');
  if (modeChoice?.dataset.modeChoice) {
    trackAnalytics(`choose_mode_${modeChoice.dataset.modeChoice}`, { depth: 1 });
    return;
  }
  const button = event.target.closest('button');
  if (!button) return;
  if (clickIdEvents[button.id]) {
    const [name, depth] = clickIdEvents[button.id];
    trackAnalytics(name, { depth });
    return;
  }
  const keyed = [
    ['labTab', 'lab_tab', 1],
    ['voice', 'lab_voice', 2],
    ['action', 'lab_action', 2],
    ['expression', 'lab_expression', 2],
    ['sceneId', 'lab_scene', 2],
    ['templateId', 'lab_template', 2],
    ['trait', 'story_trait', 2],
    ['heart', 'story_heart', 3],
  ];
  for (const [key, prefix, depth] of keyed) {
    if (button.dataset[key]) {
      trackAnalytics(`${prefix}_${button.dataset[key]}`, { depth });
      return;
    }
  }
}, { capture: true });

window.addEventListener('mengmeng:mode', event => beginPage(event.detail?.mode || 'story'));
window.addEventListener('focus', openActiveSlice);
window.addEventListener('blur', closeActiveSlice);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') openActiveSlice();
  else { closeActiveSlice(); flush({ beacon: true }); }
});
window.addEventListener('pagehide', () => {
  closeActiveSlice();
  flush({ beacon: true });
});

openActiveSlice();
flush();
void identityReady.finally(() => flush());
state.timer = window.setInterval(flush, 15_000);

export function setAnalyticsPage(page) {
  beginPage(page);
}

export function setAnalyticsChapter(chapter) {
  const next = safeName(chapter) || state.page;
  if (next === state.chapter) return;
  state.chapter = next;
  flush();
}

export function trackVoiceAttempt({ chapter, lessonId, durationMs = 0, source = 'asr', asrOk = true, correct = false, coverage = 0, targetCount = 0, matchedCount = 0 } = {}) {
  const body = JSON.stringify({
    attemptId: randomId('a'),
    visitorId: state.visitorId,
    sessionId: state.sessionId,
    chapter: safeName(chapter) || state.chapter,
    lessonId: safeName(lessonId) || 'unknown',
    durationMs: Math.round(Number(durationMs) || 0),
    source: source === 'realtime' ? 'realtime' : 'asr',
    asrOk: Boolean(asrOk),
    correct: Boolean(correct),
    coverage: Math.max(0, Math.min(1, Number(coverage) || 0)),
    targetCount: Math.max(0, Math.round(Number(targetCount) || 0)),
    matchedCount: Math.max(0, Math.round(Number(matchedCount) || 0)),
    attemptedAt: Date.now(),
  });
  void fetch('/api/analytics/voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {});
}
