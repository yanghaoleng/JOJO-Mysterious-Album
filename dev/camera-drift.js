/**
 * Gentle additive camera motion. This helper owns no camera, target or baseline:
 * add its yaw/pitch to the user's orbit only while constructing camera.position,
 * then keep camera.lookAt(stage.target), the existing character framing centre.
 * Do not write the offsets back to yaw, pitch, zoom or frameCharacters().
 * Time is visible-frame seconds supplied by the stage, never wall-clock time.
 */
export const CAMERA_DRIFT_DEFAULTS = Object.freeze({
  period: 42,
  yawAmplitude: .075,
  pitchAmplitude: .02,
  quietSeconds: 8,
  fadeInSeconds: 3,
  fadeOutSeconds: .8,
});

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const setting = (value, fallback, low, high) => Number.isFinite(value) ? clamp(value, low, high) : fallback;
const smooth = value => value * value * value * (value * (value * 6 - 15) + 10);
const ZERO = Object.freeze({ yaw: 0, pitch: 0 });

export function createCameraDrift(options = {}) {
  const defaults = CAMERA_DRIFT_DEFAULTS;
  const config = Object.freeze({
    period: setting(options.period, defaults.period, 30, 50),
    yawAmplitude: setting(options.yawAmplitude, defaults.yawAmplitude, 0, .1),
    pitchAmplitude: setting(options.pitchAmplitude, defaults.pitchAmplitude, 0, .025),
    quietSeconds: setting(options.quietSeconds, defaults.quietSeconds, 6, 30),
    fadeInSeconds: setting(options.fadeInSeconds, defaults.fadeInSeconds, 1.5, 6),
    fadeOutSeconds: setting(options.fadeOutSeconds, defaults.fadeOutSeconds, .3, 1.5),
  });
  let enabled = options.enabled === true;
  let reduced = options.reduced === true;
  let phase = 0;
  let hold = 0;
  let weight = 0;
  let from = 0;
  let to = 0;
  let elapsed = 0;
  let duration = config.fadeOutSeconds;
  let offset = ZERO;

  function aim(target) {
    if (to === target) return;
    from = weight;
    to = target;
    elapsed = 0;
    duration = target === 1 ? config.fadeInSeconds : config.fadeOutSeconds;
  }

  function fade(dt) {
    elapsed = Math.min(duration, elapsed + dt);
    const progress = elapsed / duration;
    weight = progress >= 1 ? to : from + (to - from) * smooth(progress);
  }

  function reset() {
    phase = 0;
    hold = 0;
    weight = 0;
    from = 0;
    to = 0;
    elapsed = 0;
    duration = config.fadeOutSeconds;
    offset = ZERO;
    return offset;
  }

  function pause(seconds = config.quietSeconds) {
    // Wheel, pinch, drag and viewport updates all extend the same quiet window.
    // Callers cannot accidentally resume sooner than the configured minimum.
    hold = Math.max(hold, setting(seconds, config.quietSeconds, config.quietSeconds, 60));
    aim(0);
  }

  function update(dt, flags = {}) {
    if (typeof flags.enabled === 'boolean') enabled = flags.enabled;
    if (typeof flags.reduced === 'boolean') reduced = flags.reduced;
    if (!enabled || reduced) return reset();

    const seconds = Number.isFinite(dt) && dt > 0 ? dt : 0;
    const interacting = Boolean(flags.interacting || flags.interactive);
    if (interacting) {
      pause();
      fade(seconds);
      // The whole quiet window starts after the last interactive frame.
      hold = Math.max(hold, config.quietSeconds);
    } else {
      // Split an update that crosses the quiet-window boundary. The envelope
      // therefore agrees at 30/60/120 Hz and with irregular frame intervals.
      const blocked = Math.min(seconds, hold);
      if (hold > 0) { aim(0); fade(blocked); hold = Math.max(0, hold - blocked); }
      if (hold === 0) { aim(1); fade(seconds - blocked); }
    }

    phase = (phase + seconds) % config.period;
    if (weight === 0) { offset = ZERO; return offset; }
    const angle = phase / config.period * Math.PI * 2;
    offset = Object.freeze({
      yaw: config.yawAmplitude * Math.sin(angle) * weight,
      pitch: config.pitchAmplitude * Math.cos(angle) * weight,
    });
    return offset;
  }

  return {
    update,
    pause,
    interaction: pause,
    reset,
    get offset() { return offset; },
    get state() {
      return Object.freeze({ enabled, reduced, phase, weight, holdRemaining: hold, ...config });
    },
  };
}
