// Canonical data: catalog.json. This generator emits a plain ESM browser module.
// Print a regenerated module: node src/story-npcs/generate-catalog.mjs
// Check the checked-in module: node src/story-npcs/generate-catalog.mjs --check
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'));
const voiceKeys = new Set(['sprout', 'bubble', 'moss', 'star', 'clever', 'bright', 'lively', 'sweet', 'clear', 'neighbor', 'youth', 'gentle', 'soft', 'smart', 'caring']);
const requiredStrings = ['id', 'name', 'family', 'appearance', 'personality', 'speakingStyle', 'voiceKey', 'sampleLine'];
const ids = new Set();
if (catalog.length !== 42) throw new Error('The formal NPC catalog must contain exactly 42 profiles');
for (const profile of catalog) {
  if (requiredStrings.some(key => typeof profile[key] !== 'string' || !profile[key].trim())) throw new Error(`Incomplete NPC: ${profile.id}`);
  if (!/^[a-z][a-z0-9-]*$/.test(profile.id) || ids.has(profile.id)) throw new Error(`Invalid or duplicate NPC id: ${profile.id}`);
  ids.add(profile.id);
  if (profile.role !== 'npc' || profile.selectableAsCompanion !== false) throw new Error(`NPC must stay outside companion selection: ${profile.id}`);
  if (!voiceKeys.has(profile.voiceKey) || !Number.isFinite(profile.speechRate) || profile.speechRate < .86 || profile.speechRate > 1.08) throw new Error(`Unsupported NPC voice: ${profile.id}`);
  if (!['reference-3d', 'document-image', 'text-adaptation'].includes(profile.visualBasis)) throw new Error(`Missing visual basis: ${profile.id}`);
}
for (const profile of catalog) {
  for (const related of profile.relatedProfiles || []) {
    if (!ids.has(related.id) || related.id === profile.id) throw new Error(`Invalid related profile: ${profile.id}`);
  }
}
for (const id of ['jiaojiao', 'lingdang', 'zhuxiaodi']) {
  if (!ids.has(id)) throw new Error(`Missing core NPC: ${id}`);
}
const output = `// GENERATED from catalog.json by generate-catalog.mjs. Do not edit profiles here.
// Plain ESM intentionally avoids JSON import attributes for existing Safari clients.
export const NPC_CATALOG = Object.freeze(${JSON.stringify(catalog, null, 2)}.map(profile => Object.freeze(profile)));
export const NPC_BY_ID = Object.freeze(Object.fromEntries(NPC_CATALOG.map(profile => [profile.id, profile])));
export const CORE_NPC_IDS = Object.freeze(['jiaojiao', 'lingdang', 'zhuxiaodi']);

// Unknown ids must not silently acquire a different character's identity or voice.
export function getNpc(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(NPC_BY_ID, id) ? NPC_BY_ID[id] : null;
}

export function getNpcVoice(id) {
  return getNpc(id)?.voiceKey ?? null;
}

export default NPC_CATALOG;
`;
if (process.argv.includes('--check')) {
  const existing = readFileSync(new URL('./catalog.js', import.meta.url), 'utf8');
  if (existing !== output) throw new Error('catalog.js differs from canonical catalog.json; regenerate before publishing');
  console.log(`NPC catalog verified: ${catalog.length} unique NPC-only profiles, supported voices and rates, exact JSON/JS consistency.`);
} else {
  process.stdout.write(output);
}
