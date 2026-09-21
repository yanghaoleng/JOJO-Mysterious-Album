import * as THREE from '../../vendor/three.module.js';

// Per-eater state and exclusive food claims. Mutations go back through WorldRuntime.
export function createFeedingController({entries, stage, consume}) {
  const jobs=new Map(), claims=new Map();
  let consumed=0;
  const release=job=>{if(job.target && claims.get(job.target)===job.id)claims.delete(job.target);job.target=null;job.age=0;};
  function stop(ids=[...jobs.keys()]) {
    for(const id of ids){const job=jobs.get(id);if(!job)continue;release(job);const item=entries.get(id);if(item){item.action='idle';item.actionUntil=0;item.anchor.position.copy(item.rest);item.anchor.quaternion.copy(item.orientation);}jobs.delete(id);}
  }
  function start(eaters,foods){stop(eaters);for(const id of eaters){const item=entries.get(id);if(item){item.motion=null;jobs.set(id,{id,foods:[...foods],target:null,age:0,phase:'waiting',bites:0,position:[...item.position]});}}}
  function update(dt,time){
    dt=Math.min(.1,Math.max(0,dt));
    for(const [id,job] of jobs){
      const item=entries.get(id);if(!item){stop([id]);continue;}
      if(item.entrance<2)continue;
      if(job.target && !entries.has(job.target))release(job);
      const remaining=job.foods.filter(food=>entries.has(food));
      if(!remaining.length){stop([id]);continue;}
      if(!job.target){
        const available=remaining.filter(food=>!claims.has(food)&&entries.get(food).entrance>=2);
        available.sort((a,b)=>item.rest.distanceToSquared(entries.get(a).rest)-item.rest.distanceToSquared(entries.get(b).rest));
        if(!available.length){job.phase='waiting';continue;}
        job.target=available[0];claims.set(job.target,id);job.age=0;job.bites=0;
      }
      const food=entries.get(job.target), goal=food.position;
      const dx=goal[0]-job.position[0],dz=goal[1]-job.position[1],distance=Math.hypot(dx,dz);
      const reach=Math.max(.18,(item.contactRadius+food.contactRadius)*.65);
      const yaw=Math.atan2(dx,dz);
      if(distance>reach+.005){
        job.phase='walking';const step=Math.min(distance-reach,dt*1.3);
        job.position[0]+=dx/distance*step;job.position[1]+=dz/distance*step;
        item.normal.copy(stage.world.surfaceNormal(...job.position));
        item.rest.copy(stage.world.planet.center).addScaledVector(item.normal,stage.world.planet.radius+.02);
        item.orientation.setFromUnitVectors(new THREE.Vector3(0,1,0),item.normal).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw));
        item.anchor.position.copy(item.rest);item.anchor.quaternion.copy(item.orientation);item.action='walk';item.actionUntil=time+1;
      }else{
        job.phase='eating';job.age+=dt;job.bites=Math.min(2,Math.floor(job.age/.6));
        item.action='talk';item.actionUntil=time+1;
        const pulse=stage.reduced?0:Math.sin((job.age%.6)/.6*Math.PI);
        item.anchor.position.copy(item.rest).addScaledVector(item.normal,pulse*.035);
        item.anchor.quaternion.copy(item.orientation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),pulse*.16));
        if(job.age>=1.2){
          const target=job.target;
          // A successful reducer removal is the only consumption authority.
          const result=consume(id,target,[...job.position]);
          if(result?.ok)consumed++;
          release(job);job.phase='waiting';
          if(!result?.ok)stop([id]);
        }
      }
    }
  }
  return {start,stop,update,clear(){stop();claims.clear();consumed=0;},get stats(){return {consumed,active:jobs.size,claims:[...claims],jobs:[...jobs.values()].map(({id,target,phase,bites})=>({id,target,phase,bites}))};}};
}
