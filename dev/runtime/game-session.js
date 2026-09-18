import { WorldRuntime } from "./world-runtime.js";
import { StoryDirector } from "./story-director.js";
import { createIntentGateway } from "./intent-gateway.js";
import { createWorldPresenter } from "../presentation/world-presenter.js";
import { encountersFor } from "../content/encounters.js";

export function createGameSession({
  story,
  stage,
  saved,
  legacyCreations,
  onChange = () => {},
  onError = console.warn,
}) {
  let director;
  const presenter = createWorldPresenter(stage, {
    onInteract: (id) => {
      const result = runtime.dispatch(
        [{ type: "entity.state", id, state: "active" }],
        { source: "player" },
      );
      if (result.ok) emit("entity.interact", { entityId: id });
    },
  });
  stage.worldPresenter?.dispose();
  stage.worldPresenter = presenter;
  const runtime = new WorldRuntime({
    saved,
    legacyCreations,
    onChange,
    present: (...args) => presenter.sync(...args),
  });
  director = new StoryDirector(runtime, story);
  function emit(name, payload) {
    const results = director.emit(name, payload);
    for (const r of results)
      if (!r.ok) onError(`剧情事件 ${r.event}: ${r.error}`);
    return results;
  }
  return {
    runtime,
    gateway: createIntentGateway(runtime),
    emit,
    bind(scene, cast = []) {
      const actors = [
        ...new Set([
          ...cast.map((actor) => actor.id),
          ...encountersFor(story.id, scene.world).map((n) => n.id),
          ...runtime.state.creations
            .filter((c) => c.world === scene.world)
            .map((c) => c.helper),
        ]),
      ];
      director.enter(scene, actors);
    },
    dispatch(commands, source = "player") {
      // Newly created helpers also become valid actors in this scene.
      const result = runtime.dispatch(commands, { source });
      if (result.ok)
        runtime.context.actors = [
          ...new Set([
            ...runtime.context.actors,
            ...runtime.state.creations
              .filter((c) => c.world === runtime.context.world)
              .map((c) => c.helper),
          ]),
        ];
      return result;
    },
    dispose() {
      runtime.dispose();
      presenter.dispose();
      if (stage.worldPresenter === presenter) stage.worldPresenter = null;
    },
  };
}
