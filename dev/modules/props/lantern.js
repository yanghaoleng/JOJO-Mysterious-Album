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
  part("cylinder", color, [0, 0.75, 0], [0.24, 1.4, 0.24]);
  part("ball", gold, [0, 1.5, 0], [0.4, 0.45, 0.4]);
  moving(part("cone", cream, [0, 1.97, 0], [0.55, 0.3, 0.55]), "bounce", 0.25);
  for (let i = 0; i < 3; i++)
    star([Math.sin(i * 2.1) * 0.65, 1.5, Math.cos(i * 2.1) * 0.65], 0.1);
}
