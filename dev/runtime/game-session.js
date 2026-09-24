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
  const flyAwayTimers = new Map();
  const presenter = createWorldPresenter(stage, {
    onLifeCommands: commands => runtime.dispatch(commands, {source:"script"}),
    onConsume: (eater, food, position) => runtime.dispatch([
      {type:'entity.move',id:eater,position},
      {type:'entity.remove',id:food},
    ], {source:'script'}),
    onInteract: (id) => {
      const entity=runtime.snapshot.worlds[runtime.context.world]?.entities[id];
      if(['prop:poop','prop:rword-poop'].includes(entity?.asset)){
        if(flyAwayTimers.has(id))return;
        const worldId=runtime.context.world;
        const result=runtime.dispatch([
          {type:'entity.state',id,state:'active'},
          {type:'entity.cue',id,cue:'fly-away'},
        ],{source:'player'});
        if(!result.ok)return;
        emit('entity.interact',{entityId:id});
        const timer=setTimeout(()=>{
          flyAwayTimers.delete(id);
          const current=runtime.snapshot.worlds[worldId]?.entities[id];
          if(runtime.context.world===worldId&&current?.asset===entity.asset&&current.createdOrder===entity.createdOrder)
            runtime.dispatch([{type:'entity.remove',id}],{source:'script'});
        },stage.reduced?160:1300);
        flyAwayTimers.set(id,timer);
        return;
      }
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
      for(const timer of flyAwayTimers.values())clearTimeout(timer);
      flyAwayTimers.clear();
      runtime.dispose();
      presenter.dispose();
      if (stage.worldPresenter === presenter) stage.worldPresenter = null;
    },
  };
}
