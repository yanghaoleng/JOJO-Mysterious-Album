const MODE_KEY = 'mengmeng-entry-mode-v1';
const gate = document.getElementById('mode-gate');
const switcher = document.getElementById('mode-switch');
const lab = document.getElementById('debug-lab');
const modeNote = gate.querySelector('.mode-note');
const originalModeNote = modeNote.textContent;
let labModule = null;
let storyPromise = null;
let labPromise = null;

function ensureStory() {
  storyPromise ||= import('./adventure.js').catch(error => {
    storyPromise = null;
    document.documentElement.dataset.sceneError = error?.message || 'scene failed to start';
    throw error;
  });
  return storyPromise;
}

function ensureLab() {
  labPromise ||= Promise.all([
    import('./lab.js'),
    import('../vendor/calligraph-bubble.js'),
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

function storedMode() {
  try {
    const value = localStorage.getItem(MODE_KEY);
    return value === 'story' || value === 'debug' ? value : null;
  } catch {
    return null;
  }
}

function remember(mode) {
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* local mode still works */ }
}

async function applyMode(mode, { persist = true } = {}) {
  const next = mode === 'debug' ? 'debug' : 'story';
  gate.setAttribute('aria-busy', 'true');
  gate.querySelectorAll('[data-mode-choice]').forEach(button => { button.disabled = true; });
  modeNote.textContent = next === 'debug' ? '正在打开角色实验室' : '正在铺开第一张图鉴';
  try {
    if (next === 'debug') await ensureLab();
    else await ensureStory();
  } catch (error) {
    console.error('Mode failed to load', error);
    gate.hidden = false;
    switcher.hidden = true;
    modeNote.textContent = '这一页暂时没有打开，请检查网络后再试一次。';
    return;
  } finally {
    gate.removeAttribute('aria-busy');
    gate.querySelectorAll('[data-mode-choice]').forEach(button => { button.disabled = false; });
  }

  document.body.dataset.mode = next;
  gate.hidden = true;
  switcher.hidden = false;
  lab.hidden = next !== 'debug';
  switcher.textContent = next === 'debug' ? '返回故事模式' : '进入角色实验室';
  switcher.setAttribute('aria-label', switcher.textContent);
  if (persist) remember(next);

  modeNote.textContent = originalModeNote;
  if (next === 'debug') await labModule.activateLab();
  else labModule?.deactivateLab();

  window.dispatchEvent(new CustomEvent('mengmeng:mode', { detail: { mode: next } }));
}

for (const button of gate.querySelectorAll('[data-mode-choice]')) {
  button.addEventListener('click', () => applyMode(button.dataset.modeChoice));
}

switcher.addEventListener('click', () => {
  applyMode(document.body.dataset.mode === 'debug' ? 'story' : 'debug');
});

const query = new URLSearchParams(location.search).get('mode');
if (query === 'choose') {
  document.body.dataset.mode = 'choosing';
  gate.hidden = false;
  switcher.hidden = true;
  requestAnimationFrame(() => gate.querySelector('[data-mode-choice="story"]')?.focus());
} else if (query === 'story' || query === 'debug') {
  applyMode(query, { persist: false });
} else {
  const saved = storedMode();
  if (saved) applyMode(saved, { persist: false });
  else {
    document.body.dataset.mode = 'choosing';
    gate.hidden = false;
    switcher.hidden = true;
    requestAnimationFrame(() => gate.querySelector('[data-mode-choice="story"]')?.focus());
  }
}

export { applyMode };
