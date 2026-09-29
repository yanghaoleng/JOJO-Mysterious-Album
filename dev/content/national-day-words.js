// Original teaching sequence; thematic extensions are not attributed to the R-line source.
export const NATIONAL_DAY_SOURCES = Object.freeze([
  {title:'British Council · Holiday activities',url:'https://learnenglishkids.britishcouncil.org/category/topics/holidays'},
  {title:'British Council · Transport',url:'https://learnenglishkids.britishcouncil.org/category/topics/transport'},
]);
export const NATIONAL_DAY_PROPS = Object.freeze([
  {word:'panda',zh:'熊猫',model:'national-panda',aliases:['pandas']},
  {word:'balloon',zh:'气球',model:'national-balloon',aliases:['balloons']},
  {word:'flag',zh:'国旗',model:'national-flag',aliases:['flags','Chinese flag','national flag']},
  {word:'Great Wall',zh:'长城',model:'national-great-wall',aliases:['great wall','长城']},
  {word:'mountain',zh:'山',model:'national-mountain',aliases:['mountains']},
  {word:'suitcase',zh:'行李箱',model:'national-suitcase',aliases:['suitcases']},
]);
// Short Chinese meanings also cover support words shown in the tap-to-build menu.
export const NATIONAL_DAY_MEANINGS = Object.freeze(Object.fromEntries([
  ['flag','国旗'],['flags','国旗（复数）'],['great','雄伟的'],['wall','墙'],['Great Wall','长城'],['mountain','山'],['mountains','群山'],['suitcase','行李箱'],
  ['national','国家的'],['day','日子'],['China','中国'],['holiday','假期'],['October','十月'],['first','第一'],['trip','旅行'],['travel','旅行'],['visit','参观'],['see','看见'],['pack','收拾行李'],['take','带上'],['photo','照片'],['home','家'],['picnic','野餐'],['parade','游行'],['celebrate','庆祝'],['together','一起'],['and','和；并且'],['then','然后'],['near','在附近'],['beside','在旁边'],['in','在里面'],['on','在上面'],['over','在上方'],['put','放'],['make','让'],['look','看'],['at','在'],['a','一个'],['the','这个'],['i','我'],['we','我们'],['my','我的'],['our','我们的'],['is','是'],['are','是（复数）'],['have','有'],['can','可以'],['it','它'],['with','和'],['two','二'],['three','三'],['four','四'],['five','五'],['one','一'],
  ['red','红色的'],['yellow','黄色的'],['green','绿色的'],['blue','蓝色的'],['orange','橙色的'],['pink','粉色的'],['white','白色的'],['golden','金色的'],['big','大的'],['little','小的'],['tall','高的'],['long','长的'],['bright','明亮的'],['happy','开心的'],['sunny','晴朗的'],['slowly','慢慢地'],['fast','快'],['high','高高地'],['sweet','甜的'],['warm','温暖的'],
  ['star','星星'],['stars','星星（复数）'],['balloon','气球'],['balloons','气球（复数）'],['flower','花'],['flowers','花（复数）'],['lantern','灯笼'],['lanterns','灯笼（复数）'],['drum','鼓'],['drums','鼓（复数）'],['gift','礼物'],['gifts','礼物（复数）'],['panda','熊猫'],['pandas','熊猫（复数）'],['tree','树'],['trees','树（复数）'],['train','火车'],['trains','火车（复数）'],['bus','巴士'],['airplane','飞机'],['ship','轮船'],['bike','自行车'],['map','地图'],['bag','包'],['camera','相机'],['car','汽车'],['kite','风筝'],['bridge','桥'],['garden','花园'],['cloud','云'],['clouds','云（复数）'],['sun','太阳'],['tent','帐篷'],['box','盒子'],['dad','爸爸'],['mum','妈妈'],['family','家人'],['bread','面包'],['apple','苹果'],['cake','蛋糕'],['tea','茶'],['rabbit','兔子'],['bird','鸟'],['firework','烟花'],['fireworks','烟花'],['night','夜晚'],
  ['fly','飞'],['walk','走'],['go','走'],['jump','跳'],['dance','跳舞'],['spin','旋转'],['grow','生长'],['sail','航行'],['eat','吃'],['drink','喝'],['shine','闪耀'],['wish','许愿'],['light','点亮'],
]));
const stop=(id,title,skill,rows)=>({id,title,skill,rows});
// IDs are content anchors. Add new rows without renaming existing anchors.
export const NATIONAL_DAY_STOPS = Object.freeze([
  stop('hello','国庆小广场','从一个名词开始',[
    ['flag','flag','国庆广场升起一面国旗。说 flag。'],['star','star','再点亮一颗星星。说 star。'],['balloon','balloon','给广场添一个气球。'],['flower','flower','种下一朵花。'],['lantern','lantern','挂起一盏灯笼。'],['drum','drum','庆祝活动需要一面鼓。'],['gift','gift','为朋友准备一份礼物。'],['panda','panda','邀请熊猫一起过节。'],
  ]),
  stop('count','一起数一数','数量 + 复数名词',[
    ['stars','Two stars.','变出两颗星星。'],['balloons','Two balloons.','给气球找个伙伴。'],['flowers','Three flowers.','这次种三朵花。'],['lanterns','Two lanterns.','挂两盏灯笼。'],['gifts','Four gifts.','准备四份礼物。'],['drums','Three drums.','摆好三面鼓。'],['five-stars','Five stars.','数到五，一起点亮星星。'],['pandas','Two pandas.','邀请两只熊猫。'],
  ]),
  stop('colors','给假期上色','颜色放在名词前',[
    ['balloon','Red balloon.','把气球变成红色。'],['star','Yellow star.','让星星变成黄色。'],['lantern','Red lantern.','挂起红灯笼。'],['tree','Green tree.','种一棵绿树。'],['train','Blue train.','准备一列蓝色火车。'],['kite','Orange kite.','带上橙色风筝。'],['flower','Pink flower.','种一朵粉色的花。'],['gold','Golden star.','点亮一颗金色星星。'],
  ]),
  stop('describe','大大小小的风景','大小 + 颜色或特点 + 名词',[
    ['balloon','Big red balloon.','让红气球更大。'],['star','Little yellow star.','添一颗小黄星。'],['tree','Big green tree.','让绿树长得更大。'],['car','Little red car.','准备一辆小红车。'],['tall','Tall tree.','让树长高。'],['long','Long train.','把火车变长。'],['lantern','Big bright lantern.','让大灯笼亮起来。'],['panda','Little happy panda.','让小熊猫露出开心的表情。'],
  ]),
  stop('depart','国庆出发啦','I see / I have 的短句',[
    ['train','I see a train.','我看见一列火车。'],['bus','I see a bus.','我看见一辆巴士。'],['plane','I see an airplane.','我看见一架飞机。'],['ship','I see a ship.','我看见一艘轮船。'],['map','I have a map.','我有一张地图。'],['bag','I have a bag.','我有一个包。'],['camera','I have a camera.','我有一台相机。'],['suitcase','I have a suitcase.','我有一个行李箱。'],
  ]),
  stop('landmarks','看看美丽中国','用短句描述沿途风景',[
    ['wall','I see the Great Wall.','我看见长城；Great Wall 要连起来说。'],['mountain','I see a big mountain.','我看见一座大山。'],['bridge','I see a long bridge.','我看见一座长桥。'],['garden','I see a green garden.','我看见一座绿色花园。'],['clouds','I see two white clouds.','我看见两朵白云。'],['sun','I see a bright sun.','我看见明亮的太阳。'],['tent','I have a little tent.','我带着一顶小帐篷。'],['panda','I see a happy panda.','我看见一只开心的熊猫。'],
  ]),
  stop('place','布置假日营地','用 in / on / beside 安排位置',[
    ['gift','Put a gift in the box.','把礼物放进盒子。'],['bag','Put a bag beside the tent.','把包放在帐篷旁边。'],['camera','Put a camera beside the bag.','把相机放在包旁边。'],['panda','Put a panda beside the tree.','让熊猫来到树旁。'],['flower','Put a flower beside the tent.','把花放在帐篷旁边。'],['star','Put a star on the box.','把星星放到盒子上。'],['flag','Put a flag beside the tent.','把国旗放在帐篷旁边。'],['map','Put a map beside the camera.','把地图放在相机旁边。'],
  ]),
  stop('move','让旅途动起来','Make + 对象 + 动作',[
    ['panda','Make the panda walk.','请熊猫走起来。'],['bird','Make the bird fly.','请小鸟飞起来。'],['rabbit','Make the rabbit jump.','请兔子跳起来。'],['ship','Make the ship sail.','让轮船开始航行。'],['balloon','Make the balloon spin.','让气球旋转。'],['flower','Make the flower grow.','让花朵慢慢长大。'],['slow','Make the panda walk slowly.','这次请熊猫慢慢走。'],['high','Make the bird fly high.','让小鸟飞得更高。'],
  ]),
  stop('picnic','全家的假日野餐','把人物、食物和动作连起来',[
    ['dad','I see dad and mum.','让爸爸和妈妈一起来。'],['food','I have bread and tea.','准备面包和茶。'],['apple','Put an apple in the box.','把苹果放进盒子。'],['cake','Put a cake beside the tea.','把蛋糕放在茶旁边。'],['eat','Make the panda eat an apple.','请熊猫吃苹果。'],['rabbit','Make the rabbit eat a cake.','请兔子吃蛋糕。'],['drink','Make the panda drink tea.','请熊猫喝茶。'],['dance','Make dad and mum dance.','请爸爸妈妈一起跳舞。'],
  ]),
  stop('celebrate','国庆庆祝夜','光亮、数量和节日表达',[
    ['night','Night. Bright lantern.','天黑了，点亮灯笼。'],['stars','Three golden stars.','点亮三颗金色星星。'],['gifts','Two big red gifts.','摆好两份大大的红色礼物。'],['flowers','Five little pink flowers.','种下五朵粉色小花。'],['shine','Make the star shine.','让星星闪耀。'],['lantern','Light the red lantern.','点亮红灯笼。'],['fireworks','Celebrate with fireworks.','用虚拟烟花庆祝国庆。'],['greeting','Happy National Day! I see a flag.','国庆快乐！再介绍你看到的国旗。'],
  ]),
  stop('create','我来设计假期','组合两个对象、特点或动作',[
    ['square','A red flag and two yellow stars.','布置自己的广场，也可以换一种装饰。'],['trip','A blue train and a big suitcase.','挑选交通工具和行李。'],['landscape','A tall tree and a little tent.','搭配一大一小的风景。'],['camp','Put a red gift in a big box.','自己选择物品、颜色和容器。'],['garden','Make two little flowers grow.','让带有数量和特点的植物长大。'],['friends','Make the panda and the rabbit dance.','邀请两个朋友表演。'],['view','I see the Great Wall and a mountain.','介绍两处你喜欢的风景。'],['party','Bright lanterns and golden stars.','用两种发光装饰布置庆祝夜。'],
  ]),
  stop('story','讲讲我的国庆','连续两句话，造自己的小故事',[
    ['pack','I have a map. I have a camera.','用两句话介绍你带的两件东西。'],['depart','I see a train. I have a suitcase.','说说怎么出发、带什么行李。'],['arrive','I see the Great Wall. I see a mountain.','用两句话介绍沿途风景。'],['camp','I have a tent. Put a bag beside the tent.','先介绍营地，再安排一件物品。'],['picnic','I have an apple. Make the panda eat an apple.','先准备食物，再请朋友吃。'],['play','I see a bird. Make the bird fly high.','先介绍一个朋友，再让它行动。'],['night','I see a lantern. Make the star shine.','说出夜晚的装饰，再点亮星星。'],['final','Happy National Day! I see a flag and fireworks.','国庆快乐！用你喜欢的词介绍自己的庆祝世界。'],
  ]),
]);
export const NATIONAL_DAY_WORDS=Object.freeze([...new Set(NATIONAL_DAY_STOPS.flatMap(s=>s.rows.flatMap(r=>r[1].toLowerCase().match(/[a-z]+/g)||[])))]);
export function nationalDayLessons(){
  return NATIONAL_DAY_STOPS.flatMap((stop,stopIndex)=>stop.rows.map(([key,example,prompt],index)=>{
    const tokens=example.toLowerCase().match(/[a-z]+/g)||[],mode=stopIndex<6?'build':stopIndex<10?'cloze':'open';
    return {id:`national-day-${stop.id}-${key}`,stage:stopIndex*8+index+1,stopId:stop.id,stopIndex,stopTitle:stop.title,stopStep:index+1,mode,example,targets:[...new Set(tokens)],buildWords:tokens,displayText:example,blankWords:[],blankCount:0,hintLevel:stopIndex<6?3:1,warmup:false,allowSwaps:false,allowCreative:mode==='open',choiceWords:[],chineseGuide:`${prompt} 试着说：${example}`,prompt,knowledge:[stop.skill],words:[...new Set(tokens)].map(word=>({word,meaning:NATIONAL_DAY_MEANINGS[word]||word,inSource:false})),supportWords:[],alternatives:[],goalLabel:stop.title,minWords:stopIndex===11?8:stopIndex===10?4:0};
  }));
}
