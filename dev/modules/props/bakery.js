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
  part("cylinder", wood, [0, 0.98, 0], [0.5, 0.24, 0.5]);
  const lid = part("cone", cream, [0, 1.22, 0], [0.52, 0.24, 0.52]);
  moving(lid, "bounce", 0.4, 1.3);
  for (let i = 0; i < 3; i++)
    part("ball", cream, [(i - 1) * 0.23, 1.16, 0], [0.17, 0.13, 0.15]);
  for (let i = 0; i < 3; i++)
    moving(
      part("ball", "#e8e8dc", [(i - 1) * 0.2, 1.5, 0], [0.09, 0.09, 0.09]),
      "bounce",
      0.3,
      1 + i * 0.5,
    );
}
