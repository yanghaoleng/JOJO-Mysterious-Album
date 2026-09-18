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
  pedestal();
  for (let i = 0; i < 6; i++)
    moving(
      part(
        i % 2 ? "box" : "ball",
        [color, gold, cream][i % 3],
        [Math.sin(i * 2) * 0.4, 0.3 + i * 0.19, Math.cos(i * 2) * 0.25],
        [0.27, 0.24, 0.25],
      ),
      "bounce",
      0.05,
      2 + i * 0.2,
    );
  star([0, 1.6, 0]);
}
