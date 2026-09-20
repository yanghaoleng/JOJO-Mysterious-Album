import { NPC_CATALOG } from "../../src/story-npcs/catalog.js";
import { FOUR } from "./yellow-friends.js";
import { CREATION_KITS, PROP_IDS, PROP_CATEGORIES } from "./props.js";
import { CHARACTER_CATALOG } from "./characters.js";
import { WORLD_CATALOG } from "./worlds.js";

// Serializable capability manifest. No Three.js, DOM, network or factory closures.
export const ACTOR_ACTIONS = ["idle", "wave", "hop", "listen", "talk", "walk"];
export const EXPRESSIONS = ["happy", "curious", "sad", "surprised"];
export const WORLD_IDS = WORLD_CATALOG.map((world) => world.id);
export const WOW_ACTORS = [
  { id: "window", name: "星星窗", color: "#efd36e" },
  { id: "gugu", name: "鼓鼓", color: "#e5bd5d" },
  { id: "fish", name: "海底 MOMO", color: "#86b4cd" },
  { id: "cloud", name: "云朵 MOMO", color: "#dce4e7" },
  { id: "clock", name: "时钟 MOMO", color: "#a5c3a0" },
  { id: "shadow", name: "影子 MOMO", color: "#dca9bd" },
  { id: "star", name: "星星 MOMO", color: "#d6b462" },
];
export const ASSETS = Object.freeze(
  Object.fromEntries([
    ...PROP_IDS.map((id) => [
      `prop:${id}`,
      {
        id: `prop:${id}`,
        kind: "prop",
        edible: PROP_CATEGORIES[id] === "食物",
        name: CREATION_KITS.find((k) => k.id === id)?.name || "想象试作品",
        states: ["idle", "working", "active"],
        animations: ["activate"],
      },
    ]),
    ...NPC_CATALOG.map((n) => [
      `npc:${n.id}`,
      {
        id: `npc:${n.id}`,
        kind: "actor",
        name: n.name,
        animations: ACTOR_ACTIONS,
        states: ["idle", "working", "active"],
      },
    ]),
    ...FOUR.map((n) => [
      `yellow:${n.id}`,
      {
        id: `yellow:${n.id}`,
        kind: "actor",
        name: n.name,
        animations: ACTOR_ACTIONS,
        states: ["idle", "working", "active"],
      },
    ]),
    ...CHARACTER_CATALOG.map((n) => [
      `clay:${n.id}`,
      {
        id: `clay:${n.id}`,
        kind: "actor",
        name: n.name,
        color: n.color,
        animations: ACTOR_ACTIONS,
        states: ["idle", "working", "active"],
      },
    ]),
    ...WOW_ACTORS.map((n) => [
      `wow:${n.id}`,
      {
        id: `wow:${n.id}`,
        kind: "actor",
        name: n.name,
        color: n.color,
        animations:
          n.id === "window"
            ? ["idle"]
            : ["idle", "wave", "hop", "listen", "talk"],
        states: ["idle", "working", "active"],
      },
    ]),
  ]),
);
export const isHelper = (id) =>
  typeof id === "string" &&
  (Object.hasOwn(ASSETS, `npc:${id}`) ||
    (Object.hasOwn(ASSETS, id) && id.startsWith("yellow:")));
