/** Story-specific planet sizes and the shared, pastel atmosphere contract.
 * Sky colors stay pale even at night; local key light keeps every face readable.
 * Radii are world units used by geometry and gravity, never visual scale factors.
 */
const DAY_LIGHT = {
  sky: '#dcebd9', bounce: '#ecd5b1', sun: '#fff0d0', rim: '#e5eef4',
  hemisphereIntensity: 1.9, sunIntensity: 2.35, rimIntensity: 0.72, exposure: 1.06,
};
const NIGHT_LIGHT = {
  sky: '#b9c9ed', bounce: '#dac9b1', sun: '#fff0d8', rim: '#b8d0ff',
  hemisphereIntensity: 1.85, sunIntensity: 2.1, rimIntensity: 1.05, exposure: 1.13,
};
const DUSK_LIGHT = {
  sky: '#e1cce1', bounce: '#e5c6ae', sun: '#ffe5c9', rim: '#d7d5f4',
  hemisphereIntensity: 1.85, sunIntensity: 2.25, rimIntensity: 0.85, exposure: 1.1,
};

const environment = (radius, period, colors, lighting = {}) => Object.freeze({
  radius,
  atmosphere: Object.freeze({
    period, ...colors,
    lighting: Object.freeze({ ...(period === 'night' ? NIGHT_LIGHT : period === 'dusk' ? DUSK_LIGHT : DAY_LIGHT), ...lighting }),
  }),
});

export const WORLD_ENVIRONMENTS = Object.freeze({
  orchard: environment(5.6, 'day', {
    base: '#f2efe2', glow: '#fff5d5', horizon: '#dce9d5',
    ink: '#343d30', muted: '#5e6854', accent: '#67834c', paper: '#fffaf0',
  }),
  bakery: environment(4.5, 'day', {
    base: '#f6eade', glow: '#fff2d4', horizon: '#ebd6c4',
    ink: '#493b32', muted: '#6f5a4b', accent: '#ad7850', paper: '#fff9ef',
  }, { sky: '#eee0ce', sun: '#ffead0', bounce: '#e2bd97' }),
  bridge: environment(5.9, 'day', {
    base: '#eaf0e5', glow: '#faf4da', horizon: '#d0e4df',
    ink: '#33433c', muted: '#51665c', accent: '#628b76', paper: '#f9fcf2',
  }, { sky: '#d4e8e4', rim: '#deedf2' }),
  home: environment(5.1, 'day', {
    base: '#f4edde', glow: '#fff2cb', horizon: '#e6dbc5',
    ink: '#453c32', muted: '#6a5e4c', accent: '#aa7957', paper: '#fff9eb',
  }, { sky: '#eee4d1', sun: '#ffe9c5', bounce: '#e5c49f' }),
  observatory: environment(4.35, 'night', {
    base: '#e3e7f3', glow: '#f4ecd7', horizon: '#bbc9e2',
    ink: '#303950', muted: '#4b5365', accent: '#6c7aa4', paper: '#f7f6fd',
  }),
  reef: environment(5.7, 'day', {
    base: '#e2eff1', glow: '#f0faf0', horizon: '#bedee2',
    ink: '#31444b', muted: '#496168', accent: '#518d9b', paper: '#f5fcfa',
  }, { sky: '#c8e5ed', bounce: '#c7d7ca', sun: '#eefbef', rim: '#c9edfa', exposure: 1.1 }),
  pocket: environment(3.8, 'dusk', {
    base: '#f0e4eb', glow: '#ffe9d8', horizon: '#dccce8',
    ink: '#48394e', muted: '#65536a', accent: '#9b708a', paper: '#fcf5f8',
  }),
  cloud: environment(3.55, 'day', {
    base: '#e9eff5', glow: '#fffae9', horizon: '#d5e3f1',
    ink: '#394450', muted: '#586473', accent: '#6d90b2', paper: '#fcfcf8',
  }, { sky: '#deecf7', bounce: '#e7ddd4', sun: '#fff8e5', rim: '#edf6ff', exposure: 1.08 }),
  moon: environment(4.65, 'night', {
    base: '#e5e5f1', glow: '#fbf0d6', horizon: '#c2c6e3',
    ink: '#35364d', muted: '#515062', accent: '#8380ac', paper: '#f8f6fc',
  }, { sky: '#c2c7ec', rim: '#c4d4ff', bounce: '#ded2bd', exposure: 1.15 }),
  meadow: environment(6, 'night', {
    base: '#e2eae6', glow: '#f4f0ca', horizon: '#b9d0cc',
    ink: '#30443f', muted: '#465952', accent: '#648d78', paper: '#f4f9ef',
  }, { sky: '#adcfcf', bounce: '#d7d2ac', sun: '#fff1c4', rim: '#b8dfe2', exposure: 1.12 }),
  cove: environment(5.35, 'day', {
    base: '#eeeee2', glow: '#fff0d5', horizon: '#cfe6df',
    ink: '#35453d', muted: '#56665c', accent: '#729680', paper: '#fcfbef',
  }, { sky: '#d4e7e0', bounce: '#e7d0b6', sun: '#ffe7c2', rim: '#dbedf2', exposure: 1.09 }),
});
