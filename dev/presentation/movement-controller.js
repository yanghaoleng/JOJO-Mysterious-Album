import * as THREE from "../../vendor/three.module.js";

// Presentational group motions: patrol / gather / surround.
// These animate entities over the planet surface and never write positions back
// into the world records, so a reload restores the original layout. They are
// pure performance directions for the child's self-directed play.
const UP = new THREE.Vector3(0, 1, 0);

export function createMovementController({ entries, stage }) {
  const jobs = new Map(); // id -> {mode, target, origin, waypoints, index, speed, phase, until}
  let time = 0;

  function place(item, x, z, action, t, lift = 0) {
    const normal = stage.world.surfaceNormal(x, z);
    item.rest.copy(stage.world.planet.center).addScaledVector(normal, stage.world.planet.radius + 0.02 + lift);
    const dx = x - item.position[0], dz = z - item.position[1];
    const yaw = Math.atan2(dx, dz);
    item.orientation.setFromUnitVectors(UP, normal).multiply(new THREE.Quaternion().setFromAxisAngle(UP, yaw));
    item.anchor.position.copy(item.rest);
    item.anchor.quaternion.copy(item.orientation);
    item.position = [x, z];
    item.action = action;
    item.actionUntil = t + 1;
  }

  function stepToward(item, target, speed, dt, t) {
    const [x, z] = item.position;
    const dx = target[0] - x, dz = target[1] - z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.02) return true;
    const step = Math.min(distance, dt * speed);
    place(item, x + (dx / distance) * step, z + (dz / distance) * step, "walk", t);
    return false;
  }

  function face(item, target, t) {
    const dx = target[0] - item.position[0], dz = target[1] - item.position[1];
    const yaw = Math.atan2(dx, dz);
    item.orientation.setFromUnitVectors(UP, item.normal).multiply(new THREE.Quaternion().setFromAxisAngle(UP, yaw));
    item.anchor.quaternion.copy(item.orientation);
    item.action = "idle";
    item.actionUntil = t + 2;
  }

  function centerOf(ids) {
    let x = 0, z = 0, n = 0;
    for (const id of ids) {
      const item = entries.get(id);
      if (!item) continue;
      x += item.position[0]; z += item.position[1]; n++;
    }
    return n ? [x / n, z / n] : [0, 0];
  }

  function ringPoint(center, radius, angle) {
    return [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius];
  }

  function stop(ids = [...jobs.keys()]) {
    for (const id of ids) {
      const job = jobs.get(id);
      if (!job) continue;
      const item = entries.get(id);
      if (item) {
        item.action = "idle";
        item.actionUntil = time + 1;
      }
      jobs.delete(id);
    }
  }

  function patrol(ids, { distance = 2.6, speed = 1.15 } = {}) {
    stop(ids);
    const set = new Set(ids);
    ids.forEach((id, index) => {
      const item = entries.get(id);
      if (!item) return;
      const angle = (index / Math.max(1, ids.length)) * Math.PI * 2;
      const [x, z] = item.position;
      const target = [x + Math.cos(angle) * distance, z + Math.sin(angle) * distance];
      jobs.set(id, { mode: "patrol", origin: [x, z], target, speed, phase: "to", set });
    });
  }

  function gather(ids, { radius = 0.55, speed = 1.2 } = {}) {
    stop(ids);
    const center = centerOf(ids);
    ids.forEach((id, index) => {
      const item = entries.get(id);
      if (!item) return;
      const target = ringPoint(center, radius, (index / Math.max(1, ids.length)) * Math.PI * 2);
      jobs.set(id, { mode: "gather", target, center, speed, phase: "to", group: ids });
    });
  }

  function surround(targets, surrounders, { radius = 1.9, speed = 1.25 } = {}) {
    stop([...targets, ...surrounders]);
    const center = centerOf(targets);
    targets.forEach((id, index) => {
      const item = entries.get(id);
      if (!item) return;
      const target = ringPoint(center, Math.min(0.6, radius * 0.32), (index / Math.max(1, targets.length)) * Math.PI * 2);
      jobs.set(id, { mode: "gather", target, center, speed, phase: "to", group: targets });
    });
    surrounders.forEach((id, index) => {
      const item = entries.get(id);
      if (!item) return;
      const target = ringPoint(center, radius, (index / Math.max(1, surrounders.length)) * Math.PI * 2 + 0.3);
      jobs.set(id, { mode: "surround", target, center, speed, phase: "to", group: surrounders, targets });
    });
  }

  // ---------- interaction behaviours ----------
  function chase(chaser, runner, { speed = 1.7, runnerSpeed = 1.5 } = {}) {
    stop([chaser, runner]);
    const c = entries.get(chaser), r = entries.get(runner);
    if (!c || !r) return;
    jobs.set(chaser, { mode: "chase", runner, speed, runnerSpeed });
    jobs.set(runner, { mode: "flee", chaser, speed: runnerSpeed });
  }
  function hug(a, b, { speed = 1.2 } = {}) {
    stop([a, b]);
    const ia = entries.get(a), ib = entries.get(b);
    if (!ia || !ib) return;
    const cx = (ia.position[0] + ib.position[0]) / 2, cz = (ia.position[1] + ib.position[1]) / 2;
    jobs.set(a, { mode: "hug-to", partner: b, target: [cx - 0.45, cz], center: [cx, cz], speed, phase: "to" });
    jobs.set(b, { mode: "hug-to", partner: a, target: [cx + 0.45, cz], center: [cx, cz], speed, phase: "to" });
  }
  function holdHands(ids, { speed = 1.0, gap = 0.75 } = {}) {
    stop(ids);
    const valid = ids.filter(id => entries.has(id));
    if (!valid.length) return;
    valid.forEach((id, index) => {
      const item = entries.get(id);
      const angle = (index / Math.max(1, valid.length)) * Math.PI * 2;
      const [x, z] = item.position;
      const target = [x + Math.cos(angle) * 2.6, z + Math.sin(angle) * 2.6];
      jobs.set(id, { mode: index === 0 ? "patrol" : "holdhands", index, leader: valid[0], target, origin: [x, z], speed, gap, set: new Set(valid), phase: "to" });
    });
  }
  function stack(ids, { speed = 1.1 } = {}) {
    stop(ids);
    const valid = ids.filter(id => entries.has(id));
    if (!valid.length) return;
    const base = entries.get(valid[0]);
    valid.forEach((id, index) => {
      const item = entries.get(id);
      if (index === 0) {
        jobs.set(id, { mode: "stack-hold", stackIndex: 0 });
        item.action = "idle"; item.actionUntil = time + 2;
        return;
      }
      const target = [base.position[0] + (index % 2 ? 0.22 : -0.22), base.position[1] + (index % 2 ? 0.22 : -0.22)];
      jobs.set(id, { mode: "stack-to", stackIndex: index, target, speed, phase: "to" });
    });
  }
  function ride(driver, mount, { speed = 1.2 } = {}) {
    stop([driver, mount]);
    const id = entries.get(driver), im = entries.get(mount);
    if (!id || !im) return;
    const target = [im.position[0], im.position[1]];
    jobs.set(driver, { mode: "ride-to", mount, target, speed, phase: "to" });
    // The mount itself must cruise so the ride goes somewhere, not just hover.
    const flyingRide = /ufo|spaceship|airplane|rocket/.test(im.asset || "");
    // Flying vehicles circle the whole planet on a bold route; ground vehicles stay local.
    const R = stage.world.planet.radius;
    jobs.set(mount, { mode: "ride-cruise", center: [0, 0], angle: Math.atan2(im.position[1], im.position[0]), radius: flyingRide ? R * 0.92 : 1.7, speed: flyingRide ? 1.25 : 0.32, phase: "idle", holdUntil: time + 1.6, flyHeight: flyingRide ? 1.7 : 0 });
  }
  function danceParty(ids, { radius = 1.3, speed = 1.15 } = {}) {
    stop(ids);
    const valid = ids.filter(id => entries.has(id));
    if (!valid.length) return;
    const center = centerOf(valid);
    valid.forEach((id, index) => {
      const item = entries.get(id);
      const target = ringPoint(center, Math.min(radius, 0.4 + index * 0.5), (index / Math.max(1, valid.length)) * Math.PI * 2);
      jobs.set(id, { mode: "dance-to", target, center, speed, phase: "to" });
    });
  }
  function shakeHands(a, b, { speed = 1.1 } = {}) {
    stop([a, b]);
    const ia = entries.get(a), ib = entries.get(b);
    if (!ia || !ib) return;
    const cx = (ia.position[0] + ib.position[0]) / 2, cz = (ia.position[1] + ib.position[1]) / 2;
    jobs.set(a, { mode: "handshake-to", partner: b, target: [cx - 0.5, cz], center: [cx, cz], speed, phase: "to" });
    jobs.set(b, { mode: "handshake-to", partner: a, target: [cx + 0.5, cz], center: [cx, cz], speed, phase: "to" });
  }

  // Default living behaviour: after a short pause each actor starts moving on
  // its own. Styles vary per entity: back-and-forth, circling, or wandering.
  function roam(ids, { speed = 0.9 } = {}) {
    ids.forEach((id, index) => {
      const item = entries.get(id);
      if (!item || jobs.has(id)) return;
      const [x, z] = item.position;
      const style = (hashOf(id) + index) % 3;
      if (style === 0) {
        // Walk back and forth along one line.
        const angle = (index / Math.max(1, ids.length)) * Math.PI * 2;
        const dist = 2.2 + (index % 3) * 1.1;
        jobs.set(id, { mode: "roam-bounce", origin: [x, z], target: [x + Math.cos(angle) * dist, z + Math.sin(angle) * dist], speed, phase: "to" });
      } else if (style === 1) {
        // Keep walking around in a circle (a long lap around the area).
        const radius = 2.6 + (index % 3) * 1.3;
        jobs.set(id, { mode: "roam-ring", center: [x, z], radius, angle: index * 1.7, speed, phase: "ring" });
      } else {
        // Wander: pick a random nearby point, then pick another.
        jobs.set(id, { mode: "roam-wander", origin: [x, z], speed, phase: "to", target: [x + (index % 2 ? 2.4 : -2.4), z + (index % 3) * 1.6 - 1.6] });
      }
    });
  }

  // Idle a few seconds, then start roaming on their own.
  const pendingDefaults = new Map(); // id -> startsAt
  function defaultRoam(ids, { delayMin = 1.8, delayMax = 4.2 } = {}) {
    const startsAt = time + delayMin + Math.random() * (delayMax - delayMin);
    for (const id of ids) {
      if (entries.has(id) && !jobs.has(id)) pendingDefaults.set(id, startsAt + Math.random() * 0.8);
    }
  }

  function hashOf(text) {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function update(dt, t) {
    time = t;
    dt = Math.min(0.1, Math.max(0, dt));
    for (const [id, job] of jobs) {
      const item = entries.get(id);
      if (!item || item.entrance < 2) {
        if (!item) jobs.delete(id);
        continue;
      }
      if (job.phase === "to") {
        if (stepToward(item, job.target, job.speed, dt, t)) {
          if (job.mode === "patrol") {
            job.phase = "back";
            job.arriveAt = t + 0.6;
            item.action = "idle";
            item.actionUntil = t + 1;
            // A tiny flourish between legs of the patrol reads as living motion.
            if (!stage.reduced) {
              item.model.setAction?.("wave");
              item.actionUntil = t + 0.8;
            }
          } else if (job.mode === "roam-wander") {
            // Wander: after a pause, head somewhere new nearby.
            job.phase = "hold";
            job.holdUntil = t + 0.8 + Math.random() * 1.6;
            item.action = "idle";
            item.actionUntil = t + 1;
          } else if (job.mode === "hug-to") {
            job.phase = "hug";
            job.hugUntil = t + 2.6;
            face(item, job.center, t);
          } else if (job.mode === "handshake-to") {
            job.phase = "handshake";
            job.hugUntil = t + 2.2;
            face(item, job.center, t);
          } else if (job.mode === "stack-to") {
            job.phase = "stack-hold";
            job.stackIndex = job.stackIndex;
            item.action = "idle"; item.actionUntil = t + 2;
          } else if (job.mode === "dance-to") {
            job.phase = "dancing";
            item.action = "dance"; item.actionUntil = t + 2;
          } else if (job.mode === "ride-to") {
            job.phase = "riding";
            item.action = "cheer"; item.actionUntil = t + 1;
          } else if (job.mode === "holdhands" && job.index === 0) {
            job.phase = "back";
            job.arriveAt = t + 0.5;
          } else {
            job.phase = "done";
            face(item, job.center, t);
          }
        }
      } else if (job.phase === "back" && t >= job.arriveAt) {
        if (job.mode === "holdhands" && job.index === 0) {
          stepToward(item, job.origin, job.speed, dt, t);
          job.phase = "to";
        } else if (stepToward(item, job.origin, job.speed, dt, t)) {
          job.phase = "hold";
          job.holdUntil = t + 0.5;
        }
      } else if (job.phase === "hold" && t >= job.holdUntil) {
        if (job.mode === "roam-wander") {
          const [ox, oz] = job.origin;
          job.phase = "to";
          job.target = [ox + (Math.random() - 0.5) * 5.5, oz + (Math.random() - 0.5) * 5.5];
        } else {
          // Return leg completed: head back out to the patrol target again.
          job.phase = "to";
        }
      } else if (job.phase === "ring") {
        const [cx, cz] = job.center;
        job.angle = (job.angle + (dt * job.speed) / Math.max(0.6, job.radius)) % (Math.PI * 2);
        const [x, z] = ringPoint(job.center, job.radius, job.angle);
        place(item, x, z, "walk", t);
      } else if (job.phase === "hug") {
        item.action = "dance"; item.actionUntil = t + 1;
        if (t >= job.hugUntil) { job.phase = "done"; face(item, job.center, t); }
      } else if (job.phase === "handshake") {
        item.action = "wave"; item.actionUntil = t + 0.8;
        if (t >= job.hugUntil) { job.phase = "done"; face(item, job.center, t); }
      } else if (job.phase === "stack-hold") {
        // Stay on top of the stack at an elevated height (index 0 stays grounded).
        if (job.stackIndex > 0 && item.rest) {
          item.anchor.position.copy(item.rest).add(new THREE.Vector3(0, job.stackIndex * 1.75, 0));
        }
        item.action = "idle"; item.actionUntil = t + 2;
      } else if (job.phase === "dancing") {
        item.action = "dance"; item.actionUntil = t + 1;
        if (job.until && t >= job.until) { job.phase = "done"; face(item, job.center, t); }
      } else if (job.mode === "ride-cruise") {
        if (job.phase === "idle" && t < job.holdUntil) {
          // wait for the driver to climb on
        } else if (job.phase === "idle") {
          job.phase = "cruise";
        } else {
          const [cx, cz] = job.center;
          job.angle = (job.angle + (dt * job.speed) / Math.max(0.6, job.radius)) % (Math.PI * 2);
          const px = cx + Math.cos(job.angle) * job.radius;
          const pz = cz + Math.sin(job.angle) * job.radius;
          place(item, px, pz, "idle", t, job.flyHeight || 0);
          // gentle hover bob so it feels alive
          item.anchor.position.y += Math.sin(t * 2.1) * 0.12;
        }
      } else if (job.phase === "riding") {
        const mount = entries.get(job.mount);
        if (!mount) { jobs.delete(id); continue; }
        item.anchor.position.copy(mount.anchor.position).add(new THREE.Vector3(0, 0.5, 0));
        item.anchor.quaternion.copy(mount.anchor.quaternion);
        item.position = [mount.position[0], mount.position[1]];
        item.action = "cheer"; item.actionUntil = t + 1;
      } else if (job.mode === "chase" && job.phase !== "done") {
        const runner = entries.get(job.runner);
        if (!runner) { jobs.delete(id); continue; }
        const dx = runner.position[0] - item.position[0], dz = runner.position[1] - item.position[1];
        const dist = Math.hypot(dx, dz);
        if (dist < 0.85) {
          item.action = "cheer"; item.actionUntil = t + 1.6;
          runner.action = "fall"; runner.actionUntil = t + 1.4;
          jobs.delete(id);
          continue;
        }
        if (dist > 0.01) place(item, item.position[0] + (dx / dist) * dt * job.speed, item.position[1] + (dz / dist) * dt * job.speed, "run", t);
      } else if (job.mode === "flee" && job.phase !== "done") {
        const chaser = entries.get(job.chaser);
        if (!chaser) { jobs.delete(id); continue; }
        const dx = item.position[0] - chaser.position[0], dz = item.position[1] - chaser.position[1];
        const dist = Math.hypot(dx, dz) || 1;
        if (dist < 3.2) place(item, item.position[0] + (dx / dist) * dt * job.speed, item.position[1] + (dz / dist) * dt * job.speed, "run", t);
      } else if (job.mode === "holdhands" && job.index > 0 && job.phase !== "done") {
        const leader = entries.get(job.leader);
        if (!leader) { jobs.delete(id); continue; }
        // Follow the previous member's tail at a fixed gap.
        const prev = entries.get(job.set ? [...job.set][job.index - 1] : job.leader);
        if (prev) {
          const pdx = prev.position[0] - item.position[0], pdz = prev.position[1] - item.position[1];
          const pd = Math.hypot(pdx, pdz);
          if (pd > job.gap + 0.05 && pd > 0.01) place(item, item.position[0] + (pdx / pd) * dt * job.speed, item.position[1] + (pdz / pd) * dt * job.speed, "walk", t);
          else { item.action = "idle"; item.actionUntil = t + 0.5; }
        }
      }
    }
    // Fire idle defaults.
    for (const [id, startsAt] of pendingDefaults) {
      if (t < startsAt) continue;
      pendingDefaults.delete(id);
      if (entries.has(id) && !jobs.has(id)) roam([id]);
    }
  }

  return {
    patrol,
    gather,
    surround,
    roam,
    defaultRoam,
    chase,
    hug,
    holdHands,
    stack,
    ride,
    danceParty,
    shakeHands,
    stop,
    update,
    clear() { stop(); },
    get stats() {
      return { active: jobs.size, jobs: [...jobs.values()].map(({ id, mode, phase }) => ({ id, mode, phase })) };
    },
  };
}
