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
  for (const x of [-0.55, 0.55]) beam([x, 0, 0.25], [0, 0.8, 0], 0.05);
  beam([0, 0, -0.5], [0, 0.8, 0], 0.05);
  const swivel = new THREE.Group();
  swivel.position.y = 1;
  group.add(swivel);
  const tube = part("cylinder", color, [0, 0, 0], [0.22, 1.2, 0.22], swivel);
  tube.rotation.x = Math.PI / 2 - 0.3;
  part("ring", gold, [0, 0.15, 0.57], [0.23, 0.23, 0.23], swivel);
  moving(swivel, "turn", 0.7, 1);
  star([0.7, 1.45, 0]);
}
