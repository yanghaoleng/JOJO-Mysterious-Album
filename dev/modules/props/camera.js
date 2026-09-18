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
  part("box", color, [0, 1.15, 0], [0.8, 0.55, 0.4]);
  part("ring", ink, [0, 1.17, 0.28], [0.23, 0.23, 0.18]);
  part("ball", "#a9d4da", [0, 1.17, 0.27], [0.16, 0.16, 0.1]);
  const photo = part("box", cream, [0.6, 1.02, 0.1], [0.4, 0.45, 0.025]);
  moving(photo, "bounce", 0.35);
  part("star", gold, [0.6, 1.03, 0.13], [0.13, 0.13, 0.02]);
}
