import { ASSETS, WORLD_IDS } from "../content/assets.js";
import {
  copy,
  requireValue,
  validateCommand,
  validateCreation,
  safeId,
  MAX_WORLD_ENTITIES,
  oldestEntities,
  capacityEvictions,
} from "./contracts.js";

const empty = () => ({
  version: 1,
  revision: 0,
  worlds: {},
  creations: [],
  flags: {},
  completedEvents: [],
});
let sessionSequence = 0;
const worldState = (state, world) =>
  (state.worlds[world] ||= { entities: {}, environment: "default" });

// Pure command reducer. A whole batch validates on a copy before any rendering or save.
function reduce(state, c, context) {
  const world =
    c.type.startsWith("entity.") ||
    c.type === "environment.set" ||
    c.type.startsWith("group.") ||
    c.type.startsWith("feeding.")
      ? worldState(state, context.world)
      : null;
  const entity = world?.entities[c.id];
  if (c.type.startsWith('feeding.')) {
    // “A 吃 B”允许任意对象互吃：吃者与食物只要在当前世界中存在即可，
    // 不强制吃者是角色、食物是可食用类（例如“鸡腿吃汉堡”也成立）。
    const entities=worldState(state,context.world).entities;
    for(const id of c.eaters) requireValue(entities[id], 'Eater must exist in this world');
    if(c.type==='feeding.start') for(const id of c.foods) requireValue(entities[id], 'Food must exist in this world');
    return;
  }

  if (c.type === "entity.spawn") {
    const order = entity?.createdOrder ?? (Math.max(0, ...Object.values(world.entities).map(e => e.createdOrder || 0)) + 1);
    if (!entity) for (const id of capacityEvictions(world.entities, [c])) delete world.entities[id];
    world.entities[c.id] = {
      id: c.id,
      createdOrder: order,
      asset: c.asset,
      name: c.name || '',
      position: c.position,
      color: c.color || "#9ab8ba",
      scale: c.scale || 0.65,
      sizeLocked: c.sizeLocked === true,
      colorOverride: c.colorOverride === true,
      state: entity?.state || "working",
    };
  } else if (c.type === "entity.move") {
    requireValue(entity, "Entity is not in the current world");
    entity.position = c.position;
  } else if (c.type === "entity.remove") {
    delete world.entities[c.id];
  } else if (c.type.startsWith("entity.")) {
    requireValue(entity, "Entity is not in the current world");
    if (c.type === 'entity.cue' && c.cue === 'put-in') {
      requireValue(world.entities[c.target] && entity.attachment?.target === c.target && entity.attachment?.slot === 'in', 'Drop requires an inside attachment');
    }
    if (c.type === 'entity.event') {
      requireValue(!c.target || world.entities[c.target], 'Interaction target is not in this world');
      if(c.action==='swim'){entity.effects||={};entity.effects.surface='wet';}
    }
    if (c.type === 'entity.effect') {
      const slot = ['grow','shrink','normal'].includes(c.effect) ? 'shape' : ['long','tall'].includes(c.effect) ? 'stretch' : ['happy','sad','angry','sleepy','funny','yummy'].includes(c.effect) ? 'emotion' : ['wet','dry'].includes(c.effect) ? 'surface' : ['fast','slow'].includes(c.effect) ? 'speed' : ['hum','hot','new'].includes(c.effect)?'symbol':c.effect==='high'?'altitude':c.effect==='rainbow'?'palette':['dance','spin'].includes(c.effect)?'gesture':'motion';
      entity.effects ||= {};
      entity.effects[slot] = c.effect;
      if(c.effect==='stop') {delete entity.effects.gesture; delete entity.effects.altitude; delete entity.effects.symbol; if(entity.effects.emotion==='sleepy')delete entity.effects.emotion;}
    }
    if (c.type === 'entity.attach') {
      requireValue(world.entities[c.target], 'Attachment target is not in this world');
      let cursor = c.target; const visited = new Set([c.id]);
      while (cursor) { requireValue(!visited.has(cursor), 'Attachment cycle'); visited.add(cursor); cursor = world.entities[cursor]?.attachment?.target; }
      entity.attachment = {target:c.target, slot:c.slot};
    }
    if (c.type === "entity.state") entity.state = c.state;
    if (c.type === "entity.color") { entity.color = c.color; entity.colorOverride = true; }
    if (c.type === "entity.scale") { entity.scale = c.scale; entity.sizeLocked = true; }
    if (c.type === "entity.animate")
      requireValue(
        ASSETS[entity.asset].animations.includes(c.animation),
        "Asset does not provide that animation",
      );
  } else if (c.type === "actor.animate" || c.type === "encounter.activate")
    requireValue(context.actors.includes(c.target), "Actor is not present");
  else if (c.type === "environment.set") world.environment = c.preset;
  else if (c.type === "group.patrol" || c.type === "group.gather" || c.type === "group.surround") {
    // Group actions are presentational (patrol/gather/surround): participants
    // only need to exist in this world; positions are animated by the
    // presenter, never persisted back into world records.
    for (const id of [...(c.targets || []), ...(c.surrounders || [])])
      requireValue(world.entities[id], "Group participant is not in this world");
  }
  else if (c.type === "flag.set") {
    requireValue(
      Object.hasOwn(state.flags, c.key) ||
        Object.keys(state.flags).length < 200,
      "Too many story flags",
    );
    state.flags[c.key] = c.value;
  } else if (c.type === "creation.put") {
    requireValue(
      c.record.world === context.world && c.record.scene === context.sceneId,
      "Creation belongs to another scene",
    );
    const index = state.creations.findIndex((item) => item.id === c.record.id);
    requireValue(
      index < 0 || state.creations[index].world === context.world,
      "Cannot move another world creation",
    );
    requireValue(
      index >= 0 ||
        state.creations.filter((item) => item.world === context.world).length <
          12,
      "This world has twelve creations",
    );
    if (index < 0) state.creations.push(c.record);
    else state.creations[index] = c.record;
  } else if (c.type === "creation.activate")
    requireValue(
      state.creations.some(
        (item) => item.world === context.world && item.id === c.id,
      ),
      "Creation is not present",
    );
}

function restore(saved, legacyCreations) {
  const state = empty();
  // Import known fields only. Never trust persisted model ids or arbitrary object keys.
  if (saved?.version === 1) {
    state.revision =
      Number.isSafeInteger(saved.revision) && saved.revision >= 0
        ? saved.revision
        : 0;
    for (const [id, world] of Object.entries(saved.worlds || {})) {
      if (!WORLD_IDS.includes(id)) continue;
      const context = { world: id, actors: [] };
      for (const item of oldestEntities(world?.entities || {}).slice(-MAX_WORLD_ENTITIES))
        try {
          reduce(
            state,
            validateCommand({
              type: "entity.spawn",
              id: item.id,
              asset: item.asset,
              name: item.name || '',
              position: item.position,
              color: item.color,
              scale: item.scale,
              sizeLocked: item.sizeLocked === true,
              colorOverride: item.colorOverride === true,
            }),
            context,
          );
          reduce(
            state,
            validateCommand({
              type: "entity.state",
              id: item.id,
              state: item.state,
            }),
            context,
          );
        } catch {}
      for (const item of Object.values(world?.entities || {}).slice(-MAX_WORLD_ENTITIES)) {
        for (const effect of Object.values(item.effects || {}).slice(0,10)) try {
          reduce(state, validateCommand({type:'entity.effect',id:item.id,effect}), context);
        } catch {}
        if (item.attachment) try {
          reduce(state, validateCommand({type:'entity.attach',id:item.id,...item.attachment}), context);
        } catch {}
      }
      try {
        reduce(
          state,
          validateCommand({
            type: "environment.set",
            preset: world.environment,
          }),
          context,
        );
      } catch {}
    }
    for (const [key, value] of Object.entries(saved.flags || {}).slice(0, 200))
      try {
        reduce(state, validateCommand({ type: "flag.set", key, value }), {
          world: WORLD_IDS[0],
          actors: [],
        });
      } catch {}
    state.completedEvents = Array.isArray(saved.completedEvents)
      ? saved.completedEvents
          .filter((s) => typeof s === "string" && s.length <= 300)
          .slice(-1000)
      : [];
  }
  const ids = new Set(),
    counts = {};
  for (const raw of (Array.isArray(saved?.creations)
    ? saved.creations
    : Array.isArray(legacyCreations)
      ? legacyCreations
      : []
  ).slice(-132))
    try {
      const record = validateCreation(raw);
      if (ids.has(record.id) || (counts[record.world] || 0) >= 12) continue;
      state.creations.push(record);
      ids.add(record.id);
      counts[record.world] = (counts[record.world] || 0) + 1;
    } catch {}
  return state;
}

export class WorldRuntime {
  constructor({
    saved,
    legacyCreations,
    onChange = () => {},
    present = () => {},
  } = {}) {
    this.state = restore(saved, legacyCreations);
    this.onChange = onChange;
    this.present = present;
    this.context = null;
    this.serial = 0;
    this.log = [];
    this.instanceId =
      globalThis.crypto?.randomUUID?.() || `${Date.now()}-${++sessionSequence}`;
  }
  enter(context) {
    requireValue(
      safeId(context.storyId) &&
        safeId(context.sceneId) &&
        WORLD_IDS.includes(context.world),
      "Invalid scene context",
    );
    this.context = copy({ ...context, actors: context.actors || [] });
    this.serial++;
    this.present(this.snapshot, [], this.context);
  }
  get snapshot() {
    return copy(this.state);
  }
  get token() {
    return this.context
      ? `${this.instanceId}/${this.context.storyId}/${this.context.sceneId}/${this.serial}/${this.state.revision}`
      : null;
  }
  dispatch(commands, { source = "script", token, completedEvent } = {}) {
    try {
      requireValue(this.context, "No active scene");
      requireValue(
        ["script", "player", "ai"].includes(source),
        "Unknown command source",
      );
      requireValue(
        token === undefined || token === this.token,
        "Stale world proposal",
      );
      requireValue(
        Array.isArray(commands) && commands.length <= MAX_WORLD_ENTITIES && commands.filter(c=>c?.type==='entity.spawn').length <= 100,
        "Too many world commands",
      );
      const validated = commands.map(validateCommand),
        next = this.snapshot;
      for (const c of validated) {
        requireValue(
          source === "script" || c.type !== "flag.set",
          "Story flags are script-owned",
        );
        reduce(next, c, this.context);
      }
      if (completedEvent && !next.completedEvents.includes(completedEvent))
        next.completedEvents.push(completedEvent);
      next.completedEvents = next.completedEvents.slice(-1000);
      next.revision++;
      this.state = next;
      // After committing, a failed observer must not report the batch as rejected.
      // Keep the valid state available for a later rendering/save retry.
      const warnings = [];
      try { this.onChange(this.snapshot); } catch (error) { warnings.push(`save: ${error.message}`); }
      try { this.present(this.snapshot, validated, this.context); } catch (error) { warnings.push(`present: ${error.message}`); }
      const result = {
        ok: true,
        revision: next.revision,
        count: validated.length,
        ...(warnings.length ? { warnings } : {}),
      };
      this.log.push({ source, ...result, types: validated.map((c) => c.type) });
      this.log = this.log.slice(-40);
      return result;
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
  dispose() {
    this.serial++;
    this.context = null;
    this.present = () => {};
    this.onChange = () => {};
  }
}
