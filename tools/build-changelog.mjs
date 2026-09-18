// All commits reachable from the release's HEAD, grouped by commit date in Beijing.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
if(git('rev-parse','--is-shallow-repository')==='true')throw new Error('更新日志需要完整历史：先运行 git fetch --unshallow origin。');
const summaries=JSON.parse(await readFile(new URL('../src/changelog/entries.json',import.meta.url),'utf8'));
const dates=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});
const days=new Map();
for(const record of git('log','HEAD','--format=%H%x00%cI%x00%s%x1e').split('\x1e')){
  if(!record.trim())continue;
  const [hash,at,subject]=record.trim().split('\0');
  if(!/^[a-f0-9]{40}$/.test(hash)||!subject||Number.isNaN(Date.parse(at)))throw new Error('无效的历史提交记录');
  const date=dates.format(new Date(at));
  if(!days.has(date))days.set(date,[]);
  days.get(date).push({hash,subject,at});
}
const entries=[...days].sort(([a],[b])=>b.localeCompare(a)).map(([date,commits])=>{
  const summary=summaries[date];
  if(!summary?.title||!Array.isArray(summary.changes)||!summary.changes.length||summary.changes.some(s=>typeof s!=='string'||!s.trim()))throw new Error(`请在 src/changelog/entries.json 补充 ${date} 的中文每日摘要。`);
  return {date,...summary,commits};
});
const history={version:1,timeZone:'Asia/Shanghai',revision:git('rev-parse','HEAD'),commitCount:entries.reduce((n,d)=>n+d.commits.length,0),days:entries};
if(history.commitCount!==Number(git('rev-list','--count','HEAD')))throw new Error('历史提交覆盖不完整');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const months=new Set();
const rows=entries.map((day,index)=>{
  const month=day.date.slice(0,7),first=!months.has(month);months.add(month);
  return `<article class="update" id="${first?'month-'+month:'day-'+day.date}" data-date="${day.date}"><div class="update-date"><time datetime="${day.date}">${day.date.slice(0,4)}<strong>${day.date.slice(5).replace('-',' / ')}</strong></time>${index===0?'<span class="latest">最近更新</span>':''}</div><div><h2>${esc(day.title)}</h2><ul class="changes">${day.changes.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><details><summary>查看这一天的原始记录 · ${day.commits.length} 次提交</summary><ol class="commit-list">${day.commits.map(c=>`<li><a href="https://github.com/yanghaoleng/JOJO-Mysterious-Album/commit/${c.hash}" target="_blank" rel="noopener"><code>${c.hash.slice(0,7)}</code>${esc(c.subject)}</a></li>`).join('')}</ol></details></div></article>`;
}).join('\n');
let html=await readFile(new URL('../src/changelog/template.html',import.meta.url),'utf8');
const style=await readFile(new URL('../src/changelog/style.css',import.meta.url));
const replacements={STYLE_HASH:createHash('sha256').update(style).digest('hex').slice(0,12),META:`${entries.at(-1).date.replaceAll('-','.')} — ${entries[0].date.replaceAll('-','.')} · ${entries.length} 个更新日 · ${history.commitCount} 次提交`,MONTHS:[...months].map(m=>`<a href="#month-${m}">${m.slice(0,4)} 年 ${Number(m.slice(5))} 月</a>`).join(''),DAYS:rows};
html=html.replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>{if(!(key in replacements))throw new Error(`未知模板字段 ${key}`);return replacements[key];});
await mkdir(new URL('../changelog/',import.meta.url),{recursive:true});
await writeFile(new URL('../changelog/index.html',import.meta.url),html);
await writeFile(new URL('../changelog/history.json',import.meta.url),JSON.stringify(history,null,2)+'\n');
console.log(`Updated changelog: ${entries.length} days, ${history.commitCount} commits, through ${history.revision.slice(0,7)}.`);
