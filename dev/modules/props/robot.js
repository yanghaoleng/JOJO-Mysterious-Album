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
  for (const x of [-0.23, 0.23]) {
    part("box", ink, [x, 0.18, 0], [0.28, 0.35, 0.36]);
    const arm = part("box", color, [x * 2.1, 0.9, 0], [0.16, 0.65, 0.18]);
    moving(arm, "sway", 0.3);
  }
  part("box", color, [0, 0.7, 0], [0.68, 0.75, 0.42]);
  part("box", cream, [0, 1.35, 0], [0.8, 0.55, 0.5]);
  for (const x of [-0.19, 0.19])
    part("ball", ink, [x, 1.38, 0.26], [0.06, 0.07, 0.025]);
  beam([0, 1.6, 0], [0, 1.83, 0], 0.025);
  star([0, 1.84, 0], 0.09);
  part("ring", gold, [0, 0.78, 0.24], [0.15, 0.15, 0.1]);
}
