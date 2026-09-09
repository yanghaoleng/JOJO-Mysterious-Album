import * as THREE from '../vendor/three.module.js';

// Contours are attached to actual world meshes, not a screen-space edge filter:
// distant stars, lettering and the existing drawn characters stay untouched.
// Only outline materials and crease geometries belong to this module.
export function createInkPlanetLines() {
  const records = [];
  const geometries = new Set();
  const materials = new Set();
  const viewport = new THREE.Vector2(1280, 800);
  const ink = new THREE.Color('#625a49');
  if (!THREE.ColorManagement.enabled) ink.convertSRGBToLinear();
  let disposed = false;
  const fragment = `
    uniform vec3 uInk;
    uniform float uOpacity;
    varying vec3 vMark;
    void main() {
      // Fixed to the drawing, never animated noise or a boiling camera edge.
      float dry = .78 + .22 * sin(vMark.x * 73. + vMark.y * 67. + vMark.z * 39.);
      gl_FragColor = vec4(uInk, uOpacity * dry);
      #include <colorspace_fragment>
    }
  `;
  const material = (vertexShader, width, opacity, side = THREE.FrontSide) => {
    const value = new THREE.ShaderMaterial({
      vertexShader, fragmentShader: fragment,
      uniforms: { uInk: { value: ink }, uViewport: { value: viewport }, uWidth: { value: width }, uOpacity: { value: opacity } },
      side, transparent: true, depthTest: true, depthWrite: false, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    materials.add(value); return value;
  };
  const contourMaterial = material(`
    uniform vec2 uViewport;
    uniform float uWidth;
    varying vec3 vMark;
    void main() {
      vMark = position;
      vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      vec3 n = normalize(normalMatrix * normal);
      vec2 direction = (projectionMatrix * vec4(n, 0.)).xy;
      direction /= max(.0001, length(direction));
      float pressure = .86 + .14 * sin(position.x * 17. + position.y * 21. + position.z * 13.);
      clip.xy += direction * (uWidth * pressure * 2. / uViewport) * clip.w;
      // The face itself must occlude the enlarged back-facing shell.
      clip.z += .00002 * clip.w;
      gl_Position = clip;
    }
  `, 1.35, .62, THREE.BackSide);
  const creaseMaterial = material(`
    attribute vec3 endPoint;
    attribute vec2 stroke;
    uniform vec2 uViewport;
    uniform float uWidth;
    varying vec3 vMark;
    void main() {
      vec4 a = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      vec4 b = projectionMatrix * modelViewMatrix * vec4(endPoint, 1.);
      vec2 d = (b.xy / b.w - a.xy / a.w) * uViewport;
      vec2 perpendicular = vec2(-d.y, d.x) / max(.001, length(d));
      vec4 clip = mix(a, b, stroke.x);
      vMark = mix(position, endPoint, stroke.x);
      float pressure = .84 + .16 * sin(dot(vMark, vec3(29., 17., 13.)));
      clip.xy += perpendicular * stroke.y * uWidth * pressure / uViewport * clip.w;
      clip.z -= .000025 * clip.w;
      gl_Position = clip;
    }
  `, 1.25, .48);

  function creaseGeometry(geometry) {
    const edges = new THREE.EdgesGeometry(geometry, 43);
    const positions = edges.attributes.position;
    const data = [], ends = [], strokes = [], indices = [];
    for (let i = 0; i < positions.count; i += 2) {
      const a = new THREE.Vector3().fromBufferAttribute(positions, i);
      const b = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
      if (a.distanceToSquared(b) < .0016) continue;
      const offset = data.length / 3;
      for (let v = 0; v < 4; v++) {
        data.push(a.x, a.y, a.z); ends.push(b.x, b.y, b.z);
        strokes.push(v > 1 ? 1 : 0, v % 2 ? 1 : -1);
      }
      indices.push(offset, offset + 2, offset + 1, offset + 2, offset + 3, offset + 1);
    }
    edges.dispose();
    if (!data.length) return null;
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(data, 3));
    result.setAttribute('endPoint', new THREE.Float32BufferAttribute(ends, 3));
    result.setAttribute('stroke', new THREE.Float32BufferAttribute(strokes, 2));
    result.setIndex(indices); geometries.add(result); return result;
  }

  function apply(group) {
    if (disposed) return;
    const candidates = [];
    group.traverse(mesh => {
      if (mesh.isMesh && mesh.material?.isMeshStandardMaterial && !mesh.material.transparent
        && mesh.material.userData.handcraftedSurface !== 'ink' && !mesh.userData.inkLinesApplied) candidates.push(mesh);
    });
    for (const mesh of candidates) {
      const contour = new THREE.Mesh(mesh.geometry, contourMaterial);
      contour.name = 'picturebook-pencil-contour';
      contour.userData.decorativeInkLine = true;
      contour.raycast = () => {};
      contour.frustumCulled = false;
      mesh.add(contour);
      const children = [contour];
      const surface = mesh.material.userData.handcraftedSurface;
      if (['wood', 'paint', 'fabric', 'paper'].includes(surface) && !mesh.material.vertexColors) {
        const geometry = creaseGeometry(mesh.geometry);
        if (geometry) {
          const crease = new THREE.Mesh(geometry, creaseMaterial);
          crease.name = 'picturebook-pencil-creases';
          crease.userData.decorativeInkLine = true;
          crease.raycast = () => {}; crease.frustumCulled = false;
          mesh.add(crease); children.push(crease);
        }
      }
      mesh.userData.inkLinesApplied = true;
      records.push({ mesh, children });
    }
  }
  function resize(width, height) { viewport.set(Math.max(1, width), Math.max(1, height)); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const { mesh, children } of records) {
      children.forEach(child => child.removeFromParent());
      delete mesh.userData.inkLinesApplied;
    }
    for (const geometry of geometries) geometry.dispose();
    for (const value of materials) value.dispose();
    records.length = 0; geometries.clear(); materials.clear();
  }
  return { apply, resize, dispose, diagnostics: () => ({ meshes: records.length, geometries: geometries.size, materials: materials.size, disposed }) };
}
