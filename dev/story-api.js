// The production services are stateless interpreters, but their HTTP layer
// accepts only the original scene IDs. Keep that compatibility here, without
// changing the original application or discarding the new scene's context.
const MOON_ROUTES = {
  'moon-observatory': ['moon-hill', '海底'],
  'moon-reef': ['moon-underwater', '巨人的口袋'],
  'moon-pocket': ['moon-pocket', '云层'],
  'moon-cloud': ['moon-clouds', '月球上空'],
  'moon-landing': ['moon-landing', '月球表面'],
};
const SCENE_ROUTES = {
  orchard: 'orchard-bush', bakery: 'warm-bakery', bridge: 'creaky-bridge',
  home: 'two-houses', cove: 'orchard-bush', meadow: 'orchard-bush',
  moon: 'creaky-bridge', reef: 'creaky-bridge', pocket: 'two-houses', cloud: 'doudou-home',
};

export function moonRequest(scene, inventions, answer) {
  const route = MOON_ROUTES[scene.id];
  if (!route) throw new Error('Unsupported invention scene');
  return {
    storyId: 'moon-plan', sceneId: route[0], sceneName: scene.title,
    question: scene.question, destination: route[1], constraint: scene.inventionResult,
    previousInventions: inventions.slice(-3).map(item => item.visual.name), answer,
  };
}

export function sceneRequest(scene, answer) {
  const route = scene.id === 'doudou-home' ? 'doudou-home' : SCENE_ROUTES[scene.world];
  if (!route) throw new Error('Unsupported dialogue scene');
  return {
    mode: 'scene', sceneId: route,
    question: `${scene.title}：${scene.question}`, answer,
    choices: scene.choices.map(choice => ({ id: choice.id, label: choice.label, result: choice.result, voiceHints: choice.hints })),
  };
}
