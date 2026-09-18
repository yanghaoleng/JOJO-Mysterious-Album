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
  table();
  for (let i = 0; i < 8; i++)
    moving(
      part(
        "box",
        i % 2 ? color : cream,
        [(i - 3.5) * 0.18, 0.91, 0.1],
        [0.16, 0.1, 0.65],
      ),
      "bounce",
      0.08,
      2 + i * 0.4,
    );
  for (let i = 0; i < 3; i++) star([(i - 1) * 0.55, 1.35, -0.2], 0.11);
}
