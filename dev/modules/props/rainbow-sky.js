// Independent first-light prefab; resource ownership and cleanup are provided by the toolkit.
export function build({THREE,group,shapes,materials,part,moving}) {
  group.userData.suspended=true;
  const colors=['#fa797b','#ffa960','#ffe27e','#9bd09b','#8ccbd8','#97a9e4','#c09add'];
  colors.forEach((color,i)=>{
    const geometry=new THREE.TorusGeometry(2.45-i*.17,.095,10,80,Math.PI);
    shapes.set(`rainbow-${i}`,geometry);
    part('ball',color,[0,0,0],[.001,.001,.001]);
    const arc=new THREE.Mesh(geometry,materials.get(color));arc.position.set(0,2.25,-.55);group.add(arc);
    moving(arc,'sway',.025,1.1);
  });
  for(const side of [-1,1])for(let j=0;j<3;j++)part('ball','#f6ecfa',[side*(2.18+j*.18),2.25+j%2*.12,-.55],[.38,.23,.24]);
}
