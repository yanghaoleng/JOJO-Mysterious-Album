/**
 * Original real-time paper-craft / watercolour treatment for Three.js r160.
 * No new mesh, texture, render pass, geometry mutation or screen-space noise.
 * The existing material/color objects remain owned by the model or world.
 *
 * Suggested stage: paper #f3eee2; hemisphere (#fff7e7,#a1a38b, 2.0);
 * key (#fff2d8, 2.25), broad soft shadow; rim (#e2e6ef, .65);
 * ACESFilmicToneMapping exposure 1.02–1.10. Keep original contact shadows.
 *
 * Object3D JSON retains standard material parameters and a plain style tag.
 * Three does not serialize onBeforeCompile; call style.apply(loadedObject)
 * after ObjectLoader.parse to restore the procedural paper treatment.
 */
import * as THREE from '../vendor/three.module.js';

export const STORYBOOK_PALETTE = Object.freeze({
  paper: '#f3eee2', sky: '#fff7e7', bounce: '#a1a38b', sun: '#fff2d8', rim: '#e2e6ef',
  hemisphereIntensity: 2.0, sunIntensity: 2.25, rimIntensity: .65, exposure: 1.06,
});

const VERSION = 'storybook-handcrafted-v2';
export const STORYBOOK_SURFACE_PROFILES = Object.freeze(Object.fromEntries(Object.entries({
  paper: { id: 0, roughness: .96 }, fabric: { id: 1, roughness: .98 },
  wood: { id: 2, roughness: .92 }, stone: { id: 3, roughness: .98 },
  foliage: { id: 4, roughness: .94 }, water: { id: 5, roughness: .34 },
  paint: { id: 6, roughness: .94 }, ink: { id: 7, roughness: 0 },
}).map(([name, profile]) => [name, Object.freeze(profile)])));
const owners = new WeakMap();
// Three can reuse a material's compiled program after a helper is disposed and
// reapplied. Retain only weak, per-material uniform cells so that cached GPU
// programs receive new tuning without accumulating one program per setting.
const materialUniforms = new WeakMap();
const FRAGMENT_HEADER = `
varying vec3 vStorybookLocal;
uniform float uStorybookWash;
uniform float uStorybookGrain;
uniform float uStorybookBands;
uniform float uStorybookEdge;
uniform float uStorybookRelief;
uniform float uStorybookScale;

float storybookHash(vec3 p) {
  vec3 q = fract(p * vec3(.1031, .1030, .0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float storybookNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(storybookHash(i), storybookHash(i + vec3(1.,0.,0.)), f.x),
        mix(storybookHash(i + vec3(0.,1.,0.)), storybookHash(i + vec3(1.,1.,0.)), f.x), f.y),
    mix(mix(storybookHash(i + vec3(0.,0.,1.)), storybookHash(i + vec3(1.,0.,1.)), f.x),
        mix(storybookHash(i + vec3(0.,1.,1.)), storybookHash(i + vec3(1.,1.,1.)), f.x), f.y), f.z);
}
float storybookDetailAA(vec3 p) {
  // Local-coordinate pixel footprint: suppress unresolved fibres instead of
  // screen-anchored dither, random time noise, or camera-dependent UVs.
  return 1.0 - smoothstep(.38, 1.65, length(fwidth(p)));
}
vec3 storybookReliefNormal(vec3 position, vec3 sourceNormal, float height, float facing) {
  vec3 dx = dFdx(position), dy = dFdy(position);
  vec3 crossY = cross(dy, sourceNormal), crossX = cross(sourceNormal, dx);
  float determinant = dot(dx, crossY) * facing;
  vec3 gradient = sign(determinant) * (dFdx(height) * crossY + dFdy(height) * crossX);
  // Degenerate triangles and extreme grazing views keep their valid normal.
  if (abs(determinant) < 1e-10) return sourceNormal;
  return normalize(abs(determinant) * sourceNormal - gradient);
}
`;

const PIGMENT_FRAGMENT = `
  float storyHeight = 0.0;
  float storyRoughness = 0.0;
  #if STORYBOOK_SURFACE != 7
    // A continuous volumetric field has neither UV seams nor triplanar blend
    // seams. It is fixed to the actual local mesh, including rotating limbs.
    vec3 storyP = vStorybookLocal * uStorybookScale;
    float storyWash = storybookNoise(storyP * 2.8 + vec3(2.1,7.4,1.3)) - .5;
    float storyMedium = (storybookNoise(storyP * 12.0) - .5) * storybookDetailAA(storyP * 12.0);
    float storyMark = 0.0;
    float storyPigment = storyWash * .9 + storyMedium * .26;
    #if STORYBOOK_SURFACE == 5
      // Water is translucent painted glass: broad ripple, never cloth/fibre.
      float storyRipple = sin(storyP.x * 7.0 + storyP.z * 5.0 + storyWash * 2.0)
        * storybookDetailAA(storyP * 2.0);
      storyPigment = storyWash * .28 + storyRipple * .07;
      storyHeight = storyRipple * .0025;
      storyRoughness = storyMedium * .06;
    #else
      float storyFibre = (storybookNoise(storyP * vec3(34.0,5.0,19.0)) - .5)
        * storybookDetailAA(storyP * vec3(34.0,5.0,19.0));
      #if STORYBOOK_SURFACE == 1
        float storyWeave = sin(storyP.x * 39.0 + storyWash) * sin(storyP.y * 39.0 - storyWash);
        storyMark = storyWeave * .36 * storybookDetailAA(storyP * 13.0) + storyFibre * .38;
        storyHeight = storyMark * .009 + storyMedium * .006;
      #elif STORYBOOK_SURFACE == 2
        float storyGrowth = sin(storyP.y * 31.0 + storyP.z * 8.0 + storyWash * 7.0 + storyMedium * 2.0);
        storyMark = storyGrowth * .42 * storybookDetailAA(storyP * vec3(3.0,10.0,3.0));
        storyPigment += storyMark * .55;
        storyHeight = storyMark * .006 + storyMedium * .006;
      #elif STORYBOOK_SURFACE == 3
        storyMark = storyMedium * .8 + storyFibre * .22;
        storyPigment = storyWash * .52 + storyMedium * .38;
        storyHeight = storyMedium * .022 + storyFibre * .003;
      #elif STORYBOOK_SURFACE == 4
        float storyVein = sin(storyP.y * 16.0 + abs(storyP.x) * 24.0 + storyWash);
        storyMark = storyVein * .16 * storybookDetailAA(storyP * 8.0) + storyFibre * .28;
        storyHeight = storyMark * .007 + storyMedium * .007;
      #elif STORYBOOK_SURFACE == 6
        storyMark = storyFibre * .52 + storyMedium * .32;
        storyHeight = storyMedium * .009 + storyFibre * .003;
      #else
        // Pressed paper: visible irregular pulp islands, soft fibres and
        // shallow compression, not sandpaper, black speckles or canvas grain.
        storyMark = storyMedium * .65 + storyFibre * .6;
        storyHeight = storyMedium * .012 + storyFibre * .004;
      #endif
      storyRoughness = storyMedium * .08 + storyMark * .04;
    #endif
    diffuseColor.rgb *= 1.0 + storyPigment * uStorybookWash + storyMark * uStorybookGrain;
  #endif
`;

const NORMAL_FRAGMENT = `
  #if STORYBOOK_SURFACE != 7
    normal = storybookReliefNormal(-vViewPosition, normal, storyHeight * uStorybookRelief, faceDirection);
  #endif
`;

const ROUGHNESS_FRAGMENT = `
  #if STORYBOOK_SURFACE != 7
    roughnessFactor = clamp(roughnessFactor + storyRoughness * uStorybookRelief, .22, 1.0);
  #endif
`;

const LIGHT_FRAGMENT = `
  #if STORYBOOK_SURFACE != 7
  // Broad, softly joined washes retain depth while avoiding polished plastic.
  float storyBaseLum = max(.012, dot(diffuseColor.rgb, vec3(.2126,.7152,.0722)));
  float storyLitLum = dot(totalDiffuse, vec3(.2126,.7152,.0722));
  float storyShade = max(.001, storyLitLum / storyBaseLum);
  float storyPaintShade = .27
    + .29 * smoothstep(.23, .50, storyShade)
    + .31 * smoothstep(.68, .96, storyShade)
    + .31 * smoothstep(1.10, 1.44, storyShade)
    + .24 * smoothstep(1.65, 2.05, storyShade);
  vec3 storyPaint = totalDiffuse * mix(1.0, storyPaintShade / storyShade, uStorybookBands);
  float storyFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
  float storyPigmentEdge = 1.0 - smoothstep(.04, .31, storyFacing);
  storyPaint *= 1.0 - storyPigmentEdge * uStorybookEdge;
  #if STORYBOOK_SURFACE == 5
    outgoingLight = storyPaint + totalSpecular * .45 + totalEmissiveRadiance;
  #else
    outgoingLight = storyPaint + totalSpecular * .12 + totalEmissiveRadiance;
  #endif
  #endif
`;

/**
 * createStorybookStyle({ wash=.22, grain=.12, relief=.38, scale=1,
 *                       bands=.66, edge=.06 })
 * apply(group): styles all existing mesh materials; returns the same group.
 * dispose(): restores borrowed materials and hooks; never disposes their maps.
 * Materials' own dispose events release manager references during scene swaps.
 */
export function createStorybookStyle({ wash = .22, grain = .12, relief = .38, scale = 1, bands = .66, edge = .06 } = {}) {
  const safe = (value, fallback, maximum) => Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, maximum) : fallback;
  const uniforms = {
    uStorybookWash: { value: safe(wash, .22, .45) },
    uStorybookGrain: { value: safe(grain, .12, .35) },
    uStorybookRelief: { value: safe(relief, .38, 1.5) },
    uStorybookScale: { value: Number.isFinite(scale) ? THREE.MathUtils.clamp(scale, .25, 4) : 1 },
    uStorybookBands: { value: safe(bands, .66, 1) },
    uStorybookEdge: { value: safe(edge, .06, .18) },
  };
  const records = new Map();
  let disposed = false;

  function restore(material, record, needsCompile = true) {
    material.removeEventListener('dispose', record.onDispose);
    if (material.onBeforeCompile === record.hook) material.onBeforeCompile = record.onBeforeCompile;
    if (material.customProgramCacheKey === record.cacheKey) material.customProgramCacheKey = record.customProgramCacheKey;
    material.roughness = record.roughness;
    material.metalness = record.metalness;
    material.envMapIntensity = record.envMapIntensity;
    if ('clearcoat' in material) material.clearcoat = record.clearcoat;
    if (record.extensions) material.extensions.derivatives = record.derivatives;
    else delete material.extensions;
    if (record.hadTag) material.userData.storybookStyle = record.tag;
    else delete material.userData.storybookStyle;
    records.delete(material);
    if (owners.get(material) === record) owners.delete(material);
    if (needsCompile) material.needsUpdate = true;
  }

  function applyMaterial(material) {
    if (!material?.isMeshStandardMaterial || records.has(material)) return;
    // One physical material can be shared by many meshes. Never stack hooks
    // when another live style manager already owns that shared material.
    if (owners.has(material)) return;
    const surface = Object.hasOwn(STORYBOOK_SURFACE_PROFILES, material.userData.handcraftedSurface) ? material.userData.handcraftedSurface : 'paper';
    const profile = STORYBOOK_SURFACE_PROFILES[surface];
    let boundUniforms = materialUniforms.get(material);
    if (!boundUniforms) {
      boundUniforms = Object.fromEntries(Object.entries(uniforms).map(([name, uniform]) => [name, { value: uniform.value }]));
      materialUniforms.set(material, boundUniforms);
    } else {
      for (const [name, uniform] of Object.entries(uniforms)) boundUniforms[name].value = uniform.value;
    }
    const record = {
      onBeforeCompile: material.onBeforeCompile,
      customProgramCacheKey: material.customProgramCacheKey,
      baseProgramKey: material.customProgramCacheKey.call(material),
      roughness: material.roughness,
      metalness: material.metalness,
      envMapIntensity: material.envMapIntensity,
      clearcoat: material.clearcoat,
      extensions: material.extensions,
      derivatives: material.extensions?.derivatives,
      hadTag: Object.prototype.hasOwnProperty.call(material.userData, 'storybookStyle'),
      tag: material.userData.storybookStyle,
    };
    record.hook = function (shader, renderer) {
      record.onBeforeCompile.call(this, shader, renderer);
      // Preserve unknown previous custom shaders instead of producing invalid
      // GLSL if they removed the normal StandardMaterial insertion points.
      if (!shader.vertexShader.includes('#include <begin_vertex>')
        || !shader.fragmentShader.includes('#include <color_fragment>')
        || !shader.fragmentShader.includes('#include <roughnessmap_fragment>')
        || !shader.fragmentShader.includes('#include <normal_fragment_maps>')
        || !shader.fragmentShader.includes('#include <opaque_fragment>')
        || !shader.fragmentShader.includes('vec3 totalDiffuse')) return;
      Object.assign(shader.uniforms, boundUniforms);
      shader.vertexShader = `varying vec3 vStorybookLocal;\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvStorybookLocal = transformed;');
      shader.fragmentShader = `#define STORYBOOK_SURFACE ${profile.id}\n${FRAGMENT_HEADER}\n${shader.fragmentShader}`
        .replace('#include <color_fragment>', `#include <color_fragment>\n${PIGMENT_FRAGMENT}`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${ROUGHNESS_FRAGMENT}`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${NORMAL_FRAGMENT}`)
        .replace('#include <opaque_fragment>', `${LIGHT_FRAGMENT}\n#include <opaque_fragment>`);
    };
    record.cacheKey = function () { return `${record.baseProgramKey}|${VERSION}|${surface}`; };
    record.onDispose = () => restore(material, record, false);
    records.set(material, record);
    owners.set(material, record);
    // Do not replace material or its color: model.setColor closes over them.
    if (surface !== 'ink') {
      material.roughness = Math.max(profile.roughness, material.roughness);
      material.metalness = 0;
      material.envMapIntensity = Math.min(surface === 'water' ? .4 : .12, material.envMapIntensity);
      if ('clearcoat' in material) material.clearcoat = 0;
    }
    material.extensions ??= {};
    material.extensions.derivatives = true;
    material.onBeforeCompile = record.hook;
    material.customProgramCacheKey = record.cacheKey;
    material.userData.storybookStyle = {
      version: VERSION, source: 'dev/storybook.js', surface,
      wash: uniforms.uStorybookWash.value, grain: uniforms.uStorybookGrain.value,
      bands: uniforms.uStorybookBands.value, edge: uniforms.uStorybookEdge.value,
      relief: uniforms.uStorybookRelief.value, scale: uniforms.uStorybookScale.value,
    };
    material.addEventListener('dispose', record.onDispose);
    material.needsUpdate = true;
  }

  function apply(group) {
    if (disposed || !group?.traverse) return group;
    group.traverse(node => {
      if (!node.isMesh) return;
      if (Array.isArray(node.material)) node.material.forEach(applyMaterial);
      else applyMaterial(node.material);
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
