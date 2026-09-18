// Five sample journeys share a small, unhurried carousel. Reading always pauses it.
export function createJourneyCarousel(region,dialog){
  const grid=region.querySelector('.journey-grid'),cards=[...grid.querySelectorAll('[data-journey]')];
  const controls=region.querySelector('.journey-controls'),pause=controls.querySelector('[data-journey-pause]');
  const preference=matchMedia('(prefers-reduced-motion: reduce)'),events=new AbortController();
  let start=0,visible=false,paused=false,busy=false,disposed=false,motion=null;
  const count=()=>innerWidth>=1150?3:innerWidth>=760?2:1;
  const reading=()=>region.matches(':hover')||region.contains(document.activeElement)||dialog.open||document.hidden;
  function render(){
    const shown=count();
    cards.forEach((card,index)=>{const slot=(index-start+cards.length)%cards.length;card.hidden=slot>=shown;card.style.order=slot;card.dataset.slot=slot;});
    grid.dataset.start=String(start);grid.dataset.visible=String(shown);
  }
  async function advance(direction=1,automatic=false){
    if(busy||disposed||(automatic&&(paused||preference.matches||!visible||reading())))return;
    busy=true;
    try{
      if(!preference.matches){motion=grid.animate([{opacity:1},{opacity:0,transform:'translateY(5px)'}],{duration:240,fill:'forwards'});await motion.finished;}
      if(disposed||(automatic&&reading()))return;
      start=(start+direction+cards.length)%cards.length;render();
      motion?.cancel();motion=null;
      if(!preference.matches){motion=grid.animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:720,easing:'cubic-bezier(.2,.7,.3,1)'});await motion.finished;}
    }catch{}finally{motion?.cancel();motion=null;busy=false;}
  }
  controls.addEventListener('click',event=>{
    if(event.target.closest('[data-journey-next]'))advance(1);
    if(event.target.closest('[data-journey-prev]'))advance(-1);
    if(event.target.closest('[data-journey-pause]')){
      paused=!paused;pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'继续轮换旅程':'暂停轮换旅程');pause.querySelector('[data-play]').hidden=!paused;pause.querySelector('[data-pause]').hidden=paused;
    }
  },{signal:events.signal});
  window.addEventListener('resize',render,{signal:events.signal});
  preference.addEventListener('change',()=>{motion?.cancel();render();},{signal:events.signal});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{threshold:.15});observer.observe(grid);
  const timer=setInterval(()=>advance(1,true),8000);render();
  return {dispose(){disposed=true;clearInterval(timer);observer.disconnect();events.abort();motion?.cancel();}};
}
