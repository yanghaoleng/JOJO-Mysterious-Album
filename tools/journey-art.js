// Fictional journeys: playful 3D collage compositions, never fabricated gameplay screenshots.
import * as THREE from '../vendor/three.module.js';
import {createCharacter} from '../dev/models.js';
import {createWowCharacter} from '../dev/wow-visuals.js';
import {createStorybookStyle} from '../dev/storybook.js';
export function createJourneyArt(container,theme,step=null){
  const scene=new THREE.Scene(),renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(1200,900);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;container.append(renderer.domElement);
  const camera=new THREE.OrthographicCamera(-5.8,5.8,4.35,-4.35,.1,80);camera.position.set(0,1.8,16);camera.lookAt(0,1,0);
  scene.add(new THREE.HemisphereLight('#fff8e7','#aca8ba',2.7));const sun=new THREE.DirectionalLight('#fff0d9',3.2);sun.position.set(-6,10,9);scene.add(sun);const rim=new THREE.DirectionalLight('#d8eeef',1.4);rim.position.set(6,3,-3);scene.add(rim);
  const world=new THREE.Group();scene.add(world);const style=createStorybookStyle();
  const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.8,userData:{handcraftedSurface:'paint'}});
  function part(geometry,color,pos=[0,0,0],scale=[1,1,1],parent=world){const mesh=new THREE.Mesh(geometry,mat(color));mesh.position.set(...pos);mesh.scale.set(...scale);parent.add(mesh);return mesh;}
  const ball=(color,pos,scale,parent)=>part(new THREE.SphereGeometry(1,28,20),color,pos,scale,parent);
  function group(x,y,z,rotation=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.z=rotation;world.add(g);return g;}
  function friend(type,x,y,z,size,rotation){const a=type==='gugu'?createWowCharacter({kind:'gugu',scale:size}):createCharacter({type,scale:size});const frame=group(x,y,z,rotation);frame.add(a.group);a.group.rotation.y=-.12;a.setAction('wave');a.update(.8,0);return frame;}
  function star(x,y,z,size,rotation=0){const shape=new THREE.Shape();for(let i=0;i<10;i++){const r=i%2?.44:1,a=Math.PI/2+i*Math.PI/5;i?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();const m=part(new THREE.ExtrudeGeometry(shape,{depth:.15,bevelEnabled:true,bevelThickness:.08,bevelSize:.08,bevelSegments:3}), '#eac67a',[x,y,z],[size,size,size]);m.rotation.z=rotation;return m;}
  function lollipop(x,y,z,size,color,angle){const g=group(x,y,z,angle);g.scale.setScalar(size);part(new THREE.CylinderGeometry(.055,.055,2.8,12),'#fdf0d9',[0,-.8,0],[1,1,1],g);ball(color,[0,.65,0],[1,1,.27],g);const points=[];for(let i=0;i<150;i++){const t=i/149,a=t*Math.PI*5;points.push(new THREE.Vector3(Math.cos(a)*(.06+t*.79),.65+Math.sin(a)*(.06+t*.79),.265));}part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),150,.055,8,false),'#fff3d8',[0,0,0],[1,1,1],g);return g;}
  if(theme==='candy'){
    lollipop(-.85,1.1,.3,1.3,'#e79691',-.24);
    if(step!==0)lollipop(3.8,3,-1,.63,'#a9c9b2',.38);
    if(step!==0)lollipop(-4,-.85,-.6,.54,'#d9b571',.3);
    if(step>0)for(let i=0;i<(step===1?3:6);i++)lollipop(-3+i*1.2,-1.4+(i%2)*.2,-1.5,.35,['#e79691','#a9c9b2','#eee2c9'][step===1?0:i%3],-.2+i*.09);
    friend('rabbit',-3.9,1.15,.9,.82,-.22);
    friend('gugu',1.3,-2,1,.97,.2);
    friend('frog',1.3,2.25,-.8,.56,-.24);
    star(-3.2,3.75,0,.32,.2);star(4,-1,0,.4,-.2);star(.4,4.1,-.5,.2);
    for(const [x,y,c]of[[-2,-2.5,'#b6cbb7'],[4,1,'#e9b297'],[.6,-1.1,'#e9c786']])ball(c,[x,y,.5],[.15,.15,.15]);
  }else if(theme==='moon'){
    const rocket=group(.3,.8,.4,-.48);
    part(new THREE.CapsuleGeometry(.7,2.2,10,28),'#f7eedc',[0,.2,0],[1,1,1],rocket);
    part(new THREE.ConeGeometry(.69,1.1,28),'#a4bfbb',[0,2,0],[1,1,1],rocket);
    ball('#688e9c',[0,.6,.66],[.36,.36,.09],rocket);part(new THREE.TorusGeometry(.36,.08,10,32),'#dcbb7b',[0,.6,.71],[1,1,1],rocket);
    for(const x of [-.82,.82]){const fin=part(new THREE.ConeGeometry(.4,1,3),'#cc927d',[x,-.8,0],[1,1,1],rocket);fin.rotation.z=x<0?-.35:.35;}
    const flame=part(new THREE.ConeGeometry(.32,1.1,20),'#e4be79',[0,-1.8,0],[1,1,1],rocket);flame.rotation.z=Math.PI;
    // A complete tiny moon, with the cake parcel perched on its curved north pole.
    ball('#c2c5d8',[3.5,-2.8,-.5],[1.7,1.7,1.7]);
    for(const [x,y,z,s]of[[3.2,-2.3,1,.27],[4.1,-2.9,1,.23],[2.7,-3.3,.9,.18]])ball('#a5abc5',[x,y,z],[s,s*.6,.08]);
    const cake=group(3.2,-.5,.5,.1);cake.visible=step!==0;part(new THREE.CylinderGeometry(.55,.55,.55,28),'#e5bca9',[0,0,0],[1,1,1],cake);part(new THREE.CylinderGeometry(.57,.57,.15,28),'#fff3df',[0,.3,0],[1,1,1],cake);ball('#ce857c',[0,.49,0],[.13,.17,.13],cake);
    if(step===2){const seat=group(3.2,-.9,.2,.1);ball('#a3beb8',[0,-.02,0],[.9,.23,.65],seat);ball('#a3beb8',[0,.5,-.38],[.85,.7,.22],seat);part(new THREE.TorusGeometry(.55,.07,8,32),'#bb8b6b',[0,.25,.28],[1,.75,1],seat);}
    friend('cat',-3.6,-1.7,1,.8,.31);friend('rabbit',2.15,1.2,-.6,.65,-.18);
    star(-3.6,3.1,-1,.44,-.2);star(-1.8,-2.5,0,.23);star(3.65,3.7,0,.24,.3);
  }else{
    // A boat in a little orbit, not an identical tabletop beneath every record.
    const boat=group(-.1,-.8,.4,-.16);
    const hull=part(new THREE.SphereGeometry(1,24,16,0,Math.PI*2,Math.PI/2,Math.PI/2),'#c7956c',[0,0,0],[1.7,.7,.8],boat);
    part(new THREE.CylinderGeometry(.06,.06,2.6,12),'#ac805d',[.1,1.1,0],[1,1,1],boat);
    const sail=new THREE.Shape();sail.moveTo(.2,.1);sail.lineTo(.2,2.4);sail.lineTo(1.6,.35);sail.closePath();part(new THREE.ExtrudeGeometry(sail,{depth:.08,bevelEnabled:true,bevelSize:.05,bevelThickness:.04,bevelSegments:2}),'#f8e8bc',[0,0,0],[1,1,1],boat);
    friend('owl',-3.25,.8,.8,1,.16);friend('rabbit',2.2,-1.7,1,.92,-.21);
    const question=group(2.8,2.6,0,-.2);question.visible=step===null;const arc=part(new THREE.TorusGeometry(.5,.12,12,32,Math.PI*1.55),'#9abfb9',[0,0,0],[1,1,1],question);arc.rotation.z=-.45;ball('#9abfb9',[.08,-.95,0],[.13,.13,.13],question);
    if(step===0){const helm=group(2.8,2.6,0,.2);part(new THREE.TorusGeometry(.62,.1,10,32),'#b4875f',[0,0,0],[1,1,1],helm);for(let i=0;i<6;i++){const spoke=part(new THREE.CylinderGeometry(.05,.05,1.7,8),'#b4875f',[0,0,0],[1,1,1],helm);spoke.rotation.z=i*Math.PI/3;}}
    if(step===1){const scope=group(2.9,2.5,0,-.5);const body=part(new THREE.CylinderGeometry(.25,.32,1.7,20),'#b4c8bf',[0,0,0],[1,1,1],scope);part(new THREE.CylinderGeometry(.31,.31,.16,20),'#e7c488',[0,.86,0],[1,1,1],scope);ball('#92c2c6',[0,.96,0],[.26,.06,.26],scope);}
    if(step===2){ball('#c5b1bd',[2.7,3,0],[.64,.64,.64]);ball('#acc4b7',[-.6,3.2,-.3],[.5,.5,.5]);for(let i=0;i<6;i++)ball('#e7c989',[-.05+i*.36,2.8+Math.sin(i*.5)*.3,.2],[.065,.065,.065]);}
    star(-3.3,-1.7,0,.3,.25);star(.1,3.5,-.8,.28,-.1);
    ball('#b1c8c6',[-4.9,-3.3,-1],[1.65,1.65,1.65]);
  }
  style.apply(world);renderer.render(scene,camera);
  return {renderer};
}
