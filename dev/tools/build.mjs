import { build } from 'esbuild';
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import './build-audio-catalog.mjs';
// Audio indexing must finish before importing the catalog that consumes it.
await import('./build-module-catalog.mjs');
await import('./verify-module-catalog.mjs');
await import('./verify-story-content.mjs');
for (const [entry,outfile,vendor] of [
  ['dev/app.js','dev/app.bundle.js','../vendor/'],
  ['dev/debate.js','dev/debate.bundle.js','../vendor/'],
  ['dev/words.js','dev/words.bundle.js','../vendor/'],
  ['dev/modules/gallery.js','dev/modules/gallery.bundle.js','../../vendor/'],
]) await build({entryPoints:[entry],bundle:true,format:'esm',minify:true,
  plugins:[{name:'shared-rendering',setup(builder){
    builder.onResolve({filter:/vendor\/calligraph-bubble\.js/},()=>({path:`${vendor}calligraph-bubble.js?v=20260910-lyric-motion`,external:true}));
    builder.onResolve({filter:/vendor\/three\.module\.js$/},()=>({path:`${vendor}three.module.js`,external:true}));
  }}],outfile});
console.log('Built story, debate and module gallery from shared modules.');
const {WORD_SPEECH_VOCABULARY}=await import('../word-intent.js');
await writeFile('dev/content/speech-vocabulary.json',JSON.stringify(WORD_SPEECH_VOCABULARY,null,2)+'\n');
// Content hashes keep all three entry pages current after future catalog/script edits.
for(const [html,assets] of [
  ['dev/index.html',['dev/app.bundle.js','dev/app.css','dev/exploration.css']],
  ['dev/debate.html',['dev/debate.bundle.js','dev/debate.css','dev/exploration.css']],
  ['dev/words.html',['dev/words.bundle.js','dev/words.css']],
  ['midautumn.html',['dev/words.bundle.js','dev/words.css']],
  ['dev/modules/index.html',['dev/modules/gallery.bundle.js','dev/modules/gallery.css','dev/exploration.css']],
]){
  let content=await readFile(html,'utf8');
  for(const asset of assets){const digest=createHash('sha256').update(await readFile(asset)).digest('hex').slice(0,12),name=asset.split('/').at(-1).replaceAll('.','\\.');content=content.replace(new RegExp(`(${name}\\?v=)[^"']+`,'g'),`$1${digest}`);}
  await writeFile(html,content);
}

await import('../../tools/build-changelog.mjs');
