// Independent first-light prefab; resource ownership and cleanup are provided by the toolkit.
export function build({THREE,group,part,moving}) {
 const body=new THREE.Group();group.add(body);
 part('ball','#ffe49a',[0,.57,0],[.5,.52,.42],body);
 for(const x of [-.16,.16]){part('ball','#fdf7e6',[x,.7,.38],[.11,.13,.045],body);part('ball','#53646f',[x,.69,.419],[.055,.073,.025],body);part('ball','#e7b6a7',[x*1.55,.48,.37],[.09,.05,.025],body);}
 part('ball','#8c705d',[0,.42,.414],[.05,.06,.02],body);
 for(const x of [-.23,.23])part('ball','#e9cc7e',[x,.1,.13],[.17,.1,.2],body);
 for(let i=0;i<3;i++)moving(part('star','#fff0bf',[Math.sin(i)*.5,1.25+i*.2,0],[.09,.09,.07]),'bounce',.18,2+i);
 moving(body,'sway',.3,3);moving(body,'bounce',.12,2);
}
