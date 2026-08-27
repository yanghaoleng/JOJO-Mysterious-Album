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
  button.querySelectorAll('.voice-input-control__wave i').forEach((bar, index) => {
    bar.style.setProperty('--voice-bar-scale', String([.32, .46, .36][index]));
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
  const scales = [
    .28 + value * .56,
    .40 + value * .60,
    .32 + value * .72,
  ];
  button.querySelectorAll('.voice-input-control__wave i').forEach((bar, index) => {
    bar.style.setProperty('--voice-bar-scale', scales[index].toFixed(3));
  });
}
