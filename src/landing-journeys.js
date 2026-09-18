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

Object.assign(journeys,{
  music:{title:'朵朵的云朵音乐会',child:'朵朵',avatar:'cloud',image:'journey-music',backdrop:'question',theme:'blue',duration:19,quote:'小声唱歌的云，也应该被大家听见。',creation:'一场给每朵云都留了声音的音乐会',stops:['发现云会唱歌','给小声音留位置','造出了轮流演奏的舞台'],steps:[
    {chapter:0,time:'02:18',icon:'music',speaker:'鼓鼓',question:'这朵云不下雨，你猜它在做什么？',answer:'它在唱歌！雨点就是它的小鼓槌。',effect:'云朵轻轻抖动，雨点敲出节奏。朵朵给一朵普通的云，找到了新的本领。',ideas:['把雨点变成鼓槌'],invention:'雨点小鼓槌'},
    {chapter:1,time:'08:35',icon:'ear',speaker:'书桌小鸮',question:'大云唱得很响，小云的声音听不见，怎么办？',answer:'大家先小声一点，听完小云的，再一起唱！',effect:'伙伴们轮流安静下来，小云终于唱完了自己的那一句。音乐会多了一条认真倾听的约定。',ideas:['给小声音单独的时间'],invention:'小声音优先约定'},
    {chapter:2,time:'15:41',icon:'sparkles',speaker:'雪团小兔',question:'怎样让每朵云都知道什么时候轮到自己？',answer:'做一排会发光的星星，亮到谁，谁就唱！',effect:'一排星星依次亮起，云朵接着唱出不同的声音。朵朵把刚才的约定，做成了能一起玩的舞台。',ideas:['用星星安排出场','让光来指挥合唱'],invention:'星星轮唱舞台'},
  ]},
  lantern:{title:'阿布的晚安灯塔',child:'阿布',avatar:'chick',image:'journey-lantern',backdrop:'moon',theme:'sage',duration:17,quote:'灯塔也可以小声一点，让朋友好好睡觉。',creation:'一座会为晚归朋友轻轻亮起的灯塔',stops:['想给晚归朋友照路','照顾想睡觉的伙伴','发明了温柔的路灯'],steps:[
    {chapter:0,time:'01:52',icon:'lamp',speaker:'月牙小猫',question:'天黑了，晚回家的朋友怎么找到路？',answer:'我要造一个大灯塔，让大家都能看见家！',effect:'一座灯塔亮了起来，星球上的小路不再漆黑。阿布给晚归的朋友留下了一个方向。',ideas:['给晚归朋友造灯塔'],invention:'回家方向灯塔'},
    {chapter:1,time:'07:09',icon:'moon',speaker:'小荷',question:'可是灯太亮，想睡觉的朋友睡不着了。',answer:'那就把光照在路上，不要照到他们的窗户。',effect:'灯光低下头，沿着小路铺开。窗户重新暗了下来，照路和睡觉终于可以同时发生。',ideas:['只照路不照窗户'],invention:'低头照路的灯'},
    {chapter:2,time:'14:22',icon:'footprints',speaker:'鼓鼓',question:'没有人走过来的时候，灯还要一直亮吗？',answer:'听到脚步再亮，人走过去就慢慢睡着。',effect:'朋友走近时，小灯一盏盏亮起；走远后，光又轻轻暗下去。阿布让这座灯塔学会了等待。',ideas:['用脚步唤醒灯','让路灯慢慢入睡'],invention:'脚步唤醒小路'},
  ]},
});
