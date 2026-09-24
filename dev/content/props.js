import { RLINE_MODEL_WORDS } from './rline-nouns.js';
import { ANIMAL_WORDS } from './animal-words.js';
import { MID_AUTUMN_PROPS } from './midautumn-words.js';
import { PROP_COLLECTION } from './prop-collection.js';
// Shared placement rules keep scene entry, relocation and camera focus in agreement.
export const SKY_PROP_HEIGHTS = Object.freeze({
  'prop:festival-moon': 2.7, 'prop:festival-star': 2.5,
  'prop:festival-firework': 3, 'prop:festival-moonlight': 2.5,
});
export function defaultFlightHeight(asset = '') {
  return SKY_PROP_HEIGHTS[asset] ?? (/ufo/.test(asset) ? 2.6 : /spaceship|airplane|rocket/.test(asset) ? 1.7 : 0);
}
// Every response below corresponds to a real, reusable model and animation.
export const CREATION_KITS = [
  ...ANIMAL_WORDS.map(animal => [animal.model, animal.zh, [animal.word, ...animal.aliases, animal.zh].join('|'), `${animal.zh}在场景中轻轻活动。`, 'jiaojiao']),
  ...MID_AUTUMN_PROPS.map(prop => [prop.model, prop.zh, [prop.word, ...prop.aliases, prop.zh].join('|'), `${prop.zh}在中秋夜轻轻活动。`, 'jiaojiao']),
  ['festival-moon', '中秋圆月', 'moon|moons|full moon|月亮|圆月', '带陨石坑的黄色圆月，没有星环，默认悬浮在天空。', 'jiaojiao'],
  ['festival-mooncake', '中秋月饼', 'mooncake|mooncakes|moon cake|月饼', '有花纹和层次的月饼轻轻回应。', 'jiaojiao'],
  ['festival-lantern', '中秋灯笼', 'lantern|lanterns|灯笼|花灯', '红纸灯笼与流苏轻轻摆动。', 'jiaojiao'],
  ["robot-body", "机器人身体", "机器人身体|robot body", "可拼装的机械身体，支持颜色、大小和动作变化。", "jiaojiao"],
  ["robot-head", "机器人头", "机器人头|robot head", "可拼装的机械头，支持颜色、大小和动作变化。", "jiaojiao"],
  ["robot-hand", "机器人手", "机器人手|robot hand", "可拼装的机械手，支持颜色、大小和动作变化。", "jiaojiao"],
  ["robot-foot", "机器人脚", "机器人脚|robot foot", "可拼装的机械脚，支持颜色、大小和动作变化。", "jiaojiao"],

  ["swimming-pool", "互动小水池", "水池|游泳池|swimming pool", "蓝色水面带有三圈波纹，可作为游泳事件道具。", "jiaojiao"],
  ...RLINE_MODEL_WORDS.map(n => [n.assetId.slice(5), n.word+' · '+n.zh, [n.word, n.zh, ...n.aliases].join('|'), n.zh+'轻轻摇动，回应你的声音。'+(n.extension?'这是自由创作扩展词。':n.representation+'。'), 'jiaojiao']),
["little-flame", "小火苗", "小火苗|火苗|火焰", "橙黄色火苗轻轻跳动。", "jiaojiao"],
["gold-coin", "金币", "金币|金钱|硬币", "厚厚的金币轻轻转动，露出星形浮雕。", "jiaojiao"],
["cash", "现金", "现金|钞票|纸币|钱币", "绿色纸钞叠成一小摞，轻轻摇摆。", "jiaojiao"],
["purple-diamond", "紫色钻石", "紫色钻石|钻石|紫钻|宝石", "棱面分明的紫色钻石缓缓转动。", "jiaojiao"],
["battery", "电池", "电池|能量电池", "电池的三格电量轻轻跳动。", "jiaojiao"],
["growth-bean", "成长豆（学豆）", "成长豆|学豆|橙色咖啡豆", "橙色咖啡豆形学豆轻轻弹跳，中间留着弯弯的豆缝。", "jiaojiao"],
["badge-star", "星芒徽章", "星星徽章|星芒徽章|徽章", "星芒徽章轻轻摇摆，展示独立轮廓。", "jiaojiao"],
["badge-shield", "守护盾徽章", "守护盾徽章|盾牌徽章", "守护盾徽章轻轻摇摆，展示独立轮廓。", "jiaojiao"],
["badge-ribbon", "绶带奖章", "绶带奖章|奖章|圆形徽章", "绶带奖章轻轻摇摆，展示独立轮廓。", "jiaojiao"],
["badge-crown", "皇冠徽章", "皇冠徽章|王冠徽章", "皇冠徽章轻轻摇摆，展示独立轮廓。", "jiaojiao"],
["badge-leaf", "绿叶徽章", "绿叶徽章|成长徽章", "绿叶徽章轻轻摇摆，展示独立轮廓。", "jiaojiao"],
["bee", "蜜蜂", "蜜蜂|小蜜蜂", "蜜蜂扇动翅膀，轻轻上下飞舞。", "jiaojiao"],
["fly", "苍蝇", "苍蝇|小苍蝇", "苍蝇扇动翅膀，轻轻上下飞舞。", "jiaojiao"],
["mosquito", "蚊子", "蚊子|小蚊子", "蚊子扇动翅膀，轻轻上下飞舞。", "jiaojiao"],
  ["rainbow-sky", "彩虹天空", "彩虹天空|rainbow-sky", "七色立体圆弧铺开彩虹天空。", "jiaojiao"],
  ["sky-fish", "天空小鱼", "天空小鱼|sky-fish", "三条小鱼在天空里摆尾游动。", "jiaojiao"],
  ["cotton-cloud", "棉花糖云", "棉花糖云|cotton-cloud", "三朵棉花糖在空中轻轻摇摆。", "jiaojiao"],
  ["light-seed", "光的种子", "光的种子|light-seed", "种子摇晃，壳缝透出暖光。", "jiaojiao"],
  ["light-sprout", "好奇光苗", "好奇光苗|light-sprout", "光苗伸出两片叶子，轻轻摇摆。", "jiaojiao"],
  ["light-torch", "好奇光筒", "好奇光筒|light-torch", "光筒摇动，镜头上方冒出光点。", "jiaojiao"],
  ["sleepy-star", "睡着的星星", "睡着的星星|sleepy-star", "星星轻轻摇动。", "jiaojiao"],
  ["star-friends", "星星朋友", "星星朋友|star-friends", "五颗星星在空中跳动。", "jiaojiao"],
  ["light-trail", "远方光路", "远方光路|light-trail", "光点接成一条通往远方的小路。", "jiaojiao"],
  ["light-thread", "光的丝线", "光的丝线|light-thread", "光丝围成螺旋，缓缓转动。", "jiaojiao"],
  ["bobo-light", "啵啵兽", "啵啵兽|bobo-light", "啵啵兽摇头跳动，冒出三颗小星星。", "jiaojiao"],
  ["light-book", "绘本第一页", "绘本第一页|light-book", "打开的绘本轻轻翻动纸页。", "jiaojiao"],
  ["pink-sky", "粉色天空", "粉色天空|pink-sky", "一片粉色云幕铺在头顶。", "jiaojiao"],
  ["blue-sky", "蓝色天空", "蓝色天空|blue-sky", "一片蓝色云幕铺在头顶。", "jiaojiao"],

['poop','便便','大便|便便|粑粑','长着圆眼睛的螺旋便便轻轻扭扭身子。','jiaojiao'],
['gas-cloud','一团气体','一团气体|气体|气团','淡紫色气团轻轻摇晃，鼓起蓬松的小团。','jiaojiao'],
['fart','一个屁','一个屁|屁|臭屁','黄绿色小气尾摇晃，带着一道闪电。','jiaojiao'],
["ufo","飞碟","飞碟|UFO|不明飞行物","飞碟的轮廓和部件可独立查看。","jiaojiao"],
["fighter-jet","战斗机","战斗机|战机|喷气机","战斗机的轮廓和部件可独立查看。","jiaojiao"],
["procedural","新道具","新道具|道具补全|新东西","孩子提到的清单外道具，会按名称补全一个新造型。","jiaojiao"],
["spaceship","宇宙飞船","宇宙飞船|星际飞船|太空飞船","宇宙飞船的轮廓和部件可独立查看。","jiaojiao"],
["battleship","战舰","战舰|军舰|驱逐舰","战舰的轮廓和部件可独立查看。","jiaojiao"],
["tank","坦克","坦克|装甲车","坦克的轮廓和部件可独立查看。","jiaojiao"],
["toy-bomb","炸弹","炸弹|卡通炸弹","炸弹的轮廓和部件可独立查看。","jiaojiao"],
["toy-pistol","手枪","手枪|玩具枪|玩具手枪","手枪的轮廓和部件可独立查看。","jiaojiao"],
["toy-launcher","火箭筒","火箭筒|发射器|火箭发射器","火箭筒的轮廓和部件可独立查看。","jiaojiao"],
["toy-sword","宝剑","宝剑|剑|长剑","宝剑的轮廓和部件可独立查看。","jiaojiao"],
["toy-shield","盾牌","盾牌|盾","盾牌的轮廓和部件可独立查看。","jiaojiao"],
["toy-bow","弓箭","弓箭|弓","弓箭的轮廓和部件可独立查看。","jiaojiao"],
["toy-cannon","大炮","大炮|炮台|加农炮","大炮的轮廓和部件可独立查看。","jiaojiao"],
["water-gun","水枪","水枪|喷水枪","水枪的轮廓和部件可独立查看。","jiaojiao"],
["gamepad","游戏手柄","游戏手柄|手柄|游戏机","游戏手柄的轮廓和部件可独立查看。","jiaojiao"],
["yoyo","悠悠球","悠悠球|溜溜球","悠悠球的轮廓和部件可独立查看。","jiaojiao"],
["chess","国际象棋","国际象棋|象棋棋盘|棋盘","国际象棋的轮廓和部件可独立查看。","jiaojiao"],
  ...PROP_COLLECTION.map(p => {
    const siblings = PROP_COLLECTION.filter(other => other.seed === p.seed);
    let common = siblings[0].name;
    while (common && !siblings.every(other => other.name.endsWith(common))) common = common.slice(1);
    return [p.id, p.name, p.variant === 0 && common.length > 1 ? `${p.name}|${common}` : p.name, `${p.name}轻轻活动，回应你的触碰。`, 'jiaojiao'];
  }),
  ["car", "小汽车", "小汽车|汽车|轿车|car", "小汽车向前滑动，再回到原位。", "jiaojiao"],
  ["bus", "公交车", "公交车|巴士|bus", "公交车向前滑动，再回到原位。", "jiaojiao"],
  ["train", "小火车", "小火车|火车|train", "小火车向前滑动，再回到原位。", "jiaojiao"],
  ["truck", "卡车", "卡车|货车|truck", "卡车向前滑动，再回到原位。", "jiaojiao"],
  ["bicycle", "自行车", "自行车|单车|bicycle", "自行车向前滑动，再回到原位。", "jiaojiao"],
  ["scooter", "滑板车", "滑板车|滑板车|scooter", "滑板车向前滑动，再回到原位。", "jiaojiao"],
  ["airplane", "飞机", "飞机|飞机|airplane", "飞机向前滑动，再回到原位。", "jiaojiao"],
  ["helicopter", "直升机", "直升机|直升机|helicopter", "直升机向前滑动，再回到原位。", "jiaojiao"],
  ["submarine", "潜水艇", "潜水艇|潜艇|submarine", "潜水艇向前滑动，再回到原位。", "jiaojiao"],
  ["sailboat", "帆船", "帆船|帆船|sailboat", "帆船向前滑动，再回到原位。", "jiaojiao"],
  ["apple", "苹果", "苹果|apple", "苹果轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["banana", "香蕉", "香蕉|banana", "香蕉轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["watermelon", "西瓜", "西瓜|watermelon", "西瓜轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["bread", "面包", "面包|bread", "面包轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["cake", "蛋糕", "蛋糕|cake", "蛋糕轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["icecream", "冰淇淋", "冰淇淋|冰激凌|雪糕|icecream", "冰淇淋轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["donut", "甜甜圈", "甜甜圈|甜甜圈|donut", "甜甜圈轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["pizza", "披萨", "披萨|pizza", "披萨轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["burger", "汉堡", "汉堡|burger", "汉堡轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["lollipop", "棒棒糖", "棒棒糖|lollipop", "棒棒糖轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["ball", "皮球", "皮球|ball", "皮球轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["teddy", "泰迪熊", "泰迪熊|小熊|玩具熊|teddy", "泰迪熊轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["blocks", "积木", "积木|blocks", "积木轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["kite", "风筝", "风筝|kite", "风筝轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["drum", "小鼓", "小鼓|鼓|drum", "小鼓轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["top", "陀螺", "陀螺|top", "陀螺轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["duck", "小黄鸭", "小黄鸭|鸭子|黄鸭|duck", "小黄鸭轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["robot-toy", "玩具机器人", "玩具机器人|玩具机器人|robot-toy", "玩具机器人轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["rocking-horse", "木马", "木马|rocking-horse", "木马轻轻摇动，回应你的触碰。", "jiaojiao"],
  ["xylophone", "木琴", "木琴|木琴|xylophone", "木琴轻轻摇动，回应你的触碰。", "jiaojiao"],
  [
    "bridge",
    "彩虹小桥",
    "桥",
    "桥板一块块亮起来，伙伴可以在桥边碰头。",
    "lingdang",
  ],
  [
    "garden",
    "问题花园",
    "花园|花朵|花|种子|植物",
    "花瓣展开了，藏在花心的小星星跟着探出头。",
    "lingdang-mom",
  ],
  [
    "tree",
    "发现果树",
    "树|森林",
    "树枝轻轻摇起来，枝头的星星果一颗颗亮了。",
    "lingdang-mom",
  ],
  [
    "house",
    "好奇小屋",
    "房子|小屋|帐篷|家园|城堡|图书馆",
    "屋门打开了，窗里亮着一盏等朋友来的灯。",
    "allie",
  ],
  [
    "telescope",
    "星光望远镜",
    "望远镜|观察镜|放大镜",
    "镜筒转起来，旁边的星星按顺序亮了。",
    "lingdang",
  ],
  [
    "robot",
    "问题小机器人",
    "机器人|机械伙伴|机器狗",
    "机器人挥挥手，胸前的问号灯亮了。",
    "douya",
  ],
  [
    "boat",
    "探问小船",
    "船|潜艇|潜水艇|潜航",
    "船桨划起来，船边浮出一串小气泡。",
    "gulu",
  ],
  [
    "rocket",
    "好奇火箭",
    "火箭|飞行器",
    "推进器亮起来，火箭在底座上轻轻升起。",
    "gulu",
  ],
  [
    "portal",
    "想象传送门",
    "传送|任意门|通道|时空门",
    "门里的光圈转起来，两边的星星互相眨眼。",
    "wanneng",
  ],
  [
    "balloon",
    "云朵气球",
    "气球|热气球|飞艇",
    "气球牵起小篮子，慢慢升到绳子顶端。",
    "domi",
  ],
  [
    "windmill",
    "提问风车",
    "风车|风力|风扇",
    "风车转起来，把星光送给旁边的小灯。",
    "aigaicuo",
  ],
  [
    "fountain",
    "气泡喷泉",
    "喷泉|水池|气泡|泡泡|水车",
    "三束气泡轮流跳起来，落回自己的小水池。",
    "prank-doctor",
  ],
  [
    "music",
    "星星音乐台",
    "音乐|钢琴|吉他|鼓|唱歌|琴|乐器",
    "彩色琴键轮流跳动，星星音符也跟着跳起来。",
    "xiaolu-teacher",
  ],
  [
    "bakery",
    "分享点心台",
    "包子|面包|厨房|点心|蛋糕|食物|餐厅",
    "蒸笼打开了，热气托起一只圆圆的星星包。",
    "zhuxiaodi",
  ],
  [
    "swing",
    "云朵秋千",
    "秋千|摇椅|游乐场",
    "秋千轻轻摇起来，吊绳旁的铃铛跟着摆动。",
    "nini",
  ],
  [
    "lantern",
    "好奇灯塔",
    "灯|灯塔|光|太阳|导航|指南针",
    "灯罩慢慢升起，灯塔周围的小光点跳起来。",
    "dengdeng",
  ],
  [
    "stage",
    "小小表演台",
    "舞台|剧场|表演|演出",
    "帷幕拉开，聚光灯亮在你留给朋友的位置。",
    "maoge",
  ],
  [
    "ladder",
    "折叠探索梯",
    "梯|绳|攀爬",
    "梯级从下到上轻轻抬起，顶端的小旗也摇起来。",
    "lvdou",
  ],
  [
    "camera",
    "发现照相机",
    "相机|照相|摄影|照片",
    "镜头闪了一下，一张星星图案的相片升出来。",
    "fendou",
  ],
].map(([id, name, words, response, helper]) =>
  Object.freeze({ id, name, words, response, helper }),
);

export const PROP_STATES = ["idle", "working", "active"];
export const PROP_CATEGORIES = {"car":"交通工具","bus":"交通工具","train":"交通工具","truck":"交通工具","bicycle":"交通工具","scooter":"交通工具","airplane":"交通工具","helicopter":"交通工具","submarine":"交通工具","sailboat":"交通工具","apple":"食物","banana":"食物","watermelon":"食物","bread":"食物","cake":"食物","icecream":"食物","donut":"食物","pizza":"食物","burger":"食物","lollipop":"食物","ball":"玩具","teddy":"玩具","blocks":"玩具","kite":"玩具","drum":"玩具","top":"玩具","duck":"玩具","robot-toy":"玩具","rocking-horse":"玩具","xylophone":"玩具"};
export const PROP_IDS = [...CREATION_KITS.map((kit) => kit.id), "prototype"];
Object.assign(PROP_CATEGORIES, {"ufo":"交通工具","procedural":"通用","fighter-jet":"交通工具","spaceship":"交通工具","battleship":"交通工具","tank":"交通工具","toy-bomb":"玩具","toy-pistol":"玩具","toy-launcher":"玩具","toy-sword":"玩具","toy-shield":"玩具","toy-bow":"玩具","toy-cannon":"玩具","water-gun":"玩具","gamepad":"玩具","yoyo":"玩具","chess":"玩具"});
Object.assign(PROP_CATEGORIES, Object.fromEntries(PROP_COLLECTION.map(p => [p.id, p.category])));
Object.assign(PROP_CATEGORIES,{poop:'玩具','gas-cloud':'玩具',fart:'玩具'});

Object.assign(PROP_CATEGORIES,{"little-flame": "玩具", "gold-coin": "玩具", "cash": "玩具", "purple-diamond": "玩具", "battery": "玩具", "growth-bean": "玩具", "badge-star": "玩具", "badge-shield": "玩具", "badge-ribbon": "玩具", "badge-crown": "玩具", "badge-leaf": "玩具", "bee": "玩具", "fly": "玩具", "mosquito": "玩具"});

Object.assign(PROP_CATEGORIES, Object.fromEntries(RLINE_MODEL_WORDS.map(n => [n.assetId.slice(5), 'R线名词模型库'])));

PROP_CATEGORIES['swimming-pool']='场景道具';
Object.assign(PROP_CATEGORIES,{'festival-moon':'中秋节','festival-mooncake':'中秋节','festival-lantern':'中秋节'});

Object.assign(PROP_CATEGORIES, Object.fromEntries(ANIMAL_WORDS.map(animal => [animal.model, '动物与生肖'])));

Object.assign(PROP_CATEGORIES, Object.fromEntries(MID_AUTUMN_PROPS.map(prop => [prop.model, '中秋节'])));
