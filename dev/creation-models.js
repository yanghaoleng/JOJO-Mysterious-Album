import * as THREE from '../vendor/three.module.js';

/** Handcrafted reusable props. All geometry/material ownership stays in this instance. */
export function createCreationModel(kind, color = '#9ab8ba') {
  const group = new THREE.Group(); group.name = `creation-${kind}`;
  const shapes = new Map(), materials = new Map(), movers = [];
  const cream = '#f1e3c4', wood = '#a98c69', gold = '#e8c56e', ink = '#51636b';
  function part(type, tint, p, s, parent = group) {
    if (!shapes.has(type)) shapes.set(type, type === 'box' ? new THREE.BoxGeometry(1, 1, 1) : type === 'ring' ? new THREE.TorusGeometry(1, .09, 8, 32) : type === 'cone' ? new THREE.ConeGeometry(1, 1, 12) : type === 'cylinder' ? new THREE.CylinderGeometry(1, 1, 1, 16) : type === 'star' ? new THREE.OctahedronGeometry(1) : new THREE.SphereGeometry(1, 16, 12));
    if (!materials.has(tint)) materials.set(tint, new THREE.MeshStandardMaterial({ color: tint, roughness: .86, userData: { handcraftedSurface: 'paint' } }));
    const mesh = new THREE.Mesh(shapes.get(type), materials.get(tint)); mesh.position.set(...p); mesh.scale.set(...s); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function moving(object, mode, amount = .25, rate = 2) { movers.push({ object, mode, amount, rate, rest: object.position.clone(), rotation: object.rotation.clone(), scale: object.scale.clone() }); return object; }
  const pedestal = () => part('cylinder', cream, [0,.10,0], [1.05,.20,.85]);
  const star = (p, s = .14) => moving(part('star', gold, p, [s,s,s]), 'bounce', .15);
  const beam = (a, b, radius, tint = wood) => { const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b); const mesh = part('cylinder', tint, start.clone().add(end).multiplyScalar(.5).toArray(), [radius,start.distanceTo(end),radius]); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), end.sub(start).normalize()); return mesh; };
  const table = () => { part('box', wood, [0,.8,0], [1.7,.13,1]); for(const x of [-.65,.65]) for(const z of [-.35,.35]) part('box', wood, [x,.4,z], [.10,.8,.10]); };
  if (kind === 'bridge') {
    for(let i=0;i<9;i++) { const x=(i-4)*.26,y=.25+Math.sin(i/8*Math.PI)*.3; moving(part('box', i%2 ? color : cream,[x,y,0],[.24,.12,.9]),'bounce',.035,2+i*.25); }
    for(const z of [-.5,.5]) { for(const x of [-1.05,0,1.05]) beam([x,.15,z],[x,1,z],.045); beam([-1.05,.85,z],[1.05,.85,z],.035,gold); }
  } else if (kind === 'tree') {
    part('cylinder',wood,[0,.65,0],[.16,1.3,.16]);part('ball','#abc094',[0,.05,0],[.75,.10,.6]);
    const crown=new THREE.Group();crown.position.y=1.25;group.add(crown);
    for(let i=0;i<5;i++){const a=i*Math.PI*.4,x=Math.cos(a)*.45,z=Math.sin(a)*.35;part('ball',color,[x,.15+(i%2)*.28,z],[.48,.48,.42],crown);moving(part('star',gold,[x,.1,z+.35],[.13,.16,.13],crown),'bounce',.1,2+i*.3);}
    moving(crown,'sway',.08,1.5);
  } else if (kind === 'garden') {
    part('cylinder', '#aab98c', [0,.1,0],[1,.2,.75]);
    for(let i=0;i<5;i++){ const x=Math.sin(i*2.4)*.7,z=Math.cos(i*2.4)*.45,y=.6+(i%2)*.3; beam([x,.1,z],[x,y,z],.035,'#78946c'); const flower=new THREE.Group(); flower.position.set(x,y,z);group.add(flower);for(let j=0;j<5;j++)part('ball',i%2?color:'#e4b7ae',[Math.cos(j*1.256)*.19,0,Math.sin(j*1.256)*.19],[.16,.09,.16],flower);part('star',gold,[0,.06,0],[.09,.10,.09],flower);moving(flower,'bounce',.18,2+i*.2); }
  } else if (kind === 'house') {
    part('box',cream,[0,.65,0],[1.55,1.3,1.25]);part('cone',color,[0,1.6,0],[1.25,.8,1.1]).rotation.y=Math.PI/4;
    const hinge=new THREE.Group();hinge.position.set(-.25,.05,.64);group.add(hinge);part('box',wood,[.25,.43,0],[.5,.86,.08],hinge);part('ball',gold,[.4,.42,.06],[.04,.04,.04],hinge);moving(hinge,'door',1,1);
    for(const x of [-.53,.53])part('box',gold,[x,.85,.65],[.3,.36,.035]);star([0,2.13,0]);
  } else if (kind === 'telescope') {
    for(const x of [-.55,.55])beam([x,0,.25],[0,.8,0],.05);beam([0,0,-.5],[0,.8,0],.05);
    const swivel=new THREE.Group();swivel.position.y=1;group.add(swivel);const tube=part('cylinder',color,[0,0,0],[.22,1.2,.22],swivel);tube.rotation.x=Math.PI/2-.3;part('ring',gold,[0,.15,.57],[.23,.23,.23],swivel);moving(swivel,'turn',.7,1);star([.7,1.45,0]);
  } else if (kind === 'robot') {
    for(const x of [-.23,.23]) { part('box',ink,[x,.18,0],[.28,.35,.36]); const arm=part('box',color,[x*2.1,.9,0],[.16,.65,.18]);moving(arm,'sway',.3); }
    part('box',color,[0,.7,0],[.68,.75,.42]);part('box',cream,[0,1.35,0],[.8,.55,.5]);for(const x of [-.19,.19])part('ball',ink,[x,1.38,.26],[.06,.07,.025]);beam([0,1.6,0],[0,1.83,0],.025);star([0,1.84,0],.09);part('ring',gold,[0,.78,.24],[.15,.15,.10]);
  } else if (kind === 'boat') {
    const hull=part('ball',color,[0,.4,0],[1,.35,.55]); moving(hull,'sway',.06);part('box',cream,[0,.63,0],[1.4,.09,.75]);beam([0,.6,0],[0,1.75,0],.04);const sail=part('cone',cream,[.25,1.2,0],[.6,.8,.04]);sail.rotation.z=-.2;
    for(const x of [-1,1]){const paddle=part('box',wood,[x*.7,.5,.2],[.12,1,.06]);paddle.rotation.z=x*.8;moving(paddle,'sway',.35);}
    for(let i=0;i<3;i++)moving(part('ball','#bddfe0',[(i-1)*.4,.2,.7],[.10,.10,.10]),'bounce',.4,2+i);
  } else if (kind === 'rocket') {
    pedestal();const body=new THREE.Group();group.add(body);part('cylinder',cream,[0,1.05,0],[.38,1.35,.38],body);part('cone',color,[0,1.95,0],[.39,.55,.39],body);part('ring',gold,[0,1.22,.38],[.18,.18,.12],body);part('ball','#96c9d4',[0,1.22,.37],[.14,.14,.06],body);for(const x of [-.5,.5])part('cone',color,[x,.5,0],[.25,.55,.2],body);part('cone',gold,[0,.28,0],[.24,.5,.24],body).rotation.z=Math.PI;moving(body,'bounce',.25);
  } else if (kind === 'portal') {
    pedestal();const ring=part('ring',color,[0,1.1,0],[.85,.95,.7]);moving(ring,'spin',1);for(let i=0;i<8;i++)star([Math.sin(i*Math.PI/4)*.74,1.1+Math.cos(i*Math.PI/4)*.83,0],.08);
  } else if (kind === 'balloon') {
    const balloon=new THREE.Group();group.add(balloon);part('ball',color,[0,1.6,0],[.68,.8,.65],balloon);part('box',wood,[0,.3,0],[.55,.35,.5],balloon);for(const x of [-.24,.24])part('cylinder',cream,[x,.65,0],[.018,.65,.018],balloon);moving(balloon,'bounce',.18,1.5);
  } else if (kind === 'windmill') {
    part('cone',cream,[0,.8,0],[.5,1.6,.5]);const rotor=new THREE.Group();rotor.position.set(0,1.3,.4);group.add(rotor);for(let i=0;i<4;i++){const blade=part('box',i%2?gold:color,[Math.sin(i*Math.PI/2)*.45,Math.cos(i*Math.PI/2)*.45,0],[.18,.9,.06],rotor);blade.rotation.z=-i*Math.PI/2;}part('ball',wood,[0,0,.05],[.12,.12,.08],rotor);moving(rotor,'spin',1.8);
  } else if (kind === 'fountain') {
    part('cylinder',cream,[0,.18,0],[.85,.36,.85]);part('cylinder','#98c9d2',[0,.37,0],[.73,.025,.73]);for(let i=0;i<7;i++)moving(part('ball',i%2?color:'#c8e3e1',[(i%3-1)*.3,.55,Math.sin(i*2)*.25],[.12,.12,.12]),'bounce',.65,2+i*.35);
  } else if (kind === 'music') {
    table();for(let i=0;i<8;i++)moving(part('box',i%2?color:cream,[(i-3.5)*.18,.91,.1],[.16,.1,.65]),'bounce',.08,2+i*.4);for(let i=0;i<3;i++)star([(i-1)*.55,1.35,-.2],.11);
  } else if (kind === 'bakery') {
    table();part('cylinder',wood,[0,.98,0],[.5,.24,.5]);const lid=part('cone',cream,[0,1.22,0],[.52,.24,.52]);moving(lid,'bounce',.4,1.3);for(let i=0;i<3;i++)part('ball',cream,[(i-1)*.23,1.16,0],[.17,.13,.15]);for(let i=0;i<3;i++)moving(part('ball','#e8e8dc',[(i-1)*.2,1.5,0],[.09,.09,.09]),'bounce',.3,1+i*.5);
  } else if (kind === 'swing') {
    for(const x of [-.8,.8])beam([x,0,0],[x,1.9,0],.06);beam([-.9,1.9,0],[.9,1.9,0],.07);const seat=new THREE.Group();seat.position.y=1.8;group.add(seat);for(const x of [-.3,.3])part('cylinder',cream,[x,-.65,0],[.02,1.3,.02],seat);part('box',color,[0,-1.3,0],[.8,.1,.4],seat);moving(seat,'swing',.32);
  } else if (kind === 'lantern') {
    pedestal();part('cylinder',color,[0,.75,0],[.24,1.4,.24]);part('ball',gold,[0,1.5,0],[.4,.45,.4]);moving(part('cone',cream,[0,1.97,0],[.55,.3,.55]),'bounce',.25);for(let i=0;i<3;i++)star([Math.sin(i*2.1)*.65,1.5,Math.cos(i*2.1)*.65],.1);
  } else if (kind === 'stage') {
    part('cylinder',wood,[0,.15,0],[1.1,.3,.85]);for(const x of [-.85,.85]){beam([x,.2,-.45],[x,1.8,-.45],.05);const curtain=part('box',color,[x*.7,1,-.45],[.55,1.6,.12]);moving(curtain,'slide',x*.23);}beam([-.9,1.85,-.45],[.9,1.85,-.45],.08);star([0,2,-.45],.19);
  } else if (kind === 'ladder') {
    for(const x of [-.4,.4])beam([x,0,0],[x,1.9,-.25],.05);for(let i=0;i<7;i++)moving(part('box',i%2?color:gold,[0,.2+i*.25,-i*.035],[.9,.08,.12]),'bounce',.025,2+i*.2);const flag=part('box',color,[.63,2.05,-.25],[.45,.28,.035]);moving(flag,'sway',.15);beam([.4,1.8,-.25],[.4,2.3,-.25],.025);
  } else if (kind === 'camera') {
    table();part('box',color,[0,1.15,0],[.8,.55,.4]);part('ring',ink,[0,1.17,.28],[.23,.23,.18]);part('ball','#a9d4da',[0,1.17,.27],[.16,.16,.10]);const photo=part('box',cream,[.6,1.02,.1],[.4,.45,.025]);moving(photo,'bounce',.35);part('star',gold,[.6,1.03,.13],[.13,.13,.02]);
  } else {
    pedestal();for(let i=0;i<6;i++)moving(part(i%2?'box':'ball',[color,gold,cream][i%3],[Math.sin(i*2)*.4,.3+i*.19,Math.cos(i*2)*.25],[.27,.24,.25]),'bounce',.05,2+i*.2);star([0,1.6,0]);
  }
  let age = 100, time = 0;
  return { group, kind, trigger() { age = 0; }, update(dt, reduced = false, working = false) {
    age += dt; time += dt; const strength = age < 4 ? Math.sin(Math.min(1,age/.3)*Math.PI/2) * Math.min(1,(4-age)/.5) : working ? .25 : .06;
    for(const material of materials.values()){material.emissive.set('#e8c56e');material.emissiveIntensity=age<4?strength*.18:0;}
    for(const m of movers){ const wave=Math.sin(time*m.rate)*strength*(reduced?.15:1);m.object.position.copy(m.rest);m.object.rotation.copy(m.rotation);
      if(m.mode==='bounce')m.object.position.y+=Math.abs(wave)*m.amount;
      if(m.mode==='sway')m.object.rotation.z+=wave*m.amount;
      if(m.mode==='swing')m.object.rotation.x+=wave*m.amount;
      if(m.mode==='turn'||m.mode==='door')m.object.rotation.y+=wave*m.amount;
      if(m.mode==='spin')m.object.rotation.z+=(reduced?0:time)*m.amount*(working||age<4?1:.06);
      if(m.mode==='slide')m.object.position.x+=Math.abs(wave)*m.amount;
    }
  }, dispose(){group.removeFromParent();shapes.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());} };
}
