// Mean-radius ratios, NASA Solar System Sizes. Display radii deliberately
// compress the astronomical scale: six scene units for Earth, ratio ** .35.
export const SOLAR_PLANETS = [
  {id:'mercury',name:'水星',ratio:.383,color:'#a89a89',accent:'#786f66'},
  {id:'venus',name:'金星',ratio:.949,color:'#e4c591',accent:'#c89d67'},
  {id:'earth',name:'地球',ratio:1,color:'#629ec0',accent:'#739b75'},
  {id:'mars',name:'火星',ratio:.532,color:'#c98768',accent:'#955e50'},
  {id:'jupiter',name:'木星',ratio:10.973,color:'#dbbc97',accent:'#af795f'},
  {id:'saturn',name:'土星',ratio:9.14,color:'#e4ce9f',accent:'#b6a47f'},
  {id:'uranus',name:'天王星',ratio:3.981,color:'#a0d5d6',accent:'#7ab8c2'},
  {id:'neptune',name:'海王星',ratio:3.865,color:'#577dbf',accent:'#355da0'},
].map(p=>Object.freeze({...p,radius:6*Math.pow(p.ratio,.35),tint:p.color}));
