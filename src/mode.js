const gate = document.getElementById('mode-gate');
const switcher = document.getElementById('mode-switch');
const lab = document.getElementById('debug-lab');
const modeNote = gate.querySelector('.mode-note');
const originalModeNote = modeNote.textContent;
let labModule = null;
let storyModule = null;
let storyPromise = null;
let labPromise = null;

function ensureStory() {
  storyPromise ||= import('./adventure.js').then(module => {
    storyModule = module;
    return module;
  }).catch(error => {
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

function updateModeUrl(mode, method = 'push') {
  const url = new URL(location.href);
  if (mode) url.searchParams.set('mode', mode);
  else url.search = '';
  url.hash = '';
  history[method === 'replace' ? 'replaceState' : 'pushState']({ mode: mode || 'choose' }, '', url);
}

async function applyMode(mode, { updateUrl = true } = {}) {
  const next = mode === 'debug' ? 'debug' : 'story';
  gate.setAttribute('aria-busy', 'true');
  gate.querySelectorAll('button[data-mode-choice]').forEach(button => { button.disabled = true; });
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
    gate.querySelectorAll('button[data-mode-choice]').forEach(button => { button.disabled = false; });
  }

  document.body.dataset.mode = next;
  gate.hidden = true;
  switcher.hidden = false;
  lab.hidden = next !== 'debug';
  switcher.textContent = '返回主页';
  switcher.setAttribute('aria-label', '返回主页并选择其他模式');
  if (updateUrl) updateModeUrl(next);

  modeNote.textContent = originalModeNote;
  if (next === 'debug') {
    storyModule?.deactivateStory?.();
    await labModule.activateLab();
  } else {
    labModule?.deactivateLab();
  }

  window.dispatchEvent(new CustomEvent('mengmeng:mode', { detail: { mode: next } }));
}

function showHome({ updateUrl = true } = {}) {
  storyModule?.deactivateStory?.();
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
if (query === 'story' || query === 'debug') applyMode(query, { updateUrl: false });
else {
  showHome({ updateUrl: false });
  if (query === 'choose') updateModeUrl(null, 'replace');
}

window.addEventListener('popstate', () => {
  const mode = new URLSearchParams(location.search).get('mode');
  if (mode === 'story' || mode === 'debug') applyMode(mode, { updateUrl: false });
  else showHome({ updateUrl: false });
});

export { applyMode, showHome };
