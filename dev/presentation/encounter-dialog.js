import { renderChoices } from "./choice-list.js";

// Owns focus, visibility and DOM only. The caller owns speech and world behavior.
export function createEncounterDialog({
  host = document.body,
  scenePanel = document.querySelector("#story-panel, .conversation"),
  onClose = () => {},
} = {}) {
  const controller = new AbortController();
  let lastFocus = null;
  const element = document.createElement("section");
  element.className = "encounter-dialog";
  element.hidden = true;
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-modal", "false");
  element.setAttribute("aria-label", "和星球朋友互动");
  const name = document.createElement("p"),
    line = document.createElement("p"),
    choices = document.createElement("div"),
    close = document.createElement("button");
  name.className = "encounter-name";
  line.className = "encounter-line";
  line.setAttribute("aria-live", "polite");
  choices.className = "encounter-choices";
  close.className = "encounter-close";
  close.textContent = "继续逛逛";
  close.type = "button";
  close.onclick = onClose;
  element.append(name, line, choices, close);
  host.append(element);
  document.addEventListener(
    "keydown",
    (event) => {
      if (!element.hidden && event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    { signal: controller.signal },
  );
  return {
    show(config, onChoose) {
      lastFocus = document.activeElement;
      element.hidden = false;
      document.body.dataset.encounter = "true";
      if (scenePanel) scenePanel.inert = true;
      name.textContent = `${config.name} · ${config.occupation}`;
      line.textContent = config.greeting;
      renderChoices(choices, config.choices, (choice) => {
        line.textContent = choice.response;
        onChoose(choice);
      });
      choices.querySelector("button")?.focus({ preventScroll: true });
    },
    hide() {
      element.hidden = true;
      delete document.body.dataset.encounter;
      if (scenePanel) scenePanel.inert = false;
      if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    },
    dispose() {
      controller.abort();
      element.remove();
      delete document.body.dataset.encounter;
      if (scenePanel) scenePanel.inert = false;
    },
  };
}
