import * as THREE from '../../vendor/three.module.js';
import { createDocumentCharacter, supportsDocumentCharacter } from './factory.js';
import { createStorybookStyle } from '../../dev/storybook.js';

export { supportsDocumentCharacter };

// The original story has a renderer per character and disables Three's global
// colour management. Keep this bridge entirely local to a document NPC: old
// drawn/gloss recipes, the user's companion, and their colours are untouched.
export function createLegacyDocumentNpc({ characterId, renderer }) {
  if (!supportsDocumentCharacter(characterId)) throw new Error(`Unknown document NPC: ${characterId}`);
  const model = createDocumentCharacter({ characterId, scale: 1 });
  const materials = new Set();
  model.group.traverse(node => {
    if (!node.isMesh) return;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (!material || materials.has(material)) continue;
      materials.add(material);
      if (!THREE.ColorManagement.enabled && !material.userData.legacyNpcLinearColor) {
        material.color?.convertSRGBToLinear();
        material.emissive?.convertSRGBToLinear();
        material.userData.legacyNpcLinearColor = true;
      }
    }
  });
  const style = createStorybookStyle();
  style.apply(model.group);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  const group = new THREE.Group();
  group.name = `story-document-npc-${characterId}`;
  group.userData.characterId = characterId;
  const placement = new THREE.Group();
  placement.add(model.group);
  group.add(placement);
  model.group.rotation.y = -.08;
  model.group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model.group);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  // Explicitly linearise only these new light colours under the legacy page.
  const lightColor = hex => {
    const color = new THREE.Color(hex);
    return THREE.ColorManagement.enabled ? color : color.convertSRGBToLinear();
  };
  const hemisphere = new THREE.HemisphereLight(lightColor('#fff7e7'), lightColor('#a1a38b'), 2);
  const sun = new THREE.DirectionalLight(lightColor('#fff2d8'), 2.25);
  sun.position.set(-3, 5, 6);
  const rim = new THREE.DirectionalLight(lightColor('#e2e6ef'), .65);
  rim.position.set(3, 3, -3);
  group.add(hemisphere, sun, rim);

  let talking = false;
  let action = 'idle';
  let disposed = false;
  const actions = { attack: 'wave', play: 'hop', run: 'walk', sleep: 'listen', sit: 'listen' };
  const expressions = { idle: 'happy', brave: 'curious', listen: 'curious', sleepy: 'curious', angry: 'curious' };
  const applyAction = () => model.setAction(talking ? 'talk' : action);
  const animator = {
    setFace(value = 'idle') {
      model.setExpression(expressions[value] || value);
      if (value === 'sleepy' || value === 'listen') action = 'listen';
      else if (value === 'idle' && action === 'listen') action = 'idle';
      applyAction();
    },
    setPose(value = 'idle') { action = actions[value] || value; applyAction(); },
    setTalking(value) { talking = Boolean(value); applyAction(); },
    setGaze() {},
    clearGaze() {},
    update(time, dt) { if (!disposed) model.update(time, dt); },
  };
  function fit(camera, { scaleMultiplier = 1.32, offsetY = -1.02 } = {}) {
    const width = camera.right - camera.left;
    const height = camera.top - camera.bottom;
    // Reserve space for waving, ears, a cape and the animated mouth. Placement
    // stays outside the model's animation hierarchy and never accumulates.
    const scale = Math.min(width * .82 / Math.max(size.x, .1), height * .75 / Math.max(size.y, .1), 2.52 * scaleMultiplier / Math.max(size.y, .1));
    placement.scale.setScalar(scale);
    placement.position.set(-center.x * scale, offsetY - .53 - bounds.min.y * scale, -center.z * scale);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    style.dispose();
    model.dispose();
    hemisphere.dispose(); sun.dispose(); rim.dispose();
    group.clear();
  }
  return { face: { kind: 'document', group, dispose }, animator, fit, model };
}
