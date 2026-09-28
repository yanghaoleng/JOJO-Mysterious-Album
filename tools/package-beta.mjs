import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const temp=await mkdtemp(join(tmpdir(),'jma-beta-release-'));
const destination=resolve(process.argv[2]||'/tmp/jma-beta.tar.gz');
try{
  const archive=join(temp,'source.tar.gz'),site=join(temp,'site');
  execFileSync('node',[join(root,'tools/package-release.mjs'),archive],{stdio:'inherit'});
  await mkdir(site);
  execFileSync('tar',['xzf',archive,'-C',site]);
  execFileSync('node',[join(root,'tools/prepare-beta.mjs'),site],{stdio:'inherit'});
  execFileSync('tar',['czf',destination,'-C',site,'.']);
  console.log('Beta archive:',destination);
}finally{await rm(temp,{recursive:true,force:true});}
