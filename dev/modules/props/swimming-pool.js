export function build({THREE,group,part,shapes}) {
  part('cylinder','#eee6ce',[0,.13,0],[1.5,.22,1.12]);
  const water=part('cylinder','#5abfd8',[0,.255,0],[1.38,.035,1.02]);
  const rim=part('ring','#ece3cf',[0,.3,0],[1.45,1.08,1]);rim.rotation.x=-Math.PI/2;
  const ring=new THREE.TorusGeometry(1,.016,6,48);shapes.set('pool-ripple',ring);
  const rippleMaterial=part('ball','#d5f4f5',[0,.29,0],[.01,.01,.01]).material;
  for(let i=0;i<3;i++){const mesh=new THREE.Mesh(ring,rippleMaterial);mesh.rotation.x=-Math.PI/2;mesh.scale.set(.3+i*.25,(.3+i*.25)*.75,1);mesh.position.y=.283;group.add(mesh);}
}
