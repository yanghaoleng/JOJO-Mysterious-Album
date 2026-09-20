// Independent first-light prefab; resource ownership and cleanup are provided by the toolkit.
export function build({group,part,moving}) {
 for(let i=0;i<12;i++){const t=i/11;const bead=part('ball',i%2?'#fce8a4':'#cce2bc',[Math.sin(t*1.4)*1.9,.15+t*.04,-t*2.3],[.1,.055,.14]);moving(bead,'bounce',.09,2+i*.15);}
}
