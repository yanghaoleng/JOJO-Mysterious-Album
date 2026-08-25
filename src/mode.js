import { activateLab, deactivateLab } from './lab.js';

const MODE_KEY = 'mengmeng-entry-mode-v1';
const gate = document.getElementById('mode-gate');
const switcher = document.getElementById('mode-switch');
const lab = document.getElementById('debug-lab');

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
  document.body.dataset.mode = next;
  gate.hidden = true;
  switcher.hidden = false;
  lab.hidden = next !== 'debug';
  switcher.textContent = next === 'debug' ? '返回故事模式' : '进入角色实验室';
  switcher.setAttribute('aria-label', switcher.textContent);
  if (persist) remember(next);

  if (next === 'debug') await activateLab();
  else deactivateLab();

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
