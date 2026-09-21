import * as THREE from "../../vendor/three.module.js";

// Presentational special effects: smoke, sparkles, dust, trails, weather,
// meteors, fireworks, confetti, camera shake, wind, anti-gravity, zoom.
// All effects are visual-only and never touch world records.

const UP = new THREE.Vector3(0, 1, 0);
const POOL = 420;

function makeDotTexture(color, size = 32) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

const TEXTURES = new Map();
function dot(color) {
  if (!TEXTURES.has(color)) TEXTURES.set(color, makeDotTexture(color));
  return TEXTURES.get(color);
}

export function createPfxController({ stage, world }) {
  const scene = stage.scene;
  const root = new THREE.Group();
  root.name = "pfx-layer";
  scene.add(root);
  const pool = [];
  for (let i = 0; i < POOL; i++) {
    const mat = new THREE.SpriteMaterial({ map: dot("#ffffff"), transparent: true, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    sp.visible = false;
    sp.userData = { life: 0, max: 0, vel: new THREE.Vector3(), spin: 0, size: 1, drag: 1, gravity: 0, fade: 1 };
    pool.push(sp);
    root.add(sp);
  }
  let cursor = 0;
  function take() {
    for (let i = 0; i < POOL; i++) {
      const sp = pool[cursor % POOL];
      cursor++;
      if (!sp.visible) return sp;
    }
    return null;
  }
  function burst({ at, color = "#ffffff", count = 8, speed = 1.2, life = 0.9, size = 0.22, gravity = 0, up = 0.6, spread = 1, fade = 1, drag = 0.96 }) {
    const origin = Array.isArray(at) ? new THREE.Vector3(at[0], at[1], at[2]) : at;
    for (let i = 0; i < count; i++) {
      const sp = take();
      if (!sp) return;
      sp.material.map = dot(color);
      sp.material.opacity = 1;
      sp.visible = true;
      sp.position.copy(origin);
      const u = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(spread);
      u.y = Math.abs(u.y) * 0.5 + up;
      sp.userData.vel.copy(u.multiplyScalar(speed));
      sp.userData.life = 0;
      sp.userData.max = life * (0.7 + Math.random() * 0.6);
      sp.userData.size = size * (0.6 + Math.random() * 0.9);
      sp.userData.spin = (Math.random() - 0.5) * 4;
      sp.userData.gravity = gravity;
      sp.userData.fade = fade;
      sp.userData.drag = drag;
      sp.scale.setScalar(sp.userData.size);
    }
  }

  // ---------- named effects ----------
  const effects = {
    smoke({ at, scale = 1 }) {
      burst({ at, color: "rgba(214,214,214,1)", count: 14, speed: 1.5 * scale, life: 1.4, size: 0.5 * scale, up: 1.2, spread: 0.4, drag: 0.94 });
      burst({ at, color: "rgba(180,180,180,1)", count: 10, speed: 1.1 * scale, life: 1.8, size: 0.85 * scale, up: 0.9, spread: 0.5, drag: 0.93 });
    },
    sparkle({ at, count = 10 }) {
      burst({ at, color: "rgba(255,232,150,1)", count, speed: 1.0, life: 0.8, size: 0.16, up: 1.6, spread: 0.5 });
      burst({ at, color: "rgba(255,250,215,1)", count: Math.ceil(count / 2), speed: 0.7, life: 1.0, size: 0.1, up: 1.4, spread: 0.4 });
    },
    dust({ at }) {
      burst({ at, color: "rgba(178,152,120,1)", count: 12, speed: 1.3, life: 0.8, size: 0.14, up: 0.7, spread: 0.7, drag: 0.9, gravity: -0.5 });
    },
    trail({ from, to, color = "rgba(160,220,255,1)" }) {
      const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
      const steps = 6;
      for (let i = 0; i < steps; i++) {
        const p = a.clone().lerp(b, i / steps);
        burst({ at: p, color, count: 1, speed: 0.1, life: 0.5, size: 0.13, up: 0.2, spread: 0.2 });
      }
    },
    firework({ at }) {
      const colors = ["rgba(255,120,120,1)", "rgba(255,200,90,1)", "rgba(120,220,160,1)", "rgba(140,180,255,1)", "rgba(220,150,255,1)"];
      for (let c = 0; c < 3; c++) burst({ at, color: colors[c % colors.length], count: 16, speed: 2.4, life: 1.1, size: 0.14, up: 0.4, spread: 1, gravity: -0.9, drag: 0.9 });
      burst({ at, color: "rgba(255,255,255,1)", count: 8, speed: 1.1, life: 0.7, size: 0.1, up: 0.3, spread: 1, gravity: -0.6, drag: 0.92 });
    },
    confetti({ at, count = 30 }) {
      const colors = ["rgba(255,150,150,1)", "rgba(255,210,110,1)", "rgba(150,220,160,1)", "rgba(150,190,255,1)", "rgba(230,160,255,1)"];
      burst({ at, color: colors[0], count, speed: 1.8, life: 1.6, size: 0.12, up: 1.4, spread: 0.9, gravity: -1.4, drag: 0.88 });
      for (let i = 1; i < colors.length; i++) burst({ at, color: colors[i], count: Math.ceil(count / 4), speed: 1.6, life: 1.4, size: 0.1, up: 1.2, spread: 0.8, gravity: -1.2, drag: 0.9 });
    },
    stars({ at }) { effects.sparkle({ at, count: 16 }); },
    vanishStar({ at }) { effects.firework({ at }); },
    heart({ at }) { effects.sparkle({ at, count: 6 }); },
  };

  // ---------- continuous weather ----------
  const weather = { kind: null, group: new THREE.Group() };
  weather.group.visible = false;
  root.add(weather.group);
  let weatherParticles = [];
  function startWeather(kind, strength = 1) {
    stopWeather();
    weather.kind = kind;
    weather.group.visible = true;
    for (let i = 0; i < 90 * strength; i++) {
      const sp = take();
      if (!sp) continue;
      sp.material.map = dot(kind === "rain" ? "rgba(150,190,255,1)" : kind === "snow" ? "rgba(255,255,255,1)" : "rgba(190,195,205,1)");
      sp.visible = true;
      sp.position.set((Math.random() - 0.5) * 26, Math.random() * 9 + 1, (Math.random() - 0.5) * 26);
      sp.scale.setScalar(kind === "rain" ? 0.06 : 0.12);
      sp.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 0.4, kind === "rain" ? -6 : -1.1, (Math.random() - 0.5) * 0.4);
      sp.userData.life = 0; sp.userData.max = 9999;
      sp.userData.size = sp.scale.x; sp.userData.fade = 0;
      sp.userData.drag = 1;
      sp.userData.weather = true;
      weatherParticles.push(sp);
    }
  }
  function stopWeather() {
    for (const sp of weatherParticles) { sp.visible = false; delete sp.userData.weather; }
    weatherParticles = [];
    weather.kind = null;
    weather.group.visible = false;
  }

  // ---------- camera shake / wind / zoom ----------
  let shakeUntil = 0, shakeStrength = 0;
  function shake(strength = 0.05, duration = 0.5) {
    shakeUntil = performance.now() + duration * 1000;
    shakeStrength = Math.max(shakeStrength, strength);
  }
  let windStrength = 0;
  function setWind(v) { windStrength = Math.max(0, v); }
  let zoomTarget = 1, zoomCurrent = 1;
  function setZoom(v, animate = true) {
    zoomTarget = Math.max(0.35, Math.min(2.6, v));
    if (!animate) zoomCurrent = zoomTarget;
  }
  function reset() { zoomTarget = 1; shakeUntil = 0; shakeStrength = 0; windStrength = 0; stopWeather(); }

  function update(dt) {
    const now = performance.now();
    for (const sp of pool) {
      if (!sp.visible) continue;
      const ud = sp.userData;
      if (ud.weather) {
        sp.position.addScaledVector(ud.vel, dt);
        if (sp.position.y < -0.5) sp.position.y = 9;
        sp.position.x = ((sp.position.x + 13) % 26) - 13;
        sp.position.z = ((sp.position.z + 13) % 26) - 13;
        sp.position.x += windStrength * dt * 2;
        continue;
      }
      ud.life += dt;
      if (ud.life >= ud.max) { sp.visible = false; continue; }
      ud.vel.multiplyScalar(ud.drag);
      ud.vel.y -= ud.gravity * dt;
      sp.position.addScaledVector(ud.vel, dt);
      const k = 1 - ud.life / ud.max;
      sp.material.opacity = k * ud.fade;
      sp.scale.setScalar(ud.size * (0.6 + 0.4 * k));
      sp.rotation.z += ud.spin * dt;
    }
    // zoom
    const zk = 1 - Math.exp(-dt * 3);
    zoomCurrent += (zoomTarget - zoomCurrent) * zk;
    if (Math.abs(zoomTarget - zoomCurrent) < 0.002) zoomCurrent = zoomTarget;
    root.scale.setScalar(zoomCurrent);
  }

  // camera shake hook: stage applies `shakeOffset(dt)` each frame
  function shakeOffset() {
    if (performance.now() >= shakeUntil || shakeStrength <= 0) return null;
    const s = shakeStrength * Math.max(0, (shakeUntil - performance.now()) / 1000);
    return new THREE.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  return {
    get zoomScale() { return zoomCurrent; },
    play(name, opts = {}) { try { effects[name]?.(opts); } catch (e) { /* visual-only */ } },
    startWeather, stopWeather, get weatherKind() { return weather.kind; },
    shake, setWind, setZoom, reset, update, shakeOffset,
    dispose() { stopWeather(); root.removeFromParent(); for (const sp of pool) sp.material.dispose(); },
  };
}
