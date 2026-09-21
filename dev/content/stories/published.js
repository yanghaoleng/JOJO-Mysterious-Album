const prefix = "jma.author.published.v1.";

export function applyPublishedStory(story) {
  try {
    const saved = localStorage.getItem(`${prefix}${story.id}`);
    if (!saved) return story;
    const value = JSON.parse(saved);
    if (value?.id === story.id && value?.version === story.version) {
      Object.assign(story, value);
    }
  } catch {}
  return story;
}

export function publishStory(story) {
  localStorage.setItem(`${prefix}${story.id}`, JSON.stringify(story));
  window.dispatchEvent(new CustomEvent("jma:story-published", { detail: { id: story.id } }));
}
