// Stable scene ids survive reordered scripts. Legacy numeric checkpoints still load.
export function resolveSceneIndex(story, saved) {
  if (!saved) return 0;
  if (typeof saved.sceneId === "string") {
    const exact = story.scenes.findIndex((scene) => scene.id === saved.sceneId);
    if (exact >= 0) return exact;
    const order = Array.isArray(saved.sceneOrder) ? saved.sceneOrder : [];
    const prior = order.slice(0, order.indexOf(saved.sceneId)).reverse();
    for (const id of prior) {
      const i = story.scenes.findIndex((scene) => scene.id === id);
      if (i >= 0) return Math.min(i + 1, story.scenes.length - 1);
    }
    return 0;
  }
  return Number.isInteger(saved.sceneIndex)
    ? Math.max(0, Math.min(saved.sceneIndex, story.scenes.length - 1))
    : 0;
}
export function stampProgress(story, state) {
  state.sceneId = story.scenes[state.sceneIndex]?.id;
  state.sceneOrder = story.scenes.map((scene) => scene.id);
  state.scriptVersion = story.version || 1;
  return state;
}
export function nextSceneIndex(story, index, choice) {
  const scene = story.scenes[index];
  const next = choice?.next ?? scene.next;
  if (next === "end") return -1;
  if (next) {
    const i = story.scenes.findIndex((item) => item.id === next);
    if (i < 0) throw new Error(`Unknown next scene: ${next}`);
    return i;
  }
  return scene.final || index === story.scenes.length - 1 ? -1 : index + 1;
}
