import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import * as THREE from '../../vendor/three.module.js';
import { RLINE_NOUNS, RLINE_EXTENSIONS, RLINE_MODEL_WORDS, RLINE_NON_NOUNS, RLINE_SOURCE } from '../content/rline-nouns.js';
import { createCreationModel } from '../creation-models.js';
import { PROP_BUILDERS } from '../modules/props/registry.js';
import { CREATION_KITS, PROP_CATEGORIES } from '../content/props.js';
import { ASSETS } from '../content/assets.js';

assert.equal(RLINE_NOUNS.length, RLINE_SOURCE.nounCount);
assert.equal(RLINE_NOUNS.length + RLINE_NON_NOUNS.length, RLINE_SOURCE.headwords);
assert.equal(new Set([...RLINE_NOUNS,...RLINE_NON_NOUNS].map(n => n.word)).size, RLINE_SOURCE.headwords);
assert.equal(RLINE_NOUNS.find(n=>n.word==='mum').aliases.includes('mom'),true);
assert.equal(RLINE_EXTENSIONS.find(n=>n.word==='poop').extension,true);
assert.equal(RLINE_EXTENSIONS.find(n=>n.word==='poop').lessons.length,0);
// Meaning-sensitive guards: source meanings take precedence over an English homograph.
for (const word of ['cot','run','pop','nap','cut','name','story','day','ben','sid','ted'])
  assert.ok(RLINE_NOUNS.some(n=>n.word===word),`Missing source noun ${word}`);
for (const word of ['fly','tap','zip','sail','skate'])
  assert.ok(RLINE_NON_NOUNS.some(n=>n.word===word),`Incorrect noun classification ${word}`);

// Optional comparison against the fresh DingTalk export: RLINE_SOURCE_FILE=/tmp/mengmeng-words.json.
if(process.env.RLINE_SOURCE_FILE){
  const source=JSON.parse(await readFile(process.env.RLINE_SOURCE_FILE,'utf8'));
  const known=new Set([...RLINE_NOUNS,...RLINE_NON_NOUNS].flatMap(n=>[n.word,...n.aliases]));
  for(const row of source.data.records){
    const value=(row.cells['01ZM8y7']||'').trim();if(!value)continue;
    const word=value.startsWith('look out')?'look out':value.match(/^[a-z]+/i)?.[0].toLowerCase();
    assert.ok(known.has(word),`Unreviewed source word: ${value}`);
    const entry=[...RLINE_NOUNS,...RLINE_NON_NOUNS].find(n=>n.word===word||n.aliases.includes(word));
    assert.ok(entry.lessons.includes(row.cells.VwQor0J),`Lost source lesson for ${word}`);
  }
}
let meshTotal=0;const signatures=new Set();
for(const n of RLINE_MODEL_WORDS){
  const id=n.assetId.slice(5);
  await access(`dev/modules/props/${id}.js`);
  assert.equal(typeof PROP_BUILDERS[id],'function',id);
  assert.ok(CREATION_KITS.some(p=>p.id===id&&p.words.split('|').includes(n.word)),id);
  assert.equal(PROP_CATEGORIES[id],'R线名词模型库');
  assert.ok(ASSETS[n.assetId],`Asset missing: ${n.assetId}`);
  if(!n.extension){assert.ok(n.lessons.length);assert.ok(n.sourceLines.length);}
  assert.ok(n.representation,'Scene symbols must explain what is represented');
  const model=createCreationModel(id),other=createCreationModel(id);
  const geometries=new Set(),materials=new Set(),meshes=[];
  model.group.traverse(o=>{if(o.isMesh){meshes.push(o);geometries.add(o.geometry);materials.add(o.material);}});
  assert.ok(meshes.length>=2||meshes.some(o=>['TubeGeometry','ExtrudeGeometry'].includes(o.geometry.type)),`${id} is only a generic primitive`);
  const bounds=new THREE.Box3().setFromObject(model.group);
  assert.ok(!bounds.isEmpty()&&[...bounds.min,...bounds.max].every(Number.isFinite),id);
  for(const mesh of meshes) {
    const attr=mesh.geometry.getAttribute('position');
    assert.ok(Array.from(attr.array).every(Number.isFinite),`${id} has invalid vertices`);
  }
  // Compare actual topology and placements, independent of color.
  signatures.add(JSON.stringify(meshes.map(o=>[o.geometry.type,o.geometry.attributes.position.count,o.position.toArray(),o.scale.toArray(),o.rotation.toArray().slice(0,3)])));
  other.group.traverse(o=>{if(o.isMesh){assert.ok(!geometries.has(o.geometry),`${id}: geometry leaked between instances`);assert.ok(!materials.has(o.material),`${id}: material leaked between instances`);}});
  let freedGeo=0,freedMat=0;
  for(const geo of geometries)geo.addEventListener('dispose',()=>freedGeo++);
  for(const mat of materials)mat.addEventListener('dispose',()=>freedMat++);
  model.setState('active');model.trigger();model.update(.3);
  assert.ok([...materials].some(m=>m.emissiveIntensity>0),`${id} has no activation feedback`);
  model.setState('working');model.update(.2,false,true);model.setState('idle');model.update(.1,true);
  model.dispose();
  assert.equal(freedGeo,geometries.size,`${id} leaked geometry`);
  assert.equal(freedMat,materials.size,`${id} leaked material`);
  other.trigger();other.update(.2);other.dispose();meshTotal+=meshes.length;
}
assert.ok(signatures.size>RLINE_MODEL_WORDS.length*.9,`Too many identical model silhouettes: ${signatures.size}`);
console.log(`PASS: ${RLINE_NOUNS.length} source nouns + ${RLINE_EXTENSIONS.length} labelled extension; ${signatures.size} geometry signatures / ${meshTotal} meshes; source lessons, registry, real geometry, activation, independent ownership and cleanup verified.`);
