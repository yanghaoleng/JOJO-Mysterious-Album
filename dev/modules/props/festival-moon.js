// A ring-free yellow moon with actual shallow depressions in its surface.
export function build({THREE,group,part,moving,shapes}) {
  const root=new THREE.Group();group.add(root);
  const moon=part('ball','#f4cc58',[0,1.05,0],[.82,.82,.82],root);
  const geometry=new THREE.SphereGeometry(1,64,48);
  const centers=[[-.38,.28,1,.22],[.3,-.22,1,.26],[.24,.51,1,.13],[-.5,-.36,.9,.12],[.9,.2,.4,.17],[-.6,.4,-.8,.21],[.35,-.3,-1,.2]].map(([x,y,z,r])=>({normal:new THREE.Vector3(x,y,z).normalize(),radius:r}));
  const positions=geometry.attributes.position,colors=[];
  const normal=new THREE.Vector3(),base=new THREE.Color('#f4cc58'),shadow=new THREE.Color('#b68b36');
  for(let i=0;i<positions.count;i++){
    normal.fromBufferAttribute(positions,i).normalize();let depth=0;
    for(const crater of centers){const distance=normal.distanceTo(crater.normal)/crater.radius;if(distance<1)depth=Math.max(depth,(1-distance*distance)**2);}
    positions.setXYZ(i,normal.x*(1-.09*depth),normal.y*(1-.09*depth),normal.z*(1-.09*depth));
    const color=base.clone().lerp(shadow,depth*.6);colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  shapes.set("moon-craters",geometry);moon.geometry=geometry;moon.material.color.set('#ffffff');moon.material.vertexColors=true;
  moon.material.emissive.set('#a96a1f');moon.material.emissiveIntensity=.12;
  moving(root,'bounce',.06,.8);
}
