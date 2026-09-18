import * as THREE from '../vendor/three.module.js';

// Small original clay sculptures in camera space: the sky spans the whole hero.
export function createLandingSky(stage) {
  const root = new THREE.Group();
  stage.camera.add(root); stage.scene.add(stage.camera);
  const geometries = new Set(), materials = new Set();
  const material = (color, glow = 0) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness: .48, metalness: .12, emissive: color, emissiveIntensity: glow });
    materials.add(value); return value;
  };
  const gold = material('#ffdda0', .4), mint = material('#abd6c6', .12), cream = material('#fff1ce', .18);
  const glass = material('#87c9cd', .22), dark = material('#31565c'), blush = material('#e8b3a5', .2);
  function part(parent, geometry, mat, pos = [0, 0, 0], scale = [1, 1, 1]) {
    geometries.add(geometry); const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(...pos); mesh.scale.set(...scale); parent.add(mesh); return mesh;
  }
  function star(parent, size = 1) {
    const shape = new THREE.Shape();
    for (let n = 0; n < 10; n++) { const a = Math.PI / 2 + n * Math.PI / 5, r = n % 2 ? .43 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r; n ? shape.lineTo(x, y) : shape.moveTo(x, y); }
    shape.closePath();
    const mesh = part(parent, new THREE.ExtrudeGeometry(shape, { depth: .24, bevelEnabled: true, bevelSize: .1, bevelThickness: .1, bevelSegments: 3, steps: 1 }), gold);
    mesh.scale.setScalar(size); return mesh;
  }
  const stars = [[.59,.15,.014],[.92,.32,.02],[.47,.78,.012],[.12,.79,.02],[.84,.08,.009],[.34,.12,.008]].map(([u,v,size],i) => {
    const group = new THREE.Group(); root.add(group); star(group); return { group,u,v,size,delay:.7+i*.17 };
  });
  const dustGeometry = new THREE.SphereGeometry(.018, 6, 4); geometries.add(dustGeometry);
  const dustMaterial = new THREE.MeshBasicMaterial({color:'#fff1d1',transparent:true,opacity:.6}); materials.add(dustMaterial);
  const dust = Array.from({length:28},(_,i)=>{
    const mesh = new THREE.Mesh(dustGeometry,dustMaterial); root.add(mesh);
    return {mesh,u:((i*37+11)%101)/101,v:((i*61+7)%97)/97,delay:.4+i*.025};
  });
  const ufo = new THREE.Group(); root.add(ufo);
  part(ufo,new THREE.SphereGeometry(1,24,12),mint,[0,0,0],[1,.25,.62]);
  part(ufo,new THREE.TorusGeometry(.84,.11,8,32),cream).rotation.x=Math.PI/2;
  part(ufo,new THREE.SphereGeometry(.48,20,12),glass,[0,.29,0],[1,1,.8]);
  part(ufo,new THREE.SphereGeometry(.21,12,10),blush,[0,.32,.39],[1,1,.5]);
  for(const x of [-.075,.075])part(ufo,new THREE.SphereGeometry(.033,8,6),dark,[x,.35,.48]);
  for(let n=0;n<7;n++){const a=n*Math.PI*2/7;part(ufo,new THREE.SphereGeometry(.055,8,6),gold,[Math.cos(a)*.87,-.04,Math.sin(a)*.54]);}
  const comet = new THREE.Group(); root.add(comet); star(comet,.22);
  for(let i=0;i<3;i++){
    const tail=part(comet,new THREE.ConeGeometry(.055,1.8-i*.35,8),i===1?mint:cream,[-.9+i*.11,.08-i*.08,-.04]);
    tail.rotation.z=-Math.PI/2;
  }
  const satellite = new THREE.Group(); root.add(satellite);
  part(satellite,new THREE.SphereGeometry(.42,20,14),blush);
  const ring=part(satellite,new THREE.TorusGeometry(.68,.06,8,40),cream);ring.rotation.set(1,.25,-.35);
  let flights=0, lastFlight=-1;
  const smooth=t=>{const x=THREE.MathUtils.clamp(t,0,1);return x*x*(3-2*x);};
  function place(group,u,v,size){
    const c=stage.camera,h=c.top-c.bottom;
    group.position.set(THREE.MathUtils.lerp(c.left,c.right,u),THREE.MathUtils.lerp(c.top,c.bottom,v),-13);
    group.scale.setScalar(h*size);
  }
  return {
    update(time,{reduced=false}={}) {
      const enter=delay=>reduced?1:smooth((time-delay)/1.1);
      stars.forEach(({group,u,v,size,delay},i)=>{place(group,u+Math.sin(time*.22+i)*.008,v+Math.sin(time*.6+i)*.012,size*enter(delay));group.rotation.set(.14,Math.sin(time*.35+i)*.36,Math.sin(time*.25+i)*.22);});
      dust.forEach(({mesh,u,v,delay},i)=>{place(mesh,u,v+Math.sin(time*.3+i)*.003,.07*enter(delay));});
      place(satellite,.97,.71,.055*enter(1.2));satellite.rotation.z=Math.sin(time*.22)*.13;
      // A leisurely curious visit, then a much quicker shooting star. Neither flashes.
      const visit=time%16, lap=Math.floor(time/16), mobile=stage.container.clientWidth<768;
      const flight=reduced?.43:THREE.MathUtils.clamp((visit-2)/8.5,0,1);
      ufo.visible=reduced||(visit>=2&&visit<10.5);
      place(ufo,1.17-flight*1.35,(mobile?.48:.19)+Math.sin(flight*Math.PI*2)*.035,.045*enter(2));
      ufo.rotation.set(.2,Math.sin(time*.7)*.2,-.13+Math.sin(time)*.12);
      const streak=(time+3)%10.7;
      comet.visible=!reduced&&streak>7.4&&streak<9.3;
      const travel=(streak-7.4)/1.9;
      place(comet,1.3-travel*1.6,(mobile?.48:.08)+travel*.2,.035);comet.rotation.z=Math.PI-.23;
      if(ufo.visible&&lap!==lastFlight){lastFlight=lap;flights++;}
    },
    get stats(){return {stars:stars.length,ufo:ufo.visible,comet:comet.visible,flights};},
    dispose(){root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());},
  };
}
