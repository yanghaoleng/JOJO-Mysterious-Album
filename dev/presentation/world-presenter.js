import * as THREE from "../../vendor/three.module.js";
import { ASSETS } from "../content/assets.js";
import { createCreationModel } from "../creation-models.js";
import { createActor } from "./actor-factory.js";

const UP = new THREE.Vector3(0, 1, 0);
const PRESETS = {
  day: {
    sky: "#fff5dc",
    sun: "#ffedc5",
    hemisphereIntensity: 2,
    sunIntensity: 2.4,
    exposure: 1.08,
  },
  dusk: {
    sky: "#dec5ce",
    sun: "#ffd5a9",
    hemisphereIntensity: 1.7,
    sunIntensity: 1.8,
    exposure: 1,
  },
  night: {
    sky: "#b6c9e7",
    sun: "#cfddff",
    hemisphereIntensity: 1.6,
    sunIntensity: 1.4,
    exposure: 0.96,
  },
};

// Reconciles pure world records into Three.js instances; never advances a story.
export function createWorldPresenter(stage, { onInteract = () => {} } = {}) {
  const root = new THREE.Group();
  root.name = "scripted-world-entities";
  stage.scene.add(root);
  const entries = new Map();
  let currentWorld = null,
    lastCreations = "",
    lastEnvironment = null,
    time = 0;
  function remove(id) {
    const item = entries.get(id);
    if (item) {
      item.model.dispose();
      item.anchor.removeFromParent();
      entries.delete(id);
    }
  }
  function clear() {
    for (const id of [...entries.keys()]) remove(id);
    currentWorld = null;
    lastCreations = "";
    lastEnvironment = null;
  }
  function sync(snapshot, commands = [], context) {
    if (!stage.world || !context || stage.worldId !== context.world) return;
    if (currentWorld !== stage.world) {
      clear();
      currentWorld = stage.world;
    }
    const data = snapshot.worlds[context.world] || {
      entities: {},
      environment: "default",
    };
    for (const id of [...entries.keys()])
      if (!Object.hasOwn(data.entities, id)) remove(id);
    const arriving = Object.values(data.entities).filter(record => !entries.has(record.id));
    const arrivalGap = arriving.length > 1 ? Math.min(.28, 8 / (arriving.length - 1)) : 0;
    const arrivalDelays = new Map(arriving.map((record, index) => [record.id, index * arrivalGap]));
    const batchStart = performance.now();
    for (const record of Object.values(data.entities)) {
      const signature = JSON.stringify([
        record.asset,
        record.position,
        record.color,
        record.scale,
      ]);
      let item = entries.get(record.id);
      if (item?.signature !== signature) {
        remove(record.id);
        const actor = ASSETS[record.asset].kind === "actor";
        const model = actor
          ? createActor(
              { asset: record.asset, color: record.color },
              record.scale,
            )
          : createCreationModel(record.asset.slice(5), record.color);
        const suspended = model.group.userData.suspended === true;
        const normal = stage.world.surfaceNormal(...record.position),
          anchor = new THREE.Group();
        anchor.position
          .copy(stage.world.planet.center)
          .addScaledVector(normal, stage.world.planet.radius + 0.02);
        anchor.quaternion.setFromUnitVectors(UP, normal);
        if (!actor) model.group.scale.setScalar(record.scale);
        const bounds = new THREE.Box3().setFromObject(model.group);
        const contactRadius = Math.hypot(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x)),Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z)));
        anchor.add(model.group);
        root.add(anchor);
        stage.style.apply(anchor);
        item = {
          model,
          suspended,
          anchor,
          normal,
          signature,
          actor,
          state: null,
          actionUntil: 0,
          entrance: stage.reduced || suspended ? 2 : -(arrivalDelays.get(record.id) || 0),
          arrivalAt: batchStart + (stage.reduced ? 0 : (arrivalDelays.get(record.id) || 0) * 1000),
          rest: anchor.position.clone(),
          orientation: anchor.quaternion.clone(),
          contactRadius,
          landed: false,
          impact: null,
        };
        item.anchor.position.addScaledVector(normal, stage.reduced || suspended ? 0 : 3);
        item.anchor.visible = item.entrance >= 0;
        entries.set(record.id, item);
        anchor.userData.worldEntity = record.id;
      }
      if (item.state !== record.state) {
        item.state = record.state;
        item.model.setState?.(record.state);
        if (record.state === "active") item.model.trigger?.();
      }
    }
    stage.exploration?.setEventObstacles(
      [...entries.values()].filter(item=>!item.suspended).map((item) => ({
        normal: item.normal,
        radius: 0.9,
      })),
    );
    const creations = snapshot.creations.filter(
        (item) => item.world === context.world,
      ),
      key = JSON.stringify(creations);
    if (key !== lastCreations) {
      lastCreations = key;
      stage.exploration?.setCreations(creations);
    }
    if (data.environment !== lastEnvironment) {
      lastEnvironment = data.environment;
      stage.environmentOverride = lastEnvironment !== "default";
      if (lastEnvironment === "default") {
        stage.setLighting(stage.world.atmosphere);
        if (stage.curiosity) {
          stage.curiosity.applied = false;
          stage.scene.fog ||= new THREE.Fog("#46566b", 20.2, 28.8);
        }
      } else {
        stage.scene.fog = null;
        stage.setLighting({
          period: lastEnvironment,
          lighting: PRESETS[lastEnvironment],
        });
      }
    }
    for (const c of commands) {
      if (c.type === "entity.animate") {
        const item = entries.get(c.id);
        if (item?.actor) {
          item.action = c.animation;
          item.actionUntil = time + 3;
        } else item?.model.trigger();
      }
      if (c.type === "actor.animate")
        stage.animateActor(c.target, c.animation, c.expression, c.duration);
      if (c.type === "encounter.activate")
        stage.exploration?.activateEncounter(c.target);
      if (c.type === "world.react") stage.act(c.action);
      if (c.type === "creation.activate") stage.exploration?.showCreation(c.id);
    }
  }
  return {
    sync,
    clear,
    update(dt) {
      time += dt;
      for (const item of entries.values()) {
        if (item.entrance < 2) {
          // Wall time keeps a busy frame from stretching a batch past 10s.
          item.entrance = stage.reduced ? 2 : Math.min(2, Math.max(item.entrance + dt, (performance.now() - item.arrivalAt) / 1000));
          item.anchor.visible = item.entrance >= 0;
          if (!item.anchor.visible) continue;
          const t = item.entrance, contact = .55, age = Math.max(0, t - contact);
          if (!item.landed && t >= contact) {
            item.landed = true;
            if (!stage.reduced && t < 2) for (const other of entries.values()) {
              if (other.suspended || other === item || !other.anchor.visible || other.entrance < contact) continue;
              const distance = item.rest.distanceTo(other.rest);
              const reach = item.contactRadius + other.contactRadius + .12;
              if (distance > reach || distance < .001) continue;
              // Contact-driven angular impulse, not an unrelated random wobble.
              // A damped spring (mass 1, stiffness 100, damping 10) returns upright.
              const direction = other.rest.clone().sub(item.rest).normalize();
              const axis = new THREE.Vector3().crossVectors(other.normal,direction).normalize();
              const amplitude = Math.min(.18, .08 + (reach-distance)*.3);
              other.impact = {at:performance.now(),axis,amplitude};
              item.impact = {at:performance.now(),axis:axis.clone().negate(),amplitude};
            }
          }
          const height = t < contact ? 3 * (1 - (t / contact) ** 2) : t < 2 ? .55 * Math.exp(-4 * age) * Math.abs(Math.sin(age * 11)) : 0;
          const tilt = t < contact ? .16 * t / contact : t < 2 ? .24 * Math.exp(-4 * age) * Math.cos(age * 13) : 0;
          item.anchor.position.copy(item.rest).addScaledVector(item.normal, height);
          item.anchor.quaternion.copy(item.orientation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), tilt));
          const squash = t >= contact && t < 2 ? .12 * Math.exp(-9 * age) : 0;
          item.anchor.scale.set(1 + squash, 1 - squash, 1 + squash);
        }
        if (item.entrance >= 2) item.anchor.quaternion.copy(item.orientation);
        if (item.impact) {
          const age = (performance.now()-item.impact.at)/1000;
          if (stage.reduced || age >= 1) item.impact = null;
          else {
            const angle = item.impact.amplitude * Math.exp(-5*age) * Math.sin(Math.sqrt(75)*age);
            item.anchor.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(item.impact.axis,angle));
          }
        }
        if (item.actor) {
          item.model.setAction(
            item.actionUntil > time
              ? item.action
              : item.state === "idle"
                ? "idle"
                : "listen",
          );
          item.model.update(stage.reduced ? 0 : time, dt);
        } else item.model.update(dt, stage.reduced, item.state !== "idle");
      }
    },
    getObject(id) { return entries.get(id)?.model.group || null; },
    pick(raycaster) {
      const hits = raycaster.intersectObject(root, true);
      const hit = hits[0];
      if (!hit) return false;
      const surface = raycaster.ray.intersectSphere(
        new THREE.Sphere(stage.world.planet.center, stage.world.planet.radius),
        new THREE.Vector3(),
      );
      if (
        surface &&
        hit.distance > raycaster.ray.origin.distanceTo(surface) + 0.2
      )
        return false;
      let object = hit.object;
      while (object && !object.userData.worldEntity) object = object.parent;
      if (!object) return false;
      onInteract(object.userData.worldEntity);
      return true;
    },
    get stats() {
      return [...entries].map(([id, item]) => ({
        id,
        state: item.state,
        assetKind: item.actor ? "actor" : "prop",
        position: item.anchor.position.toArray(),
        settled: item.entrance >= 2,
      }));
    },
    dispose() {
      clear();
      root.removeFromParent();
    },
  };
}
