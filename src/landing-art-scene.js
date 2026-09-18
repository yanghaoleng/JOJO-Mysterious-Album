// Landing-page dioramas reuse the actual /dev clay characters. No story state is touched.
import * as THREE from '../vendor/three.module.js';
import { createCharacter } from '../dev/models.js';

export function createLandingScene(container, { theme = 'hero', motion = true } = {}) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.append(renderer.domElement);
  const camera = new THREE.OrthographicCamera(-5.5, 5.5, 4.6, -4.6, .1, 80);
  camera.position.set(8, 6.3, 13); camera.lookAt(0, 1.2, 0);
  scene.add(new THREE.HemisphereLight('#fff7e8', '#9aafa0', 2.6));
  const sun = new THREE.DirectionalLight('#fff4dd', 4.1); sun.position.set(-5, 9, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left:-8, right:8, top:8, bottom:-8 }); sun.shadow.normalBias = .025; scene.add(sun);
  const rim = new THREE.DirectionalLight('#d8e7e1', 1.6); rim.position.set(4, 4, -4); scene.add(rim);
  const world = new THREE.Group(); scene.add(world);
  const mats = new Map();
  const mat = color => { if (!mats.has(color)) mats.set(color, new THREE.MeshStandardMaterial({color,roughness:.73})); return mats.get(color); };
  function mesh(geo,color,pos,scale=[1,1,1],parent=world) { const m = new THREE.Mesh(geo,mat(color)); m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m; }
  const ball = (c,p,s,parent) => mesh(new THREE.SphereGeometry(1,32,20),c,p,s,parent);
  const colors = theme === 'moon' ? ['#bac5c4','#dce1d7'] : theme === 'debate' ? ['#c5baac','#e9dac3'] : ['#b9c9a6','#dbe0b7'];
  ball(colors[0],[0,-.7,0],[4.45,1.1,3.4]);
  ball(colors[1],[0,-.24,0],[4.4,.58,3.35]);
  const actors = [];
  function actor(type,x,z,scale=1) { const a=createCharacter({type,scale});a.group.position.set(x,.21,z);a.group.rotation.y=.3;world.add(a.group);actors.push(a);return a; }
  actor(theme === 'debate' ? 'owl' : 'bear',-1.35,.65,1.07);
  actor('rabbit',1.12,1.25,.92);
  // A tiny path, rounded plants and hand-sized stones make the island tangible.
  for(let i=0;i<6;i++)ball('#f2e6ce',[-.1+i*.27,.29,2.7-i*.43],[.42,.06,.27]);
  for(const [x,z,s] of [[-3.1,.2,.55],[-2.9,-1.7,.75],[2.95,1.15,.5],[3,-1.3,.65]]) {
    mesh(new THREE.CylinderGeometry(.06,.08,.55,8),'#a48c6b',[x,.48,z]);
    ball('#8ea87d',[x,1.03,z],[s,s*1.2,s]);
    ball('#abc091',[x+.25,.88,z+.16],[s*.55,s*.65,s*.55]);
  }
  for(const [x,z] of [[-2.5,1.9],[2.5,2],[3.5,-.3]])ball('#c2bcb0',[x,.27,z],[.33,.18,.25]);
  const rocket=new THREE.Group();rocket.position.set(.7,.9,-1.05);rocket.rotation.z=-.13;world.add(rocket);
  mesh(new THREE.CapsuleGeometry(.55,1.65,8,24),'#f5ebd7',[0,1.15,0],[1,1,1],rocket);
  mesh(new THREE.ConeGeometry(.54,.95,24),'#c57b60',[0,2.7,0],[1,1,1],rocket);
  const windowRim=mesh(new THREE.TorusGeometry(.25,.065,12,32),'#bc9a60',[0,1.6,.51],[1,1,1],rocket);
  ball('#819f9e',[0,1.6,.52],[.23,.23,.055],rocket);
  for(const x of [-.65,.65]) {const fin=mesh(new THREE.ConeGeometry(.3,.85,3),'#c57b60',[x,.25,0],[1,1,1],rocket);fin.rotation.z=x<0?-.4:.4;}
  const flame=mesh(new THREE.ConeGeometry(.26,.65,16),'#e6b663',[0,-.34,0],[1,1,1],rocket);flame.rotation.z=Math.PI;
  const sweets=new THREE.Group();world.add(sweets);sweets.visible=false;
  for(let i=0;i<9;i++){
    const x=-3.1+(i%5)*1.42,z=-1.8+Math.floor(i/5)*1.05,h=1.3+(i%3)*.3;
    mesh(new THREE.CylinderGeometry(.035,.035,h,10),'#faf0df',[x,h/2+.25,z],[1,1,1],sweets);
    ball(['#e3ae9b','#e6c77b','#aec4b0'][i%3],[x,h+.25,z],[.37,.4,.13],sweets);
    const ring=mesh(new THREE.TorusGeometry(.21,.035,8,32),'#fff1d4',[x,h+.25,z+.13],[1,1,1],sweets);ring.rotation.z=i;
  }
  if(theme==='debate') {
    rocket.visible=false;
    const arch=mesh(new THREE.TorusGeometry(1.65,.2,12,48,Math.PI),'#b9947f',[0,.3,-1.5]);
    for(const x of [-1.65,1.65])mesh(new THREE.CylinderGeometry(.2,.22,1.2,16),'#b9947f',[x,.8,-1.5]);
    arch.position.y=1.4;
    for(const [x,z] of [[-1.4,.6],[1.1,1.2]])mesh(new THREE.CylinderGeometry(.85,.92,.22,32),'#eee0c8',[x,.24,z]);
  }
  if(theme==='wow') {
    rocket.visible=false;
    mesh(new THREE.BoxGeometry(2.35,2.1,1.8),'#edddc2',[.6,1.2,-1.25]);
    const roof=mesh(new THREE.ConeGeometry(1.92,1.1,4),'#8eab9a',[.6,2.75,-1.25]);roof.rotation.y=Math.PI/4;
    ball('#e8bb68',[.6,1.5,-.31],[.52,.52,.08]);
    mesh(new THREE.TorusGeometry(.55,.08,10,32),'#a8885e',[.6,1.5,-.28]);
    mesh(new THREE.BoxGeometry(.07,1,.09),'#a8885e',[.6,1.5,-.17]);mesh(new THREE.BoxGeometry(1,.07,.09),'#a8885e',[.6,1.5,-.17]);
  }
  const clouds=new THREE.Group();world.add(clouds);
  for(const [x,y,z,s] of [[-3.2,3.6,-2,.65],[3.3,3.5,-1.8,.5]]) {
    for(let i=0;i<3;i++)ball('#faf5e8',[x+(i-1)*s*.6,y+(i===1?s*.2:0),z],[s*.6,s*.4,s*.4],clouds);
  }
  const starShape=new THREE.Shape();
  for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.19:.42;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?starShape.lineTo(x,y):starShape.moveTo(x,y);}starShape.closePath();
  const starGeo=new THREE.ExtrudeGeometry(starShape,{depth:.12,bevelEnabled:true,bevelSize:.055,bevelThickness:.055,bevelSegments:3,steps:1});
  for(const [x,y,z,s] of [[-3.3,2.4,1,1],[2.8,4,-2,.8],[3.8,1.6,.4,.6]])mesh(starGeo,'#dfbc68',[x,y,z],[s,s,s]);
  // Five art directions share one WebGL context and the existing character library.
  const friends = new THREE.Group(), cosmos = new THREE.Group();
  scene.add(friends, cosmos); friends.visible = cosmos.visible = false;
  const floaters = ['bear','rabbit','frog','cat','owl'].map((type,i) => {
    const a=createCharacter({type,scale:i===0?1.1:.72});friends.add(a.group);
    a.group.userData.base=[[-.35,.2,1],[-2.4,1.9,-.3],[2.4,1.7,-.7],[-2.5,-1.2,1.1],[2.1,-1.4,1.5]][i];
    a.group.userData.pickId=i;return a;
  });
  for(let i=0;i<9;i++){const a=i*2.4;mesh(starGeo,'#dfbc68',[Math.sin(a)*3.7,1.2+Math.cos(a)*2.5,-2],[.3,.3,.3],friends);}
  const planets=[];
  for(let i=0;i<3;i++) {
    const planet=new THREE.Group();cosmos.add(planet);planets.push(planet);
    ball(['#b5c6a0','#d8bcaa','#b3c7c9'][i],[0,0,0],[1.2,1.1,1.2],planet);
    const inhabitant=createCharacter({type:['rabbit','bear','frog'][i],scale:.48});
    inhabitant.group.position.set(0,1,0);planet.add(inhabitant.group);actors.push(inhabitant);
    const ring=mesh(new THREE.TorusGeometry(1.6,.035,8,64),'#e2bf79',[0,0,0],[1,1,1],planet);ring.rotation.x=1.05;
    planet.position.set(...[[-2.7,.4,0],[1.9,1.9,-1.5],[1.4,-1.35,1.2]][i]);
  }
  for(let i=0;i<14;i++){const a=i*2.4;mesh(starGeo,'#ddbe7d',[Math.sin(a)*4.2,1.1+Math.cos(a)*3,-2],[.2,.2,.2],cosmos);}
  const relayStage=new THREE.Group();scene.add(relayStage);relayStage.visible=false;
  const relayActors=[];
  for(const [i,pos] of [[-2.8,0,0],[0,2,-1.3],[2.7,-.35,.7]].entries()){
    const pad=new THREE.Group();pad.position.set(...pos);relayStage.add(pad);
    ball(['#c8d4b2','#dcc6aa','#bad0c8'][i],[0,0,0],[1,.25,.8],pad);
    const a=createCharacter({type:['bear','rabbit','frog'][i],scale:.67});a.group.position.y=.16;pad.add(a.group);relayActors.push(a);
  }
  const relayOrbit=mesh(new THREE.TorusGeometry(2.8,.045,10,80),'#d9bf7d',[0,1.15,-.6],[1.35,1,1],relayStage);relayOrbit.rotation.x=.65;
  const baton=new THREE.Group();relayStage.add(baton);
  mesh(starGeo,'#e6b54f',[0,0,0],[1.65,1.65,1.65],baton);
  const relayRocket=rocket.clone();relayRocket.position.set(.35,.2,1.1);relayRocket.scale.setScalar(.45);relayStage.add(relayRocket);
  let visible=true, choice='rocket', disposed=false, concept=0, growth=0, selectedFriend=0, relay=0;
  let pointerX=0, pointerY=0;
  const move=event=>{const r=container.getBoundingClientRect();pointerX=(event.clientX-r.left)/r.width-.5;pointerY=(event.clientY-r.top)/r.height-.5;};
  container.addEventListener('pointermove',move);
  container.addEventListener('pointerleave',()=>{pointerX=pointerY=0;});
  const mainActors=actors.slice(0,2);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){const {width,height}=container.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);const span=width/height>1.35?8.3:10.3;camera.left=-span*width/height/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();render(0);}
  function render(t){
    if(disposed)return;
    const time=motion&&!reduced?t/1000:0;
    for(const a of actors)a.update(time,.016);
    for(const [i,a] of floaters.entries()){
      a.update(time,.016);const [x,y,z]=a.group.userData.base;
      a.group.position.set(x+Math.sin(time*.45+i)*.18,y+Math.sin(time*.8+i)*.24,z);
      a.group.rotation.y=.25+(reduced?0:pointerX*.7)+Math.sin(time*.5+i)*.15;
      const size=i===((selectedFriend+(reduced?0:Math.floor(time/8)))%5)?1.08:.74;a.group.scale.lerp(new THREE.Vector3(size,size,size),.07);
    }
    planets.forEach((p,i)=>{p.rotation.y=Math.sin(time*.25+i)*.2;p.position.y=[.4,1.9,-1.35][i]+Math.sin(time*.7+i)*.15;});
    cosmos.rotation.y=reduced?0:pointerX*.3;cosmos.rotation.x=reduced?0:pointerY*.12;
    if(theme==='hero'){
      rocket.position.y=.9+(choice==='fly'?.8:0)+Math.sin(time)*.12;
      rocket.rotation.z=-.13+Math.sin(time*.7)*.035;
      if(concept===2){const size=.72+growth*.09;world.scale.lerp(new THREE.Vector3(size,size,size),.06);}
      if(concept===4){const beat=reduced?relay:Math.floor(time/5)+relay;const angle=time*.5+relay*2.1;baton.position.set(Math.cos(angle)*3.4,1.5+Math.sin(angle)*1.5,.6);baton.rotation.y=time*.5;relayRocket.position.y=.35+Math.sin(time)*.15;relayActors.forEach((a,i)=>{a.setAction(i===beat%3?'wave':'listen');a.update(time,.016);});}
    }
    world.rotation.y=Math.sin(time*.15)*.045+(concept===2&&!reduced?pointerX*.22:0);
    renderer.render(scene,camera);
  }
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});intersection.observe(container);
  renderer.setAnimationLoop(t=>{if(visible&&!document.hidden)render(t);});
  return {renderer, render,
    setConcept(index){concept=index;world.visible=![1,3,4].includes(index);friends.visible=index===1;cosmos.visible=index===3;relayStage.visible=index===4;world.scale.setScalar(index===2?.72:1);rocket.visible=true;sweets.visible=false;choice='rocket';growth=0;relay=0;render(0);},
    choose(value){
      if(concept===1){selectedFriend=(selectedFriend+(value==='primary'?1:4))%floaters.length;if(value==='primary')floaters[selectedFriend].setAction('wave');else floaters.forEach(a=>a.setAction('hop'));}
      else if(concept===2){growth=value==='primary'?Math.min(3,growth+1):0;sweets.visible=growth>0;rocket.visible=growth>1;}
      else if(concept===3){cosmos.children.forEach((p,i)=>{if(i<3){p.rotation.z+=value==='primary'?.35:-.35;p.scale.setScalar(value==='primary'?1.12:1);}});}
      else if(concept===4){relay++;}
      else {choice=value==='secondary'?'candy':'fly';rocket.visible=choice!=='candy';sweets.visible=choice==='candy';}
      for(const a of mainActors)a.setAction('wave');render(performance.now());
    },dispose(){disposed=true;renderer.setAnimationLoop(null);observer.disconnect();intersection.disconnect();for(const a of [...actors,...floaters,...relayActors])a.dispose();container.removeEventListener('pointermove',move);scene.traverse(o=>{o.geometry?.dispose();});mats.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();}};
}
