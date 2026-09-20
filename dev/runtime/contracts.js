import {
  ASSETS,
  ACTOR_ACTIONS,
  EXPRESSIONS,
  WORLD_IDS,
  isHelper,
} from "../content/assets.js";
import { PROP_IDS } from "../content/props.js";

export const COMMANDS = Object.freeze({
  "entity.spawn": ["id", "asset", "position", "color", "scale"],
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
});
export const REACTIONS = ["celebrate", "listen", "wave", "hop"];
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
  if (c.type.startsWith("entity.") || c.type === "creation.activate")
    requireValue(safeId(c.id), "Invalid entity id");
  if (c.type === "entity.spawn") {
    requireValue(Object.hasOwn(ASSETS, c.asset), "Unknown asset");
    requireValue(
      Array.isArray(c.position) &&
        c.position.length === 2 &&
        c.position.every((n) => Number.isFinite(n) && Math.abs(n) <= 9),
      "Position must be two surface coordinates within -9..9",
    );
    requireValue(c.color === undefined || isColor(c.color), "Invalid color");
    requireValue(
      c.scale === undefined ||
        (Number.isFinite(c.scale) && c.scale >= 0.2 && c.scale <= 1.5),
      "Invalid scale",
    );
  }
  if (c.type === "entity.move")
    requireValue(
      Array.isArray(c.position) &&
        c.position.length === 2 &&
        c.position.every((n) => Number.isFinite(n) && Math.abs(n) <= 9),
      "Position must be two surface coordinates within -9..9",
    );
  if (c.type === "entity.color")
    requireValue(isColor(c.color), "Invalid color");
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
