import { details } from '../model-details.js';
// Authored expansion miniature; all geometry and materials belong to this instance.
export function build(k) {
  const d=details(k),g=d.pivot();
  const G='#8ab68c',P='#d89db8',T='#87644c',W='#f3efe4',I='#3e454b';
  const sphere=(c,p,s)=>d.ball(c,p,s,g),box=(c,p,s)=>d.box(c,p,s,g),cone=(c,p,s)=>k.part('cone',c,p,s,g);
  const rod=(a,b,r,c)=>{const m=k.beam(a,b,r,c);g.attach(m);return m;};
  const eyes=(y,z,x)=>{for(const side of [-1,1])sphere(I,[side*x,y,z],[.032,.04,.025]);};
  const tube=(points,color,r)=>{const geo=new k.THREE.TubeGeometry(new k.THREE.CatmullRomCurve3(points.map(p=>new k.THREE.Vector3(...p))),24,r,8,false);k.shapes.set('expansion-'+k.shapes.size,geo);const mesh=sphere(color,[0,0,0],[1,1,1]);mesh.geometry=geo;return mesh;};
sphere(G,[0,.42,0],[.54,.32,.64]);sphere('#c3d886',[0,.51,-.03],[.46,.3,.54]);
for(const z of [-.28,0,.28])for(const x of [-.23,.23])sphere('#749b66',[x,.74-Math.abs(z)*.3,z],[.16,.045,.14]);
sphere(G,[0,.44,.73],[.23,.23,.25]);eyes(.49,.94,.09);
for(const x of [-.48,.48])for(const z of [-.35,.35]){const m=sphere(G,[x,.17,z],[.24,.075,.19]);m.rotation.y=Math.sign(x*z)*.4;}
cone(G,[0,.27,-.76],[.11,.3,.1]).rotation.x=-Math.PI/2;  k.moving(g,'sway',.055,2);
}
