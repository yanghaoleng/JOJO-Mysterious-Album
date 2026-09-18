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
  for (const x of [-0.8, 0.8]) beam([x, 0, 0], [x, 1.9, 0], 0.06);
  beam([-0.9, 1.9, 0], [0.9, 1.9, 0], 0.07);
  const seat = new THREE.Group();
  seat.position.y = 1.8;
  group.add(seat);
  for (const x of [-0.3, 0.3])
    part("cylinder", cream, [x, -0.65, 0], [0.02, 1.3, 0.02], seat);
  part("box", color, [0, -1.3, 0], [0.8, 0.1, 0.4], seat);
  moving(seat, "swing", 0.32);
}
