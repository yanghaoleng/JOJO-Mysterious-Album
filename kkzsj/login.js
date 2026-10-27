const button=document.getElementById('mock-login'),message=document.getElementById('login-message');
try {
  const response=await fetch('/kkzsj/api/session',{credentials:'same-origin'});
  if(!response.ok)throw new Error('请先进入游戏，完成一章后继续');
  const session=await response.json();
  document.getElementById('guest-id').textContent=`我的 UID：${session.user.uid} · 已完成的学习进度会保留`;
  const completed=Object.values(session.state.game?.journeys||{}).some(journey=>journey.completed);
  if(!completed)throw new Error('先完成一章，再来解锁下一段冒险吧');
  button.disabled=false;
  button.onclick=async()=>{
    button.disabled=true;message.textContent='正在模拟登录…';
    try {
      const result=await fetch('/kkzsj/api/login/mock',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});
      if(!result.ok)throw new Error('登录暂未完成，请再试一次');
      message.textContent='模拟登录成功，正在进入下一章';
      location.replace('/kkzsj?continue=1');
    }catch(error){message.textContent=error.message;button.disabled=false;}
  };
}catch(error){message.textContent=error.message;}
