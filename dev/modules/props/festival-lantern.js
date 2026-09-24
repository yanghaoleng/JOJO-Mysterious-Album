// Rounded red paper lantern with gold ribs and a swinging tassel.
export function build({THREE,group,part,moving}) {
  const lantern=new THREE.Group();group.add(lantern);
  part('cylinder','#d7b563',[0,1.66,0],[.07,.35,.07],lantern);
  part('cylinder','#e9c979',[0,1.43,0],[.37,.09,.37],lantern);
  const body=part('ball','#c94b3f',[0,1.05,0],[.54,.49,.43],lantern);
  body.material.emissive.set('#733320');body.material.emissiveIntensity=.2;
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;
    part('ball','#e3a661',[Math.cos(angle)*.47,1.05,Math.sin(angle)*.38],[.028,.43,.025],lantern);
  }
  part('cylinder','#d8aa5d',[0,.62,0],[.34,.09,.34],lantern);
  part('cylinder','#e7bd65',[0,.36,0],[.06,.45,.06],lantern);
  for(let i=0;i<5;i++)part('cylinder','#c9523c',[(i-2)*.062,.14,0],[.024,.31,.024],lantern);
  moving(lantern,'sway',.12,.8);
}
