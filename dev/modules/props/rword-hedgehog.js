import { details } from '../model-details.js';
// Authored expansion miniature; all geometry and materials belong to this instance.
export function build(k) {
  const d=details(k),g=d.pivot();
  const G='#8ab68c',P='#d89db8',T='#87644c',W='#f3efe4',I='#3e454b';
  const sphere=(c,p,s)=>d.ball(c,p,s,g),box=(c,p,s)=>d.box(c,p,s,g),cone=(c,p,s)=>k.part('cone',c,p,s,g);
  const rod=(a,b,r,c)=>{const m=k.beam(a,b,r,c);g.attach(m);return m;};
  const eyes=(y,z,x)=>{for(const side of [-1,1])sphere(I,[side*x,y,z],[.032,.04,.025]);};
  const tube=(points,color,r)=>{const geo=new k.THREE.TubeGeometry(new k.THREE.CatmullRomCurve3(points.map(p=>new k.THREE.Vector3(...p))),24,r,8,false);k.shapes.set('expansion-'+k.shapes.size,geo);const mesh=sphere(color,[0,0,0],[1,1,1]);mesh.geometry=geo;return mesh;};
sphere('#b39572',[0,.4,0],[.42,.36,.57]);sphere('#e2c5a0',[0,.4,.46],[.3,.25,.28]);sphere(I,[0,.4,.75],[.065,.055,.055]);eyes(.5,.67,.12);
for(const x of [-.27,.27])for(const z of [-.26,.32])sphere('#d5b28e',[x,.08,z],[.1,.08,.12]);
for(let row=0;row<5;row++)for(let n=0;n<7;n++){const a=(n/6)*Math.PI,z=-.4+row*.15,r=.32;const m=cone(T,[Math.cos(a)*r,.4+Math.sin(a)*.29,z],[.09,.27,.085]);m.rotation.z=a-Math.PI/2;}
for(const x of [-.23,.23])sphere('#d5b28e',[x,.62,.35],[.085,.1,.07]);
  k.moving(g,'sway',.055,2);
}
