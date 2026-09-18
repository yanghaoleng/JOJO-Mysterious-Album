import { NPC_CATALOG } from '../src/story-npcs/catalog.js';
import { FOUR } from './content/yellow-friends.js';
import { CREATION_KITS } from './content/props.js';
export { CREATION_KITS } from './content/props.js';

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
