// Scene-specific names and collision footprints. Exploration never answers a story prompt.
const HOMES = { bakery: '星星小屋', reef: '海底会合点', cloud: '云端会合点', home: '暖暖小屋', meadow: '想法树下', observatory: '发射营地', pocket: '口袋营地', moon: '月球营地' };
const LANDMARKS = {
  bakery: [[-1.62,-2.22,1.55],[2.55,-1.69,1.02],[2.7,.95,.9]],
  observatory: [[-2.5,-1.83,1.05],[1.88,-1.74,.9],[-2.8,1.25,.7]],
  meadow: [[-2.73,-1.8,.48],[2.66,-2.12,.45],[-2.5,.63,.85]],
  reef: [[-2.94,-2.15,.75],[2.87,-2.22,.65],[-2.74,.59,.7]],
  home: [[-2.29,-2.23,1.3],[1.45,-2.06,1.55]],
  cloud: [[-1.1,-2.78,.4],[1.6,-2.78,.4],[2.84,.55,.75]],
  pocket: [[-2.65,-.82,.9],[2.62,-1.72,.75],[-3,-3,.6],[-2,-3,.6],[-1,-3,.6],[0,-3,.6],[1,-3,.6],[2,-3,.6],[3,-3,.6]],
  moon: [[1.87,-2.2,.3],[3.1,-1.68,.48]],
};
export function explorationConfig(worldId, storyId = 'wow') {
  const space = worldId === 'moon' || worldId === 'observatory';
  const sky = worldId === 'cloud';
  const ocean = worldId === 'reef';
  const fabric = worldId === 'pocket';
  return {
    home: HOMES[worldId] || '伙伴会合点', theme: space ? 'space' : sky ? 'sky' : ocean ? 'ocean' : fabric ? 'fabric' : 'garden',
    landmarks: LANDMARKS[worldId] || [],
    names: space ? ['星光环湾','水晶花地','月石小径','星铃坡'] : sky ? ['云泡泡湾','云朵花地','软云小径','风铃坡'] : ocean ? ['小鱼湾','珊瑚花地','贝壳小径','海铃坡'] : fabric ? ['纽扣小湾','布花草地','线团小径','纽扣风铃'] : storyId === 'debate' ? ['涟漪湖','点头花地','蘑菇小径','风铃坡'] : ['小鱼湖','弹弹花地','蘑菇小径','风铃坡'],
    hints: space ? ['走近星光环，小星星会跳起来','走过水晶，看看它们怎样回应你','月石也会轻轻蹦一下','靠近星铃，摇出一圈小星光'] : sky ? ['靠近云湾，泡泡会轻轻冒出来','走到花边，看软云一朵朵弹起来','慢慢走，脚边的云会点头','靠近风铃，摇出一圈小星光'] : ocean ? ['靠近小湾，小鱼会来打招呼','走过珊瑚，看看它们怎样回应你','慢慢走，小贝壳也会点头','靠近海铃，摇出一圈小星光'] : fabric ? ['走到岸边，彩色纽扣跳起来','走到花边，布花一朵朵弹起来','慢慢走，线团也会轻轻蹦一下','靠近风铃，摇出一圈小星光'] : null,
  };
}
