import { validateEvents, copy } from "./contracts.js";

function bind(value, payload) {
  if (typeof value === "string" && value.startsWith("$event."))
    return copy(payload[value.slice(7)] ?? null);
  if (Array.isArray(value)) return value.map((v) => bind(v, payload));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, bind(v, payload)]),
    );
  return value;
}

// Declarative event rules; no timers, dynamic code, DOM or renderer access.
export class StoryDirector {
  constructor(runtime, story) {
    this.runtime = runtime;
    this.story = story;
    this.scene = null;
    validateEvents(story.events);
  }
  enter(scene, actors = []) {
    validateEvents(scene.events);
    this.scene = scene;
    this.runtime.enter({
      storyId: this.story.id,
      sceneId: scene.id,
      world: scene.world,
      actors,
    });
  }
  emit(name, payload = {}) {
    if (!this.scene) return [];
    const results = [];
    for (const [scope, events] of [
      ["story", this.story.events || []],
      [this.scene.id, this.scene.events || []],
    ])
      for (const rule of events) {
        if (
          rule.on !== name ||
          Object.entries(rule.when || {}).some(
            ([key, value]) => payload[key] !== value,
          )
        )
          continue;
        if (
          Object.entries(rule.if || {}).some(
            ([key, value]) => this.runtime.state.flags[key] !== value,
          )
        )
          continue;
        const key = `${this.story.id}:${scope}:${rule.id}`;
        if (rule.once && this.runtime.state.completedEvents.includes(key))
          continue;
        const result = this.runtime.dispatch(bind(rule.effects, payload), {
          completedEvent: rule.once ? key : undefined,
        });
        results.push({ ...result, event: rule.id });
      }
    return results;
  }
}
