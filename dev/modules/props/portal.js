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
  const ring = part("ring", color, [0, 1.1, 0], [0.85, 0.95, 0.7]);
  moving(ring, "spin", 1);
  for (let i = 0; i < 8; i++)
    star(
      [
        Math.sin((i * Math.PI) / 4) * 0.74,
        1.1 + Math.cos((i * Math.PI) / 4) * 0.83,
        0,
      ],
      0.08,
    );
}
