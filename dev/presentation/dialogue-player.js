// A speech/subtitle component. The caller supplies story lookup and a transport.
export function createDialoguePlayer({
  voice,
  getStage,
  getEpoch,
  getDisplay,
  resolveSpeaker,
  interpolate,
  speaker,
  card,
}) {
  let version = 0;
  async function line(value, token = getEpoch()) {
    if (token !== getEpoch()) return;
    const info = resolveSpeaker(value.speaker),
      text = interpolate(value.text),
      display = getDisplay();
    speaker.textContent =
      info.name +
      (value.source === "local"
        ? " · 本地回应"
        : value.source === "ai"
          ? " · AI 回应"
          : "");
    const current = ++version;
    display.setText(text);
    card.dataset.speaking = "true";
    getStage().speak(value.speaker, true);
    const chunks = Array.from(text).reduce((parts, char) => {
      if (!parts.length || parts.at(-1).length + char.length > 110)
        parts.push("");
      parts[parts.length - 1] += char;
      return parts;
    }, []);
    let offset = 0,
      cancelled = false;
    for (const chunk of chunks) {
      if (token !== getEpoch() || current !== version) return;
      const chunkOffset = offset;
      await voice.say(
        chunk,
        info.voice,
        () => {},
        info.characterId,
        (progress) => {
          if (token !== getEpoch() || current !== version) return;
          display.update({
            start: progress.start < 0 ? -1 : chunkOffset + progress.start,
            end: progress.end < 0 ? -1 : chunkOffset + progress.end,
            spokenEnd: chunkOffset + progress.spokenEnd,
          });
          if (progress.status === "cancelled") {
            cancelled = true;
            display.clear();
          }
        },
      );
      if (cancelled) break;
      offset += chunk.length;
    }
    if (token === getEpoch() && current === version) {
      card.dataset.speaking = "false";
      getStage().speak(value.speaker, false);
    }
  }
  return {
    line,
    async sequence(lines, token = getEpoch()) {
      for (const value of lines) {
        if (token !== getEpoch()) return;
        await line(value, token);
      }
    },
    cancel() {
      version++;
    },
  };
}
