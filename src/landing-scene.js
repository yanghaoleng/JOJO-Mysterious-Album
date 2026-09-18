// Full-size living worlds, built with the exact renderer, environments and actors used in /dev stories.
import { DioramaStage } from '../dev/stage.js';
import { createWowCharacter } from '../dev/wow-visuals.js';

export function createLandingScene(container, { motion = true } = {}) {
  const stage=new DioramaStage(container);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||!motion;
  const originalResize=stage.resize.bind(stage);
  stage.resize=()=>{stage.zoom=container.clientWidth<600?1.25:1.5;originalResize();};
  const chapters=[
    {world:'bakery',cast:[{id:'hero',name:'鼓鼓',createActor:({scale})=>createWowCharacter({kind:'gugu',scale})}]},
    {world:'meadow',cast:[{id:'hero',name:'小荷',type:'frog'},{id:'friend',name:'雪团',type:'rabbit'}]},
    {world:'observatory',cast:[{id:'hero',name:'咕咕',type:'owl'}],invention:true},
  ];
  let index=-1,elapsed=0,previous=0,visible=true,disposed=false;
  function setWorld(next){
    index=next;const chapter=chapters[next];stage.setScene(chapter.world,chapter.cast);
    stage.yaw=.05;stage.pitch=.14;stage.frameCharacters();
    stage.actors.get('hero')?.setAction('wave');
    if(chapter.invention)stage.showInvention({kind:'rocket',primary:'#91aaa5',accent:'#dcbb7f'});
    stage.space.visible=false;container.dataset.scene=String(next);
  }
  setWorld(0);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(container);
  stage.renderer.domElement.setAttribute('aria-hidden','true');stage.renderer.domElement.removeAttribute('role');
  stage.renderer.domElement.style.pointerEvents='none';
  stage.renderer.setAnimationLoop(now=>{
    const dt=previous?Math.min((now-previous)/1000,.05):0;previous=now;
    if(disposed||!visible||document.hidden)return;
    if(!reduced)elapsed+=dt;
    const next=Math.floor(elapsed/12)%chapters.length,phase=elapsed%12;
    if(next!==index)setWorld(next);
    const opacity=reduced?1:phase<.7?phase/.7:phase>11.3?(12-phase)/.7:1;
    stage.renderer.domElement.style.opacity=String(index===0&&elapsed<.7?1:opacity);
    stage.world?.update(reduced?0:elapsed,dt);
    for(const actor of stage.actors.values()){actor.update(reduced?0:elapsed,dt);actor.surfaceGrounding?.update();}
    if(stage.invention&&!reduced){stage.invention.rotation.y=Math.sin(elapsed*.35)*.2;stage.invention.position.y=stage.invention.userData.restY+Math.sin(elapsed)*.12;}
    stage.yaw=.05+(reduced?0:Math.sin(elapsed*.23)*.07);stage.updateCamera();stage.updateLighting(dt);
    stage.renderer.render(stage.scene,stage.camera);
  });
  return {renderer:stage.renderer,stage,dispose(){disposed=true;observer.disconnect();stage.dispose();}};
}
