import { details } from '../model-details.js';
// Authored expansion miniature; all geometry and materials belong to this instance.
export function build(k) {
  const d=details(k),g=d.pivot();
  const G='#8ab68c',P='#d89db8',T='#87644c',W='#f3efe4',I='#3e454b';
  const sphere=(c,p,s)=>d.ball(c,p,s,g),box=(c,p,s)=>d.box(c,p,s,g),cone=(c,p,s)=>k.part('cone',c,p,s,g);
  const rod=(a,b,r,c)=>{const m=k.beam(a,b,r,c);g.attach(m);return m;};
  const eyes=(y,z,x)=>{for(const side of [-1,1])sphere(I,[side*x,y,z],[.032,.04,.025]);};
  const tube=(points,color,r)=>{const geo=new k.THREE.TubeGeometry(new k.THREE.CatmullRomCurve3(points.map(p=>new k.THREE.Vector3(...p))),24,r,8,false);k.shapes.set('expansion-'+k.shapes.size,geo);const mesh=sphere(color,[0,0,0],[1,1,1]);mesh.geometry=geo;return mesh;};
const dome=sphere('#baade7',[0,1.01,0],[.5,.4,.5]);dome.material.transparent=true;dome.material.opacity=.8;
const rim=d.ring('#dcccf5',[0,.87,0],.47,g);rim.rotation.x=Math.PI/2;eyes(1.01,.46,.13);
for(let n=0;n<8;n++){const a=n*Math.PI/4,r=.28,pts=[];for(let j=0;j<7;j++)pts.push([Math.cos(a)*r+Math.sin(j*.9+a)*.07,.84-j*.11,Math.sin(a)*r]);tube(pts,n%2?P:'#b29cd8',.025);}
  k.moving(g,'sway',.055,2);
}
