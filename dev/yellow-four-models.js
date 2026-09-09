import * as THREE from '../vendor/three.module.js';
import { createNPCToolkit, buildBirdNPC } from '../src/story-npcs/models.js';

// Solid reference-based studies. Source images stay in local output/references.
export const FOUR = [
  { id: 'bull', name: '黄牛', note: '紫角大哥', color: '#eeb52b', height: 1.48 },
  { id: 'round', name: '圆滚滚', note: '快乐担当', color: '#ffcf28', height: 1.48 },
  { id: 'jiaojiao', name: '叫叫', note: '披风小队长', color: '#f7cf54', height: 1.14 },
  { id: 'kangaroo', name: '袋鼠', note: '长腿选手', color: '#eebd37', height: 1.60 },
];

function taperedTube(points, radii) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const segments = 40, sides = 12, frames = curve.computeFrenetFrames(segments, false);
  const positions = [], indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, p = curve.getPointAt(t), at = t * (radii.length - 1);
    const lo = Math.floor(at), radius = THREE.MathUtils.lerp(radii[lo], radii[Math.min(lo + 1, radii.length - 1)], at - lo);
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2;
      const v = p.clone().addScaledVector(frames.normals[i], Math.cos(a) * radius).addScaledVector(frames.binormals[i], Math.sin(a) * radius);
      positions.push(v.x, v.y, v.z);
      if (i < segments && j < sides) {
        const k = i * (sides + 1) + j;
        indices.push(k, k + sides + 1, k + 1, k + 1, k + sides + 1, k + sides + 2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices); g.computeVertexNormals(); return g;
}

function limb(b, side, position, length, width = .15, handMaterial = b.skin) {
  const arm = b.pivot(b.rig, `arm-${side}`, position);
  const body = b.ball(arm, 'rounded-arm', b.skin, [side * .07, -length * .45, 0], [width, length * .62, width]);
  body.rotation.z = side * .16;
  b.ball(arm, 'soft-hand', handMaterial, [side * .12, -length, .025], [width * 1.06, width * 1.12, width]);
  b.arms.push(arm); return arm;
}

function bull(b) {
  const cream = b.mat('#ffe28c'), purple = b.mat('#9870b4'), muzzle = b.mat('#bf8ace'), hoof = b.mat('#60443d');
  b.ball(b.rig, 'round-strong-body', b.skin, [0, 1.20, 0], [.66, .84, .43]);
  b.ball(b.rig, 'cream-belly', cream, [0, 1.09, .34], [.46, .60, .13]);
  b.head = b.pivot(b.rig, 'bull-head', [0, 2.24, .035]);
  b.ball(b.head, 'broad-bull-head', b.skin, [0, 0, 0], [.63, .59, .43]);
  b.ball(b.head, 'lavender-muzzle', muzzle, [0, -.30, .39], [.37, .28, .225]);
  b.mouth(b.head, [0, -.355, .607], .28, .055);
  for (const s of [-1, 1]) {
    const ear = b.ball(b.head, 'side-ear', b.skin, [s * .66, .07, -.04], [.30, .15, .115]); ear.rotation.z = s * .35;
    const inner = b.ball(b.head, 'peach-ear-centre', b.mat('#efb17a'), [s * .68, .075, .043], [.21, .087, .035]); inner.rotation.z = s * .35;
    b.mesh(b.head, 'curved-purple-horn', taperedTube([[s * .43, .36, -.12], [s * .66, .59, -.12], [s * .72, .88, -.05]], [.135, .11, .004]), purple);
    b.eye(b.head, s, [s * .265, .055, .38], .16, .093);
    b.brow(b.head, s, [s * .265, .235, .378], .29);
    b.ball(b.head, 'nostril', purple, [s * .115, -.21, .593], [.067, .026, .018]);
    limb(b, s, [s * .56, 1.64, .04], .74, .16, hoof);
    const leg = b.pivot(b.rig, `leg-${s}`, [s * .36, .54, 0]);
    b.ball(leg, 'stocky-leg', b.skin, [0, -.17, 0], [.23, .42, .24]);
    b.ball(leg, 'cloven-hoof', hoof, [0, -.42, .07], [.24, .15, .28]);
    b.line(leg, 'hoof-split', b.ink, [[0, -.48, .332], [0, -.40, .345], [0, -.32, .30]], .010); b.legs.push(leg);
  }
  b.tail = b.pivot(b.rig, 'bull-tail', [-.36, .63, -.32]);
  b.line(b.tail, 'tail-cord', b.skin, [[0, 0, 0], [-.42, -.02, -.12], [-.43, .19, -.15]], .034);
  b.ball(b.tail, 'tail-tuft', hoof, [-.43, .2, -.15], [.09, .15, .075]);
}

function round(b) {
  const cream = b.mat('#ffe58b'), claws = b.mat('#a18028');
  b.ball(b.rig, 'round-body', b.skin, [0, 1.11, 0], [.75, .92, .50]);
  b.ball(b.rig, 'cream-round-belly', cream, [0, 1.01, .419], [.51, .61, .15]);
  b.head = b.pivot(b.rig, 'round-friendly-head', [0, 2.06, .015]);
  b.ball(b.head, 'soft-round-head', b.skin, [0, 0, 0], [.71, .73, .51]);
  b.iris.color.set('#738342');
  for (const s of [-1, 1]) {
    b.eye(b.head, s, [s * .30, .12, .44], .16, .18);
    limb(b, s, [s * .63, 1.67, 0], .54, .20);
    const leg = b.pivot(b.rig, `leg-${s}`, [s * .42, .46, 0]);
    b.ball(leg, 'stubby-round-leg', b.skin, [0, -.20, 0], [.28, .36, .31]);
    b.ball(leg, 'wide-foot', b.skin, [0, -.40, .13], [.30, .13, .37]);
    for (let i = 0; i < 3; i++) b.ball(leg, 'little-toe', claws, [(i - 1) * .15, -.43, .426], [.085, .075, .10]);
    b.legs.push(leg);
  }
  b.mouth(b.head, [0, -.20, .51], .20, .065);
}

function kangaroo(b) {
  const cream = b.mat('#f7de8a'), brown = b.mat('#855239'), paws = b.mat('#83652c'), earInside = b.mat('#d6964c');
  b.ball(b.rig, 'pear-shaped-torso', b.skin, [0, 1.02, -.035], [.48, .74, .36]);
  b.ball(b.rig, 'cream-belly', cream, [0, .96, .30], [.35, .62, .12]);
  b.ball(b.rig, 'long-neck', b.skin, [0, 1.75, .045], [.27, .62, .28]);
  b.head = b.pivot(b.rig, 'kangaroo-head', [0, 2.34, .12]);
  b.ball(b.head, 'long-cheeked-head', b.skin, [0, 0, 0], [.37, .46, .33]);
  b.ball(b.head, 'cream-muzzle', cream, [0, -.19, .27], [.28, .23, .25]);
  b.ball(b.head, 'large-brown-nose', brown, [0, -.095, .47], [.20, .14, .125]);
  b.mouth(b.head, [0, -.30, .46], .16, .055);
  for (const s of [-1, 1]) {
    const ear = b.pivot(b.head, 'long-kangaroo-ear', [s * .20, .30, -.015]); ear.rotation.z = s * -.31;
    b.ball(ear, 'yellow-ear', b.skin, [0, .33, 0], [.155, .48, .11]);
    b.ball(ear, 'gold-ear-inset', earInside, [0, .34, .084], [.105, .37, .028]);
    b.eye(b.head, s, [s * .172, .10, .277], .113, .137);
    b.brow(b.head, s, [s * .175, .296, .225], .19);
    limb(b, s, [s * .33, 1.57, .03], .70, .13, paws);
    const leg = b.pivot(b.rig, `leg-${s}`, [s * .35, .64, -.05]);
    b.ball(leg, 'powerful-thigh', b.skin, [s * .06, -.03, .10], [.27, .43, .30]);
    b.ball(leg, 'angled-shin', b.skin, [s * .03, -.30, .03], [.135, .32, .12]);
    b.ball(leg, 'long-flat-foot', paws, [s * .055, -.53, .29], [.19, .10, .43]); b.legs.push(leg);
    for (let i = 0; i < 2; i++) b.line(leg, 'toe-crease', brown, [[s * .055 + (i - .5) * .10, -.535, .70], [s * .055 + (i - .5) * .10, -.455, .56]], .008);
  }
  b.tail = b.pivot(b.rig, 'kangaroo-tail', [0, .69, -.24]);
  b.mesh(b.tail, 'long-tapering-tail', taperedTube([[0, 0, 0], [.36, -.37, -.52], [1.04, -.51, -.60], [1.58, -.38, -.43]], [.24, .19, .10, .004]), b.skin);
}

export function createYellowFour() {
  return FOUR.map(item => {
    const b = createNPCToolkit(item.id, item.color, { scale: item.height, species: item.id });
    ({ bull, round, jiaojiao: buildBirdNPC, kangaroo })[item.id](b);
    const actor = b.finish();
    actor.group.userData.actorId = item.id;
    return { ...actor, ...item, arms: b.arms, rig: b.rig };
  });
}
