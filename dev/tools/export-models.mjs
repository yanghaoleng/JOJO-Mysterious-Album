/** Reproduce original Three Object3D assets; no network or external input. */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CHARACTER_CATALOG, createCharacter } from '../models.js';

const output = new URL('../assets/characters/', import.meta.url);
await mkdir(output, { recursive: true });
const manifest = {
  title: '小小陶土剧场 · 原创体积角色',
  author: 'Codex, created for 萌萌星的奇妙图鉴',
  version: 1,
  source: 'dev/models.js',
  format: 'Three.js Object3D JSON',
  threeRevision: '160',
  usesSkeleton: false,
  externalTextures: false,
  characters: [],
};
for (const entry of CHARACTER_CATALOG) {
  const model = createCharacter({ type: entry.id });
  const filename = `${entry.id}.json`;
  await writeFile(new URL(filename, output), `${JSON.stringify(model.group.toJSON())}\n`);
  manifest.characters.push({ ...entry, file: `characters/${filename}`, triangles: model.group.userData.triangles, meshes: model.group.userData.meshes, restHeight: model.group.userData.restHeight });
  console.log(`${entry.id}: ${model.group.userData.triangles} triangles, ${model.group.userData.meshes} meshes`);
  model.dispose();
}
await writeFile(new URL('../assets/manifest.json', import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Exported original assets to ${fileURLToPath(output)}`);
