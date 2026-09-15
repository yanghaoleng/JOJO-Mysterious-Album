/**
 * Quiet, procedural distant space for the original ink / picture-book planet.
 * Original geometry and shaders, authored for this project; no bitmap assets.
 * All colours come from the shared world-atmosphere contract. This module never
 * changes global Three colour management, renderer configuration or scene lights.
 */
import * as THREE from '../vendor/three.module.js';
import { WORLD_ENVIRONMENTS } from '../dev/environments.js';

const DEFAULT_ATMOSPHERE = WORLD_ENVIRONMENTS.orchard.atmosphere;
const COUNTS = [240, 360, 520];
const LAYER_RATIOS = [.69, .84, 1];
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;

function seeded(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

function linearColour(value, fallback) {
  const colour = new THREE.Color(value || fallback);
  // Legacy pages disable automatic conversion. Convert this module's own colour
  // objects exactly once, without changing any borrowed material or global flag.
  if (!THREE.ColorManagement.enabled) colour.convertSRGBToLinear();
  return colour;
}

const WASH_VERTEX = /* glsl */`
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const WASH_FRAGMENT = /* glsl */`
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform vec3 uSky;
  uniform float uOpacity;
  varying vec3 vDirection;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  void main() {
    vec3 direction=normalize(vDirection);
    // Low-frequency, world-anchored watercolor blooms: no screen-space grain,
    // animated noise, UV seam or sharp atmospheric edge across the planet.
    float broad=noise(direction*3.1+vec3(2.9,8.1,5.4));
    float bloom=noise(direction*6.2+vec3(11.0,3.0,7.0));
    float band=exp(-pow((direction.y-0.16+sin(direction.x*3.0)*.10)*2.4,2.0));
    float wash=smoothstep(.26,.78,broad*.80+bloom*.20)*(.48+.52*band);
    vec3 colour=mix(uHorizon,uSky,smoothstep(-.2,.8,direction.y)*.57);
    colour=mix(colour,uGlow,smoothstep(.55,.82,broad)*.56);
    gl_FragColor=vec4(colour, wash*uOpacity);
    #include <colorspace_fragment>
  }
`;
const STAR_VERTEX = /* glsl */`
  attribute float aSize;
  attribute float aPhase;
  uniform float uPixels;
  varying float vPhase;
  void main() {
    vPhase=aPhase;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
    gl_PointSize=max(1.0,aSize*uPixels);
  }
`;
const STAR_FRAGMENT = /* glsl */`
  uniform vec3 uInk;
  uniform vec3 uLight;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uTwinkle;
  varying float vPhase;
  void main() {
    float radius=length(gl_PointCoord-.5)*2.0;
    float coverage=1.0-smoothstep(.42,1.0,radius);
    if(coverage<.008) discard;
    float breathing=1.0-uTwinkle*.5+sin(uTime*.53+vPhase*6.2831853)*uTwinkle*.5;
    vec3 colour=mix(uInk,uLight,step(.75,vPhase)*.78);
    gl_FragColor=vec4(colour,coverage*uOpacity*breathing*(.62+vPhase*.38));
    #include <colorspace_fragment>
  }
`;
const METEOR_VERTEX = /* glsl */`
  varying vec2 vUv;
  void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
`;
const METEOR_FRAGMENT = /* glsl */`
  uniform vec3 uColour;
  uniform float uOpacity;
  varying vec2 vUv;
  void main(){
    float centre=1.0-smoothstep(.15,1.0,abs(vUv.y-.5)*2.0);
    float taper=pow(vUv.x,1.6)*(1.0-smoothstep(.85,1.0,vUv.x));
    gl_FragColor=vec4(uColour,uOpacity*centre*taper);
    #include <colorspace_fragment>
  }
`;

/**
 * Mount `group` directly under an unscaled scene. Call update after the camera
 * matrices are updated. `target` is a world-space Vector3 (or finite x/y/z).
 * A camera far plane >=100 allows the full three-depth composition; shorter far
 * planes are supported, and effects hide if there is no safe background room.
 */
export function createInkPlanetSpace({ reducedMotion = false } = {}) {
  const group = new THREE.Group(); group.name = 'ink-picture-book-distant-space';
  group.userData = { decorative: true, colourSpace: 'linear-srgb', originalProceduralAsset: true };
  const geometries = new Set(), materials = new Set();
  const ownGeometry = value => { geometries.add(value); return value; };
  const ownMaterial = value => { materials.add(value); return value; };
  const shader = (vertexShader, fragmentShader, uniforms, extra = {}) => ownMaterial(new THREE.ShaderMaterial({
    vertexShader, fragmentShader, uniforms, transparent: true, depthTest: true,
    depthWrite: false, toneMapped: false, fog: false, ...extra,
  }));
  const washMaterial = shader(WASH_VERTEX, WASH_FRAGMENT, {
    uHorizon: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
    uSky: { value: new THREE.Color() }, uOpacity: { value: .16 },
  }, { side: THREE.BackSide });
  const wash = new THREE.Mesh(ownGeometry(new THREE.SphereGeometry(1, 40, 24)), washMaterial);
  wash.name = 'distant-watercolour-bloom-shell'; wash.renderOrder = -103;
  wash.frustumCulled = false; group.add(wash);
  const random = seeded(0x1a2b73d1), layers = [];
  for (let layer = 0; layer < COUNTS.length; layer++) {
    const count = COUNTS[layer], positions = [], sizes = [], phases = [];
    // A deterministic, jittered Fibonacci sphere avoids conspicuous star clumps.
    for (let i = 0; i < count; i++) {
      const y = 1 - 2 * (i + .5) / count, radius = Math.sqrt(1 - y * y);
      const angle = i * Math.PI * (3 - Math.sqrt(5)) + (random() - .5) * .28;
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      sizes.push(.82 + random() * .53); phases.push(random());
    }
    const geometry = ownGeometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
    const material = shader(STAR_VERTEX, STAR_FRAGMENT, {
      uInk: { value: new THREE.Color() }, uLight: { value: new THREE.Color() },
      uOpacity: { value: .18 }, uTime: { value: 0 }, uTwinkle: { value: 0 },
      uPixels: { value: 1.65 - layer * .25 },
    });
    const points = new THREE.Points(geometry, material); points.name = `distant-star-depth-${layer + 1}`;
    points.frustumCulled = false; points.renderOrder = -102 + layer;
    group.add(points); layers.push(points);
  }
  const meteorGeometry = ownGeometry(new THREE.BufferGeometry());
  const meteorPositions = new Float32Array(12), meteorUV = [0,0,0,1,1,0,1,1];
  meteorGeometry.setAttribute('position', new THREE.BufferAttribute(meteorPositions, 3).setUsage(THREE.DynamicDrawUsage));
  meteorGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(meteorUV, 2));
  meteorGeometry.setIndex([0,2,1,1,2,3]);
  const meteorMaterial = shader(METEOR_VERTEX, METEOR_FRAGMENT, {
    uColour: { value: new THREE.Color() }, uOpacity: { value: 0 },
  }, { side: THREE.DoubleSide });
  const meteor = new THREE.Mesh(meteorGeometry, meteorMaterial); meteor.name = 'occasional-peripheral-fine-meteor';
  meteor.frustumCulled = false; meteor.renderOrder = -99; meteor.visible = false; group.add(meteor);

  const centre = new THREE.Vector3(), view = new THREE.Vector3(), offset = new THREE.Vector3();
  const right = new THREE.Vector3(), head = new THREE.Vector3(), tail = new THREE.Vector3();
  const projectedHead = new THREE.Vector3(), projectedTail = new THREE.Vector3();
  const meteorStart = new THREE.Vector3(), meteorEnd = new THREE.Vector3(), meteorTail = new THREE.Vector3();
  let atmosphere = DEFAULT_ATMOSPHERE, disposed = false, elapsed = 0, nextMeteor = 9.5;
  let started = -1, duration = 1.15, meteorCount = 0, lastGap = 9.5, radius = 42, safeDepth = false;
  let meteorWidth = .005, meteorAlpha = .28, initialized = false;
  let lastProjected = null;

  function setAtmosphere(next = DEFAULT_ATMOSPHERE) {
    if (disposed) return false;
    atmosphere = next?.atmosphere || next || DEFAULT_ATMOSPHERE;
    const period = ['day', 'dusk', 'night'].includes(atmosphere.period) ? atmosphere.period : 'day';
    const base = linearColour(atmosphere.base, DEFAULT_ATMOSPHERE.base);
    const horizon = linearColour(atmosphere.horizon, DEFAULT_ATMOSPHERE.horizon);
    const glow = linearColour(atmosphere.glow, DEFAULT_ATMOSPHERE.glow);
    const sky = linearColour(atmosphere.lighting?.sky, atmosphere.horizon || DEFAULT_ATMOSPHERE.horizon);
    const ink = linearColour(atmosphere.accent, atmosphere.muted || DEFAULT_ATMOSPHERE.accent).lerp(base, period === 'night' ? .12 : .28);
    washMaterial.uniforms.uHorizon.value.copy(horizon);
    washMaterial.uniforms.uGlow.value.copy(glow); washMaterial.uniforms.uSky.value.copy(sky);
    washMaterial.uniforms.uOpacity.value = period === 'night' ? .26 : period === 'dusk' ? .22 : .17;
    for (let i = 0; i < layers.length; i++) {
      const uniforms = layers[i].material.uniforms;
      uniforms.uInk.value.copy(ink); uniforms.uLight.value.copy(glow);
      uniforms.uOpacity.value = (period === 'night' ? .65 : period === 'dusk' ? .40 : .21) * (1 - i * .15);
      uniforms.uTwinkle.value = !reducedMotion && period === 'night' ? .10 : 0;
    }
    meteorMaterial.uniforms.uColour.value.copy(ink).lerp(glow, period === 'night' ? .25 : .12);
    meteorAlpha = period === 'night' ? .38 : period === 'dusk' ? .29 : .20;
    group.userData.period = period;
    meteor.visible = false; started = -1; lastProjected = null;
    lastGap = 8 + random() * 12; nextMeteor = elapsed + lastGap;
    return true;
  }

  function scheduleNext() {
    const previousStart = started >= 0 ? started : elapsed;
    meteor.visible = false; started = -1; lastProjected = null;
    lastGap = 8 + random() * 12; nextMeteor = previousStart + lastGap;
  }

  function beginMeteor(camera, distance) {
    const depth = distance + radius * .66;
    const halfHeight = camera.isOrthographicCamera ? (camera.top - camera.bottom) / (2 * camera.zoom)
      : depth * Math.tan(THREE.MathUtils.degToRad(camera.fov || 35) * .5) / (camera.zoom || 1);
    const side = random() > .5 ? 1 : -1, x = side * (.67 + random() * .18), y = .76 + random() * .13;
    const p = camera.projectionMatrix.elements;
    const clipDepth = (-depth * p[10] + p[14]) / (-depth * p[11] + p[15]);
    // Unprojection also respects the stage's off-centre safe-viewport framing.
    const local = (nx, ny, value) => value.set(nx, ny, clipDepth).unproject(camera).sub(group.position);
    local(x, y, meteorStart); local(x - side * .27, y - .075, meteorEnd);
    meteorTail.copy(meteorStart).sub(meteorEnd).multiplyScalar(.28);
    meteorWidth = halfHeight * .0020; duration = .95 + random() * .42;
    started = elapsed; meteorCount++;
  }

  function update(time = 0, dt = 1 / 60, camera, target) {
    if (disposed || !camera?.isCamera) return;
    const step = clamp(Number.isFinite(dt) ? dt : 1 / 60, 0, .25);
    elapsed += step;
    if (target && [target.x, target.y, target.z].every(Number.isFinite)) centre.copy(target);
    if (!initialized) { group.position.copy(centre); initialized = true; }
    else group.position.lerp(centre, reducedMotion ? 1 : 1 - Math.exp(-step * 5));
    camera.updateWorldMatrix(true, false);
    const distance = camera.getWorldPosition(offset).distanceTo(group.position);
    // Every shell surrounds both the planet and camera. If an unusually short
    // far plane cannot do this safely, hide rather than put stars in the cast.
    radius = Math.min(44, (camera.far - distance - 1) * .88);
    safeDepth = radius * LAYER_RATIOS[0] > distance + 7;
    wash.visible = safeDepth; layers.forEach(layer => { layer.visible = safeDepth; });
    if (!safeDepth) { meteor.visible = false; started = -1; return; }
    wash.scale.setScalar(radius * 1.045);
    offset.copy(camera.position).sub(group.position);
    const pixels = Math.min(2, Math.max(1, Number(globalThis.devicePixelRatio) || 1));
    for (let i = 0; i < layers.length; i++) {
      layers[i].scale.setScalar(radius * LAYER_RATIOS[i]);
      // A small depth-dependent world displacement reinforces natural orbit
      // parallax; it is camera-driven, never an autonomous drifting star field.
      layers[i].position.copy(offset).multiplyScalar(.012 * (2 - i));
      const apparentSize = group.userData.period === 'night' ? [2.55, 1.85, 1.35][i]
        : group.userData.period === 'dusk' ? [2.05, 1.55, 1.15][i] : [1.65, 1.4, 1.15][i];
      layers[i].material.uniforms.uPixels.value = apparentSize * pixels;
      layers[i].material.uniforms.uTime.value = reducedMotion ? 0 : (Number.isFinite(time) ? time : elapsed);
    }
    if (reducedMotion) { meteor.visible = false; return; }
    if (started < 0 && elapsed >= nextMeteor) beginMeteor(camera, distance);
    if (started < 0) return;
    const progress = (elapsed - started) / duration;
    if (progress >= 1) { scheduleNext(); return; }
    head.lerpVectors(meteorStart, meteorEnd, progress); tail.copy(head).add(meteorTail);
    projectedHead.copy(head).add(group.position).project(camera);
    projectedTail.copy(tail).add(group.position).project(camera);
    const inCast = point => Math.abs(point.x) < .58 && Math.abs(point.y) < .56;
    // An orbit/zoom during a meteor must not drag the decoration over a face.
    if (inCast(projectedHead) || inCast(projectedTail) || Math.abs(projectedHead.y) > 1.2 || projectedHead.z > 1 || projectedHead.z < -1) { scheduleNext(); return; }
    view.copy(head).sub(tail).normalize(); offset.copy(view).cross(camera.getWorldDirection(right)).normalize().multiplyScalar(meteorWidth);
    for (let i = 0; i < 4; i++) {
      const p = i < 2 ? tail : head, side = i % 2 ? 1 : -1;
      meteorPositions[i * 3] = p.x + offset.x * side;
      meteorPositions[i * 3 + 1] = p.y + offset.y * side;
      meteorPositions[i * 3 + 2] = p.z + offset.z * side;
    }
    meteorGeometry.attributes.position.needsUpdate = true;
    meteorMaterial.uniforms.uOpacity.value = meteorAlpha * Math.sin(progress * Math.PI);
    meteor.visible = true;
    lastProjected = { head: projectedHead.toArray(), tail: projectedTail.toArray() };
  }

  function dispose() {
    if (disposed) return;
    disposed = true; meteor.visible = false;
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    group.clear(); group.removeFromParent();
  }

  function diagnostics() {
    return { disposed, reducedMotion: Boolean(reducedMotion), period: group.userData.period,
      starCounts: [...COUNTS], shellRadii: LAYER_RATIOS.map(value => value * radius),
      safeBackgroundDepth: safeDepth, maxDrawCalls: 5, ownedGeometries: geometries.size, ownedMaterials: materials.size,
      elapsed, nextMeteorAt: nextMeteor, lastMeteorGap: lastGap, meteorCount, meteorVisible: meteor.visible,
      meteorProjected: lastProjected ? { head: [...lastProjected.head], tail: [...lastProjected.tail] } : null,
      noExternalTextures: true };
  }
  setAtmosphere(DEFAULT_ATMOSPHERE);
  return { group, setAtmosphere, update, dispose, diagnostics };
}
