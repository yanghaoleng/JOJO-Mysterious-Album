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
  const balloon = new THREE.Group();
  group.add(balloon);
  part("ball", color, [0, 1.6, 0], [0.68, 0.8, 0.65], balloon);
  part("box", wood, [0, 0.3, 0], [0.55, 0.35, 0.5], balloon);
  for (const x of [-0.24, 0.24])
    part("cylinder", cream, [x, 0.65, 0], [0.018, 0.65, 0.018], balloon);
  moving(balloon, "bounce", 0.18, 1.5);
}
