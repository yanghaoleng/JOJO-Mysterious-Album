import { WOW_STORY } from '../src/wow-story-data.js';
import { createWowCharacter } from './wow-visuals.js';

const WORLDS = ['bakery', 'reef', 'cloud', 'home', 'meadow', 'observatory'];
const KINDS = ['gugu', 'fish', 'cloud', 'clock', 'shadow', 'star'];
const FIRST_TITLES = ['窗里的一声咚', '第一束光', '光里的小星球', '寄出一声问候', '认识鼓鼓', '听听身体的话', '一把自己的钥匙', '点心花园', '第一滴暖暖黄', '海螺那边的声音'];
export const WOW_PROPS = {
  torch: { id: 'torch', name: '好奇手电筒', description: '把你的话变成光。停下来时，也会留着光等你。' },
  radio: { id: 'radio', name: '唔姆收音机', description: '把问候寄给MOMO，听它慢慢说完。' },
  jar: { id: 'jar', name: '颜色罐', description: '保存旅途中找到的颜色，休息时也不会消失。' },
};
export const WOW_DEV_STORY = {
  id: 'wow', title: WOW_STORY.title, subtitle: '你问一句，星球亮一格。',
  age: '六章好奇之旅', onboarding: 'direct', companion: 'rabbit', companionName: '小光', color: '#efd36e',
  premise: '窗后有个小小的声音。先靠近一点，听它说完。',
  chapters: WOW_STORY.chapters.map(chapter => ({ number: chapter.id, title: chapter.title })),
  scenes: WOW_STORY.chapters.flatMap(chapter => chapter.scenes.map((source, chapterScene) => {
    const kind = chapter.id === 1 && chapterScene < 3 ? 'window' : KINDS[chapter.id - 1];
    const narrator = source.speaker === '星星窗';
    return {
      id: source.id, chapter: chapter.id, chapterScene, world: WORLDS[chapter.id - 1],
      title: chapter.id === 1 ? FIRST_TITLES[chapterScene] : chapter.world,
      objective: source.prompt, question: source.prompt, questionSpeaker: narrator ? 'guide' : 'wow',
      wow: { kind: source.kind, prop: source.prop, color: chapter.color, colorName: chapter.colorName, momo: chapter.momo },
      cast: [{ id: 'wow', name: kind === 'window' ? '星星窗' : chapter.id === 1 && chapterScene === 3 ? 'MOMO' : chapter.momo,
        voice: 'bubble', createActor: ({scale}) => createWowCharacter({kind, color:chapter.color, scale}) }],
      dialogue: [{ speaker: narrator ? 'guide' : 'wow', text: source.text }],
      choices: source.suggestions.map((label, i) => ({ id: `${source.id}-${i}`, label })), closing: [],
      final: chapter.id === 6 && chapterScene === chapter.scenes.length - 1,
    };
  })),
  ending: { title: '第一束光，一直是你的声音', text: '六位朋友，六种颜色，还有你亲手想出来的六把钥匙。', companionLine: '你最初说：“{firstWords}”我们一直记着。小灯会留着光，等你回来。' },
};

export function wowVisualState(scene, state, lit = false) {
  return { chapter:scene.chapter, scene:scene.chapterScene, kind:scene.wow.kind,
    props: state.inventory.filter(item => Object.hasOwn(WOW_PROPS,item.id)).map(item=>item.id),
    colors: state.inventory.filter(item=>item.id.startsWith('wow-color-')),
    visual: [...state.inventions].reverse().find(item=>item.chapter===scene.chapter)?.visual || null,
    lit: lit || (state.wowEntries || []).some(entry=>entry.chapter===scene.chapter),
  };
}
