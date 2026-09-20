import assert from "node:assert/strict";
import { WorldRuntime } from "../runtime/world-runtime.js";
import { createIntentGateway } from "../runtime/intent-gateway.js";
import { AI_CONTROL_LEVEL, AI_CONTROL_EXPECTATIONS } from "../content/examples/ai-control-level.js";

const runtime = new WorldRuntime();
runtime.enter({ storyId: AI_CONTROL_LEVEL.id, sceneId: AI_CONTROL_LEVEL.sceneId, world: AI_CONTROL_LEVEL.world, actors: [] });
const gateway = createIntentGateway(runtime);

for (const step of AI_CONTROL_LEVEL.steps) {
  const result = gateway.apply({ version: 1, context: runtime.token, commands: step.commands });
  assert.equal(result.ok, true, `${step.id}: ${result.error || "rejected"}`);
}

const entities = runtime.snapshot.worlds.meadow.entities;
for (const [id, position] of Object.entries(AI_CONTROL_EXPECTATIONS))
  assert.deepEqual(entities[id].position, position, `${id} did not reach its target`);
assert.equal(Object.values(entities).filter((item) => item.asset === "prop:rocket").length, 10);

const before = runtime.snapshot;
const stale = gateway.apply({ version: 1, context: "stale-context", commands: [{ type: "entity.move", id: "jiaojiao", position: [1, 1] }] });
assert.equal(stale.ok, false);
assert.deepEqual(runtime.snapshot, before, "stale proposal changed the world");
console.log("AI control level passed: spatial move, NPC placement, pocket destination, and 10 rockets.");
