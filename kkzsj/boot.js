const root = '/kkzsj';
const status = document.getElementById('kk-status');
const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
async function request(path, data) {
  const response = await fetch(root + '/api/' + path, {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
  if (!response.ok) throw new Error(response.status === 409 ? '进度已在另一个窗口更新，请刷新后继续' : '暂时没有连接成功，请重试');
  return response.json();
}
try {
  const session = await request('session', {});
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
  const badge=document.createElement('div');badge.className='kk-identity';badge.innerHTML='<span></span><small></small>';
  badge.firstElementChild.textContent=`${session.user.kind==='guest'?'游客':'测试用户'} ${session.user.uid}`;
  badge.lastElementChild.textContent=session.user.kind==='mock'?'模拟登录 · SDK 待接入':'进度自动保存';
  document.querySelector('.word-header').append(badge);
  status.textContent='';
  document.getElementById('kk-loading').remove();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)client.flush().catch(()=>{});});
  window.addEventListener('pagehide',()=>{if(!blocked)fetch(root+'/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',keepalive:true,body:JSON.stringify({revision,state:snapshot()})}).catch(()=>{});});
  await import('../dev/words.bundle.js');
} catch(error) {
  status.textContent=error.message;
  const loading=document.getElementById('kk-loading');
  if(loading){loading.textContent='暂时没有连接成功 ';const retry=document.createElement('button');retry.textContent='重新连接';retry.onclick=()=>location.reload();loading.append(retry);}
}
