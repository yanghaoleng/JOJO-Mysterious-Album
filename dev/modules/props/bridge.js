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
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 0.26,
      y = 0.25 + Math.sin((i / 8) * Math.PI) * 0.3;
    moving(
      part("box", i % 2 ? color : cream, [x, y, 0], [0.24, 0.12, 0.9]),
      "bounce",
      0.035,
      2 + i * 0.25,
    );
  }
  for (const z of [-0.5, 0.5]) {
    for (const x of [-1.05, 0, 1.05]) beam([x, 0.15, z], [x, 1, z], 0.045);
    beam([-1.05, 0.85, z], [1.05, 0.85, z], 0.035, gold);
  }
}
