import { details } from '../model-details.js';
// Authored expansion miniature; all geometry and materials belong to this instance.
export function build(k) {
  const d=details(k),g=d.pivot();
  const G='#8ab68c',P='#d89db8',T='#87644c',W='#f3efe4',I='#3e454b';
  const sphere=(c,p,s)=>d.ball(c,p,s,g),box=(c,p,s)=>d.box(c,p,s,g),cone=(c,p,s)=>k.part('cone',c,p,s,g);
  const rod=(a,b,r,c)=>{const m=k.beam(a,b,r,c);g.attach(m);return m;};
  const eyes=(y,z,x)=>{for(const side of [-1,1])sphere(I,[side*x,y,z],[.032,.04,.025]);};
  const tube=(points,color,r)=>{const geo=new k.THREE.TubeGeometry(new k.THREE.CatmullRomCurve3(points.map(p=>new k.THREE.Vector3(...p))),24,r,8,false);k.shapes.set('expansion-'+k.shapes.size,geo);const mesh=sphere(color,[0,0,0],[1,1,1]);mesh.geometry=geo;return mesh;};
sphere('#9bbbc5',[0,.35,-.12],[.38,.29,.66]);sphere('#9bbbc5',[0,.66,.4],[.28,.29,.27]);eyes(.72,.64,.12);sphere(I,[0,.61,.68],[.07,.045,.03]);
for(const side of [-1,1]){sphere('#7fa5b1',[side*.38,.13,.15],[.24,.065,.25]);sphere('#7fa5b1',[side*.17,.18,-.76],[.22,.055,.24]);for(let n=0;n<3;n++)rod([side*.08,.58+n*.025,.65],[side*.3,.55+n*.05,.65],.008,W);}
  k.moving(g,'sway',.055,2);
}
