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
  const hull = part("ball", color, [0, 0.4, 0], [1, 0.35, 0.55]);
  moving(hull, "sway", 0.06);
  part("box", cream, [0, 0.63, 0], [1.4, 0.09, 0.75]);
  beam([0, 0.6, 0], [0, 1.75, 0], 0.04);
  const sail = part("cone", cream, [0.25, 1.2, 0], [0.6, 0.8, 0.04]);
  sail.rotation.z = -0.2;
  for (const x of [-1, 1]) {
    const paddle = part("box", wood, [x * 0.7, 0.5, 0.2], [0.12, 1, 0.06]);
    paddle.rotation.z = x * 0.8;
    moving(paddle, "sway", 0.35);
  }
  for (let i = 0; i < 3; i++)
    moving(
      part("ball", "#bddfe0", [(i - 1) * 0.4, 0.2, 0.7], [0.1, 0.1, 0.1]),
      "bounce",
      0.4,
      2 + i,
    );
}
