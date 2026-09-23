// Portrait artwork: the real world fills the width beneath large, readable English.
export function drawWordShareCard({source,words=[],examples=[]}){
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;
  const ctx=canvas.getContext('2d'),width=canvas.width,height=canvas.height;
  const bg=ctx.createLinearGradient(0,0,0,height);bg.addColorStop(0,'#0c1a24');bg.addColorStop(.45,'#0c1a24');bg.addColorStop(1,'#19323b');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
  if(source?.width&&source?.height){const sceneTop=400,sceneHeight=height-sceneTop,scale=Math.max(width/source.width,sceneHeight/source.height)*1.12,sw=width/scale,sh=sceneHeight/scale,sx=(source.width-sw)/2,sy=Math.max(0,Math.min(source.height-sh,source.height*.6-sh/2));ctx.drawImage(source,sx,sy,sw,sh,0,sceneTop,width,sceneHeight);}
  const shade=ctx.createLinearGradient(0,340,0,850);shade.addColorStop(0,'#0c1a24');shade.addColorStop(.45,'#0c1a24e8');shade.addColorStop(1,'#0c1a2400');ctx.fillStyle=shade;ctx.fillRect(0,340,width,510);
  ctx.fillStyle='#fff';ctx.textBaseline='top';let y=66;
  function lines(text,size){ctx.font=`700 ${size}px MohrRounded, sans-serif`;const rows=[];let row='';for(const word of text.split(/\s+/)){const next=row?`${row} ${word}`:word;if(row&&ctx.measureText(next).width>936){rows.push(row);row=word;}else row=next;}if(row)rows.push(row);return rows;}
  const grammar=new Set('a an the i is are it my your and to in on with two three four'.split(' '));
  const singular={hands:'hand',heads:'head',robots:'robot',flowers:'flower',feet:'foot'};
  const vocabulary=[...new Set(words.map(w=>singular[w.toLowerCase()]||w))].filter(w=>!grammar.has(w.toLowerCase())).slice(0,8);
  const wordRows=lines(vocabulary.join(' · ')||'My little world',54).slice(0,2);
  for(const row of wordRows){ctx.fillText(row,72,y);y+=65;}y+=32;
  const selected=examples.slice(0,3);let size=68;
  while(size>52&&selected.reduce((sum,text)=>sum+lines(text,size).length*size*1.15+12,0)>700-y)size-=4;
  for(const example of selected){
    const rows=lines(example,size);if(y+rows.length*size*1.15>720)break;
    for(const row of rows){ctx.fillText(row,72,y);y+=size*1.15;}y+=12;
  }
  return canvas;
}
