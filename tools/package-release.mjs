// Commit first, then package: this includes that final commit in the generated history.
import {execFileSync} from 'node:child_process';
import {mkdtemp,rm,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
if(git('status','--porcelain'))throw new Error('发布打包前先提交工作区改动，保证日志和发布源码一致。');
await import('./build-changelog.mjs');
const sha=git('rev-parse','--short','HEAD');
const destination=resolve(process.argv[2]||join(tmpdir(),`jma-${sha}.tar.gz`));
const temp=await mkdtemp(join(tmpdir(),'jma-release-'));
try{
  execFileSync('git',['archive','--format=tar',`--output=${join(temp,'release.tar')}`,'HEAD'],{cwd:root});
  execFileSync('tar',['-rf',join(temp,'release.tar'),'-C',root,'changelog/index.html','changelog/history.json']);
  execFileSync('gzip',['-f',join(temp,'release.tar')]);
  await copyFile(join(temp,'release.tar.gz'),destination);
  console.log(`Release archive: ${destination}`);
}finally{await rm(temp,{recursive:true,force:true});}
