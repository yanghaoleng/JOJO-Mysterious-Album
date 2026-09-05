/**
 * Repeatable Node-only contracts for the storybook material helper.
 * Run: node dev/tools/verify-storybook.mjs
 * Checks real Three.js objects, serialization and ShaderLib.standard injection.
 * Does NOT compile GLSL, create WebGL, or prove rendered visual appearance.
 * Does not write files or modify application assets.
 */
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import { CHARACTER_CATALOG, createCharacter } from '../models.js';
import { createStorybookStyle } from '../storybook.js';

let cases = 0;
let checkedMeshes = 0;
let checkedAttributes = 0;
const count = (text, needle) => text.split(needle).length - 1;
const shaderTemplate = () => ({
  vertexShader: THREE.ShaderLib.standard.vertexShader,
  fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms),
});
const meshes = group => {
  const result = [];
  group.traverse(node => { if (node.isMesh) result.push(node); });
  return result;
};
const materialState = material => ({
  color: material.color, emissive: material.emissive,
  emissiveValue: material.emissive?.clone(), emissiveIntensity: material.emissiveIntensity,
  opacity: material.opacity, transparent: material.transparent, alphaTest: material.alphaTest,
  depthWrite: material.depthWrite, side: material.side, blending: material.blending,
  map: material.map, roughness: material.roughness, metalness: material.metalness,
  envMapIntensity: material.envMapIntensity, clearcoat: material.clearcoat,
  onBeforeCompile: material.onBeforeCompile, cacheKey: material.customProgramCacheKey,
  extensions: material.extensions, derivatives: material.extensions?.derivatives,
  hadTag: Object.hasOwn(material.userData, 'storybookStyle'), tag: material.userData.storybookStyle,
});

function assertPreserved(material, before) {
  for (const key of ['color', 'emissive', 'emissiveIntensity', 'opacity', 'transparent', 'alphaTest', 'depthWrite', 'side', 'blending', 'map']) {
    assert.strictEqual(material[key], before[key], `Borrowed material property changed: ${key}`);
  }
  if (before.emissiveValue) assert.ok(material.emissive.equals(before.emissiveValue), 'Emissive color changed');
}

function assertRestored(material, before) {
  assertPreserved(material, before);
  for (const key of ['roughness', 'metalness', 'envMapIntensity', 'clearcoat', 'onBeforeCompile', 'extensions']) {
    assert.strictEqual(material[key], before[key], `Material was not restored: ${key}`);
  }
  assert.strictEqual(material.customProgramCacheKey, before.cacheKey, 'Cache callback was not restored');
  assert.strictEqual(material.extensions?.derivatives, before.derivatives, 'Derivative extension was not restored');
  assert.equal(Object.hasOwn(material.userData, 'storybookStyle'), before.hadTag, 'Style tag ownership was not restored');
  if (before.hadTag) assert.strictEqual(material.userData.storybookStyle, before.tag, 'Original tag reference changed');
}

function assertShaderInjection(material) {
  const shader = shaderTemplate();
  material.onBeforeCompile(shader, null);
  assert.equal(count(shader.vertexShader, 'varying vec3 vStorybookLocal;'), 1, 'Vertex varying was missing or duplicated');
  assert.equal(count(shader.fragmentShader, 'varying vec3 vStorybookLocal;'), 1, 'Fragment varying was missing or duplicated');
  assert.equal(count(shader.fragmentShader, 'float storybookHash('), 1, 'Pigment helper was missing or duplicated');
  assert.ok(shader.vertexShader.indexOf('vStorybookLocal = transformed;') > shader.vertexShader.indexOf('#include <begin_vertex>'), 'Object-space coordinates were injected before the vertex existed');
  assert.ok(shader.fragmentShader.indexOf('diffuseColor.rgb *=') > shader.fragmentShader.indexOf('#include <color_fragment>'), 'Pigment was injected before vertex colors');
  assert.ok(shader.fragmentShader.indexOf('vec3 storyPaint =') > shader.fragmentShader.indexOf('vec3 totalDiffuse'), 'Painting was injected before lighting');
  assert.ok(shader.fragmentShader.indexOf('outgoingLight = storyPaint') < shader.fragmentShader.indexOf('#include <opaque_fragment>'), 'Painted lighting is not used by final output');
  for (const chunk of ['#include <alphamap_fragment>', '#include <alphatest_fragment>', '#include <lights_fragment_begin>', '#include <emissivemap_fragment>', '#include <tonemapping_fragment>', '#include <fog_fragment>']) {
    assert.ok(shader.fragmentShader.includes(chunk), `Existing Standard shader stage removed: ${chunk}`);
  }
  for (const name of ['uStorybookWash', 'uStorybookGrain', 'uStorybookBands', 'uStorybookEdge']) {
    assert.ok(Number.isFinite(shader.uniforms[name]?.value), `Missing finite shader uniform: ${name}`);
  }
  assert.ok(!shader.fragmentShader.includes('gl_FragCoord'), 'Paper coordinates became screen-space noise');
  return shader;
}

function verifyModel(type) {
  const model = createCharacter({ type });
  const style = createStorybookStyle();
  const beforeMeshes = meshes(model.group).map(mesh => ({
    mesh, geometry: mesh.geometry, material: mesh.material,
    castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow,
    attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attribute]) => [name, attribute])),
  }));
  const beforeMaterials = new Map(beforeMeshes.map(({ material }) => [material, materialState(material)]));
  let materialDisposals = 0, geometryDisposals = 0;
  for (const material of beforeMaterials.keys()) material.addEventListener('dispose', () => { materialDisposals++; });
  for (const geometry of new Set(beforeMeshes.map(item => item.geometry))) geometry.addEventListener('dispose', () => { geometryDisposals++; });

  assert.strictEqual(style.apply(model.group), model.group, 'apply did not return original group');
  const wrappedHooks = new Map([...beforeMaterials.keys()].map(material => [material, material.onBeforeCompile]));
  const versions = new Map([...beforeMaterials.keys()].map(material => [material, material.version]));
  style.apply(model.group);
  for (const [material, before] of beforeMaterials) {
    assertPreserved(material, before);
    assert.strictEqual(material.onBeforeCompile, wrappedHooks.get(material), 'Repeated apply stacked hooks');
    assert.equal(material.version, versions.get(material), 'Repeated apply unnecessarily invalidated shaders');
    assert.ok(material.roughness >= .96, 'Material is still glossy');
    assert.equal(material.metalness, 0, 'Plastic/metal reflection reduction was not applied');
    assert.equal(material.userData.storybookStyle?.version, 'storybook-pigment-v1', 'Missing serializable style tag');
    assertShaderInjection(material);
  }
  model.setColor('#90b6c5');
  assert.equal(model.group.getObjectByName('hand-shaped-pear-torso').material.color.getHexString(), '90b6c5', 'Existing setColor closure no longer updates displayed body material');
  for (const before of beforeMeshes) {
    assert.strictEqual(before.mesh.material, before.material, 'Material object replaced');
    assert.strictEqual(before.mesh.geometry, before.geometry, 'Geometry object replaced');
    assert.equal(before.mesh.castShadow, before.castShadow, 'Shadow casting changed');
    assert.equal(before.mesh.receiveShadow, before.receiveShadow, 'Shadow receiving changed');
    for (const [name, attribute] of Object.entries(before.attributes)) assert.strictEqual(before.mesh.geometry.attributes[name], attribute, 'Geometry attribute replaced');
  }

  // Exercise a real serialization boundary. Passing toJSON() directly would
  // share its userData object with the source rather than emulate a file load.
  const loaded = new THREE.ObjectLoader().parse(JSON.parse(JSON.stringify(model.group.toJSON())));
  const loadedMeshes = meshes(loaded);
  assert.equal(loadedMeshes.length, beforeMeshes.length, 'JSON changed model mesh count');
  for (let i = 0; i < loadedMeshes.length; i++) {
    assert.equal(loadedMeshes[i].name, beforeMeshes[i].mesh.name, 'JSON reordered model meshes');
    const source = beforeMeshes[i].geometry, target = loadedMeshes[i].geometry;
    for (const name of ['position', 'normal', 'uv']) {
      const a = source.attributes[name]?.array, b = target.attributes[name]?.array;
      if (!a && !b) continue;
      assert.equal(b?.length, a.length, 'JSON changed attribute length');
      // JSON normalizes -0 to +0; numerical geometry remains identical.
      assert.ok(a.every((value, index) => Number.isFinite(value) && value === b[index]), `JSON geometry differs: ${type}/${loadedMeshes[i].name}/${name}`);
      checkedAttributes += a.length;
    }
    assert.deepEqual(target.index?.array, source.index?.array, 'JSON topology changed');
    assert.ok(loadedMeshes[i].material.isMeshStandardMaterial, 'Export stopped using loadable standard materials');
    assert.equal(loadedMeshes[i].material.userData.storybookStyle?.version, 'storybook-pigment-v1', 'JSON lost paper-style metadata');
  }
  const loadedMaterialState = new Map(loadedMeshes.map(mesh => [mesh.material, materialState(mesh.material)]));
  style.apply(loaded);
  for (const material of loadedMaterialState.keys()) assertShaderInjection(material);
  style.dispose(); style.dispose();
  assert.equal(materialDisposals, 0, 'Style manager disposed borrowed materials');
  assert.equal(geometryDisposals, 0, 'Style manager disposed borrowed geometry');
  for (const [material, before] of beforeMaterials) assertRestored(material, before);
  for (const [material, before] of loadedMaterialState) assertRestored(material, before);
  style.apply(model.group);
  for (const [material, before] of beforeMaterials) assert.strictEqual(material.onBeforeCompile, before.onBeforeCompile, 'Disposed manager started styling again');
  model.dispose();
  for (const material of loadedMaterialState.keys()) material.dispose();
  for (const geometry of new Set(loadedMeshes.map(mesh => mesh.geometry))) geometry.dispose();
  checkedMeshes += beforeMeshes.length;
  console.log(`PASS ${type}: borrowed references, controls, shader-template injection, exact JSON geometry and disposal ownership`);
  cases++;
}

for (const entry of CHARACTER_CATALOG) verifyModel(entry.id);

// A genuinely translucent/emissive fixture covers the properties that character
// materials do not exercise, plus material arrays and a shared material owner.
{
  const geometry = new THREE.PlaneGeometry(1, 1);
  const texture = new THREE.DataTexture(new Uint8Array([255, 240, 210, 255]), 1, 1);
  const material = new THREE.MeshPhysicalMaterial({ color: '#92c3ca', transparent: true, opacity: .37, alphaTest: .02, depthWrite: false, side: THREE.DoubleSide, emissive: '#b3d8cf', emissiveIntensity: .6, roughness: .3, metalness: .4, clearcoat: .45, map: texture });
  material.extensions = { derivatives: false, fixtureExtension: true };
  const oldTag = { source: 'fixture-owner' }; material.userData.storybookStyle = oldTag;
  let predecessorCalls = 0, disposalEvents = 0, textureDisposals = 0;
  material.onBeforeCompile = function (shader) { predecessorCalls++; shader.uniforms.priorHook = { value: 27 }; };
  const keyBefore = material.customProgramCacheKey();
  const before = materialState(material);
  material.addEventListener('dispose', () => { disposalEvents++; });
  texture.addEventListener('dispose', () => { textureDisposals++; });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, [material, material]));
  const first = createStorybookStyle(), second = createStorybookStyle();
  first.apply(group); const hook = material.onBeforeCompile; const key = material.customProgramCacheKey();
  second.apply(group); first.apply(group);
  assert.strictEqual(material.onBeforeCompile, hook, 'Shared material acquired stacked style owners');
  assert.equal(material.customProgramCacheKey(), key, 'Repeated style changed program cache identity');
  assert.ok(key.startsWith(`${keyBefore}|`), 'Previous shader cache identity was lost');
  const shader = assertShaderInjection(material);
  assert.equal(predecessorCalls, 1, 'Previous onBeforeCompile hook did not run exactly once');
  assert.equal(shader.uniforms.priorHook.value, 27, 'Previous shader contribution was lost');
  assertPreserved(material, before);
  assert.equal(material.clearcoat, 0, 'Physical clearcoat remains glossy');
  second.dispose(); assert.strictEqual(material.onBeforeCompile, hook, 'Non-owning manager restored someone else\'s material');
  first.dispose(); assertRestored(material, before);
  assert.equal(disposalEvents, 0, 'Borrowed physical material was disposed');
  assert.equal(textureDisposals, 0, 'Borrowed texture was disposed');
  material.dispose(); geometry.dispose(); texture.dispose();
  console.log('PASS transparent/emissive fixture: alpha, light emission, maps, prior shader, shared ownership and extension/tag restoration');
  cases++;
}

// Material owners may dispose an old scene before the style manager itself.
// The material event must restore callbacks and release the ownership marker.
{
  const material = new THREE.MeshStandardMaterial();
  const geometry = new THREE.SphereGeometry(1, 8, 6);
  const mesh = new THREE.Mesh(geometry, material);
  const before = materialState(material);
  const first = createStorybookStyle(); first.apply(mesh);
  material.dispose(); assertRestored(material, before);
  const second = createStorybookStyle(); second.apply(mesh);
  assert.notStrictEqual(material.onBeforeCompile, before.onBeforeCompile, 'Disposed material retained stale style ownership');
  first.dispose(); assert.notStrictEqual(material.onBeforeCompile, before.onBeforeCompile, 'Old manager still owns disposed scene material');
  second.dispose(); assertRestored(material, before);
  material.dispose(); geometry.dispose();
  console.log('PASS scene-owner disposal: style references released and later ownership can be acquired safely');
  cases++;
}

{
  const material = new THREE.MeshStandardMaterial();
  material.onBeforeCompile = shader => { shader.fragmentShader = 'void main() { gl_FragColor = vec4(1.0); }'; };
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  const style = createStorybookStyle(); style.apply(mesh);
  const shader = shaderTemplate(); material.onBeforeCompile(shader, null);
  assert.equal(shader.fragmentShader, 'void main() { gl_FragColor = vec4(1.0); }', 'Unknown previous shader was corrupted');
  assert.equal(count(shader.vertexShader, 'vStorybookLocal'), 0, 'Partial shader injection was left behind');
  style.dispose(); material.dispose(); mesh.geometry.dispose();
  console.log('PASS incompatible prior shader: complete opt-out instead of partial invalid injection');
  cases++;
}

console.log(`PASS ${cases} Node contract cases; ${checkedMeshes} original model meshes; ${checkedAttributes} exported attribute values checked.`);
console.log('Scope: no WebGL context or GLSL compilation was performed; actual rendering remains covered by the separate browser verification.');
