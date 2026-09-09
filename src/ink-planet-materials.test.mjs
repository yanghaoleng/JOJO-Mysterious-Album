// Node contracts only; actual WebGL/appearance must also be checked in browser.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createWorld, WORLD_CATALOG } from '../dev/worlds.js';
import { createInkPlanetStyle, applyInkAtmosphere, inkLinearColor, INK_PLANET_PAINT } from './ink-planet-materials.js';

const shader = () => ({ vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms) });
const originalManagement = THREE.ColorManagement.enabled;
const report = { worlds: [], meshes: 0, materials: 0, geometryValues: 0, branches: new Set() };
try {
  for (const enabled of [false, true]) {
    THREE.ColorManagement.enabled = enabled;
    for (const { id } of WORLD_CATALOG) {
      const world = createWorld(id);
      const style = createInkPlanetStyle();
      const materials = new Map(), geometries = new Map();
      let meshes = 0, disposals = 0;
      world.group.traverse(mesh => {
        if (!mesh.isMesh) return;
        meshes++;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          if (materials.has(material)) continue;
          materials.set(material, {
            color: material.color.toArray(), emissive: material.emissive.toArray(),
            roughness: material.roughness, metalness: material.metalness, envMapIntensity: material.envMapIntensity,
            hook: material.onBeforeCompile, key: material.customProgramCacheKey, render: material.onBeforeRender,
            opacity: material.opacity, depthWrite: material.depthWrite, transparent: material.transparent,
          });
          material.addEventListener('dispose', () => disposals++);
        }
        if (!geometries.has(mesh.geometry)) geometries.set(mesh.geometry, Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key, attr]) => [key, Array.from(attr.array)])));
      });
      assert.equal(style.apply(world.group), world.group);
      const versions = [...materials].map(([m]) => m.version);
      style.apply(world.group);
      assert.deepEqual([...materials].map(([m]) => m.version), versions, 'Repeated apply caused recompilation');
      for (const [m, original] of materials) {
        assert.deepEqual(m.color.toArray(), original.color);
        assert.deepEqual(m.emissive.toArray(), original.emissive);
        const s = shader(); m.onBeforeCompile(s);
        assert.ok(s.fragmentShader.includes(`#define INK_PLANET_SRGB ${enabled ? 0 : 1}`));
        assert.equal(s.fragmentShader.split('float inkPlanetNoise(').length, 2);
        assert.ok(s.fragmentShader.includes('inkPlanetLinear(vColor'));
        assert.ok(s.fragmentShader.includes('fwidth(p)'));
        assert.ok(!s.fragmentShader.includes('gl_FragCoord'));
        assert.ok(s.vertexShader.includes('vInkPlanetLocalNormal = objectNormal;'), 'Short strokes lost their surface-plane orientation');
        assert.ok(s.fragmentShader.includes('inkPlanetDryMark(inkP.yz'), 'Sparse dry-pencil strokes disappeared');
        assert.ok(s.fragmentShader.includes('distanceToStroke'), 'Dry strokes reverted to closed pigment rings');
        assert.ok(s.fragmentShader.includes('inkAxes /= max(.0001'), 'Triplanar blend can divide by zero');
        assert.ok(!s.fragmentShader.includes('mix(inkShade,'), 'Smooth directional clay lighting returned');
        assert.ok(s.fragmentShader.includes('outgoingLight = inkPaint + totalEmissiveRadiance;'), 'Specular toy highlight returned to the ink pass');
        assert.ok(s.fragmentShader.includes(`float inkFlatShade = ${INK_PLANET_PAINT.baseShade.toFixed(3)}`));
        assert.ok(s.fragmentShader.includes(`${INK_PLANET_PAINT.faceTurn.toFixed(3)} * smoothstep`));
        assert.ok(s.fragmentShader.includes(`${INK_PLANET_PAINT.lightTurn.toFixed(3)} * smoothstep`));
        assert.ok(s.fragmentShader.indexOf('diffuseColor.rgb = inkPlanetLinear') < s.fragmentShader.indexOf('#include <map_fragment>'));
        for (const chunk of ['normal_fragment_maps', 'alphatest_fragment', 'lights_fragment_begin', 'colorspace_fragment', 'tonemapping_fragment', 'fog_fragment']) assert.ok(s.fragmentShader.includes(`#include <${chunk}>`));
        report.branches.add(m.userData.inkPlanetStyle.surface);
        if (m.userData.handcraftedSurface !== 'ink') assert.equal(m.metalness, 0);
        for (const key of ['opacity', 'depthWrite', 'transparent']) assert.equal(m[key], original[key]);
        m.emissiveIntensity = .37; m.onBeforeRender();
        assert.equal(s.uniforms.uInkEmissiveIntensity.value, .37);
      }
      const atmosphereBefore = JSON.stringify(world.atmosphere);
      const adapted = applyInkAtmosphere(world.atmosphere);
      for (const key of ['sky', 'bounce', 'sun', 'rim']) assert.ok(adapted.lighting[key].isColor);
      assert.ok(adapted.lighting.hemisphereIntensity >= 2.5 && adapted.lighting.sunIntensity < .8 && adapted.lighting.rimIntensity < .2,
        'Directional lighting overpowered the picturebook paper');
      assert.equal(JSON.stringify(world.atmosphere), atmosphereBefore);
      for (const [geometry, attributes] of geometries) for (const [name, values] of Object.entries(attributes)) {
        assert.deepEqual(Array.from(geometry.attributes[name].array), values, `${id}/${name} changed`);
        report.geometryValues += values.length;
      }
      style.dispose(); style.dispose();
      assert.equal(disposals, 0, 'Style disposed a borrowed material');
      for (const [m, original] of materials) {
        assert.equal(m.onBeforeCompile, original.hook); assert.equal(m.customProgramCacheKey, original.key);
        assert.equal(m.onBeforeRender, original.render);
        for (const key of ['roughness', 'metalness', 'envMapIntensity']) assert.equal(m[key], original[key]);
        assert.equal(m.userData.inkPlanetStyle, undefined);
      }
      // World disposal must also release the style's hooks and allow safe late disposal.
      const next = createInkPlanetStyle({ wash: .71 }); next.apply(world.group);
      for (const [m] of materials) { const s = shader(); m.onBeforeCompile(s); assert.equal(s.uniforms.uInkWash.value, .71); }
      world.dispose(); next.dispose();
      assert.equal(disposals, materials.size);
      assert.equal(THREE.ColorManagement.enabled, enabled);
      report.worlds.push(`${id}/${enabled ? 'linear' : 'legacy-srgb'}`);
      report.meshes += meshes; report.materials += materials.size;
    }
  }
  THREE.ColorManagement.enabled = false;
  const smoothstep = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lightResponse = [0, .001, .15, .5, .9, 1.5, 2, 8, 100].map(shade => INK_PLANET_PAINT.baseShade
    + INK_PLANET_PAINT.faceTurn * smoothstep(.15, .8, shade) + INK_PLANET_PAINT.lightTurn * smoothstep(.9, 1.5, shade));
  assert.ok(lightResponse.every(value => value >= .9 && value <= 1));
  assert.ok(Math.max(...lightResponse) - Math.min(...lightResponse) <= .09 + 1e-10, 'Paper lighting exceeded its weak 9% face turn');
  assert.equal(INK_PLANET_PAINT.specular, 0);
  const expected = new THREE.Color('#888888').convertSRGBToLinear();
  assert.ok(inkLinearColor('#888888').equals(expected));
  assert.ok(inkLinearColor(expected).equals(expected));
  const geom = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geom, material), a = createInkPlanetStyle(), b = createInkPlanetStyle();
  a.apply(mesh); const hook = material.onBeforeCompile;
  b.apply(mesh); assert.equal(material.onBeforeCompile, hook); b.dispose(); assert.equal(material.onBeforeCompile, hook);
  a.dispose(); material.dispose(); geom.dispose();
  const nan = createInkPlanetStyle({ wash: NaN, grain: Infinity, edge: -1, scale: NaN });
  const fallback = new THREE.MeshStandardMaterial(); const fallbackMesh = new THREE.Mesh(new THREE.BoxGeometry(), fallback);
  nan.apply(fallbackMesh); const s = shader(); fallback.onBeforeCompile(s);
  for (const uniform of Object.values(s.uniforms).filter(u => typeof u.value === 'number')) assert.ok(Number.isFinite(uniform.value));
  nan.dispose(); fallback.dispose(); fallbackMesh.geometry.dispose();
  console.log(JSON.stringify({ pass: true, ...report, branches: [...report.branches] }, null, 2));
} finally {
  THREE.ColorManagement.enabled = originalManagement;
}
