// Transform only an extracted, committed release. The original JMA files stay intact.
import {readFile,writeFile,readdir,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {transform} from 'esbuild';
import {resolve,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=await realpath(resolve(process.argv[2]||'.'));
const repo=await realpath(fileURLToPath(new URL('..',import.meta.url)));
if(root===repo||root.endsWith('/current'))throw new Error('Use a separate extracted release');
const rewrite=text=>text.replace(/(["'`(])\/(assets|vendor|src|dev|favicon\.ico)\b/g,'$1/kkzsj/$2').replaceAll('/api/','/kkzsj/api/');
async function visit(dir,change=rewrite,includeApp=false){
  for(const file of await readdir(dir,{withFileTypes:true})){
    if(['.git','node_modules','tools'].includes(file.name)||(!includeApp&&file.name==='kkzsj'))continue;
    const target=join(dir,file.name);
    if(file.isDirectory())await visit(target,change,includeApp);
    else if(['.html','.css','.js'].includes(extname(file.name))){const before=await readFile(target,'utf8'),after=await change(before,target);if(before!==after)await writeFile(target,after);}
  }
}
await visit(root);
// Preserve the upstream MIT notice while shrinking the renderer's transfer/parse cost.
const threePath=join(root,'vendor/three.module.js');
await writeFile(threePath,(await transform(await readFile(threePath,'utf8'),{minify:true,format:'esm',legalComments:'inline'})).code);
const digest=async path=>createHash('sha256').update(await readFile(join(root,path))).digest('hex').slice(0,12);
const critical=new Map();
for(const path of ['vendor/three.module.js','vendor/calligraph-bubble.js'])critical.set(path,await digest(path));
async function versionReferences(paths){
  await visit(root,text=>{
    for(const [path,hash] of paths){
      const name=path.split('/').at(-1).replaceAll('.','\\.');
      text=text.replace(new RegExp('(["\x27`])[^"\x27`\\s]*\\/'+name+'(?:\\?[^"\x27`]*)?\\1','g'),`$1/kkzsj/${path}?v=${hash}$1`);
    }
    return text;
  },true);
}
await versionReferences(critical);
critical.set('dev/words.bundle.js',await digest('dev/words.bundle.js'));
await versionReferences(new Map([['dev/words.bundle.js',critical.get('dev/words.bundle.js')]]));
let game=await readFile(join(root,'words.html'),'utf8');
const preloads=[...critical].map(([path,hash])=>`<link rel="modulepreload" href="/kkzsj/${path}?v=${hash}">`).join('');
game=game.replace('开口造世界 · 萌萌星','开口造世界 · 叫叫用户测试版').replace('https://jma.mikeywa.site/words','https://mikeywa.site/kkzsj').replace(/<script type="module" src="[^\"]*words\.bundle\.js[^\"]*"><\/script>/,'<script type="module" src="/kkzsj/kkzsj/boot.js"></script>').replace('</head>',preloads+'<link rel="stylesheet" href="/kkzsj/kkzsj/style.css"></head>').replace('<noscript>','<div id="kk-loading" role="status"><h1>开口，造个小世界。</h1><div class="kk-load-track" aria-hidden="true"></div><p data-phase>正在准备你的冒险…</p></div><p id="kk-status" role="status"></p><noscript>');
await writeFile(join(root,'kkzsj/index.html'),game);
let data=await readFile(join(root,'data.html'),'utf8');
data=data.replaceAll('href="./','href="/kkzsj/').replaceAll('src="./','src="/kkzsj/').replace('href="/"','href="/kkzsj"').replaceAll('萌萌星','开口造世界独立版').replace('<title>','<title>独立版 · ').replace('</head>','<link rel="stylesheet" href="/kkzsj/kkzsj/style.css"></head>').replace('</body>','<script type="module" src="/kkzsj/kkzsj/accounts.js"></script></body>');
data=data.replace('<body','<body data-edition="kkzsj"').replace(/<button[^>]+data-activity="(?:midautumn|national-day)"[^>]*>.*?<\/button>/g,'').replace('原版、中秋、国庆分开看；进度按实际题数计算','按游客 UID 统计；仅包含此独立版本');
await writeFile(join(root,'kkzsj/data.html'),data);
// Entry pages always revalidate; their versioned scripts/styles may be cached safely.
await visit(join(root,'kkzsj'),async(text,target)=>{
  if(!target.endsWith('.html'))return text;
  const urls=[...text.matchAll(/(?:src|href)="(\/kkzsj\/[^"?]+\.(?:js|css))(?:\?[^\"]*)?"/g)];
  for(const [tag,url] of urls){const hash=await digest(url.slice('/kkzsj/'.length));text=text.replace(tag,tag.replace(/=".*"$/,`="${url}?v=${hash}"`));}
  return text;
},true);
const sizes={};
await visit(root,async(text,target)=>{
  if(Buffer.byteLength(text)>1024){const compressed=gzipSync(text,{level:9});await writeFile(target+'.gz',compressed);if(critical.has(target.slice(root.length+1)))sizes[target.slice(root.length+1)]={rawBytes:Buffer.byteLength(text),gzipBytes:compressed.length};}
  return text;
},true);
await writeFile(join(root,'kkzsj/assets-manifest.json'),JSON.stringify({critical:Object.fromEntries(critical),sizes},null,2));
console.log('Prepared independent /kkzsj game, login placeholder and dashboard');
