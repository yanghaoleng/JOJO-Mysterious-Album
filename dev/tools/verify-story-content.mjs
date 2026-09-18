import assert from "node:assert/strict";
import { WOW_DEV_STORY } from "../content/stories/wow.js";
import { MOON_CURIOSITY_STORY } from "../content/stories/moon.js";
import { DEBATE_STORY } from "../content/stories/debate.js";
import { ASSETS, WORLD_IDS } from "../content/assets.js";
import {
  COMMANDS,
  validateCommand,
  validateEvents,
} from "../runtime/contracts.js";

function checkEvents(events = []) {
  validateEvents(events);
  for (const event of events)
    for (const effect of event.effects) {
      assert.ok(
        Object.keys(effect).every(
          (k) => k === "type" || COMMANDS[effect.type].includes(k),
        ),
        `${event.id}: unknown command field`,
      );
      if (!JSON.stringify(effect).includes("$event.")) validateCommand(effect);
      if (effect.type === "entity.spawn")
        assert.ok(ASSETS[effect.asset], `${event.id}: unknown asset`);
    }
}
for (const story of [WOW_DEV_STORY, MOON_CURIOSITY_STORY, DEBATE_STORY]) {
  checkEvents(story.events);
  const ids = new Set((story.scenes || []).map((s) => s.id));
  assert.equal(
    ids.size,
    story.scenes?.length || 0,
    `${story.id}: duplicate scene id`,
  );
  for (const scene of story.scenes || []) {
    assert.ok(WORLD_IDS.includes(scene.world), `${scene.id}: unknown world`);
    checkEvents(scene.events);
    for (const actor of scene.cast)
      if (actor.asset)
        assert.ok(ASSETS[actor.asset], `${scene.id}: unknown character asset`);
    for (const next of [scene.next, ...scene.choices.map((c) => c.next)])
      assert.ok(
        next === undefined || next === "end" || ids.has(next),
        `${scene.id}: unknown next scene ${next}`,
      );
    assert.ok(
      ["voice", "choice"].includes(scene.inputMode),
      `${scene.id}: missing input mode`,
    );
  }
}
console.log(
  "PASS: three chapter scripts, resource references, event contracts and branch targets.",
);
