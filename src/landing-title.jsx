import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Calligraph} from 'calligraph';
const lines=['故事的下一页，','听孩子的。'];
const total=lines.join('').length;
function Title({target,instant}){
  const [count,setCount]=useState(instant?total:0);
  const [staticText,setStaticText]=useState(instant);
  useEffect(()=>{
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,started=false;
    const finish=()=>{cancelAnimationFrame(frame);setStaticText(true);setCount(total);target.dataset.entrance='complete';window.dispatchEvent(new Event('mengmeng:hero-title-ready'));};
    const start=()=>{
      if(started)return;started=true;
      if(instant||preference.matches){finish();return;}
      let nextAt=performance.now()+140,shown=0;target.dataset.entrance='playing';
      const tick=now=>{if(now>=nextAt){setCount(++shown);nextAt=now+55;}if(shown<total)frame=requestAnimationFrame(tick);else target.dataset.entrance='settling';};
      frame=requestAnimationFrame(tick);
    };
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();start();}});observer.observe(target);
    const change=()=>{if(preference.matches)finish();};preference.addEventListener('change',change);
    return()=>{observer.disconnect();cancelAnimationFrame(frame);preference.removeEventListener('change',change);};
  },[target,instant]);
  let offset=0;
  return lines.map((line,row)=>{
    const first=offset;offset+=line.length;
    return <span className="hero-title-line" aria-hidden="true" key={line}>{Array.from(line).map((letter,index)=><span className={`hero-letter${letter==='。'?' accent-stop':''}`} data-glyph={letter} data-entered={first+index<count} key={index}>
      {staticText?<span>{letter}</span>:<Calligraph onComplete={first+index===total-1?()=>{target.dataset.entrance='complete';window.dispatchEvent(new Event('mengmeng:hero-title-ready'));}:undefined} animation="bouncy" autoSize={false} initial={!instant} drift={{x:0,y:12}} trend={1} aria-hidden="true">{first+index<count?letter:''}</Calligraph>}
    </span>)}</span>;
  });
}
const target=document.getElementById('mode-title');
if(target){
  const instant=matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.setAttribute('aria-label',lines.join(''));target.dataset.textMotion='calligraph';
  const root=createRoot(target);flushSync(()=>root.render(<Title target={target} instant={instant}/>));
  document.documentElement.classList.remove('hero-title-pending');
  addEventListener('pagehide',event=>{if(!event.persisted)root.unmount();},{once:true});
}
