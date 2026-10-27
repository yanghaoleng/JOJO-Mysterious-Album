const area=document.createElement('section');area.className='dashboard-section';area.id='kk-accounts';
area.innerHTML='<div class="section-heading"><div><p class="panel-kicker">开口造世界 · 独立用户</p><h2>游客与登录进度</h2></div><p>模拟登录与正式 SDK 登录单独标识</p></div><p class="kk-account-stats" id="kk-account-stats"></p><article class="analysis-panel"><div class="table-wrap"><table class="kk-account-table"><thead><tr><th>UID</th><th>身份</th><th>完成章节</th><th>创建时间</th><th>进度更新时间</th></tr></thead><tbody id="kk-account-rows"></tbody></table></div></article>';
document.getElementById('users').before(area);
async function load(){
  const response=await fetch('/kkzsj/api/data/accounts',{credentials:'same-origin'});if(!response.ok)return;
  const data=await response.json();document.getElementById('kk-account-stats').textContent=`累计 ${data.totals.total} 位用户 · ${data.totals.mock_logins||0} 位模拟登录 · 正式 SDK 尚未接入 · 最近更新的 200 位用户`;
  const rows=document.getElementById('kk-account-rows');rows.replaceChildren();
  for(const user of data.users){const row=document.createElement('tr');for(const value of [user.uid,user.login_kind==='mock'?'模拟登录':'游客',user.completed_chapters,new Date(user.created_at*1000).toLocaleString('zh-CN'),new Date(user.updated_at*1000).toLocaleString('zh-CN')]){const cell=document.createElement('td');cell.textContent=String(value);row.append(cell);}rows.append(row);}
}
new MutationObserver(()=>{if(!document.getElementById('dashboard').hidden)load();}).observe(document.getElementById('dashboard'),{attributes:true,attributeFilter:['hidden']});
setInterval(()=>{if(!document.hidden&&!document.getElementById('dashboard').hidden)load();},30000);
load();
