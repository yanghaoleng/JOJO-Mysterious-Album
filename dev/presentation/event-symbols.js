import * as THREE from '../../vendor/three.module.js';
// Geometry symbols stay legible in WebGL and do not depend on a platform emoji font.
export function createEventSymbol(kind,color='#6d668d') {
  const root=new THREE.Group();root.name=`symbol-${kind}`;
  const materials=[],geometries=[];
  const mat=new THREE.MeshBasicMaterial({color,depthTest:false});materials.push(mat);
  const line=(points)=>{const g=new THREE.CylinderGeometry(.014,.014,1,6);geometries.push(g);for(let i=1;i<points.length;i++){const a=new THREE.Vector3(...points[i-1]),b=new THREE.Vector3(...points[i]),d=b.clone().sub(a);if(!d.length())continue;const mesh=new THREE.Mesh(g,mat);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=d.length();mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());mesh.renderOrder=10;root.add(mesh);}};
  const dot=(x,y,s=.045)=>{const g=new THREE.SphereGeometry(s,10,8);geometries.push(g);const n=new THREE.Mesh(g,mat);n.position.set(x,y,0);root.add(n);};
  if(kind==='note'){dot(-.1,-.12,.075);dot(.14,-.07,.075);line([[-.04,-.12,0],[-.04,.25,0],[.2,.32,0],[.2,-.07,0]]);line([[-.04,.19,0],[.2,.26,0]]);}
  else if(kind==='z'){line([[-.14,.15,0],[.14,.15,0],[-.14,-.13,0],[.14,-.13,0]]);}
  else if(kind==='heart'){const points=[];for(let i=0;i<=40;i++){const t=i/40*Math.PI*2;points.push([.015*16*Math.sin(t)**3,.015*(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)),0]);}line(points);}
  else if(kind==='steam'){for(let x of [-.16,0,.16])line(Array.from({length:16},(_,i)=>[x+Math.sin(i*.6)*.045,i*.027-.2,0]));}
  else if(kind==='check')line([[-.17,0,0],[-.04,-.12,0],[.2,.16,0]]);
  else if(kind==='question'){line([[-.12,.12,0],[-.1,.25,0],[.12,.25,0],[.15,.1,0],[0,-.01,0],[0,-.08,0]]);dot(0,-.2,.025);}
  else if(kind==='alert'){line([[0,.23,0],[0,-.04,0]]);dot(0,-.17,.03);}
  else if(kind==='eyes'){for(let x of [-.14,.14]){const pts=Array.from({length:25},(_,i)=>[x+Math.cos(i/24*Math.PI*2)*.105,Math.sin(i/24*Math.PI*2)*.15,0]);line(pts);dot(x,.01,.04);}}
  else {const pts=[];for(let i=0;i<=8;i++){const a=i*Math.PI/4,r=i%2?.065:.24;pts.push([Math.cos(a)*r,Math.sin(a)*r,0]);}line(pts);}
  root.userData.dispose=()=>{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());};return root;
}
