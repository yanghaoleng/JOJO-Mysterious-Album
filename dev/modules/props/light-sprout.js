// Independent first-light prefab; resource ownership and cleanup are provided by the toolkit.
export function build({THREE,group,part,moving}) {
 part('ball','#c0ae89',[0,.12,0],[.35,.12,.27]);
 const shoot=new THREE.Group();group.add(shoot);
 part('cylinder','#f0d577',[0,.52,0],[.055,.8,.055],shoot);
 for(const side of [-1,1]){const leaf=part('ball',side<0?'#f5dc8a':'#aacf98',[side*.19,.64,0],[.28,.12,.10],shoot);leaf.rotation.z=side*.6;}
 part('ball','#fff0a3',[0,1,0],[.20,.27,.18],shoot);moving(shoot,'sway',.25,2);
}
