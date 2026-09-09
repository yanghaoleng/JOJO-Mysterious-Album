/**
 * Original-edition ink and pale watercolour on xuan paper, Three.js r160.
 * Apply ONLY to a freshly created world's group, not the legacy characters.
 * No new mesh, texture, pass, normal displacement, or global colour switch.
 *
 * auto input colour assumes worlds made under the CURRENT ColourManagement
 * setting. Use inputColorSpace:'linear' for an already-linearised/loaded world.
 * With the legacy global=false, decoding happens in this material's shader:
 * authored colours, emissive intensity and globe vertex buffers stay untouched.
 * Dispose the style before replacing it; do not stack it with dev/storybook.
 */
import * as THREE from '../vendor/three.module.js';

export const INK_PLANET_PALETTE = Object.freeze({
  paper: '#f6f1e5', ink: '#55574b', sky: '#f5f1e3', bounce: '#d8d5c5',
  sun: '#fff3d9', rim: '#e9edf0',
  hemisphereIntensity: 2.6, sunIntensity: .72, rimIntensity: .12, exposure: 1.04,
});

// A paper illustration has painted tonal areas, not a continuously relit clay
// surface. Keep the entire direct/indirect light response within this 9% range.
export const INK_PLANET_PAINT = Object.freeze({ baseShade: .9, faceTurn: .075, lightTurn: .015, specular: 0 });
const VERSION = 'ink-planet-picturebook-v3';
const SURFACES = Object.freeze({ paper: 0, fabric: 1, wood: 2, stone: 3, foliage: 4, water: 5, paint: 6, ink: 7 });
const owners = new WeakMap();
const materialUniforms = new WeakMap();

const HEADER = `
varying vec3 vInkPlanetLocal;
varying vec3 vInkPlanetLocalNormal;
uniform float uInkWash;
uniform float uInkGrain;
uniform float uInkEdge;
uniform float uInkPaperMix;
uniform float uInkScale;
uniform float uInkEmissiveIntensity;
uniform vec3 uInkPaper;
uniform vec3 uInkLine;

vec3 inkPlanetLinear(vec3 c) {
  vec3 lo = c / 12.92;
  vec3 hi = pow(max((c + .055) / 1.055, vec3(0.0)), vec3(2.4));
  return mix(lo, hi, step(vec3(.04045), c));
}
float inkPlanetHash(vec3 p) {
  p = fract(p * vec3(.1031, .1030, .0973));
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float inkPlanetNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(inkPlanetHash(i), inkPlanetHash(i + vec3(1.,0.,0.)), f.x),
        mix(inkPlanetHash(i + vec3(0.,1.,0.)), inkPlanetHash(i + vec3(1.,1.,0.)), f.x), f.y),
    mix(mix(inkPlanetHash(i + vec3(0.,0.,1.)), inkPlanetHash(i + vec3(1.,0.,1.)), f.x),
        mix(inkPlanetHash(i + vec3(0.,1.,1.)), inkPlanetHash(i + vec3(1.,1.,1.)), f.x), f.y), f.z);
}
float inkPlanetAA(vec3 p) {
  return 1.0 - smoothstep(.35, 1.5, length(fwidth(p)));
}
float inkPlanetDryMark(vec2 p, float seed) {
  // One short, interrupted pencil/bristle mark in an occasional paper cell.
  // These are filled open strokes, never contours around a noise isovalue.
  vec2 cell = floor(p), q = fract(p) - .5;
  float chance = inkPlanetHash(vec3(cell, seed));
  float jitter = inkPlanetHash(vec3(cell, seed + 4.7));
  vec2 direction = normalize(vec2(1.0, .18 + jitter * .35));
  q -= vec2(jitter - .5, chance - .5) * .23;
  float along = dot(q, direction), across = dot(q, vec2(-direction.y, direction.x));
  float distanceToStroke = max(abs(along) - (.14 + jitter * .15), abs(across) - (.013 + jitter * .009));
  float footprint = max(.008, length(fwidth(p)) * .48);
  return (1.0 - smoothstep(-footprint, footprint, distanceToStroke))
    * step(.82, chance) * (1.0 - smoothstep(.65, 1.8, length(fwidth(p))));
}
`;

// Decode pigment and vertex colour separately, before multiplication. Maps
// retain Three's own colour-space handling, including linear normal/data maps.
const INPUT_COLOUR = `
  #if INK_PLANET_SRGB == 1
    diffuseColor.rgb = inkPlanetLinear(diffuseColor.rgb);
  #endif
`;
const VERTEX_COLOUR = `
  #if INK_PLANET_SRGB == 1
    #if defined(USE_COLOR_ALPHA)
      diffuseColor *= vec4(inkPlanetLinear(vColor.rgb), vColor.a);
    #elif defined(USE_COLOR)
      diffuseColor.rgb *= inkPlanetLinear(vColor);
    #endif
  #else
    #include <color_fragment>
  #endif
`;
const EMISSIVE_COLOUR = `
  #if INK_PLANET_SRGB == 1
    // The standard emissive uniform already includes intensity. Remove that
    // multiplier before decoding, then restore it (important for fireflies).
    totalEmissiveRadiance = uInkEmissiveIntensity > .00001
      ? inkPlanetLinear(totalEmissiveRadiance / uInkEmissiveIntensity) * uInkEmissiveIntensity
      : vec3(0.0);
  #endif
`;
const PIGMENT = `
  float inkWet = .5;
  float inkDry = 0.0;
  float inkMarks = 0.0;
  #if INK_PLANET_SURFACE != 7
    vec3 inkP = vInkPlanetLocal * uInkScale;
    float inkBroad = inkPlanetNoise(inkP * .9 + vec3(3.7, .6, 8.1));
    inkWet = inkPlanetNoise(inkP * vec3(3.2, 1.25, 2.4) + inkBroad * .5);
    float inkPulp = (inkPlanetNoise(inkP * 21.0) - .5) * inkPlanetAA(inkP * 21.0);
    float inkFibre = (inkPlanetNoise(inkP * vec3(36., 3.8, 19.)) - .5)
      * inkPlanetAA(inkP * vec3(36., 3.8, 19.));
    vec3 inkAxes = pow(abs(normalize(vInkPlanetLocalNormal)), vec3(4.0));
    inkAxes /= max(.0001, inkAxes.x + inkAxes.y + inkAxes.z);
    inkMarks = dot(inkAxes, vec3(
      inkPlanetDryMark(inkP.yz * 2.8, 2.1), inkPlanetDryMark(inkP.xz * 2.8, 8.5), inkPlanetDryMark(inkP.xy * 2.8, 5.3)));
    // Sparse, very soft pigment pools. An isovalue ring at every noise cell
    // makes closed camouflage/tortoiseshell contours, not a light ink wash.
    float inkDeposit = smoothstep(.67, .87, inkWet) * .07;
    inkDry = inkPulp * .68 + inkFibre * .65;
    float inkWash = (inkBroad - .5) * .58 + (inkWet - .5) * .26 - inkDeposit;
    #if INK_PLANET_SURFACE == 0 || INK_PLANET_SURFACE == 4
      inkWash *= .86;
      inkDry *= .92;
    #endif
    #if INK_PLANET_SURFACE == 2
      inkWash += sin(inkP.y * 18. + inkBroad * 5. + inkP.z * 2.)
        * .065 * inkPlanetAA(inkP * 6.);
    #elif INK_PLANET_SURFACE == 3
      inkWash += inkPulp * .18;
    #elif INK_PLANET_SURFACE == 5
      // Water stays a soft blue wash, without paper fibres or specular plastic.
      inkWash = (inkBroad - .5) * .24
        + sin(inkP.x * 6. + inkP.z * 5. + inkWet) * .045 * inkPlanetAA(inkP * 2.);
      inkDry = inkPulp * .15;
      inkMarks = 0.0;
    #endif
    float inkLum = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722));
    // Keep the pigment's hue: cream paper showing through is not a grey fog.
    vec3 inkTint = mix(vec3(inkLum), diffuseColor.rgb, .96);
    float inkLift = smoothstep(.48, .75, inkWet);
    float inkReserve = clamp(uInkPaperMix * (.86 + inkLift * .32), 0.0, .8);
    diffuseColor.rgb = mix(inkTint, uInkPaper, inkReserve);
    diffuseColor.rgb *= max(.4, 1.0 + inkWash * uInkWash + inkDry * uInkGrain);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uInkLine, inkMarks * uInkGrain * .8);
  #endif
`;
const LIGHT = `
  #if INK_PLANET_SURFACE != 7
    float inkBaseLum = max(.012, dot(diffuseColor.rgb, vec3(.2126, .7152, .0722)));
    float inkLightLum = dot(totalDiffuse, vec3(.2126, .7152, .0722));
    float inkShade = max(.001, inkLightLum / inkBaseLum);
    // Two faint painted planes, not a smooth Lambertian ramp. Even a deep
    // shadow changes the paper wash by at most 9%; geometry supplies volume.
    float inkFlatShade = ${INK_PLANET_PAINT.baseShade.toFixed(3)}
      + ${INK_PLANET_PAINT.faceTurn.toFixed(3)} * smoothstep(.15, .8, inkShade)
      + ${INK_PLANET_PAINT.lightTurn.toFixed(3)} * smoothstep(.9, 1.5, inkShade);
    vec3 inkPaint = diffuseColor.rgb * inkFlatShade;
    float inkFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
    float inkPixel = max(.007, fwidth(inkFacing));
    float inkContour = 1.0 - smoothstep(.035, .15 + inkPixel, inkFacing);
    inkContour *= .62 + .38 * smoothstep(.28, .66, inkWet);
    #if INK_PLANET_SURFACE == 0 || INK_PLANET_SURFACE == 4
      inkContour *= .65;
    #endif
    #if INK_PLANET_SURFACE == 5
      inkContour *= .24;
    #endif
    inkPaint = mix(inkPaint, inkPaint * uInkLine, inkContour * uInkEdge);
    outgoingLight = inkPaint + totalEmissiveRadiance;
  #endif
`;

/** Return a linear Color without ever touching THREE.ColorManagement. */
export function inkLinearColor(value) {
  if (value?.isColor) return value.clone(); // Color inputs are already working-space.
  const color = new THREE.Color(value);
  return THREE.ColorManagement.enabled ? color : color.convertSRGBToLinear();
}

/**
 * Pure atmosphere adapter: CSS tokens remain CSS, lighting colours are new
 * linear THREE.Color objects. Compatible with DioramaStage.setLighting().
 * No mutation of WORLD_ENVIRONMENTS, the scene, or existing character lights.
 */
export function applyInkAtmosphere(atmosphere = {}) {
  const night = atmosphere.period === 'night';
  const lighting = { ...INK_PLANET_PALETTE, ...atmosphere.lighting };
  const paper = inkLinearColor(INK_PLANET_PALETTE.paper);
  const soften = (value, amount) => inkLinearColor(value).lerp(paper, amount);
  return {
    ...atmosphere,
    paper: INK_PLANET_PALETTE.paper,
    lighting: {
      ...atmosphere.lighting,
      sky: soften(lighting.sky, .52), bounce: soften(lighting.bounce, .6),
      sun: soften(lighting.sun, .42), rim: soften(lighting.rim, .55),
      hemisphereIntensity: night ? 2.7 : 2.6,
      sunIntensity: night ? .65 : .72, rimIntensity: night ? .18 : .12,
      exposure: night ? 1.06 : 1.04,
    },
  };
}

/** Idempotent borrowed-material style. dispose restores hooks and parameters. */
export function createInkPlanetStyle({ wash = .52, grain = .3, edge = .1, paperMix = .34, scale = 1, inputColorSpace = 'auto' } = {}) {
  const safe = (value, fallback, min, max) => Number.isFinite(value) ? THREE.MathUtils.clamp(value, min, max) : fallback;
  const uniforms = {
    uInkWash: { value: safe(wash, .52, 0, .9) },
    uInkGrain: { value: safe(grain, .3, 0, .6) },
    uInkEdge: { value: safe(edge, .1, 0, .55) },
    uInkPaperMix: { value: safe(paperMix, .34, 0, .7) },
    uInkScale: { value: safe(scale, 1, .25, 4) },
    uInkPaper: { value: inkLinearColor(INK_PLANET_PALETTE.paper) },
    uInkLine: { value: inkLinearColor(INK_PLANET_PALETTE.ink) },
    uInkEmissiveIntensity: { value: 1 },
  };
  const records = new Map();
  let disposed = false;

  function restore(material, record, recompile = true) {
    material.removeEventListener('dispose', record.onDispose);
    if (material.onBeforeCompile === record.hook) material.onBeforeCompile = record.onBeforeCompile;
    if (material.customProgramCacheKey === record.cacheKey) material.customProgramCacheKey = record.originalKey;
    if (material.onBeforeRender === record.beforeRender) material.onBeforeRender = record.originalBeforeRender;
    for (const [key, value] of Object.entries(record.values)) material[key] = value;
    if (record.extensions) {
      if (record.hadDerivatives) record.extensions.derivatives = record.derivatives;
      else delete record.extensions.derivatives;
      material.extensions = record.extensions;
    } else delete material.extensions;
    if (record.hadTag) material.userData.inkPlanetStyle = record.tag;
    else delete material.userData.inkPlanetStyle;
    records.delete(material);
    if (owners.get(material) === record) owners.delete(material);
    if (recompile) material.needsUpdate = true;
  }

  function applyMaterial(material) {
    if (!material?.isMeshStandardMaterial || records.has(material) || owners.has(material)) return;
    // Explicitly reject an active Dev treatment; stacking two lighting shaders
    // would silently discard one treatment. Dispose that manager first.
    if (material.userData.storybookStyle) return;
    const surface = Object.hasOwn(SURFACES, material.userData.handcraftedSurface) ? material.userData.handcraftedSurface : 'paper';
    const srgb = inputColorSpace === 'srgb' || (inputColorSpace !== 'linear' && !THREE.ColorManagement.enabled);
    let bound = materialUniforms.get(material);
    if (!bound) { bound = THREE.UniformsUtils.clone(uniforms); materialUniforms.set(material, bound); }
    else for (const [key, uniform] of Object.entries(uniforms)) {
      if (uniform.value?.isColor) bound[key].value.copy(uniform.value);
      else bound[key].value = uniform.value;
    }
    const record = {
      onBeforeCompile: material.onBeforeCompile, originalKey: material.customProgramCacheKey,
      baseKey: material.customProgramCacheKey.call(material), originalBeforeRender: material.onBeforeRender,
      values: Object.fromEntries(['roughness', 'metalness', 'envMapIntensity', ...('clearcoat' in material ? ['clearcoat'] : [])].map(key => [key, material[key]])),
      extensions: material.extensions, hadDerivatives: Object.hasOwn(material.extensions || {}, 'derivatives'), derivatives: material.extensions?.derivatives,
      hadTag: Object.hasOwn(material.userData, 'inkPlanetStyle'), tag: material.userData.inkPlanetStyle,
    };
    record.beforeRender = function (...args) {
      record.originalBeforeRender?.apply(this, args);
      bound.uInkEmissiveIntensity.value = Number.isFinite(this.emissiveIntensity) ? Math.max(0, this.emissiveIntensity) : 1;
    };
    record.hook = function (shader, renderer) {
      record.onBeforeCompile.call(this, shader, renderer);
      if (!shader.vertexShader.includes('#include <begin_vertex>')
        || !['#include <map_fragment>', '#include <color_fragment>', '#include <emissivemap_fragment>', '#include <opaque_fragment>', 'vec3 totalDiffuse'].every(chunk => shader.fragmentShader.includes(chunk))) return;
      bound.uInkEmissiveIntensity.value = Number.isFinite(this.emissiveIntensity) ? Math.max(0, this.emissiveIntensity) : 1;
      Object.assign(shader.uniforms, bound);
      shader.vertexShader = `varying vec3 vInkPlanetLocal;\nvarying vec3 vInkPlanetLocalNormal;\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInkPlanetLocal = transformed;\nvInkPlanetLocalNormal = objectNormal;');
      shader.fragmentShader = `#define INK_PLANET_SURFACE ${SURFACES[surface]}\n#define INK_PLANET_SRGB ${srgb ? 1 : 0}\n${HEADER}\n${shader.fragmentShader}`
        .replace('#include <map_fragment>', `${INPUT_COLOUR}\n#include <map_fragment>`)
        .replace('#include <color_fragment>', `${VERTEX_COLOUR}\n${PIGMENT}`)
        .replace('#include <emissivemap_fragment>', `${EMISSIVE_COLOUR}\n#include <emissivemap_fragment>`)
        .replace('#include <opaque_fragment>', `${LIGHT}\n#include <opaque_fragment>`);
    };
    record.cacheKey = () => `${record.baseKey}|${VERSION}|${surface}|${srgb ? 'srgb' : 'linear'}`;
    record.onDispose = () => restore(material, record, false);
    records.set(material, record); owners.set(material, record);
    if (surface !== 'ink') {
      material.roughness = Math.max(material.roughness, surface === 'water' ? .82 : .98);
      material.metalness = 0; material.envMapIntensity = Math.min(material.envMapIntensity, .08);
      if ('clearcoat' in material) material.clearcoat = 0;
    }
    material.extensions ??= {}; material.extensions.derivatives = true;
    material.onBeforeCompile = record.hook; material.customProgramCacheKey = record.cacheKey;
    material.onBeforeRender = record.beforeRender;
    material.userData.inkPlanetStyle = { version: VERSION, surface, inputColorSpace: srgb ? 'srgb' : 'linear' };
    material.addEventListener('dispose', record.onDispose);
    material.needsUpdate = true;
  }

  function apply(group) {
    if (disposed || !group?.traverse) return group;
    group.traverse(node => {
      if (!node.isMesh) return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) applyMaterial(material);
    });
    return group;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const [material, record] of [...records]) restore(material, record);
  }
  return { apply, dispose };
}
