import assert from "node:assert/strict";
import { readFile, access, readdir } from "node:fs/promises";
import { WorldRuntime } from "../runtime/world-runtime.js";
import { StoryDirector } from "../runtime/story-director.js";
import { createIntentGateway } from "../runtime/intent-gateway.js";
import {
  resolveSceneIndex,
  nextSceneIndex,
  stampProgress,
} from "../runtime/story-progress.js";
import { validateEvents, validateCommand } from "../runtime/contracts.js";
import { prepareCreation } from "../features/creation-service.js";
import { ASSETS } from "../content/assets.js";
import { PROP_IDS } from "../content/props.js";
import { PROP_BUILDERS } from "../modules/props/registry.js";
import { MODULE_CATALOG } from "../modules/catalog.js";
import { EVENT_PLAYGROUND } from "../content/examples/event-playground.js";
import { WOW_DEV_STORY } from "../content/stories/wow.js";
import { MOON_CURIOSITY_STORY } from "../content/stories/moon.js";
import { DEBATE_STORY } from "../content/stories/debate.js";

let renders = 0,
  saves = 0;
const runtime = new WorldRuntime({
  onChange: () => saves++,
  present: () => renders++,
});
const director = new StoryDirector(runtime, EVENT_PLAYGROUND);
director.enter({ id: "showcase-scene", world: "meadow" }, ["guide"]);
director.emit("scene.enter");
assert.equal(Object.keys(runtime.snapshot.worlds.meadow.entities).length, 2);
const onceRevision = runtime.state.revision;
director.emit("scene.enter");
assert.equal(runtime.state.revision, onceRevision);
assert.equal(director.emit("entity.interact", { entityId: "other" }).length, 0);
director.emit("entity.interact", { entityId: "demo-windmill" });
assert.equal(runtime.state.flags["asked-windmill"], true);
director.emit("demo.garden");
director.emit("demo.night");
assert.ok(runtime.state.worlds.meadow.entities["idea-garden"]);
assert.equal(runtime.state.worlds.meadow.environment, "night");
director.emit("demo.remove");
assert.ok(!runtime.state.worlds.meadow.entities["idea-garden"]);
const before = runtime.snapshot,
  renderBefore = renders,
  saveBefore = saves;
for (const invalid of [
  { type: "entity.spawn", id: "broken", asset: "prop:nope", position: [0, 0] },
  {
    type: "entity.spawn",
    id: "broken",
    asset: "prop:garden",
    position: [Infinity, 0],
  },
  { type: "entity.state", id: "missing", state: "active" },
  { type: "entity.animate", id: "demo-windmill", animation: "walk" },
  { type: "actor.animate", target: "absent", animation: "wave" },
  { type: "runJavaScript", code: "alert(1)" },
  JSON.parse('{"type":"flag.set","key":"__proto__","value":true}'),
]) {
  const result = runtime.dispatch([
    { type: "environment.set", preset: "day" },
    invalid,
  ]);
  assert.equal(result.ok, false, JSON.stringify(invalid));
  assert.deepEqual(runtime.snapshot, before);
}
assert.equal(renders, renderBefore);
assert.equal(saves, saveBefore);
const gateway = createIntentGateway(runtime),
  description = gateway.describe();
description.scene.world = "moon";
assert.equal(runtime.context.world, "meadow");
const envelope = {
  version: 1,
  context: runtime.token,
  commands: [{ type: "entity.color", id: "demo-windmill", color: "#95becb" }],
};
assert.equal(gateway.apply(envelope).ok, true);
assert.equal(
  gateway.apply(envelope).ok,
  false,
  "Replayed old proposal must fail",
);
assert.equal(
  gateway.apply({
    version: 1,
    context: runtime.token,
    commands: [{ type: "flag.set", key: "skip-story", value: true }],
  }).ok,
  false,
);
const oldScene = runtime.token;
director.enter({ id: "different-scene", world: "moon" });
assert.equal(gateway.apply({ ...envelope, context: oldScene }).ok, false);
const restored = new WorldRuntime({ saved: runtime.snapshot });
assert.deepEqual(restored.snapshot, runtime.snapshot);
const restoredDirector = new StoryDirector(restored, EVENT_PLAYGROUND);
restoredDirector.enter({ id: "showcase-scene", world: "meadow" });
assert.equal(
  restoredDirector.emit("scene.enter").length,
  0,
  "One-time events survive save and scene revisit",
);
const conditional = new StoryDirector(restored, {
  id: "test",
  events: [
    {
      id: "only-after-question",
      on: "try",
      if: { "asked-windmill": true },
      effects: [{ type: "entity.state", id: "demo-windmill", state: "idle" }],
    },
  ],
});
conditional.enter({ id: "test-scene", world: "meadow" });
assert.equal(conditional.emit("try")[0].ok, true);
const bound = new StoryDirector(restored, {
  id: "test",
  events: [
    {
      id: "parameter",
      on: "touch",
      effects: [
        {
          type: "entity.animate",
          id: "$event.entityId",
          animation: "activate",
        },
      ],
    },
  ],
});
bound.enter({ id: "test-scene", world: "meadow" });
assert.equal(bound.emit("touch", { entityId: "demo-windmill" })[0].ok, true);

const scene = MOON_CURIOSITY_STORY.scenes[0];
runtime.enter({
  storyId: "moon",
  sceneId: scene.id,
  world: scene.world,
  actors: [],
});
const first = prepareCreation({
  text: "请铃铛做一座蓝色桥和花园",
  scene,
  creations: [],
  position: () => [0, 1, 0],
  id: "test-creation",
});
assert.equal(first.ok, true);
assert.equal(runtime.dispatch(first.commands).ok, true);
const modified = prepareCreation({
  text: "给刚才的作品加一个机器人",
  scene,
  creations: runtime.state.creations,
  position: () => null,
  id: "ignored",
});
assert.equal(modified.record.id, first.record.id);
assert.equal(modified.record.helper, "lingdang");
assert.equal(runtime.dispatch(modified.commands).ok, true);
assert.equal(runtime.state.creations.length, 1);
const migrated = new WorldRuntime({ legacyCreations: runtime.state.creations });
assert.deepEqual(migrated.state.creations, runtime.state.creations);
const dirty = new WorldRuntime({
  saved: {
    version: 1,
    worlds: {
      meadow: {
        entities: {
          bad: { id: "bad", asset: "url:remote-code", position: [0, 0] },
        },
      },
    },
    creations: [{ id: "bad" }],
  },
});
assert.equal(dirty.state.creations.length, 0);
const story = {
  version: 2,
  scenes: [
    { id: "a" },
    { id: "inserted" },
    { id: "b", next: "c" },
    { id: "c" },
  ],
};
assert.equal(resolveSceneIndex(story, { sceneId: "b", sceneIndex: 1 }), 2);
assert.equal(
  resolveSceneIndex(story, {
    sceneId: "deleted",
    sceneOrder: ["a", "deleted", "c"],
  }),
  1,
);
assert.equal(resolveSceneIndex(story, { sceneIndex: 1 }), 1);
assert.equal(nextSceneIndex(story, 2), 3);
assert.equal(nextSceneIndex(story, 0, { next: "c" }), 3);
assert.equal(nextSceneIndex(story, 0, { next: "end" }), -1);
assert.equal(stampProgress(story, { sceneIndex: 2 }).sceneId, "b");

function serializable(value) {
  assert.notEqual(typeof value, "function");
  if (value && typeof value === "object")
    for (const next of Object.values(value)) serializable(next);
}
for (const story of [WOW_DEV_STORY, MOON_CURIOSITY_STORY, DEBATE_STORY]) {
  serializable(story);
  validateEvents(story.events);
  const ids = new Set();
  for (const scene of story.scenes || []) {
    assert.ok(!ids.has(scene.id));
    ids.add(scene.id);
    validateEvents(scene.events);
    for (const actor of scene.cast)
      if (actor.asset) assert.ok(Object.hasOwn(ASSETS, actor.asset));
  }
}
assert.deepEqual([...PROP_IDS].sort(), Object.keys(PROP_BUILDERS).sort());
assert.equal(
  new Set(MODULE_CATALOG.map((item) => item.id)).size,
  MODULE_CATALOG.length,
);
for (const item of MODULE_CATALOG) {
  await access(item.source);
  assert.ok(item.name && item.description && item.capabilities.length);
  for (const dep of item.dependencies)
    assert.ok(MODULE_CATALOG.some((n) => n.id === dep));
}
const propFiles = (await readdir("dev/modules/props")).filter(
  (p) => p.endsWith(".js") && !["toolkit.js", "registry.js"].includes(p),
);
assert.equal(
  propFiles.length,
  PROP_IDS.length,
  "Every prefab appears in the catalog",
);
for (const path of [
  "dev/content/stories/wow.js",
  "dev/content/stories/moon.js",
  "dev/content/stories/debate.js",
  "dev/content/encounters.js",
]) {
  const text = await readFile(path, "utf8");
  assert.ok(
    !/vendor\/three|createActor|document\.|window\.|localStorage/.test(text),
    `${path} must remain pure content`,
  );
}
for (const event of EVENT_PLAYGROUND.events)
  for (const effect of event.effects) validateCommand(effect);
console.log(
  `PASS: atomic commands, invalid/unsafe inputs, event conditions/bindings/once, AI stale/replay rejection, world and legacy creation saves, script reordering/branching, pure story content, ${MODULE_CATALOG.length} catalog entries and 20 independent prefabs.`,
);
