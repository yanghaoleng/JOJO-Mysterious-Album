// A self-contained prefab: no story or DOM dependency.
export function build({
  THREE,
  group,
  part,
  moving,
  pedestal,
  star,
  beam,
  table,
  cream,
  wood,
  gold,
  ink,
  color,
}) {
  part("cylinder", cream, [0, 0.18, 0], [0.85, 0.36, 0.85]);
  part("cylinder", "#98c9d2", [0, 0.37, 0], [0.73, 0.025, 0.73]);
  for (let i = 0; i < 7; i++)
    moving(
      part(
        "ball",
        i % 2 ? color : "#c8e3e1",
        [((i % 3) - 1) * 0.3, 0.55, Math.sin(i * 2) * 0.25],
        [0.12, 0.12, 0.12],
      ),
      "bounce",
      0.65,
      2 + i * 0.35,
    );
}
