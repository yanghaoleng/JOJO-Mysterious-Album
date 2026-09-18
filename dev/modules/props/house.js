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
  part("box", cream, [0, 0.65, 0], [1.55, 1.3, 1.25]);
  part("cone", color, [0, 1.6, 0], [1.25, 0.8, 1.1]).rotation.y = Math.PI / 4;
  const hinge = new THREE.Group();
  hinge.position.set(-0.25, 0.05, 0.64);
  group.add(hinge);
  part("box", wood, [0.25, 0.43, 0], [0.5, 0.86, 0.08], hinge);
  part("ball", gold, [0.4, 0.42, 0.06], [0.04, 0.04, 0.04], hinge);
  moving(hinge, "door", 1, 1);
  for (const x of [-0.53, 0.53])
    part("box", gold, [x, 0.85, 0.65], [0.3, 0.36, 0.035]);
  star([0, 2.13, 0]);
}
