// Transform only an extracted, committed release. The original JMA files stay intact.
import {readFile,writeFile,readdir,realpath,copyFile} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=await realpath(resolve(process.argv[2]||'.'));
const repo=await realpath(fileURLToPath(new URL('..',import.meta.url)));
if(root===repo||root.endsWith('/current'))throw new Error('Use a separate extracted release');
const rewrite=text=>text.replace(/(["'`(])\/(assets|vendor|src|dev|favicon\.ico)\b/g,'$1/kkzsj/$2').replaceAll('/api/','/kkzsj/api/');
async function visit(dir){
  for(const file of await readdir(dir,{withFileTypes:true})){
    if(['.git','node_modules','tools','kkzsj'].includes(file.name))continue;
    const target=join(dir,file.name);
    if(file.isDirectory())await visit(target);
    else if(['.html','.css','.js'].includes(extname(file.name))){const before=await readFile(target,'utf8'),after=rewrite(before);if(before!==after)await writeFile(target,after);}
  }
}
await visit(root);
let game=await readFile(join(root,'words.html'),'utf8');
game=game.replace('开口造世界 · 萌萌星','开口造世界 · 叫叫用户测试版').replace('https://jma.mikeywa.site/words','https://mikeywa.site/kkzsj').replace(/<script type="module" src="[^\"]*words\.bundle\.js[^\"]*"><\/script>/,'<script type="module" src="/kkzsj/kkzsj/boot.js"></script>').replace('</head>','<link rel="stylesheet" href="/kkzsj/kkzsj/style.css"></head>').replace('<noscript>','<div id="kk-loading" role="status">正在打开你的世界…</div><p id="kk-status" role="status"></p><noscript>');
await writeFile(join(root,'kkzsj/index.html'),game);
let data=await readFile(join(root,'data.html'),'utf8');
data=data.replaceAll('href="./','href="/kkzsj/').replaceAll('src="./','src="/kkzsj/').replace('href="/"','href="/kkzsj"').replaceAll('萌萌星','开口造世界独立版').replace('<title>','<title>独立版 · ').replace('</head>','<link rel="stylesheet" href="/kkzsj/kkzsj/style.css"></head>').replace('</body>','<script type="module" src="/kkzsj/kkzsj/accounts.js"></script></body>');
data=data.replace('<body','<body data-edition="kkzsj"').replace(/<button[^>]+data-activity="(?:midautumn|national-day)"[^>]*>.*?<\/button>/g,'').replace('原版、中秋、国庆分开看；进度按实际题数计算','按游客 UID 统计；仅包含此独立版本');
await writeFile(join(root,'kkzsj/data.html'),data);
console.log('Prepared independent /kkzsj game, login placeholder and dashboard');
