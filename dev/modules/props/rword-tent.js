import { details } from '../model-details.js';
// Authored expansion miniature; all geometry and materials belong to this instance.
export function build(k) {
  const d=details(k),g=d.pivot();
  const G='#8ab68c',P='#d89db8',T='#87644c',W='#f3efe4',I='#3e454b';
  const sphere=(c,p,s)=>d.ball(c,p,s,g),box=(c,p,s)=>d.box(c,p,s,g),cone=(c,p,s)=>k.part('cone',c,p,s,g);
  const rod=(a,b,r,c)=>{const m=k.beam(a,b,r,c);g.attach(m);return m;};
  const eyes=(y,z,x)=>{for(const side of [-1,1])sphere(I,[side*x,y,z],[.032,.04,.025]);};
  const tube=(points,color,r)=>{const geo=new k.THREE.TubeGeometry(new k.THREE.CatmullRomCurve3(points.map(p=>new k.THREE.Vector3(...p))),24,r,8,false);k.shapes.set('expansion-'+k.shapes.size,geo);const mesh=sphere(color,[0,0,0],[1,1,1]);mesh.geometry=geo;return mesh;};
// Two sloped fabric panels and an open front keep the entrance visibly hollow.
for(const side of [-1,1]){const m=box(side<0?'#de886b':'#efb28a',[side*.36,.63,0],[.085,1.45,1.25]);m.rotation.z=side*.55;}
d.panel([[-.72,.04],[.72,.04],[0,1.25]],.055,'#c47b64',[0,0,-.63],g);
box('#d6bea0',[0,.035,0],[1.45,.07,1.3]);
for(const z of [-.72,.72]){rod([-.78,.04,z],[0,1.36,z],.035,T);rod([0,1.36,z],[.78,.04,z],.035,T);}rod([0,1.36,-.76],[0,1.36,.76],.035,T);
for(const side of [-1,1]){rod([side*.54,.39,.55],[side*.98,.06,.83],.012,W);box(T,[side*.98,.06,.83],[.04,.12,.04]);}
  k.moving(g,'sway',.055,2);
}
