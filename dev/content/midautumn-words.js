// Festival extensions are creative vocabulary, separate from the original R-line source.
export const MID_AUTUMN_PROPS=Object.freeze([
  {word:'star',zh:'星星',model:'festival-star',aliases:['stars']},
  {word:'cloud',zh:'云朵',model:'festival-cloud',aliases:['clouds']},
  {word:'osmanthus',zh:'桂花',model:'festival-osmanthus',aliases:['osmanthus flower','osmanthus flowers']},
  {word:'pomelo',zh:'柚子',model:'festival-pomelo',aliases:['pomelos']},
  {word:'tea',zh:'茶',model:'festival-tea',aliases:[]},
  {word:'teapot',zh:'茶壶',model:'festival-teapot',aliases:['teapots']},
  {word:'moonlight',zh:'月光',model:'festival-moonlight',aliases:[]},
  {word:'firework',zh:'烟花',model:'festival-firework',aliases:['fireworks']},
  {word:'gift',zh:'礼物',model:'festival-gift',aliases:['gifts']},
  {word:'fan',zh:'扇子',model:'festival-fan',aliases:['fans']},
]);

export const MID_AUTUMN_EXTRA_WORDS=Object.freeze([
  {word:'autumn',zh:'秋天'}, {word:'festival',zh:'节日'}, {word:'night',zh:'夜晚'},
  {word:'reunion',zh:'团圆'}, {word:'full',zh:'圆满的'}, {word:'golden',zh:'金色的'},
  {word:'warm',zh:'温暖的'}, {word:'delicious',zh:'美味的'}, {word:'glowing',zh:'发光的'},
  {word:'shiny',zh:'闪亮的'}, {word:'beautiful',zh:'美丽的'}, {word:'share',zh:'分享'},
  {word:'wish',zh:'许愿'}, {word:'shine',zh:'闪耀'}, {word:'light',zh:'点亮'},
  {word:'celebrate',zh:'庆祝'}, {word:'together',zh:'一起'}, {word:'drink',zh:'喝'},
]);

export const MID_AUTUMN_CHAPTER_WORDS=Object.freeze([
  'moon','mooncake','lantern','rabbit',...MID_AUTUMN_PROPS.map(prop=>prop.word),
  'family','tree','flower','cake','book',
  'round','bright','sweet','full','golden','warm','delicious','glowing','shiny','beautiful',
  'red','yellow','orange','white','blue','big','little','happy',
  'eat','drink','jump','fly','dance','spin','grow','share','wish','shine','light','celebrate',
  'autumn','festival','night','reunion','together',
]);
