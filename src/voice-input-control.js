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
  const profiles = [.58, .82, 1, .82, .58];
  button.querySelectorAll('.voice-input-control__wave i').forEach((bar, index) => {
    const cascade = .72 + ((Math.sin(now / 106 + index * 1.12) + 1) * .14);
    const scale = .22 + value * profiles[index] * cascade;
    bar.style.setProperty('--voice-bar-scale', scale.toFixed(3));
  });
}
