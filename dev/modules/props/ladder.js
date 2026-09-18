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
  for (const x of [-0.4, 0.4]) beam([x, 0, 0], [x, 1.9, -0.25], 0.05);
  for (let i = 0; i < 7; i++)
    moving(
      part(
        "box",
        i % 2 ? color : gold,
        [0, 0.2 + i * 0.25, -i * 0.035],
        [0.9, 0.08, 0.12],
      ),
      "bounce",
      0.025,
      2 + i * 0.2,
    );
  const flag = part("box", color, [0.63, 2.05, -0.25], [0.45, 0.28, 0.035]);
  moving(flag, "sway", 0.15);
  beam([0.4, 1.8, -0.25], [0.4, 2.3, -0.25], 0.025);
}
