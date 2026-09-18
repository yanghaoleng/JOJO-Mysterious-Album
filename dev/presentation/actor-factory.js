import { createCharacter } from "../models.js";
import { createDocumentCharacter } from "../../src/story-npcs/factory.js";
import { createYellowCharacter } from "../yellow-four-models.js";
import { createWowCharacter } from "../wow-visuals.js";

// The only bridge from serializable actor references to concrete model factories.
export function actorModelKey(config) {
  return (
    config.modelKey ??
    config.asset ??
    config.createActor ??
    (config.characterId
      ? `npc:${config.characterId}`
      : `clay:${config.type || "rabbit"}`)
  );
}
export function createActor(config, scale = 0.78) {
  const asset =
    config.asset ||
    (config.characterId
      ? `npc:${config.characterId}`
      : `clay:${config.type || "rabbit"}`);
  if (asset.startsWith("wow:"))
    return createWowCharacter({
      kind: asset.slice(4),
      color: config.color,
      scale,
    });
  if (asset.startsWith("yellow:"))
    return createYellowCharacter(asset.slice(7), scale);
  if (asset.startsWith("npc:"))
    return createDocumentCharacter({ characterId: asset.slice(4), scale });
  if (typeof config.createActor === "function")
    return config.createActor({ scale }); // Historical stories only.
  return createCharacter({ type: asset.slice(5), color: config.color, scale });
}
