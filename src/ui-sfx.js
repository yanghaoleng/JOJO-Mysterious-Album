import { createUISFX, cueNames } from '../vendor/uisfx.js';

const knownCues = new Set(cueNames);
const importantCues = [
  'select', 'forward', 'back', 'reward',
];

const player = createUISFX({
  pack: 'organic',
  volume: 0.38,
  maxVoices: 5,
});

let installed = false;
let unlocked = false;

function playNow(cue, options) {
  if (!knownCues.has(cue)) return null;
  return player.play(cue, options);
}

async function unlockAndPlay(cue, options) {
  if (!unlocked) unlocked = await player.unlock();
  return playNow(cue, options);
}

function inferCue(control) {
  const declared = control.dataset.uisfx;
  if (declared === 'none') return '';
  if (knownCues.has(declared)) return declared;

  const id = control.id || '';
  const text = (control.getAttribute('aria-label') || control.textContent || '').trim();
  const key = `${id} ${text}`;

  if (/返回|关闭|退出|取消|back|close|logout/i.test(key)) return /关闭|close/i.test(key) ? 'close' : 'back';
  if (/重来|再来|重试|重新|retry|replay|restart/i.test(key)) return 'retry';
  if (/复制|copy/i.test(key)) return '';
  if (/播放|试听|朗读|说一遍|play|voice/i.test(key)) return 'play';
  if (/开始|启程|叫醒|进入|继续|下一|打开|begin|start|enter|continue/i.test(key)) return /叫醒|wake/i.test(key) ? 'wake' : 'forward';
  if (/保存|收进|完成|save|complete/i.test(key)) return '';
  if (control.matches('a[href]')) return 'forward';
  if (control.matches('input[type="checkbox"], input[type="radio"], [role="switch"]')) {
    const current = control.matches('input') ? control.checked : control.getAttribute('aria-checked') === 'true';
    return current ? 'toggle-off' : 'toggle-on';
  }
  return control.matches('button, [role="button"], select') ? 'select' : '';
}

export function installUISFX() {
  if (installed || typeof document === 'undefined') return player;
  installed = true;
  player.setEnabled(true);

  const unlock = async () => {
    if (!unlocked) {
      unlocked = await player.unlock();
      if (unlocked) void player.preload(importantCues);
    }
  };

  document.addEventListener('pointerdown', unlock, { capture: true, once: true });
  document.addEventListener('keydown', unlock, { capture: true, once: true });

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const control = event.target.closest('button, a[href], [role="button"], [role="switch"], input[type="checkbox"], input[type="radio"], select');
    if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
    const cue = inferCue(control);
    if (cue) void unlockAndPlay(cue);
  }, { capture: true });

  document.addEventListener('change', event => {
    if (!(event.target instanceof HTMLInputElement) || event.target.type !== 'range') return;
    void unlockAndPlay('volume-change');
  }, { capture: true });

  window.addEventListener('pagehide', () => player.stopAll(), { capture: true });
  return player;
}

export function playUISFX(cue, options) {
  return unlockAndPlay(cue, options);
}

export function startUISFXLoop(cue, options = {}) {
  return unlockAndPlay(cue, { ...options, loop: true, retrigger: 'ignore' });
}

export function stopUISFX() {
  player.stopAll();
}

export function isUISFXCue(cue) {
  return knownCues.has(cue);
}

export { player as uiSFX };
