// Text-only reusable choices. User/AI strings never become HTML.
export function renderChoices(
  host,
  choices,
  onChoose,
  {
    className = "",
    key = (choice) => choice.id,
    label = (choice) => choice.label,
  } = {},
) {
  host.replaceChildren(
    ...choices.map((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = className;
      button.textContent = label(choice);
      const id = key(choice);
      if (id !== undefined) button.dataset.choice = id;
      button.onclick = () => onChoose(choice);
      return button;
    }),
  );
}
