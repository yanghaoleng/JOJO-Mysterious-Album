import { mountProductIcons } from '../vendor/ui-icons.js?v=20260828-product-icons';

const VISUAL_BY_STATE = {
  listening: 'wave',
  requesting: 'thinking',
  thinking: 'thinking',
  speaking: 'thinking',
  streaming: 'thinking',
};

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));

export function mountVoiceInputControl(button) {
  if (!button || button.dataset.voiceControlMounted === 'true') return button;
  button.dataset.voiceControlMounted = 'true';
  if (!button.querySelector('.voice-input-control__start')) return button;
  mountProductIcons(button);
  button.querySelectorAll('.voice-input-control__wave i').forEach((bar, index) => {
    bar.style.setProperty('--voice-wave-delay', `${Math.sin(index) * .5}s`);
  });
  button.querySelectorAll('.voice-input-control__thinking i').forEach((dot, index) => {
    dot.style.setProperty('--voice-dot-turn', `${index * 45}deg`);
    dot.style.setProperty('--voice-dot-delay', `${index * 150}ms`);
  });
  return button;
}

export function setVoiceInputControlState(button, state = 'setup') {
  if (!button) return;
  mountVoiceInputControl(button);
  button.dataset.state = state;
  button.dataset.voiceVisual = VISUAL_BY_STATE[state] || 'permission';
  if (button.dataset.voiceVisual !== 'wave') setVoiceInputControlLevel(button, 0);
}

export function setVoiceInputControlLevel(button, level) {
  if (!button) return;
  mountVoiceInputControl(button);
  const value = clamp(level);
  button.style.setProperty('--voice-level', value.toFixed(3));
  const now = performance.now();
  const profiles = [.42, .58, .78, .94, 1, .84, .62, .46];
  button.querySelectorAll('.voice-input-control__wave i').forEach((bar, index) => {
    const cascade = .76 + ((Math.sin(now / 106 + index * 1.12) + 1) * .12);
    const scale = .58 + value * profiles[index] * cascade;
    bar.style.setProperty('--voice-bar-scale', scale.toFixed(3));
  });
}
