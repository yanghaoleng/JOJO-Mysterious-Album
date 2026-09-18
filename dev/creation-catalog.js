import { NPC_CATALOG } from '../src/story-npcs/catalog.js';
import { FOUR } from './yellow-four-models.js';

// Every response below corresponds to a real, reusable model and animation.
export const CREATION_KITS = [
  ['bridge', '彩虹小桥', '桥', '桥板一块块亮起来，伙伴可以在桥边碰头。', 'lingdang'],
  ['garden', '问题花园', '花园|花朵|花|种子|植物', '花瓣展开了，藏在花心的小星星跟着探出头。', 'lingdang-mom'],
  ['tree', '发现果树', '树|森林', '树枝轻轻摇起来，枝头的星星果一颗颗亮了。', 'lingdang-mom'],
  ['house', '好奇小屋', '房子|小屋|帐篷|家园|城堡|图书馆', '屋门打开了，窗里亮着一盏等朋友来的灯。', 'allie'],
  ['telescope', '星光望远镜', '望远镜|观察镜|放大镜', '镜筒转起来，旁边的星星按顺序亮了。', 'lingdang'],
  ['robot', '问题小机器人', '机器人|机械伙伴|机器狗', '机器人挥挥手，胸前的问号灯亮了。', 'douya'],
  ['boat', '探问小船', '船|潜艇|潜水艇|潜航', '船桨划起来，船边浮出一串小气泡。', 'gulu'],
  ['rocket', '好奇火箭', '火箭|飞行器', '推进器亮起来，火箭在底座上轻轻升起。', 'gulu'],
  ['portal', '想象传送门', '传送|任意门|通道|时空门', '门里的光圈转起来，两边的星星互相眨眼。', 'wanneng'],
  ['balloon', '云朵气球', '气球|热气球|飞艇', '气球牵起小篮子，慢慢升到绳子顶端。', 'domi'],
  ['windmill', '提问风车', '风车|风力|风扇', '风车转起来，把星光送给旁边的小灯。', 'aigaicuo'],
  ['fountain', '气泡喷泉', '喷泉|水池|气泡|泡泡|水车', '三束气泡轮流跳起来，落回自己的小水池。', 'prank-doctor'],
  ['music', '星星音乐台', '音乐|钢琴|吉他|鼓|唱歌|琴|乐器', '彩色琴键轮流跳动，星星音符也跟着跳起来。', 'xiaolu-teacher'],
  ['bakery', '分享点心台', '包子|面包|厨房|点心|蛋糕|食物|餐厅', '蒸笼打开了，热气托起一只圆圆的星星包。', 'zhuxiaodi'],
  ['swing', '云朵秋千', '秋千|摇椅|游乐场', '秋千轻轻摇起来，吊绳旁的铃铛跟着摆动。', 'nini'],
  ['lantern', '好奇灯塔', '灯|灯塔|光|太阳|导航|指南针', '灯罩慢慢升起，灯塔周围的小光点跳起来。', 'dengdeng'],
  ['stage', '小小表演台', '舞台|剧场|表演|演出', '帷幕拉开，聚光灯亮在你留给朋友的位置。', 'maoge'],
  ['ladder', '折叠探索梯', '梯|绳|攀爬', '梯级从下到上轻轻抬起，顶端的小旗也摇起来。', 'lvdou'],
  ['camera', '发现照相机', '相机|照相|摄影|照片', '镜头闪了一下，一张星星图案的相片升出来。', 'fendou'],
].map(([id, name, words, response, helper]) => Object.freeze({ id, name, words, response, helper }));
const COLORS = [['红', '#d99486'], ['橙', '#e8af72'], ['黄', '#ebce79'], ['绿', '#9fb992'], ['蓝', '#95becb'], ['紫', '#baa7d2'], ['粉', '#dbadbf'], ['白', '#eee8d9']];
export function planCreation(raw) {
  const text = String(raw || '').trim().slice(0, 180);
  const objectWords = text.replace(/棉花糖|花生|烟花|花钱/g, '').replace(/飞船/g, '火箭');
  const kits = CREATION_KITS.filter(kit => new RegExp(kit.words).test(objectWords)).slice(0, 3);
  const helper = [...NPC_CATALOG].sort((a,b)=>b.name.length-a.name.length).find(n => text.includes(n.name.replace(/（.*$/, '')) || text.toLowerCase().includes(n.id));
  const yellow = FOUR.find(n => n.id !== 'jiaojiao' ? text.includes(n.name) : text.includes('黄色叫叫'));
  const primary = COLORS.find(([word]) => text.includes(word))?.[1] || '#9ab8ba';
  const parts = kits.map(kit => kit.id);
  // An unrecognised idea stays an explicitly labelled prototype, never a rocket by default.
  return { parts: parts.length ? parts : ['prototype'], primary, helper: yellow ? `yellow:${yellow.id}` : helper?.id || kits[0]?.helper || 'baozai',
    name: kits.length ? kits.map(k => k.name).join('＋') : '你的想象试作品',
    idea: text, response: kits.length ? kits.map(k => k.response).join('') : '先用彩色积木搭出了试作品。你可以再加一座桥、一朵花，或叫一个朋友来试。' };
}
