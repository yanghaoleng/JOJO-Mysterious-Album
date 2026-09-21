// Parametric toy-shelf models: variants change silhouettes, counts and fittings.
// All geometry/material ownership remains with the per-instance toolkit.
export function buildCollection(k, recipe) {
  const {part, beam, group, THREE, moving, cream, ink, wood, gold} = k;
  const {family: f, variant: v, seed, category} = recipe;
  const palette = ['#d58c78','#88aaa0','#d6b66c','#91a9c4','#b99eb8'];
  const color = k.color === '#9ab8ba' ? palette[seed % palette.length] : k.color;
  const p = (shape, tint, xyz, size) => part(shape, tint, xyz, size);
  const ball = (tint,x,y,z,r,sy=r,sz=r) => p('ball',tint,[x,y,z],[r,sy,sz]);
  const box = (tint,x,y,z,w,h,d) => p('box',tint,[x,y,z],[w,h,d]);
  const cyl = (tint,x,y,z,r,h,rz=r) => p('cylinder',tint,[x,y,z],[r,h,rz]);
  const wheel = (x,z,r=.23) => { const m=cyl(ink,x,r,z,r,.12); m.rotation.x=Math.PI/2; ball(cream,x,r,z+Math.sign(z)*.07,r*.4,r*.4,.03); };
  const wheels = (length=1.6, pairs=2) => {for(let i=0;i<pairs;i++)for(const z of [-.48,.48])wheel(-length/2+i*length/(pairs-1),z);};
  const leaf = (x,y,z) => {const m=ball('#839b69',x,y,z,.18,.05,.35);m.rotation.z=.4;};
  const plate = () => cyl(cream,0,.06,0,.9,.12);
  const eyes = (y,z,x=.18) => {for(const a of [-x,x])ball(ink,a,y,z,.055);};
  const count = 1+v;
  if (category === '交通工具' || f === 'train') {
    if (['car','van','bus','truck','digger','loader','crane','mixer','tanker','train'].includes(f)) {
      const length = f==='bus'||f==='train'?2.2+v*.12:1.65+v*.1;
      box(color,0,.48,0,length,.35,.86); wheels(length*.7,v===4?3:2);
      if (f==='car') {
        box(cream,.02,.83,0,.85+v*.06,.48,.7);
        box('#7a9caa',.04,.87,.36,.62,.25,.025);
        if(seed===0)cyl(gold,0,1.14,0,.13,.12);
        if(seed===1){ball('#cb7272',-.12,1.14,0,.11);ball('#789aca',.12,1.14,0,.11);}
        if(seed===8){box(ink,-.75,.85,0,.14,.1,1.1);box(color,.45,.7,0,.7,.16,.95);}
        if(v===3)box(wood,0,1.15,0,.65,.12,.55);
      } else if(['van','bus','train'].includes(f)) {
        box(color,0,.9,0,length*.9,.75+(v===3?.25:0),.82);
        for(let i=0;i<3+v;i++)box('#87b3bf',-length*.38+i*length*.76/(2+v),1.03,.425,.18,.26,.02);
        if(recipe.name.includes('双层')&&f==='bus'){box(color,0,1.54,0,length*.88,.48,.8);for(let i=0;i<4;i++)box(cream,-.7+i*.46,1.58,.41,.26,.2,.02);}
        if(f==='train') {cyl(ink,-.62,1.5,0,.12,.4);box(gold,.8,.7,0,.12,.18,.9);}
        if(seed===2){box('#dc7771',0,1.34,0,.42,.1,.12);box('#dc7771',0,1.34,0,.12,.1,.42);}
      } else {
        box(cream,.56,.9,0,.62,.65,.76);box('#87b3bf',.89,1,0,.025,.3,.52);
        if(f==='truck') {
          box(color,-.42,.76,0,.88,.35,.84);
          if(seed===16)box(color,-.42,1.08,0,1.05,.9,.83);
          else {for(const z of [-.39,.39])box(wood,-.4,1,z,.95,.18,.06);}
          if(seed===3)for(let i=0;i<5;i++){beam([-.85+i*.28,1.02,-.22],[-.85+i*.28,1.02,.22],.035,cream);beam([-.9,1.02,-.22],[.45,1.02,-.22],.03,cream);beam([-.9,1.02,.22],[.45,1.02,.22],.03,cream);}
        }
        if(f==='tanker'||f==='mixer') {const tank=cyl(f==='mixer'?color:cream,-.35,1.05,0,.42,1.15); tank.rotation.z=Math.PI/2+(f==='mixer'?.2:0);moving(tank,'turn',.15); }
        if(f==='digger'||f==='crane') {
          beam([-.35,.9,0],[-.9,1.9+v*.1,0],.09,color);
          beam([-.9,1.9+v*.1,0],[-1.45,1.1,0],.07,gold);
          if(f==='digger')box(ink,-1.48,.98,0,.42,.25,.65);
          else {beam([-1.45,1.1,0],[-1.45,.55,0],.025,ink);p('ring',gold,[-1.45,.5,0],[.12,.12,.12]);}
        }
        if(f==='loader'){beam([-.4,.7,-.25],[-1.05,.35,-.25],.06,color);beam([-.4,.7,.25],[-1.05,.35,.25],.06,color);box(ink,-1.16,.28,0,.5,.3,1.05);}
      }
    } else if(f==='bike') {
      for(const x of [-.6,.6]){const m=p('ring',ink,[x,.38,0],[.36,.36,.36]);moving(m,'spin',.8);}
      for(const [a,b] of [[[-.6,.38,0],[0,.85,0]],[[0,.85,0],[.6,.38,0]],[[-.6,.38,0],[.6,.38,0]]])beam(a,b,.045,color);
      box(ink,-.08,.95,0,.35,.07,.24);beam([.6,.38,0],[.46,1.15,0],.04,wood);beam([.46,1.15,-.25],[.46,1.15,.25],.04,ink);
      if(v>=2){box(cream,-.5,.84,0,.35,.2,.3);if(v===3)wheel(-.65,.5,.25);}
    } else if(['boat','ship','sail','sled'].includes(f)) {
      ball(color,0,.3,0,1.1,.3,.48);box(wood,0,.53,0,1.7,.08,.72);
      if(f==='sail'){for(let i=0;i<1+v%3;i++){const x=-.55+i*.55;beam([x,.55,0],[x,1.8,0],.035,wood);p('cone',cream,[x+.2,1.24,0],[.4,.85,.035]);}}
      else if(f==='sled'){for(const z of [-.5,.5])beam([-1,.12,z],[1,.12,z],.055,ink);box(cream,.35,.85,0,.13,.6,.8);}
      else{box(cream,.1,.86,0,.85,.62,.62);for(let i=0;i<count;i++)ball(ink,-.8+i*.32,.47,.45,.07,.07,.02);if(f==='ship'){cyl(ink,-.3,1.35,0,.12,.5);box(color,.1,1.2,0,.6,.16,.65);}}
    } else if(['plane','rotor'].includes(f)) {
      ball(color,0,.7,0,1.05,.3,.32);box(cream,.15,.68,0,.65,.08,2.25);box(color,-.83,.83,0,.35,.45,.1);
      ball('#83afc1',.63,.87,0,.24,.18,.24);
      if(f==='rotor'){const rotor=box(ink,0,1.2,0,2.2,.04,.14);moving(rotor,'turn',3);beam([0,.8,0],[0,1.2,0],.045,ink);}
      if(v===2)box(cream,.1,1.05,0,.7,.07,2.25);
      for(const z of [-.26,.26])wheel(.35,z,.13);
    } else if(f==='rocket') {
      cyl(cream,0,.85,0,.3,1.25);p('cone',color,[0,1.64,0],[.31,.4,.31]);
      for(let i=0;i<3+v;i++){const a=i*Math.PI*2/(3+v);p('cone',color,[Math.cos(a)*.35,.3,Math.sin(a)*.35],[.16,.55,.16]);}
      ball('#8cbbd0',0,1.05,.29,.13,.13,.03);
      if(v===3)for(const x of [-.8,.8])box('#7896b9',x,.9,0,1,.06,.6);
      if(v===4)box(color,0,.5,0,1.8,.1,.8);
    }
  } else if(category==='食物') {
    const fruitColors = {pear:'#bfcb80',orange:'#e9a458',peach:'#e5a396',lemon:'#e6cf68',kiwi:'#ac9974',mango:'#dfb563',tomato:'#d77662'};
    if(['fruit','pineapple','pumpkin'].includes(f)) {
      const fruitKeys={28:'pear',29:'orange',30:'peach',35:'lemon',36:'kiwi',37:'mango',42:'tomato'};
      const tint=fruitColors[fruitKeys[seed]]||color;
      if(v===4)plate();
      const n=v===4?3:1;
      for(let i=0;i<n;i++){const x=n===1?0:(i-1)*.48;ball(tint,x,.48,0,.42,v===2?.32:.48,.4);beam([x,.85,0],[x+.05,1.04,0],.035,wood);leaf(x+.12,.94,0);
        if(recipe.name.includes('切'))cyl(cream,x,.94,0,.33,.025);
        if(f==='pineapple')for(let j=0;j<5;j++){const m=p('cone','#84986a',[x+(j-2)*.09,1.1,0],[.1,.48,.1]);m.rotation.z=(j-2)*.2;}
        if(f==='pumpkin')for(let j=0;j<7;j++){const a=j*Math.PI*2/7;ball('#d9a365',x+Math.cos(a)*.18,.45,Math.sin(a)*.18,.3,.4,.3);}
      }
    } else if(f==='berry') {
      if(v===4)plate();
      for(let i=0;i<Math.min(9,1+v*2);i++){const a=i*2.4,r=.13*Math.sqrt(i);ball(color,Math.cos(a)*r,.24+Math.floor(i/3)*.13,Math.sin(a)*r,.2);leaf(Math.cos(a)*r,.4+Math.floor(i/3)*.13,Math.sin(a)*r);}
    } else if(f==='root'||f==='corn') {
      for(let i=0;i<1+v%3;i++){const x=(i-v%3/2)*.36;p(f==='root'?'cone':'cylinder',f==='root'?'#db9a60':gold,[x,.52,0],[.19,.88,.19]).rotation.z=Math.PI;leaf(x,.99,0);if(f==='corn')for(let j=0;j<6;j++)for(const z of [-.15,.15])ball(gold,x,.18+j*.13,z,.07);}
    } else if(f==='mushroom') {
      for(let i=0;i<1+v%3;i++){const x=(i-v%3/2)*.55;cyl(cream,x,.28,0,.13,.48);ball(color,x,.56,0,.35,.2,.35);}
    } else if(['cookie','chocolate','macaron','pudding','cupcake','bun','dumpling','sushi'].includes(f)) {
      if(v>=3)plate();
      const n=v>=3?3:1;
      for(let i=0;i<n;i++){const x=(i-(n-1)/2)*.55;
        if(f==='chocolate'){box('#856858',x,.2,0,.5,.3,.65);for(let j=0;j<3;j++)box('#a17c63',x,.37,(j-1)*.19,.43,.05,.15);}
        if(f==='cookie'){p(v===1?'box':v===2?'star':'cylinder',gold,[x,.15,0],[.42,.14,.42]);for(let j=0;j<5;j++)ball('#94745d',x+Math.cos(j*1.25)*.24,.24,Math.sin(j*1.25)*.24,.04);if(v===3)cyl(cream,x,.12,0,.4,.06);}
        if(f==='macaron'){ball(color,x,.18,0,.35,.15,.35);cyl(cream,x,.27,0,.32,.09);ball(color,x,.35,0,.35,.12,.35);}
        if(f==='pudding'){p('cone',gold,[x,.35,0],[.4,.6,.4]);cyl('#b5845d',x,.64,0,.2,.07);}
        if(f==='cupcake'){cyl(gold,x,.25,0,.3,.5);for(let j=0;j<3;j++)ball(cream,x,.5+j*.13,0,.32-j*.075,.14,.32-j*.075);ball(v===2?'#886c57':'#ce7972',x,.87,0,.09);}
        if(f==='bun'||f==='dumpling'){ball(cream,x,.28,0,.38,f==='bun'?.3:.2,.3);for(let j=0;j<5;j++)beam([x+(j-2)*.07,.44,-.13],[x+(j-2)*.05,.54,.1],.018,gold);}
        if(f==='sushi'){cyl(ink,x,.24,0,.3,.4);cyl(cream,x,.45,0,.26,.025);ball(v===1?gold:'#9baf7c',x,.47,0,.11,.025,.11);}
      }
    } else if(f==='sandwich'||f==='hotdog') {
      if(f==='sandwich'){for(let j=0;j<3+v%3;j++){box(j%2? '#99aa73':gold,0,.12+j*.13,0,1,.1,.7);}}
      else {ball(gold,0,.3,0,.8,.22,.3);ball('#bc7f67',0,.46,0,.72,.13,.14);for(let i=0;i<4+v;i++)box(gold,-.5+i*.18,.57,0,.06,.035,.18);}
    } else if(f==='bowl') {
      ball(cream,0,.24,0,.65,.25,.65);cyl('#d5ba85',0,.42,0,.56,.06);
      for(let i=0;i<12;i++){const a=i*2.4,r=.13*Math.sqrt(i);ball(i%3?gold:'#97a975',Math.cos(a)*r,.48,Math.sin(a)*r,.09,.035,.07);}
      if(seed===53)for(let i=0;i<4;i++)p('ring',gold,[0,.49+i*.02,0],[.2+i*.075,.02,.2+i*.075]).rotation.x=Math.PI/2;
      beam([-.4,.55,-.7],[.5,.62,.7],.025,wood);beam([-.29,.55,-.7],[.61,.62,.7],.025,wood);
    } else if(f==='cup') {
      cyl(cream,0,.45,0,.37,.9);cyl(color,0,.91,0,.33,.025);beam([.1,.65,0],[.25,1.3,0],.025,gold);
      if(v===2)for(let i=0;i<5;i++)ball(ink,(i-2)*.1,.17,.33,.035);
      if(v===4)p('ring',gold,[.3,1,0],[.2,.2,.06]);
    }
  } else {
    if(f==='ball'){for(let i=0;i<(v===3?2:1);i++){const x=i*.8;ball(color,x,.4,0,.4);for(let j=0;j<6;j++){const a=j*Math.PI/3;ball(cream,x+Math.cos(a)*.34,.4+Math.sin(a)*.34,.14,.09);}}if(v===4){beam([-.6,.1,0],[.6,.1,0],.04,wood);p('ring',wood,[0,.6,.1],[.58,.58,.05]);}}
    else if(['animal','rabbit','elephant','dinosaur','doll'].includes(f)){
      ball(color,0,.55,0,.4,.48,.32);ball(cream,0,1.05,0,.4,.35,.34);eyes(1.1,.31);
      for(const x of [-.24,.24]){ball(color,x,.15,.12,.18,.14,.22);ball(color,x*1.8,.55,0,.14,.24,.14);}
      if(f==='rabbit')for(const x of [-.2,.2])ball(color,x,1.53,0,.12,.42,.12);
      else if(f==='elephant'){for(const x of [-.43,.43])ball(color,x,1.07,0,.22,.3,.08);beam([0,1.02,.3],[0,.68,.54],.09,color);}
      else if(f==='dinosaur'){beam([0,.55,-.2],[0,.35,-.85],.12,color);for(let i=0;i<4;i++)p('cone',gold,[0,.7-i*.1,-.3-i*.12],[.12,.2,.12]);}
      else if(f==='doll'){ball(wood,0,1.29,-.03,.4,.16,.32);if(v%2)for(const x of [-.4,.4])ball(wood,x,1.1,0,.13,.3,.13);if(v===4)p('cone',color,[0,.45,0],[.52,.65,.4]);}
      else for(const x of [-.3,.3])ball(color,x,1.34,0,.15);
      if(v===2)group.scale.setScalar(.72);if(v===3)group.scale.set(1.12,1.2,1.12);
      if(recipe.name.includes('双人')) {const pair=new THREE.Group();for(const child of [...group.children])pair.add(child);pair.position.x=-.5;pair.scale.setScalar(.72);group.add(pair);const other=pair.clone(true);other.position.x=.5;group.add(other);}
    } else if(['castle','house','stack','puzzle','cube','piano'].includes(f)){
      if(f==='castle'){for(let i=0;i<1+v%3;i++){const x=(i-v%3/2)*.7;box(color,x,.55,0,.5,1.1,.5);p('cone',gold,[x,1.28,0],[.39,.4,.39]);}box(cream,0,.35,.25,1.7,.7,.2);}
      if(f==='house'){box(cream,0,.5,0,1.2,1,.9);p('cone',color,[0,1.23,0],[.95,.55,.8]);box(wood,0,.3,.46,.3,.6,.02);for(const x of [-.4,.4])box('#8bafbe',x,.65,.46,.22,.25,.03);if(v>=2)box(color,0,.45,.7,1.4,.08,.5);}
      if(f==='stack'){for(let i=0;i<3+v;i++)box(palette[i%5],0,.15+i*.23,0,1-i*.07,.2,.8-i*.05);}
      if(f==='puzzle'||f==='cube'){const n=2+Math.min(v,3);for(let x=0;x<n;x++)for(let y=0;y<n;y++)box(palette[(x+y)%5],(x-(n-1)/2)*.25,f==='cube'?.14+y*.25:.1,f==='cube'?0:(y-(n-1)/2)*.25,.23,f==='cube'?.23:.13,.23);}
      if(f==='piano'){box(color,0,.55,0,1.4,.9,.65);for(let i=0;i<8+v;i++)box(i%3===1?ink:cream,-.55+i*1.1/(7+v),.6,.4,.085,.08,.35);for(const x of [-.55,.55])box(wood,x,.16,0,.1,.3,.5);}
    } else if(f==='rings'){cyl(wood,0,.07,0,.6,.14);cyl(wood,0,.7,0,.045,1.3);for(let i=0;i<3+v;i++)p('ring',palette[i%5],[0,.2+i*.13,0],[.46-i*.04,.46-i*.04,.46-i*.04]).rotation.x=Math.PI/2;}
    else if(f==='bowling'){for(let i=0;i<1+v;i++){const x=(i-v/2)*.32;cyl(cream,x,.28,0,.12,.4);ball(cream,x,.57,0,.1);cyl(color,x,.48,0,.07,.08);}ball(color,0,.17,.55,.17);}
    else if(f==='pinwheel'){beam([0,0,0],[0,1.3,0],.04,wood);const hub=new THREE.Group();group.add(hub);hub.position.y=1.25;for(let i=0;i<4+v%3;i++){const a=i*Math.PI*2/(4+v%3);const blade=part('cone',palette[i%5],[Math.cos(a)*.25,Math.sin(a)*.25,0],[.18,.4,.04],hub);blade.rotation.z=a-Math.PI/2;}moving(hub,'spin',1.8);}
    else if(f==='rattle'){beam([0,.1,0],[0,.7,0],.08,wood);for(let i=0;i<count;i++){const a=i*2.4;ball(palette[i%5],Math.cos(a)*.25,.88+Math.sin(a)*.2,0,.18);}}
    else if(f==='tambourine'){cyl(cream,0,.18,0,.6,.22);for(let i=0;i<6+v;i++){const a=i*Math.PI*2/(6+v);ball(gold,Math.cos(a)*.6,.2,Math.sin(a)*.6,.09,.04,.09);}}
    else if(f==='guitar'){ball(wood,0,.47,0,.42,.5,.12);box(wood,0,1.13,0,.13,.8,.1);ball(ink,0,.6,.12,.12,.12,.015);for(let i=0;i<4+v%3;i++)beam([(i-2)*.02,.28,.14],[(i-2)*.02,1.5,.08],.006,cream);}
    else if(f==='slide'){box(color,0,.7,0,.9,.1,1.8).rotation.x=.5;for(const x of [-.4,.4])beam([x,0,-.75],[x,1.2,-.75],.04,wood);for(let i=0;i<3+v;i++)beam([-.4,.15+i*.14,-.75],[.4,.15+i*.14,-.75],.035,wood);}
    else if(f==='seesaw'){p('cone',wood,[0,.3,0],[.35,.6,.35]);const b=box(color,0,.63,0,1.6+v*.1,.1,.4);moving(b,'sway',.2);for(const x of [-.65,.65])beam([x,.65,0],[x,.92,0],.04,wood);}
    else if(f==='swing'){for(const x of [-.65,.65])for(const z of [-.4,.4])beam([x,0,z],[x,1.5,0],.04,wood);beam([-.65,1.5,0],[.65,1.5,0],.05,wood);for(const x of [-.25,.25])beam([x,.45,0],[x,1.5,0],.015,ink);moving(box(color,0,.43,0,.65,.08,.4),'swing',.18);}
    else if(f==='bucket'){cyl(color,0,.35,0,.4,.7);p('ring',wood,[0,.85,0],[.38,.38,.38]);if(v>0){beam([.6,.2,0],[.6,1,0],.04,wood);box(gold,.6,.2,0,.3,.3,.08);}}
  }
  // Put the lowest point on the ground without overriding moving child transforms.
  group.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(group);
  if(bounds.isEmpty())throw new Error('Empty collection model: '+recipe.id);
  const pivot=new THREE.Group();
  for(const child of [...group.children])pivot.add(child);
  group.add(pivot);
  pivot.scale.copy(group.scale);
  group.scale.setScalar(1);
  pivot.position.y=-bounds.min.y;
  moving(pivot,category==='交通工具'?'slide':'sway',.08,1.8);
}
