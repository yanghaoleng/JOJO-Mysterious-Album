// Text-only reusable choices. User/AI strings never become HTML.
export function renderChoices(
  host,
  choices,
  onChoose,
  {
    className = "",
    key = (choice) => choice.id,
    label = (choice) => choice.label,
    icon = (choice) => choice.icon,
  } = {},
) {
  host.replaceChildren(
    ...choices.map((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = className;
      const glyph = icon(choice);
      if (glyph) button.append(typeof glyph === "function" ? glyph() : glyph);
      const text = document.createElement("span");
      text.textContent = label(choice);
      button.append(text);
      const id = key(choice);
      if (id !== undefined) button.dataset.choice = id;
      button.onclick = () => onChoose(choice);
      return button;
    }),
  );
}
