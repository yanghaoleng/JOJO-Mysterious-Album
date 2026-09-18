import * as THREE from '../vendor/three.module.js';
// A small fixed pool: a soft white poof, never a full-screen fog layer.
export function createLandingPuffs(stage){
  const root=new THREE.Group();root.name='hero-white-puffs';stage.scene.add(root);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const context=canvas.getContext('2d'),gradient=context.createRadialGradient(32,32,1,32,32,31);
  gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.35,'rgba(255,255,255,.8)');gradient.addColorStop(.7,'rgba(255,255,255,.25)');gradient.addColorStop(1,'rgba(255,255,255,0)');
  context.fillStyle=gradient;context.fillRect(0,0,64,64);
  const texture=new THREE.CanvasTexture(canvas);
  const particles=Array.from({length:28},()=>{
    const material=new THREE.SpriteMaterial({map:texture,color:'#ffffff',transparent:true,opacity:0,depthWrite:false});
    const mesh=new THREE.Sprite(material);mesh.visible=false;root.add(mesh);
    return {mesh,born:-10,origin:new THREE.Vector3(),velocity:new THREE.Vector3(),size:0};
  });
  let cursor=0,bursts=0;
  function burst(position,time,{size=.3,count=6}={}){
    bursts++;
    for(let i=0;i<count;i++){
      const p=particles[cursor++%particles.length],a=i/count*Math.PI*2+bursts*.7;
      p.born=time;p.size=size*(.72+(i%3)*.16);p.origin.copy(position);
      p.origin.x+=Math.cos(a)*.28;p.origin.y+=.12+(i%2)*.09;p.origin.z+=.4+Math.sin(a)*.12;
      p.velocity.set(Math.cos(a)*.7,.4+(i%3)*.16,Math.sin(a)*.28);
      p.mesh.visible=true;
    }
  }
  return {
    burst,
    update(time,{reduced=false}={}){
      particles.forEach(p=>{
        const age=(time-p.born)/.72;
        p.mesh.visible=!reduced&&age>=0&&age<1;if(!p.mesh.visible)return;
        p.mesh.position.copy(p.origin).addScaledVector(p.velocity,age);
        const size=p.size*(.45+age*1.5);p.mesh.scale.set(size*2,size*1.6,1);
        p.mesh.material.opacity=.22*Math.sin(Math.PI*Math.sqrt(age))*Math.pow(1-age,.6);
      });
    },
    get stats(){return {active:particles.filter(p=>p.mesh.visible).length,bursts};},
    dispose(){root.removeFromParent();texture.dispose();particles.forEach(p=>p.mesh.material.dispose());},
  };
}
