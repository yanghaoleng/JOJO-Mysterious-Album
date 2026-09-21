import * as THREE from '../../vendor/three.module.js';

/** Temporary input affordance. Progress is owned by the caller, never this component. */
export function createStoryTapTarget(stage) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(64,64,4,64,64,64);
  gradient.addColorStop(0,'rgba(255,246,170,.7)'); gradient.addColorStop(.4,'rgba(255,214,90,.4)'); gradient.addColorStop(1,'rgba(255,200,60,0)');
  ctx.fillStyle=gradient; ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const halo=new THREE.Sprite(material); halo.name='story-tap-glow'; halo.visible=false; stage.scene.add(halo);
  const light=new THREE.PointLight('#ffe5a0',0,5,2); stage.scene.add(light);
  let object=null,id=null,enabled=false,burst=0,time=0,onTap=null;
  const center=new THREE.Vector3(),size=new THREE.Vector3(),box=new THREE.Box3();
  return {
    set(target, key, ready, callback) {
      if(id!==key) {burst=0;time=0;}
      object=target;id=key;enabled=!!ready;onTap=callback;
    },
    activate(){if(object)burst=1;},
    update(dt){
      time+=dt;burst=Math.max(0,burst-dt/1.1);
      halo.visible=!!object && !!object.parent && (enabled || burst>0);
      light.visible=halo.visible;
      if(!halo.visible)return;
      object.updateWorldMatrix(true,true);box.setFromObject(object);box.getCenter(center);box.getSize(size);
      halo.position.copy(center);
      const pulse=stage.reduced?.65:.5+.5*Math.sin(time*2.8);
      const diameter=Math.max(size.x,size.y,size.z,.35)*(1.7+burst*.65);
      light.position.copy(stage.camera.position).sub(center).normalize().multiplyScalar(Math.max(size.length()*.6,.5)).add(center);
      light.distance=diameter*2;light.intensity=burst>0?3+burst*5:.7+pulse*.8;
      halo.scale.set(diameter,diameter,1);material.opacity=burst>0?.65+.35*burst:.18+.24*pulse;
    },
    pick(raycaster){
      if(!object || !object.parent)return false;
      box.setFromObject(object);
      const direct=raycaster.intersectObject(object,true)[0];
      const padded=raycaster.ray.intersectBox(box.clone().expandByScalar(.08),new THREE.Vector3());
      const hit=direct || (padded && {distance:raycaster.ray.origin.distanceTo(padded)});
      if(!hit)return false;
      const planet=stage.world?.planet;
      const surface=planet && raycaster.ray.intersectSphere(new THREE.Sphere(planet.center,planet.radius),new THREE.Vector3());
      if(surface && hit.distance>raycaster.ray.origin.distanceTo(surface)+.2)return false;
      // Consume repeat taps during the response without sending a second answer.
      if(enabled){enabled=false;burst=1;onTap?.();}
      return true;
    },
    get stats(){
      const rect=stage.renderer.domElement.getBoundingClientRect();
      const p=center.clone().project(stage.camera);
      return {id,enabled,burst,opacity:material.opacity,visible:halo.visible,x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2};
    },
    dispose(){halo.removeFromParent();light.removeFromParent();light.dispose();material.dispose();texture.dispose();object=null;onTap=null;}
  };
}
