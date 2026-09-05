/**
 * Original real-time storybook pigment treatment for Three.js r160.
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

const VERSION = 'storybook-pigment-v1';
const owners = new WeakMap();
const FRAGMENT_HEADER = `
varying vec3 vStorybookLocal;
uniform float uStorybookWash;
uniform float uStorybookGrain;
uniform float uStorybookBands;
uniform float uStorybookEdge;

float storybookHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float storybookNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(storybookHash(i), storybookHash(i + vec2(1.,0.)), f.x),
             mix(storybookHash(i + vec2(0.,1.)), storybookHash(i + vec2(1.,1.)), f.x), f.y);
}
vec2 storybookUV(vec3 p) {
  // A fixed oblique object-space projection: no UV seam or screen crawl.
  return vec2(p.x * 1.37 + p.z * .71, p.y * 1.17 + p.z * .43);
}
`;

const PIGMENT_FRAGMENT = `
  vec2 storyUV = storybookUV(vStorybookLocal);
  float storyWash = storybookNoise(storyUV * 2.7) - .5;
  float storyFine = storybookNoise(storyUV * 91.0) - .5;
  // Fade sub-pixel paper fibres when the object is distant. Paper stays still
  // on the moving object and avoids temporal sparkle under camera rotation.
  float storyFootprint = length(fwidth(storyUV * 91.0));
  storyFine *= 1.0 - smoothstep(.65, 2.1, storyFootprint);
  float storyFibre = sin(storyUV.x * 51.0 + storyUV.y * 86.0 + storyWash * 3.0);
  storyFibre *= 1.0 - smoothstep(.5, 1.8, length(fwidth(storyUV * 40.0)));
  diffuseColor.rgb *= 1.0 + storyWash * uStorybookWash
    + storyFine * uStorybookGrain + storyFibre * uStorybookGrain * .13;
`;

const LIGHT_FRAGMENT = `
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
  outgoingLight = storyPaint + totalSpecular * .08 + totalEmissiveRadiance;
`;

/**
 * createStorybookStyle({ wash=.11, grain=.035, bands=.72, edge=.075 })
 * apply(group): styles all existing mesh materials; returns the same group.
 * dispose(): restores borrowed materials and hooks; never disposes their maps.
 * Materials' own dispose events release manager references during scene swaps.
 */
export function createStorybookStyle({ wash = .11, grain = .035, bands = .72, edge = .075 } = {}) {
  const safe = (value, fallback, maximum) => Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, maximum) : fallback;
  const uniforms = {
    uStorybookWash: { value: safe(wash, .11, .3) },
    uStorybookGrain: { value: safe(grain, .035, .12) },
    uStorybookBands: { value: safe(bands, .72, 1) },
    uStorybookEdge: { value: safe(edge, .075, .18) },
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
        || !shader.fragmentShader.includes('#include <opaque_fragment>')
        || !shader.fragmentShader.includes('vec3 totalDiffuse')) return;
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = `varying vec3 vStorybookLocal;\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvStorybookLocal = transformed;');
      shader.fragmentShader = `${FRAGMENT_HEADER}\n${shader.fragmentShader}`
        .replace('#include <color_fragment>', `#include <color_fragment>\n${PIGMENT_FRAGMENT}`)
        .replace('#include <opaque_fragment>', `${LIGHT_FRAGMENT}\n#include <opaque_fragment>`);
    };
    record.cacheKey = function () { return `${record.baseProgramKey}|${VERSION}`; };
    record.onDispose = () => restore(material, record, false);
    records.set(material, record);
    owners.set(material, record);
    // Do not replace material or its color: model.setColor closes over them.
    material.roughness = Math.max(.96, material.roughness);
    material.metalness = 0;
    material.envMapIntensity = Math.min(.12, material.envMapIntensity);
    if ('clearcoat' in material) material.clearcoat = 0;
    material.extensions ??= {};
    material.extensions.derivatives = true;
    material.onBeforeCompile = record.hook;
    material.customProgramCacheKey = record.cacheKey;
    material.userData.storybookStyle = {
      version: VERSION, source: 'dev/storybook.js',
      wash: uniforms.uStorybookWash.value, grain: uniforms.uStorybookGrain.value,
      bands: uniforms.uStorybookBands.value, edge: uniforms.uStorybookEdge.value,
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
