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
  part("cylinder", wood, [0, 0.15, 0], [1.1, 0.3, 0.85]);
  for (const x of [-0.85, 0.85]) {
    beam([x, 0.2, -0.45], [x, 1.8, -0.45], 0.05);
    const curtain = part("box", color, [x * 0.7, 1, -0.45], [0.55, 1.6, 0.12]);
    moving(curtain, "slide", x * 0.23);
  }
  beam([-0.9, 1.85, -0.45], [0.9, 1.85, -0.45], 0.08);
  star([0, 2, -0.45], 0.19);
}
