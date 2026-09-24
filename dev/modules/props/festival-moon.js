// A warm full moon for the Mid-Autumn word chapter.
export function build({part,moving}) {
  const moon=part('ball','#e7bb67',[0,1.25,0],[.82,.82,.82]);
  moon.material.emissive.set('#a96a1f');moon.material.emissiveIntensity=.7;
  for(const [x,y,r] of [[-.32,1.46,.14],[.28,1.08,.19],[.12,1.56,.09]]){
    const crater=part('ball','#ce9b4b',[x,y,.76],[r,r*.78,.026]);
    crater.material.emissive.set('#634c25');crater.material.emissiveIntensity=.08;
  }
  const halo=part('ring','#e9c87e',[0,1.25,-.04],[.99,.99,.08]);
  halo.material.emissive.set('#9d6b21');halo.material.emissiveIntensity=.3;
  moving(moon,'bounce',.08,.8);
}
