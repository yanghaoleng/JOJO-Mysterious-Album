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
  const body = new THREE.Group();
  group.add(body);
  part("cylinder", cream, [0, 1.05, 0], [0.38, 1.35, 0.38], body);
  part("cone", color, [0, 1.95, 0], [0.39, 0.55, 0.39], body);
  part("ring", gold, [0, 1.22, 0.38], [0.18, 0.18, 0.12], body);
  part("ball", "#96c9d4", [0, 1.22, 0.37], [0.14, 0.14, 0.06], body);
  for (const x of [-0.5, 0.5])
    part("cone", color, [x, 0.5, 0], [0.25, 0.55, 0.2], body);
  part("cone", gold, [0, 0.28, 0], [0.24, 0.5, 0.24], body).rotation.z =
    Math.PI;
  moving(body, "bounce", 0.25);
}
