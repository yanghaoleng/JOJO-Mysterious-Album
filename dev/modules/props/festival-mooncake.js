// A moulded mooncake with a raised flower seal and a visible layered edge.
export function build({part,moving}) {
  const plate=part('cylinder','#f1e1c4',[0,.11,0],[1.18,.12,1.18]);
  plate.material.roughness=.72;
  part('cylinder','#b7793d',[0,.36,0],[.86,.36,.86]);
  part('cylinder','#dfab5c',[0,.58,0],[.91,.09,.91]);
  for(let i=0;i<12;i++){
    const angle=i*Math.PI/6;
    part('ball','#c98a43',[Math.cos(angle)*.77,.39,Math.sin(angle)*.77],[.15,.22,.15]);
  }
  const seal=part('cylinder','#e9bf73',[0,.65,0],[.44,.035,.44]);
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;
    part('ball','#af7137',[Math.cos(angle)*.25,.682,Math.sin(angle)*.25],[.12,.014,.075]);
  }
  part('ball','#b8793d',[0,.69,0],[.075,.018,.075]);
  moving(seal,'bounce',.018,.9);
}
