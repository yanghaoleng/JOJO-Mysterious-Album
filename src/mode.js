import { installUISFX, playUISFX } from './ui-sfx.js';

installUISFX();

const gate = document.getElementById('mode-gate');
const switcher = document.getElementById('mode-switch');
const lab = document.getElementById('debug-lab');
const modeNote = gate.querySelector('.mode-note');
const originalModeNote = modeNote.textContent;
let labModule = null;
let labPromise = null;

function ensureLab() {
  labPromise ||= Promise.all([
    import('./lab.js?v=20260826-voice-call-2'),
    import('../vendor/calligraph-bubble.js?v=20260826-voice-call-2'),
  ]).then(([module]) => {
    labModule = module;
    return module;
  }).catch(error => {
    labPromise = null;
    document.documentElement.dataset.labError = error?.message || 'lab failed to start';
    throw error;
  });
  return labPromise;
}

function updateModeUrl(mode, method = 'push') {
  const url = new URL(location.href);
  if (mode) url.searchParams.set('mode', mode);
  else url.search = '';
  url.hash = '';
  history[method === 'replace' ? 'replaceState' : 'pushState']({ mode: mode || 'choose' }, '', url);
}

async function applyMode(mode, { updateUrl = true } = {}) {
  const next = 'debug';
  gate.setAttribute('aria-busy', 'true');
  gate.querySelectorAll('button[data-mode-choice]').forEach(button => { button.disabled = true; });
  modeNote.textContent = '正在打开角色实验室';
  try {
    await ensureLab();
  } catch (error) {
    console.error('Mode failed to load', error);
    gate.hidden = false;
    switcher.hidden = true;
    modeNote.textContent = '这一页暂时没有打开，请检查网络后再试一次。';
    void playUISFX('error');
    return;
  } finally {
    gate.removeAttribute('aria-busy');
    gate.querySelectorAll('button[data-mode-choice]').forEach(button => { button.disabled = false; });
  }

  document.body.dataset.mode = next;
  gate.hidden = true;
  switcher.hidden = false;
  lab.hidden = next !== 'debug';
  switcher.setAttribute('aria-label', '返回主页并选择其他模式');
  if (updateUrl) {
    updateModeUrl(next);
    void playUISFX('forward');
  }

  modeNote.textContent = originalModeNote;
  if (next === 'debug') {
    await labModule.activateLab();
  }

  window.dispatchEvent(new CustomEvent('mengmeng:mode', { detail: { mode: next } }));
}

function showHome({ updateUrl = true } = {}) {
  labModule?.deactivateLab();
  document.body.dataset.mode = 'choosing';
  lab.hidden = true;
  gate.hidden = false;
  switcher.hidden = true;
  modeNote.textContent = originalModeNote;
  if (updateUrl) updateModeUrl(null);
  window.dispatchEvent(new CustomEvent('mengmeng:mode', { detail: { mode: 'choose' } }));
  requestAnimationFrame(() => gate.querySelector('[data-mode-choice="echo"]')?.focus());
}

for (const button of gate.querySelectorAll('button[data-mode-choice]')) {
  button.addEventListener('click', () => applyMode(button.dataset.modeChoice));
}

switcher.addEventListener('click', () => showHome());

const query = new URLSearchParams(location.search).get('mode');
if (query === 'debug') applyMode(query, { updateUrl: false });
else {
  showHome({ updateUrl: false });
  if (query === 'choose') updateModeUrl(null, 'replace');
}

window.addEventListener('popstate', () => {
  const mode = new URLSearchParams(location.search).get('mode');
  if (mode === 'debug') applyMode(mode, { updateUrl: false });
  else showHome({ updateUrl: false });
});

export { applyMode, showHome };
