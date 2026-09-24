import { details } from '../model-details.js';
// Authored expansion miniature; all geometry and materials belong to this instance.
export function build(k) {
  const d=details(k),g=d.pivot();
  const G='#8ab68c',P='#d89db8',T='#87644c',W='#f3efe4',I='#3e454b';
  const sphere=(c,p,s)=>d.ball(c,p,s,g),box=(c,p,s)=>d.box(c,p,s,g),cone=(c,p,s)=>k.part('cone',c,p,s,g);
  const rod=(a,b,r,c)=>{const m=k.beam(a,b,r,c);g.attach(m);return m;};
  const eyes=(y,z,x)=>{for(const side of [-1,1])sphere(I,[side*x,y,z],[.032,.04,.025]);};
  const tube=(points,color,r)=>{const geo=new k.THREE.TubeGeometry(new k.THREE.CatmullRomCurve3(points.map(p=>new k.THREE.Vector3(...p))),24,r,8,false);k.shapes.set('expansion-'+k.shapes.size,geo);const mesh=sphere(color,[0,0,0],[1,1,1]);mesh.geometry=geo;return mesh;};
sphere(P,[0,.74,0],[.44,.49,.4]);eyes(.82,.36,.16);
for(let n=0;n<8;n++){const a=n*Math.PI/4,pts=[];for(let j=0;j<6;j++){const r=.24+j*.1,angle=a+j*.11;pts.push([Math.cos(angle)*r,.29-j*.033+Math.max(0,j-3)*.075,Math.sin(angle)*r]);}tube(pts,P,.085);for(let j=1;j<4;j++){const p=pts[j];sphere('#f3c7d1',[p[0],p[1]-.065,p[2]],[.042,.027,.042]);}}
  k.moving(g,'sway',.055,2);
}
