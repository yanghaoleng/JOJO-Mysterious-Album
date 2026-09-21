import * as THREE from "../../vendor/three.module.js";
import { ASSETS } from "../content/assets.js";
import { createCreationModel } from "../creation-models.js";
import { createActor } from "./actor-factory.js";

import { createFeedingController } from "./feeding-controller.js";
import { createMovementController } from "./movement-controller.js";
import { createPfxController } from "./pfx-controller.js";

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
export function createWorldPresenter(stage, { onInteract = () => {}, onConsume = () => ({ok:false}) } = {}) {
  const root = new THREE.Group();
  root.name = "scripted-world-entities";
  stage.scene.add(root);
  const entries = new Map();
  let onPickEntity = () => {};
  const feeding = createFeedingController({entries,stage,consume:onConsume});
  const movement = createMovementController({entries, stage});
  const pfx = createPfxController({ stage, world: stage.world });
  let floatMode = false;
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
    feeding.clear();
    movement.clear();
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
        record.color,
        record.scale,
        record.colorOverride,
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
          : createCreationModel(record.asset.slice(5), record.color, record.name);
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
        if(record.colorOverride) {
          const palette=new THREE.Color(record.color), hsl={};palette.getHSL(hsl);
          const touched=new Set();
          model.group.traverse(node=>{if(!node.isMesh)return;for(const material of Array.isArray(node.material)?node.material:[node.material]) {
            if(!material.color || touched.has(material))continue;touched.add(material);
            const original={};material.color.getHSL(original);
            const protectedFlag=['prop:ladder','prop:battleship'].includes(record.asset) && ['397fc4','ffda45'].includes(material.color.getHexString());
            if(!protectedFlag && (material.vertexColors || (original.l>.15 && (original.s>.12 || original.l<.85)))) {
              material.color.setHSL(hsl.h,hsl.s,Math.min(.82,Math.max(.2,hsl.l*(.7+original.l*.5))));
              if(material.vertexColors){material.vertexColors=false;material.needsUpdate=true;}
            }
          }});
        }
        stage.style.apply(anchor);
        item = {
          model,
          suspended,
          anchor,
          normal,
          signature,
          asset: record.asset,
          scale: record.scale,
          color: record.color,
          actor,
          state: null,
          actionUntil: 0,
          entrance: stage.reduced || suspended ? 2 : -(arrivalDelays.get(record.id) || 0),
          arrivalAt: batchStart + (stage.reduced ? 0 : (arrivalDelays.get(record.id) || 0) * 1000),
          rest: (() => { const flying = /ufo|spaceship|airplane|rocket/.test(record.asset || ""); return flying ? anchor.position.clone().addScaledVector(normal, 1.7) : anchor.position.clone(); })(),
          orientation: anchor.quaternion.clone(),
          position: [...record.position],
          contactRadius,
          landed: false,
          impact: null,
        };
        const flyingRideInit = /ufo|spaceship|airplane|rocket/.test(record.asset || "");
        if (flyingRideInit) item.anchor.position.addScaledVector(normal, 1.7);
        item.anchor.position.addScaledVector(normal, stage.reduced || suspended ? 0 : 3);
        item.anchor.visible = item.entrance >= 0;
        entries.set(record.id, item);
        anchor.userData.worldEntity = record.id;
      }
      if(record.position.some((value,index)=>value!==item.position[index])) {
        item.normal.copy(stage.world.surfaceNormal(...record.position));
        item.rest.copy(stage.world.planet.center).addScaledVector(item.normal,stage.world.planet.radius+.02);
        item.orientation.setFromUnitVectors(UP,item.normal);item.position=[...record.position];
        item.anchor.position.copy(item.rest);
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
      if(c.type==='feeding.start') { feeding.start(c.eaters,c.foods); movement.stop([...c.eaters]); }
      if(c.type==='feeding.stop') feeding.stop(c.eaters);
      if(['entity.move','entity.motion'].includes(c.type)) {
        // Consumption persists the current position; other movement cancels feeding.
        if(!commands.some(other=>other.type==='entity.remove')) feeding.stop([c.id]);
        movement.stop([c.id]);
      }
      if(c.type==='entity.remove') movement.stop([c.id]);
      if(c.type==='group.patrol') movement.patrol(c.targets);
      if(c.type==='group.gather') movement.gather(c.targets);
      if(c.type==='group.surround') movement.surround(c.targets, c.surrounders);
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
      if (c.type === "actor.perform") {
        const item = entries.get(c.id);
        if (item) { item.action = c.action; item.actionUntil = time + (c.duration || 4); }
      }
      if (c.type === "fx.play") {
        const at = c.id ? entries.get(c.id)?.anchor?.position?.toArray() : c.position || (stage.target?.toArray() || [0, 0, 0]);
        if (at) pfx.play(c.effect, { at });
      }
      if (c.type === "weather.set") {
        if (c.preset === "rain" || c.preset === "snow") pfx.startWeather(c.preset, c.strength || 1);
        else pfx.stopWeather();
      }
      if (c.type === "world.shake") pfx.shake(c.strength || 0.05, c.duration || 0.6);
      if (c.type === "world.zoom") pfx.setZoom(c.scale || 1);
      if (c.type === "world.float") floatMode = !!c.on;
      if (c.type === "group.chase") movement.chase(c.chaser, c.runner);
      if (c.type === "group.hug") movement.hug(c.targets[0], c.targets[1]);
      if (c.type === "group.handshake") movement.shakeHands(c.targets[0], c.targets[1]);
      if (c.type === "group.holdhands") movement.holdHands(c.targets);
      if (c.type === "group.stack") movement.stack(c.targets);
      if (c.type === "group.ride") {
        movement.ride(c.driver, c.mount);
        // Riding a flying vehicle: overhead follow cam so you see the route.
        const mountItem = entries.get(c.mount);
        if (mountItem && /ufo|spaceship|airplane|rocket/.test(mountItem.asset || "")) {
          const mid = c.mount;
          stage.setFollowTarget(() => {
            const it = entries.get(mid);
            return it ? it.position : null;
          }, mountItem.model?.name || "飞行物");
          stage.playCinematic({ kind: "overhead" });
        }
      }
      if (c.type === "group.dance") movement.danceParty(c.targets);
    }
  }
  return {
    sync,
    clear,
    update(dt) {
      time += dt;
      pfx.update(dt);
      const zs = pfx.zoomScale;
      if (Math.abs(zs - 1) > 0.004) root.scale.setScalar(zs);
      else if (root.scale.x !== 1) root.scale.setScalar(1);
      for (const item of entries.values()) {
        if (floatMode && item.entrance >= 2) {
          const wave = Math.sin(time * 2.2 + (item.rest?.x || 0)) * 0.08;
          item.anchor.position.y = (item.rest?.y || 0) + 1.6 + wave;
          item.anchor.quaternion.copy(item.orientation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(time * 1.4) * 0.06));
        }
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
      feeding.update(dt,time);
      movement.update(dt,time);
    },
    get feedingStats() { return feeding.stats; },
    get movementStats() { return movement.stats; },
    get pfx() { return pfx; },
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
      onPickEntity(object.userData.worldEntity);
      return true;
    },
    set onPickEntity(fn) { onPickEntity = fn || (() => {}); },
    getPosition(id) { return entries.get(id)?.position || null; },
    get stats() {
      return [...entries].map(([id, item]) => ({
        id,
        state: item.state,
        scale: item.scale,
        color: item.color,
        assetKind: item.actor ? "actor" : "prop",
        position: item.anchor.position.toArray(),
        settled: item.entrance >= 2,
      }));
    },
    dispose() {
      clear();
      pfx.dispose();
      root.removeFromParent();
    },
  };
}
