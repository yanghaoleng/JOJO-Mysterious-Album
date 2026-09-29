// Curated routes use R-line nouns; stable route IDs also identify analytics and saves.
// Each tuple: first noun, second noun, plural, colour, size, final action, alternatives.
export const WORD_THEME_PLANS = {
  animals: {band:'early',title:'动物出发站',world:'meadow',preview:'rword-duck',words:'duck frog dog bunny bird bee hen cat',goals:['用中文提示说出动物英文名','认识数量、颜色和大小','用一句短指令让动物行动'],routes:[
    ['duck','frog','ducks','green','big','Make the duck swim.',['Make the frog jump.','Make the duck jump.']],
    ['frog','dog','dogs','red','little','Make the dog jump.',['Make the frog swim.','Make the dog run.']],
    ['dog','bird','birds','blue','big','Make the bird fly.',['Make the dog jump.','Make the bird jump.']],
  ]},
  color: {band:'early',title:'玩具彩虹城',world:'home',preview:'rword-ball',words:'ball toy robot hat kite bow cape',goals:['说出熟悉的玩具','尝试替换颜色和大小','给玩具安排一个动作'],routes:[
    ['ball','robot','balls','red','little','Make the ball spin.',['Make the robot jump.','Make the ball jump.']],
    ['robot','hat','robots','blue','big','Make the robot jump.',['Make the robot spin.','Make the hat fly.']],
    ['kite','toy','kites','yellow','little','Make the kite fly.',['Make the toy jump.','Make the kite spin.']],
  ]},
  garden: {band:'early',title:'花园生长岛',world:'orchard',preview:'rword-flower',words:'flower tree seed grass water bee sun mud',goals:['认识植物和花园里的朋友','组合数量、颜色和大小','观察 grow 和 fly 带来的变化'],routes:[
    ['flower','tree','flowers','red','little','Make the flower grow.',['Make the tree grow.','Make the flower spin.']],
    ['seed','flower','seeds','yellow','little','Make the seed grow.',['Make the flower grow.','Make the seed jump.']],
    ['bee','tree','bees','blue','big','Make the bee fly.',['Make the tree grow.','Make the bee dance.']],
  ]},
  traffic: {band:'middle',title:'交通出发港',world:'cove',preview:'rword-ship',words:'car train bike van jeep jet ship',goals:['认识不同交通工具','描述颜色、数量和大小','用动作或 beside 表达位置关系'],routes:[
    ['car','train','trains','red','big','Put the car beside the train.',['Make the car go.','Make the train go.']],
    ['ship','bike','bikes','blue','little','Make the ship sail.',['Make the ship go.','Put the bike beside the ship.']],
    ['jet','van','vans','yellow','big','Make the jet fly.',['Make the van go.','Put the van beside the jet.']],
  ]},
  sports: {band:'middle',title:'动物运动场',world:'cove',preview:'rword-frog',words:'bird duck frog dog fox bee ant snail',goals:['区分动物的运动方式','在短语中描述动物','用短句安排游泳、飞行或跑跳'],routes:[
    ['frog','duck','ducks','green','little','Make the duck swim.',['Make the frog jump.','Make the duck jump.']],
    ['dog','fox','dogs','red','big','Make the dog run.',['Make the fox jump.','Make the dog swim.']],
    ['bird','snail','birds','blue','little','Make the bird fly.',['Make the snail walk.','Make the bird dance.']],
  ]},
  camp: {band:'middle',title:'家庭露营寻宝',world:'meadow',preview:'rword-fort',words:'family dad mum kid fort box map key bag blanket',goals:['认识露营物件和家庭成员','用短语描述寻找的物件','用 in 或 beside 安排物件位置'],routes:[
    ['map','box','boxes','red','big','Put the map in the box.',['Put the map beside the box.','Make the map fly.']],
    ['key','bag','bags','yellow','little','Put the key in the bag.',['Put the key beside the bag.','Make the key spin.']],
    ['fort','blanket','forts','blue','big','Put the blanket beside the fort.',['Make the fort grow.','Make the blanket fly.']],
  ]},
  monster: {band:'older',title:'机器人零件实验室',world:'pocket',preview:'robot-body',words:'robot body head hand foot eye ear leg tail',goals:['认识身体部位与复数 feet','组合大小、颜色与数量','用完整句子驱动组装好的机器人'],routes:[
    ['head','hand','hands','blue','big','Make the big blue robot jump.',['Make the robot walk.','Make the robot dance.']],
    ['body','foot','feet','red','little','Make the little red robot walk.',['Make the robot jump.','Make the robot dance.']],
    ['eye','ear','ears','green','big','Make the green robot dance.',['Make the robot jump.','Make the robot spin.']],
  ]},
  rhyme: {band:'older',title:'押韵魔法门',world:'bridge',preview:'rword-cat',words:'cat hat mat pig wig bug rug bee tree snail',goals:['听辨 cat/hat、bug/rug、bee/tree 的韵尾','替换同韵词创造画面','组合动作、配饰和位置关系'],routes:[
    ['cat','hat','hats','blue','big','Give the cat a hat.',['Put the cat on the mat.','Make the cat jump.']],
    ['bug','rug','rugs','red','little','Make the bug spin on the rug.',['Put the bug on the rug.','Make the bug jump.']],
    ['bee','tree','trees','green','little','Make the bee fly near the tree.',['Make the bee dance.','Make the tree grow.']],
  ]},
  ocean: {band:'older',title:'海湾探险港',world:'reef',preview:'rword-ship',words:'ship shell wave bay cave water',goals:['用原词库认识海湾和航行物件','组合多个描述词','用 sail、in、near 等组织探险画面'],routes:[
    ['ship','shell','shells','blue','big','Make the ship sail near the shell.',['Make the ship sail.','Put the shell in the ship.']],
    ['shell','cave','shells','yellow','little','Put the shell in the cave.',['Put the shell beside the cave.','Make the shell spin.']],
    ['wave','ship','ships','blue','big','Make the ship sail on the wave.',['Make the wave grow.','Make the ship sail.']],
  ]},
};

export function pickThemeRoute(plan, previous, random=Math.random) {
  const choices=plan.routes.map((_,i)=>i).filter(i=>i!==previous);
  return choices[Math.min(choices.length-1,Math.floor(Math.max(0,random())*choices.length))];
}

// Only bounded completion badges and last route numbers survive clearing a 3D world.
export function cleanThemeProgress(raw={}) {
  const result={};
  for(const band of ['early','middle','older']){
    const ids=Object.keys(WORD_THEME_PLANS).filter(id=>WORD_THEME_PLANS[id].band===band),entry=raw?.[band];
    result[band]={completed:ids.filter(id=>Array.isArray(entry?.completed)&&entry.completed.includes(id)),last:ids.includes(entry?.last)?entry.last:null,routes:{}};
    for(const id of ids)if(Number.isInteger(entry?.routes?.[id])&&entry.routes[id]>=0&&entry.routes[id]<3)result[band].routes[id]=entry.routes[id];
  }
  return result;
}
