// Independent first-light prefab; resource ownership and cleanup are provided by the toolkit.
export function build({THREE,group,part,moving}) {
  group.userData.suspended=true;
  ['#ffcf75','#83d6da','#eca2c6'].forEach((color,i)=>{
    const fish=new THREE.Group();fish.position.set((i-1)*1.05,3.0+Math.sin(i*2)*.28,.05);group.add(fish);
    part('ball',color,[0,0,0],[.43,.24,.18],fish);
    const tail=part('cone',color,[-.48,0,0],[.24,.32,.12],fish);tail.rotation.z=-Math.PI/2;
    part('ball','#fff9ed',[.2,.07,.15],[.10,.10,.04],fish);part('ball','#344758',[.22,.07,.188],[.045,.055,.022],fish);
    const fin=part('cone',color,[0,.25,0],[.14,.18,.10],fish);fin.rotation.z=.25;
    moving(fish,'slide',.48,1.0+i*.25);moving(tail,'swing',.7,4);
  });
}
