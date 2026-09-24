import { details } from '../model-details.js';
// Authored expansion miniature; all geometry and materials belong to this instance.
export function build(k) {
  const d=details(k),g=d.pivot();
  const G='#8ab68c',P='#d89db8',T='#87644c',W='#f3efe4',I='#3e454b';
  const sphere=(c,p,s)=>d.ball(c,p,s,g),box=(c,p,s)=>d.box(c,p,s,g),cone=(c,p,s)=>k.part('cone',c,p,s,g);
  const rod=(a,b,r,c)=>{const m=k.beam(a,b,r,c);g.attach(m);return m;};
  const eyes=(y,z,x)=>{for(const side of [-1,1])sphere(I,[side*x,y,z],[.032,.04,.025]);};
  const tube=(points,color,r)=>{const geo=new k.THREE.TubeGeometry(new k.THREE.CatmullRomCurve3(points.map(p=>new k.THREE.Vector3(...p))),24,r,8,false);k.shapes.set('expansion-'+k.shapes.size,geo);const mesh=sphere(color,[0,0,0],[1,1,1]);mesh.geometry=geo;return mesh;};
sphere('#bd9478',[0,.42,-.14],[.5,.39,.67]);sphere('#bd9478',[0,.82,.35],[.38,.36,.33]);eyes(.91,.64,.16);
for(const side of [-1,1]){sphere('#d9b799',[side*.13,.68,.63],[.18,.12,.1]);sphere('#a98268',[side*.44,.13,.22],[.24,.09,.28]);sphere('#a98268',[side*.19,.15,-.77],[.25,.07,.21]);tube([[side*.16,.65,.69],[side*.17,.43,.73],[side*.14,.22,.77]],W,.045);for(let n=0;n<3;n++)rod([side*.16,.7+n*.02,.73],[side*.36,.66+n*.055,.72],.009,T);}
sphere(I,[0,.79,.7],[.09,.045,.035]);
  k.moving(g,'sway',.055,2);
}
