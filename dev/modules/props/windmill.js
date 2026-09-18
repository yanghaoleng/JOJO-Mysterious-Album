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
  part("cone", cream, [0, 0.8, 0], [0.5, 1.6, 0.5]);
  const rotor = new THREE.Group();
  rotor.position.set(0, 1.3, 0.4);
  group.add(rotor);
  for (let i = 0; i < 4; i++) {
    const blade = part(
      "box",
      i % 2 ? gold : color,
      [
        Math.sin((i * Math.PI) / 2) * 0.45,
        Math.cos((i * Math.PI) / 2) * 0.45,
        0,
      ],
      [0.18, 0.9, 0.06],
      rotor,
    );
    blade.rotation.z = (-i * Math.PI) / 2;
  }
  part("ball", wood, [0, 0, 0.05], [0.12, 0.12, 0.08], rotor);
  moving(rotor, "spin", 1.8);
}
