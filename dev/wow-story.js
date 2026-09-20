// Compatibility exports for existing tools.
import { WOW_DEV_STORY, WOW_PROPS } from './content/stories/wow.js';
import { applyPublishedStory } from './content/stories/published.js';
applyPublishedStory(WOW_DEV_STORY);
export { WOW_DEV_STORY, WOW_PROPS } from './content/stories/wow.js';

export function wowVisualState(scene, state, lit = false) {
  if (WOW_DEV_STORY.firstLight) {
    const entries = state.wowEntries || [];
    const words = state.firstWords || '';
    const color = entries.find(item=>item.id==='gugu-feeling')?.answer || '';
    return { firstLight:true, chapter:1, scene:scene.chapterScene, kind:scene.wow.kind, props:state.inventory.filter(item=>item.id==='torch').map(item=>item.id), colors:[], visual:null, lit:lit || entries.length>0, progress:Math.min(1,entries.length/11), firstWords:words, skyColor:color, skyThing:entries.find(item=>item.id==='gugu-question')?.answer || '', energy:entries.some(item=>item.id==='shell-invitation')?25:0 };
  }
  const chapterScenes = WOW_DEV_STORY.scenes.filter(item => item.chapter === scene.chapter);
  const chapterIds = new Set(chapterScenes.map(item => item.id));
  const answered = new Set((state.wowEntries || []).filter(entry => chapterIds.has(entry.id)).map(entry => entry.id));
  const daylightAt = chapterScenes.findIndex(item => item.wow.kind === 'color') + 1 || chapterScenes.length;
  return { chapter:scene.chapter, scene:scene.chapterScene, kind:scene.wow.kind, progress:Math.min(1, answered.size / daylightAt),
    props: state.inventory.filter(item => Object.hasOwn(WOW_PROPS,item.id)).map(item=>item.id),
    colors: state.inventory.filter(item=>item.id.startsWith('wow-color-')),
    visual: [...state.inventions].reverse().find(item=>item.chapter===scene.chapter)?.visual || null,
    lit: lit || (state.wowEntries || []).some(entry=>entry.chapter===scene.chapter),
  };
}
