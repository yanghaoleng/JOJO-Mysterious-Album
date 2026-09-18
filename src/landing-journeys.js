// Authored fictional examples. Questions, answers, audio and illustrations are demonstrations.
export const journeys={
  candy:{title:'小芽的甜甜星球',child:'小芽',avatar:'strawberry',image:'journey-candy',quote:'我要种一片棒棒糖森林，每个朋友都能分到一根。',creation:'一片可以分享的棒棒糖森林',steps:[
    {speaker:'鼓鼓',question:'今天，你想让星球上多出什么？',answer:'我要一根比我还高的草莓棒棒糖！',effect:'一根大大的草莓棒棒糖从云里冒出来，鼓鼓抬起头，好奇地看着它。'},
    {speaker:'雪团小兔',question:'如果大家都想尝一口，一根够吗？',answer:'那就种一片棒棒糖森林，每个朋友都有一根！',effect:'一个愿望长成了好几个。棒棒糖接连冒出来，伙伴们围了过来。'},
    {speaker:'小荷',question:'想吃不同味道的朋友，怎么办？',answer:'草莓的，苹果的，还有牛奶的，让他们自己选！',effect:'森林里有了不同颜色和味道。小芽的星球，变成了大家可以一起分享的地方。'},
  ]},
  moon:{title:'球球的月球快递',child:'球球',avatar:'astronaut',image:'journey-moon',quote:'火箭可以送快递吗？月亮上的朋友还没吃过蛋糕。',creation:'一艘带着蛋糕座位的月光火箭',steps:[
    {speaker:'书桌小鸮',question:'要去月球，你想用什么办法？',answer:'我要造一个能送快递的大火箭！',effect:'一艘奶油色火箭出现了。它有大大的舷窗，也留出了放快递的位置。'},
    {speaker:'雪团小兔',question:'给月球上的朋友带点什么？',answer:'带蛋糕呀！他们可能还没吃过草莓蛋糕呢。',effect:'旅程多了一个新任务：把草莓蛋糕送给月球上的朋友。'},
    {speaker:'月牙小猫',question:'飞得那么快，蛋糕会不会被颠坏？',answer:'给蛋糕加一个软软的座位，再系上安全带！',effect:'火箭多了一个专门保护蛋糕的软座。球球的第二个主意，改变了第一个发明。'},
  ]},
  question:{title:'米粒的第 N 个为什么',child:'米粒',avatar:'dinosaur',image:'journey-question',quote:'如果每个人都当船长，谁来发现新的小岛呢？',creation:'一艘大家轮流掌舵、一起选路的小船',steps:[
    {speaker:'书桌小鸮',question:'开船的时候，大家都想当船长，听谁的？',answer:'可以轮流呀，一人当一会儿船长！',effect:'船上多了一条大家认可的小约定：轮流掌舵，每个朋友都有机会。'},
    {speaker:'雪团小兔',question:'轮到别人当船长，你还能做些什么？',answer:'我来看有没有小岛，发现了就告诉大家！',effect:'米粒找到了另一个喜欢的角色——发现小岛的人。伙伴们开始分工探索。'},
    {speaker:'书桌小鸮',question:'如果你们想去不同的小岛呢？',answer:'先听听他们为什么想去，再一起选一条路。',effect:'地图上有了两个目的地。大家先分享理由，再商量下一站，一场辩论长出了新的玩法。'},
  ]},
};

export const journeyChapters=[
  {number:'第一章',title:'第一束好奇的光',icon:'sparkles'},
  {number:'第二章',title:'观点小剧场',icon:'messages-square'},
  {number:'第三章',title:'登月计划',icon:'rocket'},
];
// These are internally consistent authored sample logs, not tracked child data.
const logs={
  candy:{duration:18,theme:'rose',wish:'我想让每个朋友，都有自己喜欢的糖。',route:'从一根棒棒糖，走到一座分享森林',stops:['许下第一个愿望','想到了分享的办法','创造出三种味道'],steps:[
    {chapter:0,time:'02:14',title:'一个大大的愿望',icon:'candy',ideas:['把棒棒糖变得比自己还高'],invention:'巨人草莓棒棒糖',note:'大小，由小芽重新定义。'},
    {chapter:1,time:'07:36',title:'“我的”变成了“大家的”',icon:'users',ideas:['把一根糖种成一片森林'],invention:'每人一根的森林',note:'分享的办法，是小芽自己想的。'},
    {chapter:2,time:'15:02',title:'让朋友自己选',icon:'sprout',ideas:['创造不同口味','把选择权交给朋友'],invention:'自由选味花园',note:'同一个世界，容得下不同的喜欢。'},
  ]},
  moon:{duration:21,theme:'blue',wish:'我要把蛋糕，好好地送到月亮上。',route:'从想飞上月球，到照顾一块小蛋糕',stops:['想到火箭快递','决定给朋友送蛋糕','改造了火箭座位'],steps:[
    {chapter:0,time:'03:08',title:'火箭也可以送快递',icon:'rocket',ideas:['把火箭变成快递车'],invention:'月球快递火箭',note:'球球给登月加上了自己的任务。'},
    {chapter:1,time:'09:42',title:'给没见过的朋友一份礼物',icon:'cake-slice',ideas:['给月球朋友带草莓蛋糕'],invention:'第一份月球蛋糕',note:'目的地没变，出发的理由变了。'},
    {chapter:2,time:'17:26',title:'为蛋糕发明一个座位',icon:'armchair',ideas:['给蛋糕做软座','用安全带保护蛋糕'],invention:'蛋糕专属安全座',note:'一个新问题，让原来的发明又长大了一点。'},
  ]},
  question:{duration:16,theme:'sage',wish:'我也想当船长，也想听听大家的想法。',route:'从争着当船长，到一起决定下一站',stops:['提出轮流掌舵','探索了分工和选路','还没出发，留待下一次'],steps:[
    {chapter:0,time:'02:40',title:'船长可以轮流当',icon:'sailboat',ideas:['轮流当船长'],invention:'轮流船长约定',note:'米粒创造了一条大家都能参与的规则。'},
    {chapter:1,time:'08:12',title:'我来发现新的小岛',icon:'telescope',ideas:['船长之外也能有自己的工作'],invention:'小岛发现员',note:'新的角色，不是故事预先安排的。'},
    {chapter:1,time:'13:54',title:'先听理由，再一起选',icon:'route',ideas:['先听每个人的理由','一起商量航线'],invention:'一起选路的地图',note:'米粒用对话，把分歧变成了新玩法。'},
  ]},
};
for(const [id,log] of Object.entries(logs)){
  const journey=journeys[id];
  Object.assign(journey,{...log,steps:journey.steps.map((step,i)=>({...step,...log.steps[i]}))});
}
