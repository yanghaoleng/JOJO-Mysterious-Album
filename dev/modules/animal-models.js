// Distinct hand-built animal silhouettes using the shared prop toolkit.
// Geometry and materials belong to the toolkit instance and are released with it.
export function buildAnimal(k,kind){
  const root=new k.THREE.Group();root.name=`animal-${kind}`;k.group.add(root);k.group.userData.animalWord=kind;
  const ink='#34404a',cream='#f7eddb',pink='#dca1a2',gold='#e8bd66',brown='#9e714f';
  const ball=(color,x,y,z,sx,sy=sx,sz=sx,parent=root)=>k.part('ball',color,[x,y,z],[sx,sy,sz],parent);
  const box=(color,x,y,z,sx,sy,sz,parent=root)=>k.part('box',color,[x,y,z],[sx,sy,sz],parent);
  const cone=(color,x,y,z,sx,sy,sz,parent=root)=>k.part('cone',color,[x,y,z],[sx,sy,sz],parent);
  const rod=(a,b,r,color=brown,parent=root)=>{const mesh=k.beam(a,b,r,color);parent.add(mesh);return mesh;};
  const eyes=(y,z,span=.18,r=.045)=>{for(const x of [-span,span]){ball(cream,x,y,z,r*1.45,r*1.5,.025);ball(ink,x,y,z+.024,r,r,.02);}};
  const feet=(color,x=.27,z=.4,height=.38,hoof=ink)=>{for(const side of [-1,1])for(const end of [-1,1]){ball(color,side*x,height*.56,end*z,.12,height*.6,.14);ball(hoof,side*x,.08,end*z+.07,.13,.09,.18);}};
  const body=(color,{wide=.43,long=.66,high=.43,y=.65}={})=>ball(color,0,y,-.15,wide,high,long);
  const head=(color,{y=1.09,z=.46,wide=.31,tall=.29,deep=.3}={})=>ball(color,0,y,z,wide,tall,deep);
  const tail=(color,from=[0,.72,-.75],to=[0,.48,-1.1],r=.055)=>rod(from,to,r,color);
  const wing=(side,color,{x=.3,y=.56,z=-.04,scale=[.14,.22,.32]}={})=>{
    const group=new k.THREE.Group();group.name=`wing-${side}`;group.position.set(side*x,y,z);root.add(group);
    ball(color,side*.08,-.04,0,...scale,group);k.moving(group,'flap',side*.46,3.7);return group;
  };

  switch(kind){
    case 'elephant':{
      const gray='#9baeb4';body(gray,{wide:.59,long:.75,high:.54,y:.77});head(gray,{y:1.16,z:.56,wide:.48,tall:.43,deep:.42});
      feet(gray,.41,.48,.58,'#7b8f95');
      for(const side of [-1,1]){ball(gray,side*.46,1.17,.51,.34,.38,.1);ball('#c9a9a6',side*.49,1.15,.61,.23,.28,.035);}
      eyes(1.24,.96,.21,.047);
      for(const [y,z,r] of [[.96,.96,.18],[.78,1.1,.15],[.59,1.17,.12],[.48,1.23,.1]])ball(gray,0,y,z,r,r*.9,r);
      for(const side of [-1,1]){const tusk=cone(cream,side*.28,.73,1.01,.08,.3,.08);tusk.rotation.x=.55;tusk.rotation.z=side*.25;}
      tail(gray,[0,.85,-.89],[0,.42,-1.09]);break;
    }
    case 'chick':{
      const yellow='#f2cf75';ball(yellow,0,.46,0,.39,.39,.37);ball(yellow,0,.91,.18,.28,.28,.27);eyes(.98,.43,.13,.045);
      const beak=cone('#e89b56',0,.82,.48,.11,.24,.11);beak.rotation.x=Math.PI/2;
      wing(-1,yellow,{x:.3,y:.55,scale:[.11,.16,.24]});wing(1,yellow,{x:.3,y:.55,scale:[.11,.16,.24]});
      for(const side of [-1,1]){rod([side*.16,.19,.02],[side*.16,.045,.23],.032,'#c6804b');for(const dx of [-.075,.075])rod([side*.16,.045,.23],[side*.16+dx,.035,.34],.02,'#c6804b');}
      for(const dx of [-.12,0,.12])ball(yellow,dx,1.19,-.01,.09,.13,.08);break;
    }
    case 'giraffe':{
      const yellow='#ebc676',spots='#ae7e4e';body(yellow,{wide:.36,long:.56,high:.32,y:.68});feet(yellow,.24,.56,.4,spots);
      ball(yellow,0,1.23,.38,.16,.79,.16);head(yellow,{y:1.88,z:.53,wide:.25,tall:.22,deep:.37});
      ball('#e2b96c',0,1.75,.87,.19,.1,.2);eyes(1.95,.86,.15,.037);
      for(const side of [-1,1]){rod([side*.13,2.05,.48],[side*.16,2.31,.47],.035,spots);ball(spots,side*.16,2.32,.47,.065);ball(yellow,side*.25,1.93,.42,.12,.08,.15);}
      for(const [x,y,z] of [[-.3,.78,-.46],[.31,.62,-.17],[-.31,.62,.12],[.29,.82,.24],[0,.93,-.57],[-.12,1.37,.52],[.1,1.62,.51]])ball(spots,x,y,z,.095,.08,.05);
      tail(yellow,[0,.82,-.7],[0,.51,-1.02],.035);ball(spots,0,.48,-1.04,.09,.16,.07);break;
    }
    case 'zebra':{
      const white='#f2efdf';body(white,{wide:.4,long:.68,high:.34,y:.65});feet(white,.27,.5,.47,ink);
      ball(white,0,1.03,.43,.2,.43,.21);head(white,{y:1.34,z:.64,wide:.23,tall:.27,deep:.39});ball(ink,0,1.19,1.0,.2,.1,.15);eyes(1.41,.96,.14,.035);
      for(const side of [-1,1]){ball(white,side*.21,1.57,.49,.08,.19,.08);for(let i=0;i<5;i++){const stripe=box(ink,side*.397,.7,-.62+i*.25,.022,.44,.09);stripe.rotation.x=(i%2?-.34:.28);}for(let i=0;i<3;i++)box(ink,side*.19,1.01+i*.16,.43,.025,.07,.2);}
      for(let i=0;i<5;i++)cone(ink,0,1.4-i*.14,.27-i*.04,.11,.2,.1).rotation.x=-.45;
      tail(white,[0,.76,-.84],[0,.4,-1.12],.038);ball(ink,0,.36,-1.15,.085,.15,.075);break;
    }
    case 'snake':{
      const green='#6fab7f',light='#d5df9c';
      for(let i=0;i<11;i++){const t=i/10,z=-.97+t*1.6,x=Math.sin(t*7.5)*.27,y=.14+(t>.78?(t-.78)*2.3:0);ball(green,x,y,z,.22-t*.06,.2-t*.04,.24);if(i%2===0)ball(light,x,y+.13,z,.07,.025,.12);}
      ball(green,.17,.75,.78,.28,.25,.31);ball(light,.17,.62,1.01,.22,.07,.2);for(const x of [-.01,.35]){ball(cream,x,.81,1.02,.075,.08,.035);ball(ink,x,.82,1.05,.033,.04,.02);}
      rod([.17,.6,1.14],[.17,.5,1.36],.02,'#dc6f73');for(const dx of [-.09,.09])rod([.17,.5,1.36],[.17+dx,.43,1.46],.014,'#dc6f73');break;
    }
    case 'ox':{
      const tan='#aa7850';body(tan,{wide:.56,long:.75,high:.46,y:.72});feet(tan,.38,.45,.58,'#514940');head(tan,{y:1.08,z:.61,wide:.4,tall:.36,deep:.39});
      ball('#d7a588',0,.86,.97,.34,.22,.2);eyes(1.18,.97,.22,.041);
      for(const side of [-1,1]){rod([side*.28,1.37,.58],[side*.5,1.61,.55],.07,cream);rod([side*.5,1.61,.55],[side*.69,1.66,.58],.038,cream);ball(tan,side*.38,1.26,.36,.13,.11,.18);}
      for(const x of [-.13,.13])ball(ink,x,.85,1.16,.04,.025,.02);tail(tan,[0,.85,-.9],[0,.42,-1.12]);break;
    }
    case 'tiger':{
      const orange='#df9658';body(orange,{wide:.43,long:.69,high:.4,y:.68});feet(orange,.29,.4,.48,'#d8a268');head(orange,{y:1.1,z:.5,wide:.37,tall:.35,deep:.34});
      for(const side of [-1,1]){ball(orange,side*.3,1.39,.39,.13,.15,.1);ball(cream,side*.3,1.4,.47,.075,.08,.025);ball(cream,side*.13,.94,.82,.16,.12,.09);for(let i=0;i<4;i++){const stripe=box(ink,side*.426,.71,-.57+i*.31,.025,.2,.11);stripe.rotation.x=(i%2?-.35:.35);}for(const z of [.35,.56])box(ink,side*.31,1.19,z,.025,.08,.12);}
      eyes(1.16,.82,.2,.041);ball(ink,0,.93,.91,.07,.055,.04);for(const x of [-.12,0,.12])box(ink,x,1.37,.83,.05,.18,.02).rotation.z=x*2;
      tail(orange,[0,.78,-.85],[.2,.95,-1.27],.075);for(const t of [.25,.55,.85])ball(ink,.2*t,.79+.16*t,-.85-.42*t,.08,.055,.09);break;
    }
    case 'dragon':{
      const jade='#69ac9a',dark='#448476';
      for(let i=0;i<9;i++){const t=i/8,z=-1.05+t*1.46,x=Math.sin(t*6.5)*.22,y=.4+Math.sin(t*5)*.12;ball(jade,x,y,z,.22+t*.08,.2+t*.05,.28);if(i<7)cone(gold,x,y+.28,z,.1,.22,.1);}
      ball(jade,0,1.07,.64,.38,.32,.35);ball('#97c8a3',0,.9,.97,.29,.13,.29);eyes(1.14,.94,.22,.05);
      for(const side of [-1,1]){rod([side*.22,1.31,.55],[side*.27,1.7,.49],.06,gold);ball(gold,side*.27,1.72,.49,.075);rod([side*.23,.87,.91],[side*.58,.7,1.12],.025,cream);for(const z of [-.56,.13]){rod([side*.21,.46,z],[side*.44,.09,z+.14],.06,jade);for(const dx of [-.08,.08])cone(gold,side*.44+dx,.08,z+.2,.04,.13,.04);}}
      for(const x of [-.12,.12])ball(ink,x,.95,1.22,.045,.03,.025);break;
    }
    case 'horse':{
      const chestnut='#ae7550';body(chestnut,{wide:.39,long:.68,high:.36,y:.67});feet(chestnut,.26,.52,.5,'#544238');
      ball(chestnut,0,1.05,.41,.2,.45,.22);head(chestnut,{y:1.37,z:.67,wide:.24,tall:.29,deep:.39});ball('#d5a889',0,1.2,1.0,.19,.11,.17);eyes(1.43,.99,.16,.035);
      for(const side of [-1,1]){const ear=cone(chestnut,side*.17,1.7,.5,.09,.25,.09);ear.rotation.z=side*.18;}
      for(let i=0;i<6;i++)ball('#59463b',0,1.48-i*.13,.27-i*.05,.13,.14,.12);
      tail('#59463b',[0,.81,-.84],[0,.35,-1.14],.11);break;
    }
    case 'goat':{
      const white='#e5e0c9';body(white,{wide:.36,long:.57,high:.36,y:.6});feet(white,.24,.36,.42,'#68645a');head(white,{y:1.05,z:.46,wide:.28,tall:.28,deep:.29});eyes(1.1,.75,.17,.035);
      ball('#d4baa3',0,.91,.77,.21,.12,.12);for(const side of [-1,1]){rod([side*.16,1.3,.4],[side*.31,1.52,.33],.04,'#b6a78b');rod([side*.31,1.52,.33],[side*.41,1.58,.28],.03,'#b6a78b');ball(white,side*.29,1.01,.37,.15,.11,.12);}
      const beard=cone(white,0,.73,.78,.11,.3,.1);beard.rotation.z=Math.PI;
      tail(white,[0,.7,-.68],[0,.84,-.87],.05);break;
    }
    case 'sheep':{
      const wool='#ece8d7',face='#82766f';body(wool,{wide:.46,long:.62,high:.43,y:.65});feet(face,.28,.32,.4,'#5e5954');
      for(let i=0;i<5;i++)for(const side of [-1,0,1])ball(wool,side*.28,.95,-.67+i*.28,.22,.2,.23);
      head(face,{y:1.09,z:.59,wide:.26,tall:.29,deep:.32});ball(wool,0,1.37,.44,.3,.18,.25);eyes(1.12,.9,.16,.035);
      for(const side of [-1,1])ball(face,side*.3,1.11,.47,.16,.08,.12);ball('#b9a293',0,.93,.93,.15,.08,.12);break;
    }
    case 'monkey':{
      const fur='#9d704f',face='#e0b88b';ball(fur,0,.55,-.05,.36,.47,.32);ball(face,0,.55,.25,.21,.31,.06);head(fur,{y:1.15,z:.14,wide:.33,tall:.34,deep:.29});
      ball(face,0,1.08,.42,.26,.24,.08);for(const side of [-1,1]){ball(fur,side*.33,1.17,.1,.15,.17,.1);ball(face,side*.34,1.17,.19,.075,.09,.025);rod([side*.27,.72,0],[side*.48,.3,.22],.09,fur);ball(face,side*.49,.25,.23,.1,.09,.09);rod([side*.17,.26,-.08],[side*.25,.08,.16],.1,fur);ball(face,side*.25,.07,.17,.13,.07,.14);}
      eyes(1.19,.5,.15,.047);ball(ink,0,.98,.52,.045,.03,.02);
      rod([.2,.45,-.29],[.53,.68,-.51],.065,fur);rod([.53,.68,-.51],[.61,1.08,-.69],.05,fur);rod([.61,1.08,-.69],[.37,1.24,-.7],.04,fur);break;
    }
    case 'rooster':{
      const white='#f5ead5',red='#c94c44';ball(white,0,.61,-.1,.42,.48,.42);head(white,{y:1.17,z:.33,wide:.27,tall:.28,deep:.25});eyes(1.21,.57,.15,.038);
      const beak=cone(gold,0,1.1,.63,.1,.22,.1);beak.rotation.x=Math.PI/2;
      for(const x of [-.16,0,.16])ball(red,x,1.47,.27,.09,.19,.08);ball(red,0,.94,.57,.1,.16,.08);
      wing(-1,white,{x:.34,y:.72,scale:[.13,.27,.27]});wing(1,white,{x:.34,y:.72,scale:[.13,.27,.27]});
      for(const side of [-1,1]){rod([side*.17,.3,-.04],[side*.18,.07,.13],.04,'#b4814f');for(const dx of [-.08,.08])rod([side*.18,.07,.13],[side*.18+dx,.05,.28],.024,'#b4814f');}
      for(let i=0;i<5;i++){const plume=ball(i%2?'#486b65':'#c78556',(i-2)*.11,.95+Math.abs(i-2)*.07,-.53,.08,.43,.17);plume.rotation.x=-.45;}
      break;
    }
    default:throw new Error(`Unknown animal model: ${kind}`);
  }
  k.moving(root,'sway',.07,1.55);
}
