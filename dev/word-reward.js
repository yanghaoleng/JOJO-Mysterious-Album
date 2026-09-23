// Success feedback is finite and decorative; it never owns learning progress.
export function createWordReward({getTranscript,checkIcon,reduced,playSound}){
  const animations=new Set(),particles=new Set();let lastSound=-Infinity;
  function animate(node,frames,options){const a=node.animate(frames,options);animations.add(a);a.finished.catch(()=>{}).finally(()=>animations.delete(a));return a;}
  function clear(){for(const a of animations)a.cancel();animations.clear();for(const n of particles)n.remove();particles.clear();const text=getTranscript();text?.classList.remove('is-matched');text?.querySelectorAll('.match-check,.match-sweep').forEach(n=>n.remove());}
  function show({celebrate=true}={}){
    clear();const text=getTranscript();if(!text)return;
    const value=text.textContent;const words=document.createElement('span');words.className='match-words';words.textContent=value;
    const sweep=document.createElement('span');sweep.className='match-sweep';sweep.dataset.text=value;sweep.setAttribute('aria-hidden','true');words.append(sweep);
    const check=document.createElement('span');check.className='match-check';check.setAttribute('role','img');check.setAttribute('aria-label','匹配成功');check.innerHTML=checkIcon;
    text.replaceChildren(words,check);text.classList.add('is-matched');
    const easing='cubic-bezier(0.23, 1, 0.32, 1)';
    if(reduced())sweep.remove();
    else {animate(sweep,[{clipPath:'polygon(-30% 0,0 0,0 100%,-30% 100%)'},{clipPath:'polygon(100% 0,130% 0,130% 100%,100% 100%)'}],{duration:280,easing:'linear'}).finished.catch(()=>{}).finally(()=>sweep.remove());}
    animate(check,reduced()?[{opacity:0},{opacity:1}]:[{opacity:0,transform:'translateY(5px) scale(.95)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:200,delay:reduced()?0:80,fill:'backwards',easing});
    if(performance.now()-lastSound>1200){lastSound=performance.now();void playSound();}
    if(!celebrate||reduced())return;
    for(const side of [-1,1])for(let i=0;i<12;i++){
      const node=document.createElement('i');node.className='word-confetti';node.setAttribute('aria-hidden','true');node.style[side<0?'left':'right']='0';node.style.bottom=`${18+i%4*7}vh`;node.style.background=['#73d5ff','#8ee6b2','#ffe39b','#bda7ff'][i%4];document.body.append(node);particles.add(node);
      const dx=-side*(45+i%4*26),dy=-(40+i*9);
      const a=animate(node,[{opacity:0,transform:'translate(0,0) rotate(0deg)'},{opacity:1,transform:`translate(${dx*.65}px,${dy}px) rotate(${side*90}deg)`,offset:.4},{opacity:0,transform:`translate(${dx}px,${dy+90}px) rotate(${side*210}deg)`}],{duration:500,delay:i%3*40,easing});
      a.finished.catch(()=>{}).finally(()=>{node.remove();particles.delete(node);});
    }
  }
  return {show,clear};
}
