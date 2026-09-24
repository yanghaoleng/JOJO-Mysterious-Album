// Shared geometry helpers for ten independently registered Mid-Autumn props.
export function buildFestivalModel(k,kind){
  const root=new k.THREE.Group();root.name=kind;k.group.add(root);
  const part=(shape,color,p,s,parent=root)=>k.part(shape,color,p,s,parent);
  const ball=(color,p,s,parent=root)=>part('ball',color,p,s,parent);
  const rod=(a,b,r,color)=>{const mesh=k.beam(a,b,r,color);root.add(mesh);return mesh;};
  const gold='#e7bb68',cream='#fff0d1',red='#c5534b',green='#6b9c78',brown='#9d6f4d';
  switch(kind){
    case 'star':{
      const star=part('flag-star',gold,[0,.85,0],[.86,.86,.13]);star.material.emissive.set('#9b6727');star.material.emissiveIntensity=.6;
      for(const x of [-.18,.18])ball('#574d49',[x,.91,.1],[.03,.04,.018]);
      rod([-.09,.72,.11],[.09,.72,.11],.013,'#574d49');
      k.moving(root,'bounce',.1,1.5);break;
    }
    case 'cloud':{
      for(const [x,y,z,s] of [[0,.7,0,.43],[-.39,.62,.04,.32],[.39,.62,.02,.34],[-.14,.96,-.05,.36],[.23,.94,-.08,.32]])
        ball('#e6e7ec',[x,y,z],[s,s*.72,s*.58]);
      for(const [x,y] of [[-.38,.75],[.28,.7]])ball('#f9f3ea',[x,y,.26],[.07,.035,.018]);
      k.moving(root,'sway',.08,1);break;
    }
    case 'osmanthus':{
      rod([0,.05,0],[0,.85,0],.09,brown);
      for(const [a,b] of [[[-.02,.62,0],[-.45,1.04,0]],[[0,.75,0],[.44,1.18,.04]],[[0,.49,0],[.4,.74,.18]]])rod(a,b,.045,brown);
      for(const [x,y,z] of [[-.43,1.05,0],[.44,1.19,.04],[.43,.75,.19],[-.15,.87,.08],[.13,1.04,-.06]]){
        ball(green,[x,y,z],[.23,.14,.11]);
        for(const dx of [-.1,0,.1])for(const dy of [-.065,.065])ball(gold,[x+dx,y+dy,z+.1],[.038,.039,.023]);
      }
      k.moving(root,'sway',.07,1.3);break;
    }
    case 'pomelo':{
      ball('#a6bb74',[0,.57,0],[.51,.57,.48]);ball('#d6d38d',[0,1.04,0],[.17,.16,.16]);
      rod([0,1.12,0],[.06,1.3,0],.035,brown);
      const leaf=ball(green,[.23,1.22,.02],[.23,.06,.12]);leaf.rotation.z=.3;
      for(const x of [-.16,.16])ball('#6d845c',[x,.69,.45],[.045,.06,.016]);
      k.moving(root,'sway',.045,.9);break;
    }
    case 'tea':{
      part('cylinder',cream,[0,.3,0],[.54,.1,.52]);
      part('cylinder','#f5e5c8',[0,.58,0],[.38,.5,.39]);
      part('cylinder','#9f713f',[0,.85,0],[.34,.025,.34]);
      const handle=part('ring',cream,[.42,.62,0],[.23,.22,.06]);handle.rotation.y=Math.PI/2;
      for(const x of [-.1,.1]){const steam=rod([x,.98,0],[x+.04,1.37,0],.018,'#e7e7df');k.moving(steam,'sway',.06,1.1);}
      break;
    }
    case 'teapot':{
      ball('#d4a875',[0,.56,0],[.54,.41,.48]);
      part('cylinder','#f0d6aa',[0,.96,0],[.41,.07,.4]);
      ball(gold,[0,1.04,0],[.11,.09,.1]);
      const spout=rod([.4,.64,0],[.84,.84,0],.11,'#d4a875');spout.scale.x*=1.1;
      part('ring','#d4a875',[-.55,.64,0],[.29,.29,.09]).rotation.y=Math.PI/2;
      ball('#b87d50',[0,.53,.43],[.12,.11,.03]);
      k.moving(root,'sway',.045,1);break;
    }
    case 'moonlight':{
      const halo=part('ring','#f3d48a',[0,.82,0],[.64,.64,.07]);halo.material.emissive.set('#a77b2e');halo.material.emissiveIntensity=.8;
      ball('#fff0bd',[0,.82,0],[.38,.38,.07]).material.emissive.set('#b69a53');
      for(let i=0;i<10;i++){const a=i*Math.PI/5;rod([Math.cos(a)*.73,.82+Math.sin(a)*.73,0],[Math.cos(a)*1.01,.82+Math.sin(a)*1.01,0],.025,gold);}
      for(let i=0;i<5;i++)ball(cream,[(i-2)*.2,.16+Math.abs(i-2)*.08,.02],[.045,.045,.025]);
      k.moving(root,'sway',.07,.8);break;
    }
    case 'firework':{
      const colors=['#f5d17e','#ef8b79','#a4c6e2','#d4a5d6'];
      ball(cream,[0,.95,0],[.09,.09,.09]);
      for(let i=0;i<16;i++){const a=i*Math.PI/8,r=i%2?.58:.75,c=colors[i%4];
        rod([Math.cos(a)*.16,.95+Math.sin(a)*.16,0],[Math.cos(a)*r,.95+Math.sin(a)*r,0],.018,c);
        ball(c,[Math.cos(a)*r,.95+Math.sin(a)*r,0],[.06,.06,.045]);
      }
      k.moving(root,'spin',.1,.55);break;
    }
    case 'gift':{
      part('box','#d05b53',[0,.49,0],[.91,.75,.83]);
      part('box',gold,[0,.88,0],[1,.14,.92]);
      part('box',cream,[0,.51,.43],[.16,.81,.035]);
      part('box',cream,[.47,.51,0],[.035,.81,.16]);
      for(const side of [-1,1]){const bow=part('ring',cream,[side*.2,1.05,.06],[.22,.13,.04]);bow.rotation.z=side*.35;}
      ball(gold,[0,1.03,.07],[.12,.09,.08]);k.moving(root,'bounce',.05,.9);break;
    }
    case 'fan':{
      rod([0,.09,0],[0,.64,0],.055,brown);
      for(let i=0;i<9;i++){const a=(-.9+i*.225),x=Math.sin(a),y=Math.cos(a);const blade=part('box',i%2?'#e7b36d':'#f4d39c',[x*.37,.69+y*.31,0],[.15,.68,.035]);blade.rotation.z=-a*.7;}
      part('cylinder',brown,[0,.47,.05],[.11,.13,.07]);k.moving(root,'sway',.09,1.2);break;
    }
    default:throw new Error(`Unknown festival model: ${kind}`);
  }
}
