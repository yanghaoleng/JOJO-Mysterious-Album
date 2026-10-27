const root = '/kkzsj';
const status = document.getElementById('kk-status');
const loading=document.getElementById('kk-loading');
const phase=text=>{const node=loading?.querySelector('[data-phase]');if(node)node.textContent=text;};
const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
async function request(path, data) {
  const response = await fetch(root + '/api/' + path, {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
  if (!response.ok) throw new Error(response.status === 409 ? '进度已在另一个窗口更新，请刷新后继续' : '暂时没有连接成功，请重试');
  return response.json();
}
try {
  performance.mark('kkzsj-session-start');
  const session = await request('session', {});
  performance.mark('kkzsj-session-ready');phase('正在打开立体世界…');
  const prefix = `kkzsj.${session.user.uid}.`;
  const keys = {game:prefix+'game', tour:prefix+'tour', pending:prefix+'pending'};
  for (const [field,key] of Object.entries(keys)) {
    if (session.state[field] != null) localStorage.setItem(key, JSON.stringify(session.state[field]));
    else localStorage.removeItem(key);
  }
  let revision = session.revision, timer, saving = Promise.resolve(), blocked = false;
  function snapshot() { return Object.fromEntries(Object.entries(keys).map(([field,key])=>[field,read(key)]).filter(([,value])=>value!=null)); }
  const client = window.__KKZSJ__ = {
    user:session.user, keys,
    changed() { clearTimeout(timer); timer=setTimeout(()=>client.flush().catch(()=>{}),800); },
    flush() {
      clearTimeout(timer);
      saving = saving.catch(()=>{}).then(async()=>{
        if(blocked) throw new Error('进度已在另一个窗口更新，请刷新后继续');
        try { const result=await request('progress',{revision,state:snapshot()}); revision=result.revision; status.textContent='已保存'; }
        catch(error) { if(error.message.includes('另一个窗口'))blocked=true; status.textContent=error.message;throw error; }
      });
      return saving;
    },
    async requireLogin(pending) {
      localStorage.setItem(keys.pending,JSON.stringify(pending));
      await client.flush();
      location.assign(root+'/login');
    },
    async consumeContinuation() { localStorage.removeItem(keys.pending); await client.flush(); },
    continuation:new URLSearchParams(location.search).get('continue')==='1'&&session.user.kind!=='guest'?read(keys.pending):null,
    completedGuest:session.user.kind==='guest'&&Object.values(session.state.game?.journeys||{}).some(journey=>journey.completed),
  };
  const badge=document.createElement('div');badge.className='kk-identity';badge.innerHTML='<button type="button" class="kk-copy-uid"><span></span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg></button><small role="status" aria-live="polite"></small>';
  const copyButton=badge.firstElementChild;
  copyButton.firstElementChild.textContent=`${session.user.kind==='guest'?'游客':'测试用户'} ${session.user.uid}`;
  copyButton.setAttribute('aria-label',`复制用户 ID ${session.user.uid}`);
  copyButton.title='点击复制 UID';copyButton.onkeydown=event=>event.stopPropagation();
  badge.lastElementChild.textContent=session.user.kind==='mock'?'模拟登录 · SDK 待接入':'进度自动保存';
  let copiedTimer;
  copyButton.onclick=async()=>{
    const hint=session.user.kind==='mock'?'模拟登录 · SDK 待接入':'进度自动保存';
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(session.user.uid);
      else{
        const input=document.createElement('textarea');input.value=session.user.uid;input.style.cssText='position:fixed;left:-9999px';document.body.append(input);input.select();
        try{if(!document.execCommand('copy'))throw new Error('copy_failed');}finally{input.remove();copyButton.focus();}
      }
      badge.lastElementChild.textContent='UID 已复制';
    }catch{badge.lastElementChild.textContent='复制未成功，请再点一次';}
    clearTimeout(copiedTimer);copiedTimer=setTimeout(()=>{badge.lastElementChild.textContent=hint;},2200);
  };
  document.querySelector('.word-header').append(badge);
  status.textContent='';
  document.addEventListener('visibilitychange',()=>{if(document.hidden)client.flush().catch(()=>{});});
  window.addEventListener('pagehide',()=>{if(!blocked)fetch(root+'/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',keepalive:true,body:JSON.stringify({revision,state:snapshot()})}).catch(()=>{});});
  await import('../dev/words.bundle.js');
  await new Promise(requestAnimationFrame);
  performance.mark('kkzsj-interactive');loading?.remove();
} catch(error) {
  status.textContent=error.message;
  const loading=document.getElementById('kk-loading');
  if(loading){loading.textContent='暂时没有连接成功 ';const retry=document.createElement('button');retry.textContent='重新连接';retry.onclick=()=>location.reload();loading.append(retry);}
}
