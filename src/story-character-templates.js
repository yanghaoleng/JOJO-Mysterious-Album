// Exact animal presets from the character simulator. Story mode consumes the
// same recipes so a named character keeps the same silhouette in both places.
export const STORY_CHARACTER_TEMPLATES = [
  {
    id: 'bean-dog', group: '小动物', name: '豆豆小狗', hint: '软耳朵、豆豆眼，跑起来尾巴会摇。', seed: 21081, species: 'dog', base: 'quad',
    parts: { eyes: { type: 'dot', scale: 1.15, sx: .52 }, crest: { style: 'floppy', tone: 'skin', len: 2.05, spread: .94 }, mouth: { style: 'cat' }, nose: { style: 'button', size: 1.75 }, torso: { shape: 'round', wF: .56, hF: .56 }, tail: { style: 'wag', len: 1.22 }, extras: { spots: true } },
  },
  {
    id: 'moon-cat', group: '小动物', name: '月牙小猫', hint: '三根小胡须，卷尾巴像一个问号。', seed: 31242, species: 'cat', base: 'quad',
    parts: { eyes: { type: 'sleepy', scale: 1.45, sx: .62 }, crest: { style: 'cat', tone: 'skin', len: 1.05, spread: .72 }, mouth: { style: 'cat' }, nose: { style: 'triangle', size: 1.05 }, torso: { shape: 'tiny', wF: .43, hF: .5 }, tail: { style: 'curl', len: 1.4 }, extras: { whiskers: true, spots: false } },
  },
  {
    id: 'snow-rabbit', group: '小动物', name: '雪团小兔', hint: '长耳朵、小门牙，还有一颗绒球尾巴。', seed: 42303, species: 'human', base: 'sit',
    parts: { eyes: { type: 'sparkle', scale: 1.58, sx: .53 }, crest: { style: 'bunny', tone: 'skin', len: 1.7, spread: .62 }, mouth: { style: 'buckteeth' }, nose: { style: 'button', size: .9 }, torso: { shape: 'round', wF: .55, hF: .59 }, tail: { style: 'puff', len: 1.35 } },
  },
  {
    id: 'honey-bear', group: '小动物', name: '蜜糖小熊', hint: '圆耳朵配圆肚子，坐着也很神气。', seed: 53464, species: 'dog', base: 'sit',
    parts: { eyes: { type: 'dot', scale: 1.25, sx: .49 }, crest: { style: 'bear', tone: 'skin', len: 1.48, spread: .7 }, mouth: { style: 'tiny' }, nose: { style: 'button', size: 1.6 }, torso: { shape: 'barrel', wF: .69, hF: .65 }, tail: { style: 'puff', len: .95 }, extras: { spots: false } },
  },
  {
    id: 'curl-fox', group: '小动物', name: '卷尾小狐狸', hint: '尖耳朵、亮眼睛，尾巴总是翘着。', seed: 64525, species: 'cat', base: 'quad',
    parts: { eyes: { type: 'wide', scale: 1.34, sx: .61 }, crest: { style: 'cat', tone: 'skin', len: 1.25, spread: .75 }, mouth: { style: 'smirk' }, nose: { style: 'triangle', size: 1.2 }, skull: { shape: 'pear' }, torso: { shape: 'bean', wF: .48, hF: .52 }, tail: { style: 'puff', len: 1.85 }, extras: { whiskers: true, spots: true } },
  },
  {
    id: 'bamboo-panda', group: '小动物', name: '竹叶熊猫', hint: '圆耳朵和大眼圈，喜欢抱着东西想问题。', seed: 75686, species: 'dog', base: 'sit',
    parts: { eyes: { type: 'void', scale: 1.42, sx: .54, glint: true }, crest: { style: 'bear', tone: 'skin', len: 1.38, spread: .68 }, mouth: { style: 'tiny' }, nose: { style: 'button', size: 1.35 }, torso: { shape: 'pear', wF: .62, hF: .62, tone: 'hatch' }, tail: { style: 'puff', len: .7 }, extras: { spots: false } },
  },
  {
    id: 'pond-frog', group: '小动物', name: '池塘小蛙', hint: '眼睛圆圆的，蹲下来像一颗小豆子。', seed: 86747, species: 'human', base: 'sit',
    parts: { eyes: { type: 'wide', scale: 2.05, sx: .63 }, crest: { style: 'none' }, mouth: { style: 'wobble' }, nose: { style: 'none' }, skull: { shape: 'wide' }, torso: { shape: 'round', wF: .64, hF: .5 }, tail: { style: 'none' }, extras: { blush: true } },
  },
  {
    id: 'book-owl', group: '小动物', name: '书桌小鸮', hint: '两只大圆眼，翅膀习惯收在身体旁边。', seed: 97808, species: 'human', base: 'biped',
    parts: { eyes: { type: 'saucer', scale: 1.86, sx: .5 }, crest: { style: 'bear', tone: 'skin', len: 1.15, spread: .7 }, mouth: { style: 'tiny' }, nose: { style: 'triangle', size: .8 }, torso: { shape: 'round', wF: .62, hF: .62, pattern: 'belly' }, arms: { style: 'wing', len: .85 }, legs: { style: 'stub', len: .42 }, tail: { style: 'none' } },
  },
  {
    id: 'forest-deer', group: '小动物', name: '林间小鹿', hint: '头顶长着小鹿角，走路轻轻的。', seed: 108969, species: 'human', base: 'quad',
    parts: { eyes: { type: 'dot', scale: 1.22, sx: .57 }, crest: { style: 'antlers', tone: 'bone', len: .9, spread: .61, branches: 2 }, mouth: { style: 'tiny' }, nose: { style: 'button', size: 1.05 }, skull: { shape: 'pear' }, torso: { shape: 'tiny', wF: .4, hF: .48 }, tail: { style: 'puff', len: .75 }, extras: { spots: true } },
  },
  {
    id: 'leaf-hedgehog', group: '小动物', name: '落叶小刺猬', hint: '背着一圈短刺，鼻子总在找新味道。', seed: 120030, species: 'human', base: 'sit',
    parts: { eyes: { type: 'dot', scale: 1.08, sx: .48 }, crest: { style: 'spikes', tone: 'ringed', len: 1.08, nSpikes: 7 }, mouth: { style: 'tiny' }, nose: { style: 'triangle', size: 1.25 }, skull: { shape: 'pear' }, torso: { shape: 'round', wF: .62, hF: .6 }, tail: { style: 'none' }, extras: { freckles: true } },
  },
  {
    id: 'river-otter', group: '小动物', name: '河湾小水獭', hint: '小圆耳、长尾巴，最喜欢把手抱在胸前。', seed: 131191, species: 'dog', base: 'biped',
    parts: { eyes: { type: 'sparkle', scale: 1.3, sx: .5 }, crest: { style: 'bear', tone: 'skin', len: .95, spread: .67 }, mouth: { style: 'cat' }, nose: { style: 'button', size: 1.25 }, torso: { shape: 'bean', wF: .48, hF: .72, pattern: 'belly' }, arms: { style: 'clasped', len: .82 }, legs: { style: 'stub', len: .43 }, tail: { style: 'wag', len: 1.68 }, extras: { whiskers: true, spots: false } },
  },
  {
    id: 'cloud-alpaca', group: '小动物', name: '云朵羊驼', hint: '软耳朵、长脖子，像一小团会走的云。', seed: 142252, species: 'dog', base: 'biped',
    parts: { eyes: { type: 'happy', scale: 1.38, sx: .52 }, crest: { style: 'floppy', tone: 'skin', len: 1.12, spread: .73 }, mouth: { style: 'wobble' }, nose: { style: 'button', size: 1.1 }, skull: { shape: 'tall' }, torso: { shape: 'tiny', wF: .37, hF: .9 }, arms: { style: 'stub', len: .72 }, legs: { style: 'noodle', len: .9 }, tail: { style: 'puff', len: .8 }, extras: { spots: false } },
  },
];

export const storyCharacterTemplateById = id => STORY_CHARACTER_TEMPLATES.find(item => item.id === id) || STORY_CHARACTER_TEMPLATES[0];

export function randomStoryAnimalTemplate() {
  const values = new Uint32Array(1);
  globalThis.crypto?.getRandomValues?.(values);
  const fallback = Math.floor(Math.random() * 0xffffffff);
  return STORY_CHARACTER_TEMPLATES[(values[0] || fallback) % STORY_CHARACTER_TEMPLATES.length];
}
