// Run only on an extracted release, never on the repository or production current.
import {readFile,writeFile,readdir,realpath} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=await realpath(resolve(process.argv[2]||'.'));
const repo=await realpath(fileURLToPath(new URL('..',import.meta.url)));
if(root===repo||root.endsWith('/current'))throw new Error('Use a separate extracted beta release directory');
const rewrite=text=>text.replace(/(["'`(])\/(assets|vendor|src|dev)\//g,'$1/beta/$2/');
async function visit(dir){
  for(const file of await readdir(dir,{withFileTypes:true})){
    if(['.git','node_modules','tools'].includes(file.name))continue;
    const target=join(dir,file.name);
    if(file.isDirectory())await visit(target);
    else if(['.html','.css','.js'].includes(extname(file.name))){const before=await readFile(target,'utf8'),after=rewrite(before);if(before!==after)await writeFile(target,after);}
  }
}
await visit(root);
const html=(await readFile(join(root,'dev/words.html'),'utf8')).replaceAll('href="./','href="/beta/dev/').replaceAll('src="./','src="/beta/dev/');
await writeFile(join(root,'index.html'),html);
console.log('Prepared isolated /beta/ entry and static assets in',root);
