import { details } from '../model-details.js';
// Authored expansion miniature; all geometry and materials belong to this instance.
export function build(k) {
  const d=details(k),g=d.pivot();
  const G='#8ab68c',P='#d89db8',T='#87644c',W='#f3efe4',I='#3e454b';
  const sphere=(c,p,s)=>d.ball(c,p,s,g),box=(c,p,s)=>d.box(c,p,s,g),cone=(c,p,s)=>k.part('cone',c,p,s,g);
  const rod=(a,b,r,c)=>{const m=k.beam(a,b,r,c);g.attach(m);return m;};
  const eyes=(y,z,x)=>{for(const side of [-1,1])sphere(I,[side*x,y,z],[.032,.04,.025]);};
  const tube=(points,color,r)=>{const geo=new k.THREE.TubeGeometry(new k.THREE.CatmullRomCurve3(points.map(p=>new k.THREE.Vector3(...p))),24,r,8,false);k.shapes.set('expansion-'+k.shapes.size,geo);const mesh=sphere(color,[0,0,0],[1,1,1]);mesh.geometry=geo;return mesh;};
sphere('#46535e',[0,.59,0],[.37,.52,.31]);sphere(W,[0,.52,.245],[.28,.36,.075]);sphere('#46535e',[0,1.13,0],[.28,.27,.25]);
for(const x of [-.12,.12])sphere(W,[x,1.12,.2],[.115,.15,.05]);eyes(1.16,.247,.12);
cone('#e7ad61',[0,1.02,.34],[.11,.22,.09]).rotation.x=Math.PI/2;
for(const x of [-.18,.18])sphere('#e7ad61',[x,.075,.13],[.13,.065,.2]);
for(const side of [-1,1]){const pivot=new k.THREE.Group();pivot.position.set(side*.3,.81,0);g.add(pivot);const m=k.part('ball','#46535e',[side*.05,-.21,0],[.1,.31,.14],pivot);m.rotation.z=side*.25;k.moving(pivot,'flap',side*.24,3);}
  k.moving(g,'sway',.055,2);
}
