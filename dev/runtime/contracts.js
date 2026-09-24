import { BEHAVIOR_ACTIONS } from '../content/behavior-events.js';
import {
  ASSETS,
  ACTOR_ACTIONS,
  EXPRESSIONS,
  WORLD_IDS,
  isHelper,
} from "../content/assets.js";
import { PROP_IDS } from "../content/props.js";

export const COMMANDS = Object.freeze({
  "entity.effect": ["id", "effect"],
  "entity.cue": ["id", "cue", "target"],
  "entity.event": ["id", "action", "target", "duration", "colors"],
  "entity.attach": ["id", "target", "slot"],
  "feeding.start": ["eaters", "foods"],
  "feeding.stop": ["eaters"],
  "entity.spawn": ["id", "asset", "name", "position", "color", "scale", "sizeLocked", "colorOverride"],
  "entity.scale": ["id", "scale"],
  "entity.move": ["id", "position"],
  "entity.remove": ["id"],
  "entity.state": ["id", "state"],
  "entity.animate": ["id", "animation"],
  "entity.color": ["id", "color"],
  "actor.animate": ["target", "animation", "expression", "duration"],
  "encounter.activate": ["target"],
  "environment.set": ["preset"],
  "world.react": ["action"],
  "flag.set": ["key", "value"],
  "creation.put": ["record"],
  "creation.activate": ["id"],
  "group.patrol": ["targets", "speed", "distance"],
  "group.gather": ["targets"],
  "group.surround": ["targets", "surrounders"],
  "group.chase": ["chaser", "runner"],
  "group.hug": ["targets"],
  "group.handshake": ["targets"],
  "group.holdhands": ["targets"],
  "group.stack": ["targets"],
  "group.ride": ["driver", "mount"],
  "group.dance": ["targets"],
  "actor.perform": ["id", "action", "duration"],
  "fx.play": ["effect"],
  "weather.set": ["preset"],
  "world.shake": ["strength", "duration"],
  "world.zoom": ["scale"],
  "world.float": ["on", "targets"],
});
export const REACTIONS = ["celebrate", "listen", "wave", "hop"];
export const WORD_EFFECTS = ['cold','hungry','thirsty','dirty','clean','grow', 'shrink', 'long', 'tall', 'normal', 'jump', 'fly', 'swim', 'run', 'run-stop', 'walk', 'roll', 'dance', 'spin', 'sail', 'sleep', 'stop', 'happy', 'sad', 'angry', 'sleepy', 'funny', 'wet', 'dry', 'fast', 'slow', 'high', 'rainbow', 'hum', 'hot', 'yummy', 'new'];
export const ATTACH_SLOTS = ['on', 'in', 'over', 'beside', 'near', 'head', 'hair', 'face', 'left-eye', 'right-eye', 'middle-eye', 'nose', 'mouth', 'left-ear', 'right-ear', 'left-hand', 'right-hand', 'left-foot', 'right-foot', 'tail'];
export const MAX_WORLD_ENTITIES = 300;
export function oldestEntities(entities) {
  return Object.values(entities).sort((a, b) => (a.createdOrder ?? 0) - (b.createdOrder ?? 0));
}
// Same FIFO policy used before scattering and when committing a batch.
export function capacityEvictions(entities, commands) {
  const ids = new Set(oldestEntities(entities).map(e => e.id));
  const removed = [];
  for (const c of commands) {
    if (c.type === 'entity.remove') ids.delete(c.id);
    if (c.type !== 'entity.spawn' || ids.has(c.id)) continue;
    while (ids.size >= MAX_WORLD_ENTITIES) {
      const id = ids.values().next().value;
      ids.delete(id); removed.push(id);
    }
    ids.add(c.id);
  }
  return removed;
}
export const safeId = (value) =>
  typeof value === "string" &&
  /^[a-zA-Z0-9][a-zA-Z0-9:_.-]{0,95}$/.test(value) &&
  !["constructor", "prototype", "__proto__"].includes(value);
export const isColor = (value) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
export const copy = (value) => JSON.parse(JSON.stringify(value));
export function requireValue(ok, message) {
  if (!ok) throw new Error(message);
}
export function validateCreation(record) {
  requireValue(
    record && safeId(record.id) && WORLD_IDS.includes(record.world),
    "Invalid creation identity",
  );
  requireValue(
    Object.keys(record).every((key) =>
      [
        "id",
        "world",
        "scene",
        "normal",
        "parts",
        "primary",
        "helper",
        "name",
        "idea",
        "response",
      ].includes(key),
    ),
    "Unknown creation field",
  );
  requireValue(
    typeof record.name === "string" &&
      record.name.length <= 100 &&
      typeof record.idea === "string" &&
      record.idea.length <= 180 &&
      typeof record.response === "string" &&
      record.response.length <= 600,
    "Invalid creation text",
  );
  requireValue(
    Array.isArray(record.parts) &&
      record.parts.length > 0 &&
      record.parts.length <= 3 &&
      record.parts.every((p) => PROP_IDS.includes(p)),
    "Unknown creation part",
  );
  requireValue(
    Array.isArray(record.normal) &&
      record.normal.length === 3 &&
      record.normal.every(Number.isFinite) &&
      Math.abs(Math.hypot(...record.normal) - 1) < 0.05,
    "Invalid surface position",
  );
  requireValue(
    isColor(record.primary) && isHelper(record.helper) && safeId(record.scene),
    "Invalid creation appearance",
  );
  return copy(record);
}
export function validateCommand(command) {
  requireValue(
    command &&
      typeof command === "object" &&
      !Array.isArray(command) &&
      Object.hasOwn(COMMANDS, command.type),
    "Unknown world command",
  );
  requireValue(
    Object.keys(command).every(
      (k) => k === "type" || COMMANDS[command.type].includes(k),
    ),
    "Unknown command field",
  );
  const c = copy(command);
  if (c.type === 'entity.cue') {
    requireValue(['mention','put-in','cancel'].includes(c.cue), 'Unknown word cue');
    requireValue(c.cue === 'put-in' ? safeId(c.target) && c.target !== c.id : c.target === undefined, 'Invalid cue target');
  }
  if (c.type === 'entity.event') {
    requireValue(c.colors === undefined || (Array.isArray(c.colors) && c.colors.length === 2 && c.colors.every(isColor)), 'Invalid mixture colors');
    requireValue(BEHAVIOR_ACTIONS.some(a=>a.id===c.action), 'Unknown interaction event');
    requireValue(c.target === undefined || (safeId(c.target) && c.target !== c.id), 'Invalid interaction target');
    requireValue(c.duration === undefined || (Number.isFinite(c.duration) && c.duration >= 2 && c.duration <= 20), 'Invalid event duration');
  }
  if (c.type === 'entity.effect') requireValue(WORD_EFFECTS.includes(c.effect), 'Unknown word effect');
  if (c.type === 'entity.attach') requireValue(safeId(c.target) && c.target !== c.id && ATTACH_SLOTS.includes(c.slot), 'Invalid attachment');
  if (c.type.startsWith("entity.") || c.type === "creation.activate")
    requireValue(safeId(c.id), "Invalid entity id");
  if (c.type.startsWith('feeding.')) {
    for (const field of c.type === 'feeding.start' ? ['eaters','foods'] : ['eaters'])
      requireValue(Array.isArray(c[field]) && c[field].length > 0 && c[field].length <= 100 && c[field].every(safeId) && new Set(c[field]).size === c[field].length, 'Invalid feeding participants');
    if (c.type === 'feeding.start') requireValue(!c.eaters.some(id=>c.foods.includes(id)), 'Cannot eat oneself');
  }
  if (c.type === "actor.perform") {
    requireValue(ACTOR_ACTIONS.includes(c.action), "Unknown actor action");
  }
  if (c.type === "fx.play") {
    requireValue(["smoke", "sparkle", "dust", "trail", "firework", "confetti", "stars", "vanishStar", "heart"].includes(c.effect), "Unknown effect");
  }
  if (c.type === "weather.set") {
    requireValue(["clear", "rain", "snow"].includes(c.preset), "Unknown weather");
  }
  if (c.type === "entity.spawn") {
    requireValue(Object.hasOwn(ASSETS, c.asset), "Unknown asset");
    requireValue(
      Array.isArray(c.position) &&
        c.position.length === 2 &&
        c.position.every((n) => Number.isFinite(n) && Math.abs(n) <= 9),
      "Position must be two surface coordinates within -9..9",
    );
    for(const field of ['sizeLocked','colorOverride']) requireValue(c[field]===undefined || typeof c[field]==='boolean','Invalid appearance override');
    if (c.color !== undefined && !isColor(c.color)) delete c.color;
    requireValue(
      c.scale === undefined ||
        (Number.isFinite(c.scale) && c.scale >= 0.1 && c.scale <= 5.2),
      "Invalid scale",
    );
  }
  if (c.type === "entity.scale") requireValue(Number.isFinite(c.scale) && c.scale >= .1 && c.scale <= 5.2, "Invalid scale");
  if (c.type === "entity.move")
    requireValue(
      Array.isArray(c.position) &&
        c.position.length === 2 &&
        c.position.every((n) => Number.isFinite(n) && Math.abs(n) <= 9),
      "Position must be two surface coordinates within -9..9",
    );
  if (c.type === "entity.color") {
    if (!isColor(c.color)) delete c.color;
  }
  if (c.type === "entity.state")
    requireValue(
      ["idle", "working", "active"].includes(c.state),
      "Invalid entity state",
    );
  if (c.type === "entity.animate")
    requireValue(
      ["activate", ...ACTOR_ACTIONS].includes(c.animation),
      "Invalid animation",
    );
  if (c.type === "actor.animate") {
    requireValue(
      safeId(c.target) && ACTOR_ACTIONS.includes(c.animation),
      "Invalid actor action",
    );
    requireValue(
      c.expression === undefined || EXPRESSIONS.includes(c.expression),
      "Invalid expression",
    );
    requireValue(
      c.duration === undefined ||
        (Number.isFinite(c.duration) && c.duration >= 0.1 && c.duration <= 10),
      "Invalid animation duration",
    );
  }
  if (c.type === "encounter.activate")
    requireValue(safeId(c.target), "Invalid encounter target");
  if (c.type === "environment.set")
    requireValue(
      ["day", "dusk", "night", "default"].includes(c.preset),
      "Invalid environment preset",
    );
  if (c.type === "world.react")
    requireValue(REACTIONS.includes(c.action), "Invalid world reaction");
  if (c.type === "group.patrol" || c.type === "group.gather")
    requireValue(
      Array.isArray(c.targets) && c.targets.length > 0 && c.targets.length <= 100 && c.targets.every(safeId) && new Set(c.targets).size === c.targets.length,
      "Invalid group targets",
    );
  if(c.type==="group.patrol") {
    if(c.speed!==undefined)requireValue(Number.isFinite(c.speed)&&c.speed>=.1&&c.speed<=3,"Invalid patrol speed");
    if(c.distance!==undefined)requireValue(Number.isFinite(c.distance)&&c.distance>=.1&&c.distance<=4,"Invalid patrol distance");
  }
  if (c.type === "group.surround") {
    requireValue(
      Array.isArray(c.targets) && c.targets.length > 0 && c.targets.length <= 100 && c.targets.every(safeId) && new Set(c.targets).size === c.targets.length,
      "Invalid surround targets",
    );
    requireValue(
      Array.isArray(c.surrounders) && c.surrounders.length > 0 && c.surrounders.length <= 100 && c.surrounders.every(safeId) && new Set(c.surrounders).size === c.surrounders.length,
      "Invalid surrounders",
    );
    requireValue(!c.surrounders.some(id => c.targets.includes(id)), "Cannot surround oneself");
  }
  if (c.type === "flag.set")
    requireValue(
      safeId(c.key) &&
        ["boolean", "string", "number"].includes(typeof c.value) &&
        (typeof c.value !== "string" || c.value.length <= 160) &&
        (typeof c.value !== "number" || Number.isFinite(c.value)),
      "Invalid story flag",
    );
  if (c.type === "creation.put") c.record = validateCreation(c.record);
  return c;
}

export function validateEvents(events = []) {
  requireValue(
    Array.isArray(events) && events.length <= 100,
    "Invalid event list",
  );
  const ids = new Set();
  for (const event of events) {
    requireValue(
      safeId(event.id) && !ids.has(event.id) && safeId(event.on),
      "Duplicate or invalid event",
    );
    ids.add(event.id);
    requireValue(
      event.once === undefined || typeof event.once === "boolean",
      "Invalid once flag",
    );
    for (const condition of [event.when, event.if])
      requireValue(
        !condition ||
          (typeof condition === "object" &&
            !Array.isArray(condition) &&
            Object.entries(condition).every(
              ([k, v]) =>
                safeId(k) && ["string", "number", "boolean"].includes(typeof v),
            )),
        "Invalid condition",
      );
    requireValue(
      Array.isArray(event.effects) && event.effects.length <= 32,
      "Invalid effect list",
    );
    // Bindings are resolved and fully validated again at execution time.
    for (const effect of event.effects)
      requireValue(
        Object.hasOwn(COMMANDS, effect.type),
        "Unknown event effect",
      );
  }
  return events;
}
