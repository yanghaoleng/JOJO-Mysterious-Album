import { details } from '../model-details.js';
// 通用道具补全: 孩子提到清单外的明确物体时，按名称用模板拼装低多边形道具。
export function build(k) {
  const { part, group, THREE, moving, color, cream, wood, gold, ink } = k;
  const { box, ball, cylinder, panel, pivot } = details(k);
  const cone = (c, p, s) => part('cone', c, p, s);
  const name = String(k.name || '').trim();

  // 飞行器：战斗机 / 飞机 / 直升机 / 火箭 / 飞船
  if (/战斗机|战机|喷气机|歼击机|轰炸机/.test(name)) {
    box(color, [0, .55, 0], [.32, .22, 2.1]);
    const nose = cone(color, [0, .68, 1.25], [.16, .5, .16]); nose.rotation.x = Math.PI / 2;
    ball(gold, [0, .72, .15], [.14, .12, .35]);
    const wl = box(ink, [-.85, .6, 0], [.5, .06, 1.3]); wl.rotation.y = .5;
    const wr = box(ink, [.85, .6, 0], [.5, .06, 1.3]); wr.rotation.y = -.5;
    box(ink, [-.32, .56, -1.02], [.26, .05, .45]);
    box(ink, [.32, .56, -1.02], [.26, .05, .45]);
    box(ink, [0, .84, -1], [.06, .46, .28]);
    const ex = cylinder(gold, [0, .53, -1.1], [.08, .12, .14]); ex.rotation.x = Math.PI / 2;
    moving(pivot, 'slide', .18);
    return;
  }
  if (/飞机|飞行器|直升机|无人机/.test(name)) {
    ball(color, [0, .58, 0], [1, .22, .22]);
    box(color, [0, .6, 0], [.42, .06, 1.8]);
    box(color, [-.78, .66, 0], [.3, .05, .8]);
    box(color, [.78, .66, 0], [.3, .05, .8]);
    const t = cone(color, [0, .95, .2], [.2, .5, .2]); t.rotation.x = -Math.PI / 2;
    moving(pivot, 'slide', .2);
    return;
  }
  if (/火箭|导弹|飞船|飞碟|卫星|航天/.test(name)) {
    box(color, [0, .5, 0], [.55, 1.4, .55]);
    const n = cone(color, [0, 1.45, 0], [.3, .8, .3]); n.rotation.x = 0;
    box(ink, [-.55, .5, 0], [.16, .9, .16]);
    box(ink, [.55, .5, 0], [.16, .9, .16]);
    const f1 = cone(gold, [0, -.35, 0], [.45, .5, .45]); f1.rotation.x = Math.PI;
    moving(pivot, 'float', .12);
    return;
  }

  // 车辆：汽车 / 卡车 / 巴士 / 摩托 / 自行车
  if (/车|汽车|卡车|轿车|巴士|公交|出租|救护车|消防车|警车/.test(name)) {
    box(color, [0, .62, 0], [.72, .42, 1.5]);
    box(color, [0, .95, 0], [.62, .24, 1]);
    box(cream, [0, 1.05, 0], [.5, .16, .78]);
    for (const x of [-.42, .42]) for (const z of [-.55, .55]) {
      const w = cylinder(ink, [x, .28, z], [.2, .12, .2]); w.rotation.x = Math.PI / 2;
    }
    moving(pivot, 'slide', .16);
    return;
  }
  if (/摩托|自行车|单车|电动车/.test(name)) {
    ball(color, [0, .85, .3], [.5, .14, .14]);
    box(ink, [0, .7, .3], [.09, .5, .09]);
    for (const z of [.5, -.35]) { const w = cylinder(ink, [0, .35, z], [.34, .1, .34]); w.rotation.x = Math.PI / 2; }
    return;
  }

  // 船 / 舰
  if (/船|舰|艇|帆船|轮船|潜艇|航母/.test(name)) {
    box(color, [0, .35, 0], [.9, .5, 1.6]);
    const b = cone(color, [0, .1, -.9], [.55, .4, .55]); b.rotation.x = Math.PI / 2;
    const mast = cylinder(wood, [0, 1.2, 0], [.05, 1, .05]);
    box(cream, [0, 1.6, .05], [.06, .7, .9]);
    moving(pivot, 'float', .1);
    return;
  }

  // 房子 / 建筑
  if (/房子|房屋|屋|城堡|帐篷|小屋|楼|商店|超市|学校/.test(name)) {
    box(color, [0, .6, 0], [1.6, 1.2, 1.4]);
    const roof = cone(color, [0, 1.5, 0], [1.2, .9, 1.2]);
    box(gold, [0, .6, .72], [.4, .5, .05]);
    box(cream, [-.5, .35, 0], [.3, .5, .05]);
    box(cream, [.5, .35, 0], [.3, .5, .05]);
    return;
  }

  // 冰箱 / 柜子（立柜 + 门）
  if (/冰箱|柜子|衣柜|书柜|储物柜/.test(name)) {
    box(color, [0, .75, 0], [1, 1.5, .9]);
    box(cream, [0, .75, .46], [.85, 1.1, .05]);
    box(gold, [0, 1.02, .5], [.05, .14, .05]);
    box(ink, [0, .48, .46], [.85, .06, .05]);
    return;
  }

  // 树 / 植物
  if (/树|花|草|植物|蘑菇|森林/.test(name)) {
    cylinder(wood, [0, .5, 0], [.12, 1, .12]);
    ball(color, [0, 1.5, 0], [.7, .7, .7]);
    return;
  }

  // 球类
  if (/球|足球|篮球|排球|皮球|网球|乒乓球/.test(name)) {
    ball(color, [0, .6, 0], [.7, .7, .7]);
    moving(pivot, 'bounce', .18);
    return;
  }

  // 食物
  if (/糖|蛋糕|饼干|面包|披萨|汉堡|冰淇淋|巧克力|甜甜圈/.test(name)) {
    cylinder(cream, [0, .35, 0], [.7, .5, .7]);
    ball(gold, [0, .75, 0], [.4, .35, .4]);
    return;
  }

  // 恐龙 / 动物
  if (/恐龙|龙|熊|老虎|狮子|大象|长颈鹿|斑马|企鹅|乌龟/.test(name)) {
    ball(color, [0, .9, 0], [.7, .55, 1]);
    ball(color, [.8, 1.15, 0], [.45, .4, .45]);
    for (const x of [-.35, .35]) for (const z of [-.45, .45]) cylinder(ink, [x, .25, z], [.1, .5, .1]);
    moving(pivot, 'walk', .12);
    return;
  }

  // 兜底：彩色积木塔（保证任何名词都能得到可见的新道具）
  box(color, [0, .35, 0], [1, .7, 1]);
  box(gold, [0, .95, 0], [.72, .5, .72]);
  box(cream, [0, 1.55, 0], [.45, .7, .45]);
  ball(gold, [0, 2.2, 0], [.3, .3, .3]);
}
