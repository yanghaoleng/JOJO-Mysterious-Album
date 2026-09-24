import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import { ANIMAL_WORDS, ZODIAC_ANIMALS } from '../content/animal-words.js';
import { CREATION_KITS, PROP_CATEGORIES } from '../content/props.js';
import { WORD_VOCABULARY, createWordSuggestions } from '../content/word-games.js';
import { WORD_SPEECH_VOCABULARY, planWordIntent } from '../word-intent.js';
import { ASSETS } from '../content/assets.js';
import { createCreationModel } from '../creation-models.js';

assert.equal(ZODIAC_ANIMALS.length, 12);
assert.equal(new Set(ZODIAC_ANIMALS.map(animal => animal.word)).size, 12);
assert.equal(ANIMAL_WORDS.length, 13);
const signatures = new Set();
for (const animal of ANIMAL_WORDS) {
  const { word, model, aliases } = animal;
  assert.equal(PROP_CATEGORIES[model], '动物与生肖');
  assert.ok(ASSETS[`prop:${model}`]);
  assert.ok(CREATION_KITS.some(kit => kit.id === model && kit.words.split('|').includes(word)));
  for (const spoken of [word, ...aliases]) {
    assert.ok(WORD_SPEECH_VOCABULARY.includes(spoken), `Missing hotword: ${spoken}`);
    assert.ok(WORD_VOCABULARY[spoken], `Missing vocabulary: ${spoken}`);
    const commands = planWordIntent(spoken).commands.filter(command => command.type === 'entity.spawn');
    assert.ok(commands.some(command => command.asset === `prop:${model}`), `Wrong scene model for ${spoken}`);
  }
  const instance = createCreationModel(model);
  const meshes = [];
  instance.group.traverse(object => { if (object.isMesh) meshes.push(object); });
  assert.ok(meshes.length >= 12, `Model lacks detail: ${model}`);
  const bounds = new THREE.Box3().setFromObject(instance.group);
  assert.ok(!bounds.isEmpty() && [...bounds.min, ...bounds.max].every(Number.isFinite), model);
  signatures.add(JSON.stringify(meshes.map(mesh => [mesh.geometry.type, mesh.position.toArray(), mesh.scale.toArray()])));
  const shapes = new Set(meshes.map(mesh => mesh.geometry));
  const materials = new Set(meshes.map(mesh => mesh.material));
  let disposedShapes = 0, disposedMaterials = 0;
  shapes.forEach(shape => shape.addEventListener('dispose', () => disposedShapes++));
  materials.forEach(material => material.addEventListener('dispose', () => disposedMaterials++));
  instance.setState('active');
  instance.update(.3);
  instance.dispose();
  assert.equal(disposedShapes, shapes.size, model);
  assert.equal(disposedMaterials, materials.size, model);
}
assert.equal(signatures.size, ANIMAL_WORDS.length, 'Animal models must have distinct silhouettes');
for (const zodiac of ZODIAC_ANIMALS) assert.ok(ASSETS[zodiac.asset], zodiac.word);
const suggestions = createWordSuggestions({ mode:'open', example:'A big elephant.' });
assert.ok(suggestions.parts.some(part => part.text.toLowerCase() === 'elephant'));
console.log('PASS: 13 distinct animal models, 12 zodiac assets, vocabulary, speech hotwords, scene commands and cleanup.');
