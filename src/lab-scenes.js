import * as THREE from 'three';
import { applyBackgroundCanvasStyle } from './background-style.js?v=20260828-style-editor-v2';
import { PAPER, PR, Sketch } from './sketch.js';
import { hashStr } from './rng.js';

const C = {
  ink: [55, 51, 45],
  moss: [103, 132, 105],
  leaf: [130, 154, 113],
  gold: [204, 168, 92],
  sky: [142, 174, 184],
  blue: [92, 112, 151],
  indigo: [49, 55, 88],
  rose: [191, 132, 126],
  clay: [174, 123, 91],
  wood: [153, 118, 79],
  snow: [222, 229, 224],
};

export const SCENE_GROUPS = ['全部', '日常', '自然', '奇遇'];

const GROUND_SCENE_HORIZONS = Object.freeze({
  'paper-ground': 450,
  'classroom-desk': 470,
  library: 555,
  attic: 540,
  'breakfast-table': 470,
  'rainy-window': 545,
  meadow: 510,
  'mushroom-forest': 555,
  seaside: 515,
  greenhouse: 550,
  'paper-creek': 520,
  'snow-globe': 515,
  'castle-window': 550,
  moon: 530,
  underwater: 590,
  train: 520,
  rooftop: 575,
  'blanket-fort': 580,
  'music-stage': 565,
});

const BACKDROP_WORLD_HEIGHT = 3.94;
const BACKDROP_WORLD_TOP = .12 + BACKDROP_WORLD_HEIGHT / 2;

export const LAB_SCENES = [
  { id: 'paper-ground', group: '日常', name: '纸上地面', hint: '一条铅笔地面线', floorY: -1.02, scale: 1.08, motion: 'ground', line: '我们先站在最简单的纸上地面。' },
  { id: 'classroom-desk', group: '日常', name: '教室书桌', hint: '课本、铅笔和桌面', floorY: -.72, scale: .82, motion: 'ground', line: '现在我站在教室的书桌上，旁边还有一支铅笔。' },
  { id: 'library', group: '日常', name: '安静图书馆', hint: '被书架轻轻围住', floorY: -1.02, scale: 1, motion: 'ground', line: '这里是安静的图书馆，书架上藏着很多故事。' },
  { id: 'attic', group: '日常', name: '玩具阁楼', hint: '旧木箱和小玩具', floorY: -1.02, scale: .98, motion: 'ground', line: '我们到了玩具阁楼，旧木箱里也许藏着新朋友。' },
  { id: 'breakfast-table', group: '日常', name: '早餐餐桌', hint: '杯子、盘子和晨光', floorY: -.7, scale: .8, motion: 'ground', line: '现在我站在早餐桌上，晨光刚好照进来。' },
  { id: 'rainy-window', group: '日常', name: '雨天窗台', hint: '玻璃雨滴和窗沿', floorY: -.9, scale: .94, motion: 'ground', line: '窗外正在下雨，我会听一听雨点的声音。' },
  { id: 'meadow', group: '自然', name: '萤火草地', hint: '草叶和暖色萤火', floorY: -1.02, scale: 1.04, motion: 'breeze', line: '我们来到了萤火草地，草叶正在轻轻摇动。' },
  { id: 'mushroom-forest', group: '自然', name: '蘑菇森林', hint: '大蘑菇和树影', floorY: -1.02, scale: .94, motion: 'breeze', line: '这里是蘑菇森林，每一把蘑菇伞都像小屋顶。' },
  { id: 'seaside', group: '自然', name: '贝壳海边', hint: '浅浪、沙滩和贝壳', floorY: -.94, scale: 1, motion: 'breeze', line: '海浪慢慢靠近，又慢慢退回去了。' },
  { id: 'greenhouse', group: '自然', name: '温室花房', hint: '玻璃拱顶和盆栽', floorY: -1.02, scale: .96, motion: 'breeze', line: '温室里有很多新叶子，它们都朝着光生长。' },
  { id: 'paper-creek', group: '自然', name: '纸船小溪', hint: '石头、浅水和纸船', floorY: -.9, scale: .88, motion: 'breeze', line: '一只纸船正从小溪里经过，我们和它打个招呼吧。' },
  { id: 'snow-globe', group: '自然', name: '雪花玻璃球', hint: '玻璃罩里的小雪', floorY: -.76, scale: .78, motion: 'snow', line: '我们进了雪花玻璃球，雪会慢慢落在身边。' },
  { id: 'castle-window', group: '奇遇', name: '城堡窗台', hint: '石头拱窗和远山', floorY: -.9, scale: .92, motion: 'breeze', line: '我站在城堡的窗台上，可以看见很远的地方。' },
  { id: 'clouds', group: '奇遇', name: '云朵里面', hint: '软云层和轻漂浮', floorY: -.7, scale: .96, motion: 'float', line: '云朵把我轻轻托起来，现在脚下软绵绵的。' },
  { id: 'space', group: '奇遇', name: '星星宇宙', hint: '失重漂浮和小行星', floorY: -.72, scale: .94, motion: 'zero-g', line: '我们到了宇宙，身体会像没有重量一样慢慢漂浮。' },
  { id: 'moon', group: '奇遇', name: '月球表面', hint: '环形山和远处地球', floorY: -.88, scale: .92, motion: 'moon-hop', line: '月球上的重力很轻，走一步也会像小跳跃。' },
  { id: 'underwater', group: '奇遇', name: '海底气泡', hint: '水草、气泡和慢漂流', floorY: -.8, scale: .9, motion: 'underwater-ground', line: '海底的水草沿着地面轻轻摇，我们会慢慢走过气泡。' },
  { id: 'train', group: '奇遇', name: '慢火车车厢', hint: '窗外风景缓缓经过', floorY: -1.01, scale: .96, motion: 'train', line: '慢火车已经出发，窗外的风景正在经过。' },
  { id: 'rooftop', group: '奇遇', name: '屋顶晚风', hint: '烟囱、远屋和风', floorY: -.91, scale: .94, motion: 'breeze', line: '屋顶的晚风有一点凉，我们可以一起看远处的灯。' },
  { id: 'blanket-fort', group: '奇遇', name: '被窝城堡', hint: '毯子、枕头和小灯', floorY: -.91, scale: .9, motion: 'ground', line: '被窝城堡已经搭好了，这里只说悄悄话。' },
  { id: 'giant-pocket', group: '奇遇', name: '巨人口袋', hint: '线脚、纽扣和布纹', floorY: -.88, scale: .86, motion: 'pocket', line: '我们躲进了巨人的口袋，走路时这里会轻轻晃动。' },
  { id: 'music-stage', group: '奇遇', name: '音乐小舞台', hint: '幕布、灯光和节拍', floorY: -.98, scale: 1, motion: 'stage', line: '小舞台的灯亮了，现在轮到我们表演。' },
].map(scene => ({
  ...scene,
  hasGround: Number.isFinite(GROUND_SCENE_HORIZONS[scene.id]),
  horizonY: GROUND_SCENE_HORIZONS[scene.id] ?? null,
}));

export const sceneById = id => LAB_SCENES.find(item => item.id === id) || LAB_SCENES[0];

export function sceneHorizonWorldY(scene) {
  if (!scene?.hasGround) return null;
  return BACKDROP_WORLD_TOP - (scene.horizonY / 720) * BACKDROP_WORLD_HEIGHT;
}

export function sceneFloorY(scene) {
  if (!scene?.hasGround) return scene?.floorY ?? -1;
  const motionLift = scene.motion === 'moon-hop' ? .055 : scene.motion === 'snow' ? .025 : scene.motion === 'stage' ? .014 : 0;
  return Math.min(scene.floorY, sceneHorizonWorldY(scene) - motionLift - .045);
}

function rect(s, x, y, w, h, col, alpha = .15) {
  s.washFill([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], col, { layers: 2, alpha, bleed: .35, blooms: false });
}

function blob(s, x, y, rx, ry, col, alpha = .17) {
  const pts = s.blobPts(x, y, rx, ry, 0, .45);
  s.washFill(pts, col, { layers: 2, alpha, bleed: .45, blooms: true });
  return pts;
}

function line(s, points, width = 2, alpha = .36, col = C.ink) {
  s.sline(points, width, alpha, `rgba(${col[0]},${col[1]},${col[2]},${alpha})`);
}

function circle(s, x, y, r, col = C.ink, alpha = .32) {
  const pts = s.blobPts(x, y, r, r, 0, .28);
  line(s, [...pts, pts[0]], 1.7, alpha, col);
}

function ground(s, y = 530, col = C.leaf) {
  rect(s, 0, y, 960, 220, col, .12);
  line(s, [[0, y], [150, y - 3], [330, y + 2], [520, y - 2], [720, y + 2], [960, y]], 3, .45);
}

function reinforceHorizon(s, config) {
  if (!config.hasGround) return;
  const y = config.horizonY;
  const groundColor = config.group === '日常' ? [205, 194, 171] : config.group === '自然' ? [166, 185, 143] : [174, 174, 156];
  rect(s, 0, y + 1, 960, 719 - y, groundColor, .055);
  rect(s, 0, y + 1, 960, 30, groundColor, .11);
  line(s, [[0, y], [155, y - 2], [320, y + 1], [486, y - 2], [650, y + 2], [812, y - 1], [960, y]], 3.2, .56, C.ink);
}

function grass(s, y, count = 18) {
  for (let i = 0; i < count; i++) {
    const x = 20 + i * (920 / Math.max(1, count - 1)) + s.jr(-12, 12);
    line(s, [[x, y], [x + s.jr(-7, 7), y - s.jr(10, 32)]], 1.2, .28, C.moss);
  }
}

function stars(s, count = 34) {
  for (let i = 0; i < count; i++) {
    const x = s.jr(30, 930), y = s.jr(28, 480), r = s.jr(1.5, 4.5);
    line(s, [[x - r, y], [x + r, y], [x, y], [x, y - r], [x, y + r]], 1.2, .62, C.gold);
  }
}

function books(s, x, y, cols, rows, cellW = 44, cellH = 62) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const bx = x + col * cellW + s.jr(-3, 3), by = y + row * cellH;
      rect(s, bx, by, cellW * s.jr(.55, .88), cellH - 10, s.pick([C.rose, C.sky, C.gold, C.moss]), .13);
      line(s, [[bx, by], [bx, by + cellH - 10], [bx + cellW * .7, by + cellH - 10]], 1.2, .24);
    }
  }
}

function paintScene(s, id) {
  const ctx = s.ctx;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, 960, 720);

  if (id === 'paper-ground') {
    ground(s, GROUND_SCENE_HORIZONS['paper-ground'], [219, 210, 187]);
    grass(s, GROUND_SCENE_HORIZONS['paper-ground'], 13);
  } else if (id === 'classroom-desk') {
    rect(s, 0, 0, 960, 430, [225, 218, 199], .1);
    line(s, [[110, 115], [110, 370], [390, 370], [390, 115], [110, 115]], 3, .28);
    books(s, 560, 120, 5, 2, 55, 68);
    rect(s, 0, 470, 960, 250, C.wood, .22); line(s, [[0, 470], [960, 470]], 4, .48);
    line(s, [[150, 560], [330, 520]], 8, .35, C.gold); circle(s, 760, 548, 44, C.sky, .28);
  } else if (id === 'library') {
    rect(s, 25, 70, 270, 490, C.wood, .09); rect(s, 665, 70, 270, 490, C.wood, .09);
    books(s, 48, 105, 5, 6, 46, 65); books(s, 690, 105, 5, 6, 46, 65);
    for (const x of [25, 295, 665, 935]) line(s, [[x, 70], [x, 570]], 3, .3);
    ground(s, 555, [214, 203, 181]);
  } else if (id === 'attic') {
    line(s, [[40, 260], [480, 42], [920, 260]], 5, .34, C.wood);
    line(s, [[160, 205], [160, 520]], 3, .28, C.wood); line(s, [[800, 205], [800, 520]], 3, .28, C.wood);
    rect(s, 80, 410, 210, 130, C.wood, .2); line(s, [[80, 445], [290, 445]], 2, .3);
    circle(s, 760, 480, 62, C.rose, .24); line(s, [[705, 500], [815, 500]], 2, .28);
    ground(s, 540, C.wood);
  } else if (id === 'breakfast-table') {
    rect(s, 0, 0, 960, 440, [231, 221, 198], .08);
    line(s, [[100, 80], [100, 370], [340, 370], [340, 80], [100, 80]], 3, .28);
    blob(s, 215, 215, 82, 68, C.sky, .1);
    rect(s, 0, 470, 960, 250, C.wood, .2); line(s, [[0, 470], [960, 470]], 4, .45);
    circle(s, 730, 548, 78, C.sky, .2); rect(s, 116, 504, 88, 95, C.gold, .12);
  } else if (id === 'rainy-window') {
    rect(s, 100, 60, 760, 500, C.sky, .12);
    line(s, [[100, 60], [860, 60], [860, 560], [100, 560], [100, 60], [480, 60], [480, 560]], 4, .4);
    for (let i = 0; i < 30; i++) {
      const x = s.jr(130, 830), y = s.jr(85, 500);
      line(s, [[x, y], [x - s.jr(2, 8), y + s.jr(12, 34)]], 1.4, .25, C.blue);
    }
    rect(s, 0, 545, 960, 175, C.wood, .17); line(s, [[0, 545], [960, 545]], 4, .42);
  } else if (id === 'meadow') {
    blob(s, 740, 130, 145, 65, C.sky, .1); blob(s, 215, 180, 120, 50, C.sky, .09);
    ground(s, 510, C.leaf); grass(s, 510, 28);
    for (let i = 0; i < 16; i++) circle(s, s.jr(70, 890), s.jr(330, 500), s.jr(2, 5), C.gold, .55);
  } else if (id === 'mushroom-forest') {
    for (const x of [70, 220, 740, 885]) {
      rect(s, x, 40, 56, 510, C.wood, .12); line(s, [[x + 25, 40], [x + 18, 550]], 4, .3, C.wood);
    }
    for (const [x, y, r] of [[150, 500, 90], [805, 480, 115], [330, 540, 55]]) {
      blob(s, x, y - r * .35, r, r * .46, C.rose, .22); rect(s, x - r * .14, y - r * .25, r * .28, r * .7, C.wood, .14);
    }
    ground(s, 555, C.moss);
  } else if (id === 'seaside') {
    rect(s, 0, 250, 960, 260, C.sky, .14);
    for (let y = 300; y < 510; y += 45) line(s, [[0, y], [180, y + 8], [350, y - 5], [560, y + 7], [760, y - 5], [960, y + 4]], 2, .24, C.blue);
    ground(s, 515, [216, 191, 140]);
    for (const [x, r] of [[120, 17], [790, 22], [865, 12]]) circle(s, x, 565, r, C.clay, .3);
  } else if (id === 'greenhouse') {
    line(s, [[90, 540], [90, 210], [180, 70], [780, 70], [870, 210], [870, 540]], 4, .34, C.moss);
    for (const x of [250, 480, 710]) line(s, [[x, 90], [x, 540]], 2, .22, C.moss);
    for (const x of [135, 290, 680, 830]) {
      rect(s, x - 35, 465, 70, 85, C.clay, .16);
      line(s, [[x, 470], [x + s.jr(-8, 8), 340]], 3, .3, C.moss);
      blob(s, x - 28, 380, 36, 22, C.leaf, .18); blob(s, x + 28, 420, 38, 22, C.leaf, .18);
    }
    ground(s, 550, [213, 200, 174]);
  } else if (id === 'paper-creek') {
    ground(s, 520, C.leaf); rect(s, 0, 455, 960, 150, C.sky, .16);
    for (let y = 478; y < 570; y += 32) line(s, [[0, y], [180, y + 6], [380, y - 4], [610, y + 5], [960, y]], 1.6, .22, C.blue);
    line(s, [[120, 505], [190, 535], [260, 505], [190, 555], [120, 505]], 2, .34);
    for (const x of [50, 335, 740, 890]) blob(s, x, 520 + s.jr(-25, 25), 30, 18, [130, 125, 110], .16);
  } else if (id === 'snow-globe') {
    rect(s, 0, 0, 960, 720, [224, 221, 207], .08);
    circle(s, 480, 330, 285, C.sky, .32); rect(s, 290, 570, 380, 90, C.wood, .16);
    for (let i = 0; i < 55; i++) circle(s, s.jr(230, 730), s.jr(85, 535), s.jr(1, 4), C.sky, .35);
    line(s, [[250, 515], [710, 515]], 3, .32);
  } else if (id === 'castle-window') {
    rect(s, 0, 0, 960, 720, [207, 199, 184], .11);
    blob(s, 480, 350, 290, 330, C.sky, .1);
    line(s, [[165, 560], [165, 260], [205, 155], [300, 80], [480, 45], [660, 80], [755, 155], [795, 260], [795, 560]], 8, .42);
    for (let y = 130; y < 620; y += 80) line(s, [[0, y], [160, y + 4], [210, y - 2]], 2, .2);
    rect(s, 0, 550, 960, 170, [179, 167, 145], .16); line(s, [[0, 550], [960, 550]], 5, .46);
  } else if (id === 'clouds') {
    rect(s, 0, 0, 960, 720, C.sky, .08);
    for (const [x, y, rx, ry] of [[160, 185, 180, 70], [760, 155, 220, 78], [480, 545, 410, 115], [80, 580, 180, 70]]) blob(s, x, y, rx, ry, PR, .58);
    for (let i = 0; i < 9; i++) line(s, [[s.jr(80, 880), s.jr(250, 480)], [s.jr(80, 880), s.jr(250, 480)]], 1, .12, C.sky);
  } else if (id === 'space') {
    ctx.fillStyle = 'rgb(61,63,91)'; ctx.fillRect(0, 0, 960, 720);
    stars(s, 48);
    blob(s, 820, 570, 210, 145, C.rose, .25); circle(s, 820, 570, 150, C.gold, .35);
    line(s, [[90, 475], [210, 420], [350, 450]], 2, .28, C.sky); circle(s, 160, 440, 38, C.sky, .28);
  } else if (id === 'moon') {
    ctx.fillStyle = 'rgb(79,82,106)'; ctx.fillRect(0, 0, 960, 720); stars(s, 28);
    circle(s, 790, 120, 55, C.sky, .38); blob(s, 790, 120, 45, 45, C.sky, .18);
    blob(s, 480, 640, 640, 190, [190, 190, 178], .42);
    for (const [x, y, r] of [[150, 570, 45], [730, 590, 66], [860, 520, 28]]) circle(s, x, y, r, C.ink, .2);
    line(s, [[0, 530], [150, 520], [330, 540], [510, 515], [700, 535], [960, 520]], 3, .4, C.ink);
  } else if (id === 'underwater') {
    ctx.fillStyle = 'rgb(203,222,216)'; ctx.fillRect(0, 0, 960, 720);
    for (let i = 0; i < 20; i++) circle(s, s.jr(45, 915), s.jr(70, 500), s.jr(5, 17), C.blue, .23);
    for (const x of [80, 170, 760, 860]) {
      line(s, [[x, 610], [x + 24, 520], [x - 10, 430], [x + 18, 345]], 5, .28, C.moss);
      blob(s, x + 15, 500, 38, 16, C.leaf, .15);
    }
    ground(s, 590, [186, 171, 135]);
  } else if (id === 'train') {
    rect(s, 80, 70, 800, 420, C.sky, .1);
    line(s, [[80, 70], [880, 70], [880, 490], [80, 490], [80, 70], [480, 70], [480, 490]], 5, .38);
    for (let i = 0; i < 7; i++) {
      const x = i * 160 - 40;
      blob(s, x, 410, 90, 80, C.moss, .12); line(s, [[x, 410], [x, 490]], 2, .18, C.moss);
    }
    rect(s, 0, 520, 960, 200, C.wood, .18); line(s, [[0, 520], [960, 520]], 4, .4);
  } else if (id === 'rooftop') {
    rect(s, 0, 0, 960, 500, C.sky, .08);
    for (const [x, h] of [[30, 160], [150, 105], [760, 145], [870, 90]]) {
      rect(s, x, 500 - h, 110, h, C.blue, .09); line(s, [[x, 500], [x, 500 - h], [x + 110, 500 - h], [x + 110, 500]], 2, .25);
    }
    line(s, [[0, 575], [240, 440], [480, 575], [720, 440], [960, 575]], 5, .42, C.clay);
    rect(s, 90, 350, 70, 145, C.clay, .15); line(s, [[90, 350], [160, 350], [160, 495]], 3, .32);
  } else if (id === 'blanket-fort') {
    rect(s, 0, 0, 960, 720, [218, 205, 181], .1);
    const tent = [[80, 570], [330, 110], [760, 120], [900, 570]];
    s.washFill(tent, C.rose, { layers: 3, alpha: .1, bleed: .6 }); line(s, tent, 5, .35, C.rose);
    for (let i = 0; i < 10; i++) circle(s, 250 + i * 55, 155 + Math.sin(i) * 20, 5, C.gold, .5);
    blob(s, 170, 550, 115, 48, C.sky, .15); blob(s, 800, 555, 110, 45, C.gold, .13);
    line(s, [[0, 580], [960, 580]], 3, .34);
  } else if (id === 'giant-pocket') {
    ctx.fillStyle = 'rgb(184,199,201)'; ctx.fillRect(0, 0, 960, 720);
    const pocket = [[170, 170], [790, 170], [850, 570], [680, 650], [280, 650], [110, 570]];
    s.washFill(pocket, C.blue, { layers: 3, alpha: .12, bleed: .4 }); line(s, [...pocket, pocket[0]], 6, .4, C.blue);
    for (let i = 0; i < 18; i++) circle(s, 155 + i * 38, 184 + Math.sin(i) * 3, 2.5, C.gold, .38);
    circle(s, 790, 95, 42, C.gold, .35);
  } else if (id === 'music-stage') {
    rect(s, 0, 0, 960, 720, [224, 214, 193], .08);
    rect(s, 0, 0, 190, 590, C.rose, .22); rect(s, 770, 0, 190, 590, C.rose, .22);
    line(s, [[190, 0], [190, 590]], 5, .4, C.rose); line(s, [[770, 0], [770, 590]], 5, .4, C.rose);
    blob(s, 350, 300, 130, 260, C.gold, .08); blob(s, 610, 300, 130, 260, C.gold, .08);
    ground(s, 565, C.wood);
    for (const [x, y] of [[220, 230], [720, 180], [160, 370]]) {
      circle(s, x, y, 10, C.ink, .35); line(s, [[x + 10, y], [x + 10, y - 55], [x + 35, y - 48]], 2, .35);
    }
  }
  reinforceHorizon(s, sceneById(id));
}

function renderCanvas(width, height, id) {
  const s = new Sketch(width, height);
  s.boil(hashStr(`lab-scene:${id}`));
  s.ctx.save();
  s.ctx.scale(width / 960, height / 720);
  paintScene(s, id);
  s.ctx.restore();
  return s.canvas;
}

export function createSceneBackdrop(id, backgroundStyle) {
  const config = sceneById(id);
  const canvas = renderCanvas(1024, 768, config.id);
  applyBackgroundCanvasStyle(canvas, backgroundStyle);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const geometry = new THREE.PlaneGeometry(5.25, 3.94);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, .12, -1.45);
  mesh.renderOrder = -80;
  mesh.userData.hasGround = config.hasGround;
  mesh.userData.horizonY = config.horizonY;
  mesh.userData.horizonWorldY = sceneHorizonWorldY(config);
  mesh.userData.floorY = sceneFloorY(config);
  mesh.userData.dispose = () => { texture.dispose(); material.dispose(); geometry.dispose(); };
  return mesh;
}

export function paintSceneCanvas(canvas, id, backgroundStyle) {
  const rendered = renderCanvas(Math.max(260, canvas.width || 260), Math.max(160, canvas.height || 160), id);
  applyBackgroundCanvasStyle(rendered, backgroundStyle);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(rendered, 0, 0, canvas.width, canvas.height);
}

export function paintSceneThumbnail(canvas, id, backgroundStyle) {
  paintSceneCanvas(canvas, id, backgroundStyle);
}
