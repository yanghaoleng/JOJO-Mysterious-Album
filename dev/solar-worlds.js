import * as THREE from '../vendor/three.module.js';
import { createPlanetSurface } from './planet.js';
import { WORLD_ENVIRONMENTS } from './environments.js';

export function createSolarWorld(planet, requestedRadius) {
  const surface=createPlanetSurface(requestedRadius??planet.radius), {radius,center}=surface;
  const group=new THREE.Group(), geometries=[], materials=[];
  const add=(geometry,color,parent=group)=>{
    const material=new THREE.MeshStandardMaterial({color,roughness:.9,userData:{handcraftedSurface:'stone'}});
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;
    geometries.push(geometry);materials.push(material);parent.add(mesh);return mesh;
  };
  const globe=add(new THREE.SphereGeometry(radius,96,64),'#ffffff');globe.position.copy(center);
  globe.userData.planetBody=true;globe.name='complete-planet-sphere';globe.material.vertexColors=true;
  const positions=globe.geometry.attributes.position, colors=[];
  const base=new THREE.Color(planet.color),accent=new THREE.Color(planet.accent),white=new THREE.Color('#ecebdc');
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i)/radius,y=positions.getY(i)/radius,z=positions.getZ(i)/radius;
    const band=(Math.sin(y*39+Math.sin(x*7+z*5)*.45)+1)/2;
    const patch=Math.sin(x*7+z*3)+Math.sin(z*8-y*3)+Math.cos(y*7+x*4);
    const c=base.clone();
    if(planet.id==='earth')c.lerp(accent,patch>.15?1:0).lerp(white,Math.abs(y)>.9?1:Math.max(0,Math.sin(x*21+z*18+y*6)-.82)*2);
    else if(['jupiter','saturn','venus'].includes(planet.id))c.lerp(accent,band*.65);
    else c.lerp(accent,(patch+3)/6*.45);
    if(planet.id==='jupiter' && ((x-.42)**2/.04+(y+.24)**2/.007)<1 && z>.5)c.set('#b97862');
    if(planet.id==='mars'&&Math.abs(y)>.94)c.copy(white);
    colors.push(c.r,c.g,c.b);
  }
  globe.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  if(['mercury','mars'].includes(planet.id))for(let i=0;i<28;i++){
    const y=1-2*(i+.5)/28,a=i*2.399963,normal=new THREE.Vector3(Math.sqrt(1-y*y)*Math.cos(a),y,Math.sqrt(1-y*y)*Math.sin(a));
    const crater=add(new THREE.TorusGeometry(radius*(.025+(i%4)*.006),radius*.003,5,20),planet.accent);
    crater.position.copy(center).addScaledVector(normal,radius*.999);crater.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
  }
  if(planet.id==='saturn'||planet.id==='uranus'){
    const rings=new THREE.Group();rings.position.copy(center);rings.rotation.z=planet.id==='saturn'?.45:1.7;group.add(rings);
    for(let i=0;i<5;i++){
      const ring=add(new THREE.RingGeometry(radius*(1.35+i*.12),radius*(1.44+i*.12),128),i%2?planet.accent:planet.color,rings);
      ring.rotation.x=-Math.PI/2;ring.material.side=THREE.DoubleSide;
    }
  }
  return {id:planet.id,group,planet:{radius,center:center.clone()},...surface,
    atmosphere:WORLD_ENVIRONMENTS[planet.id].atmosphere,tint:planet.tint,tapTargets:[],
    characterSpots:[{x:-1.4,y:.04,z:.4,rotation:.2},{x:0,y:.04,z:.8,rotation:0},{x:1.4,y:.04,z:.4,rotation:-.2}],
    focus:{x:0,y:-1.45,z:0},stats:{radius,meshes:geometries.length,triangles:geometries.reduce((n,g)=>n+(g.index?.count??g.attributes.position.count)/3,0),materials:materials.length,staticBatches:1,secondaryLandmarks:0},
    update(){},react(){},dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.removeFromParent();group.clear();}};
}
