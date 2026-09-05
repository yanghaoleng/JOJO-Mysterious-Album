/**
 * 小小陶土剧场 · original volumetric character collection, 2026.
 * Authored for this project by Codex. No legacy rig, canvas cut-outs, skeleton,
 * downloaded model, external texture, or generative image is used here.
 * See assets/README.md for provenance, reproducible exports, and the API.
 */
import * as THREE from '../vendor/three.module.js';

export const CHARACTER_CATALOG = Object.freeze([
  { id: 'dog', name: '豆豆', description: '垂耳朵的小狗，带着一只邮差包。', color: '#c99561' },
  { id: 'rabbit', name: '雪团', description: '长耳朵的小兔，戴着一条蓝围巾。', color: '#eee3d5' },
  { id: 'otter', name: '阿獭', description: '圆鼻子的小水獭，口袋里藏着小贝壳。', color: '#99735b' },
  { id: 'owl', name: '咕咕', description: '心形脸的小猫头鹰，背着一本小书。', color: '#b19a7f' },
  { id: 'cat', name: '月牙', description: '尖耳朵的小猫，卷尾巴上有一道奶油色。', color: '#bf9980' },
  { id: 'bear', name: '蜜糖', description: '圆耳朵的小熊，围着蜂蜜色小领巾。', color: '#c39666' },
  { id: 'frog', name: '小荷', description: '圆眼睛的小青蛙，戴着一片荷叶。', color: '#93af83' },
]);

const ACTIONS = new Set(['idle', 'talk', 'wave', 'hop', 'listen', 'walk']);
const EXPRESSIONS = new Set(['happy', 'curious', 'sad', 'surprised']);
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const damping = (from, to, dt, speed = 10) => THREE.MathUtils.lerp(from, to, 1 - Math.exp(-speed * dt));

// A rounded, tapered piece with real thickness; unlike a card, both sides and
// the edge read correctly when the character turns. The optional bend gives
// ears, wings and leaves their hand-shaped silhouette.
function petalGeometry(length, width, thickness, bend = 0, pointed = false) {
  const rings = 14;
  const sides = 16;
  const positions = [];
  const indices = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const profile = Math.pow(Math.sin(Math.PI * t), pointed ? .86 : .58);
    const taper = pointed ? 1.35 - .8 * t : 1;
    for (let j = 0; j <= sides; j++) {
      const angle = j / sides * TAU;
      positions.push(
        Math.cos(angle) * width * profile * taper,
        t * length,
        Math.sin(angle) * thickness * profile + Math.sin(t * Math.PI * .5) * bend,
      );
      if (i < rings && j < sides) {
        const a = i * (sides + 1) + j;
        const b = a + sides + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function softenedBodyGeometry(pear = .16) {
  const sphere = new THREE.SphereGeometry(1, 24, 18);
  // A parametric SphereGeometry serializes its recipe, not edited vertices.
  // Copy into a plain buffer so exported models retain the sculpted surface.
  const geometry = new THREE.BufferGeometry().copy(sphere);
  sphere.dispose();
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const width = 1 - pear * y;
    // Deliberately very quiet surface irregularity: a hand-shaped solid,
    // rather than a texture or a faceted low-poly approximation.
    const wobble = 1 + .006 * Math.sin(y * 7 + x * 4) * Math.sin(z * 5);
    position.setXYZ(i, x * width * wobble, y, z * width * wobble);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Return a model facing +Z, feet at y=0, rest height 2.2 units.
 * Placement belongs to `group`; animations only change its internal children.
 * `time` and `dt` use seconds. All six actions loop and blend smoothly.
 */
export function createCharacter({ type = 'dog', color, scale = 1 } = {}) {
  const preset = CHARACTER_CATALOG.find(item => item.id === type) || CHARACTER_CATALOG[0];
  type = preset.id;
  const geometries = new Set();
  const materials = new Set();
  const ownGeometry = geometry => { geometries.add(geometry); return geometry; };
  const material = (hex, properties = {}) => {
    const value = new THREE.MeshStandardMaterial({ color: hex, roughness: .76, metalness: 0, ...properties });
    materials.add(value);
    return value;
  };
  const skin = material(color ?? preset.color);
  const darker = material('#a17d62');
  const innerEar = material('#d5a49c');
  const cream = material('#f4e8d6');
  const ink = material('#34302e', { roughness: .33 });
  const eyeMaterial = material('#252929', { roughness: .17 });
  const glintMaterial = material('#fffdf4', { roughness: .24, emissive: '#fff7dc', emissiveIntensity: .15 });
  const blushMaterial = material('#d89683', { roughness: .91 });
  const tongueMaterial = material('#c98679');
  const blue = material('#688f9c');
  const mustard = material('#c2a166');
  const sage = material('#617c63');
  const bagMaterial = material('#b98559');
  const stitchMaterial = material('#e5c7a0');
  const sphere = ownGeometry(new THREE.SphereGeometry(1, 20, 14));
  const smallSphere = ownGeometry(new THREE.SphereGeometry(1, 16, 10));
  const group = new THREE.Group();
  group.name = `clay-${type}`;
  group.userData = { author: 'Codex · 小小陶土剧场', source: 'dev/models.js', modelVersion: 1, species: type, usesSkeleton: false };
  group.scale.setScalar(Number.isFinite(scale) && scale > 0 ? scale : 1);
  const fit = new THREE.Group();
  const actor = new THREE.Group();
  group.add(fit);
  fit.add(actor);
  const part = (parent, name, geometry, mat, position = [0, 0, 0], size = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.scale.set(...size);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const ball = (parent, name, mat, position, size, tiny = false) => part(parent, name, tiny ? smallSphere : sphere, mat, position, size);
  const pivot = (parent, name, position) => {
    const node = new THREE.Group();
    node.name = name;
    node.position.set(...position);
    parent.add(node);
    return node;
  };
  const tube = (parent, name, points, radius, mat, segments = 20) => {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    return part(parent, name, ownGeometry(new THREE.TubeGeometry(curve, segments, radius, 7, false)), mat);
  };
  const petal = (parent, name, mat, position, dimensions, bend = 0, pointed = false) =>
    part(parent, name, ownGeometry(petalGeometry(...dimensions, bend, pointed)), mat, position);

  const wide = type === 'owl' || type === 'frog';
  const body = pivot(actor, 'breathing-body', [0, .76, 0]);
  const torsoSize = type === 'otter' ? [.43, .61, .33] : type === 'owl' ? [.57, .63, .4] : type === 'frog' ? [.53, .46, .34] : [.45, .54, .35];
  const torso = part(body, 'hand-shaped-pear-torso', ownGeometry(softenedBodyGeometry(type === 'owl' ? -.06 : .18)), skin, [0, 0, 0], torsoSize);
  const belly = ball(body, 'inlaid-cream-belly', cream, [0, -.03, .272], [torsoSize[0] * .72, torsoSize[1] * .77, .13]);
  if (type === 'frog') belly.material = material('#d9dcaa');
  const headBaseY = type === 'frog' ? 1.33 : type === 'owl' ? 1.55 : 1.53;
  const head = pivot(actor, 'expressive-head', [0, headBaseY, .025]);
  const headSize = type === 'otter' ? [.55, .48, .44] : type === 'owl' ? [.61, .49, .4] : type === 'frog' ? [.64, .4, .43] : type === 'rabbit' ? [.49, .48, .42] : [.55, .51, .44];
  part(head, 'rounded-solid-head', ownGeometry(softenedBodyGeometry(-.035)), skin, [0, 0, 0], headSize);

  const feet = [];
  const arms = [];
  const ears = [];
  for (const side of [-1, 1]) {
    const leg = pivot(actor, side < 0 ? 'left-foot-pivot' : 'right-foot-pivot', [side * (wide ? .3 : .24), .2, .02]);
    ball(leg, 'short-solid-leg', type === 'owl' ? mustard : skin, [0, .10, .016], [.115, .195, .126]);
    const foot = ball(leg, 'rounded-foot', type === 'owl' ? mustard : skin, [0, -.05, .105], [type === 'frog' ? .23 : .18, .15, type === 'rabbit' ? .29 : .24]);
    if (type === 'owl' || type === 'frog') {
      for (let toe = -1; toe <= 1; toe++) {
        ball(leg, 'little-toe', type === 'owl' ? mustard : skin, [toe * .075, -.11, .26 + (toe === 0 ? .025 : 0)], [.058, .048, .105], true);
      }
    } else {
      for (let toe = -1; toe <= 1; toe += 2) {
        tube(leg, 'toe-seam', [[toe * .04, -.003, .286], [toe * .04, -.02, .314], [toe * .04, -.051, .329]], .006, darker, 5);
      }
    }
    feet.push(leg);
    ball(body, 'rounded-shoulder', skin, [side * (wide ? .49 : .41), .235, .07], [.145, .135, .17]);
    const arm = pivot(body, side < 0 ? 'left-arm-pivot' : 'right-arm-pivot', [side * (wide ? .49 : .41), .24, 0]);
    if (type === 'owl') {
      const wing = petal(arm, 'rounded-wing', darker, [0, 0, 0], [.6, .17, .11], .025);
      wing.rotation.z = Math.PI + side * .16;
      wing.rotation.x = -.12;
      for (let feather = 0; feather < 3; feather++) {
        ball(arm, 'wing-feather-ridge', skin, [side * .024 * feather, -.23 - feather * .09, .093], [.082, .13, .035], true);
      }
    } else {
      const paw = ball(arm, 'soft-arm-and-paw', skin, [side * .035, -.22, .035], [type === 'frog' ? .1 : .13, .29, .14]);
      paw.rotation.z = side * .16;
      ball(arm, 'paw-pad', cream, [side * .059, -.35, .137], [.077, .085, .018], true);
    }
    arms.push(arm);
  }

  // Ears are purpose-built solids. Their proportions, placement and outlines
  // distinguish species without relying on a texture painted on a shared rig.
  for (const side of [-1, 1]) {
    if (type === 'frog') break;
    const ear = pivot(head, side < 0 ? 'left-ear' : 'right-ear', [side * (type === 'rabbit' ? .24 : .42), type === 'dog' ? .29 : .36, -.01]);
    if (type === 'dog') {
      petal(ear, 'folded-drop-ear', darker, [0, 0, 0], [.73, .2, .115], .12);
      petal(ear, 'velvet-ear-inset', innerEar, [0, .11, .079], [.49, .111, .027], .10);
      ear.rotation.z = Math.PI + side * .18;
      ear.rotation.x = -.1;
    } else if (type === 'rabbit') {
      ear.position.y = .28;
      petal(ear, 'long-rabbit-ear', skin, [0, 0, 0], [.9, .135, .092], -.10);
      petal(ear, 'long-pink-ear-inset', innerEar, [0, .115, .067], [.67, .075, .022], -.082);
      ear.rotation.z = -side * .14;
    } else if (type === 'cat' || type === 'owl') {
      petal(ear, type === 'cat' ? 'pointed-cat-ear' : 'little-owl-tuft', skin, [0, -.07, 0], [type === 'cat' ? .46 : .31, type === 'cat' ? .21 : .125, .095], -.055, true);
      if (type === 'cat') petal(ear, 'pink-triangle-inset', innerEar, [0, -.005, .072], [.30, .12, .027], -.04, true);
      ear.rotation.z = -side * .32;
    } else {
      const radius = type === 'otter' ? .115 : .175;
      ball(ear, 'round-ear', skin, [0, 0, 0], [radius, radius, .11]);
      ball(ear, 'round-ear-inset', innerEar, [0, -.01, .087], [radius * .6, radius * .61, .035], true);
      ear.position.y = type === 'otter' ? .24 : .39;
    }
    ear.userData.rest = ear.rotation.clone();
    ears.push(ear);
  }

  // Full eye whites, glassy pupils, two physical highlights, and independent
  // skin-colored eyelids remain legible when viewed from three-quarter angles.
  const eyes = [];
  const brows = [];
  const eyeY = type === 'frog' ? .29 : type === 'owl' ? .07 : .08;
  const eyeX = type === 'owl' ? .265 : type === 'frog' ? .35 : .225;
  const eyeZ = type === 'frog' ? .294 : type === 'owl' ? .35 : .402;
  if (type === 'owl') {
    for (const side of [-1, 1]) {
      const disk = ball(head, 'owl-heart-face-disk', cream, [side * .228, -.005, .285], [.306, .354, .152]);
      disk.rotation.z = -side * .12;
    }
  }
  for (const side of [-1, 1]) {
    const eye = pivot(head, side < 0 ? 'left-eye' : 'right-eye', [side * eyeX, eyeY, eyeZ]);
    const large = type === 'owl' || type === 'frog';
    const eyeRadius = large ? .137 : .091;
    if (type === 'frog') ball(eye, 'raised-frog-eye-socket', skin, [0, .011, -.055], [.215, .218, .175]);
    ball(eye, 'warm-eye-white', cream, [0, 0, 0], [eyeRadius * 1.19, eyeRadius * 1.34, eyeRadius * .55]);
    const pupil = ball(eye, 'glossy-pupil', eyeMaterial, [side * -.008, -.006, eyeRadius * .41], [eyeRadius * .79, eyeRadius * 1.01, eyeRadius * .55]);
    ball(pupil, 'large-eye-catchlight', glintMaterial, [-.27, .36, .87], [.23, .20, .11], true);
    ball(pupil, 'small-eye-catchlight', glintMaterial, [.28, -.24, .93], [.10, .105, .06], true);
    const lid = ball(eye, 'independent-upper-eyelid', type === 'owl' ? cream : skin, [0, eyeRadius * .17, eyeRadius * .73], [eyeRadius * 1.24, .0001, eyeRadius * .52]);
    lid.visible = false;
    eye.userData = { pupil, lid, radius: eyeRadius, side, baseY: eyeY };
    eyes.push(eye);
    const brow = tube(head, 'soft-eyebrow', [[side * (eyeX - .09), eyeY + eyeRadius * 1.74, eyeZ - .008], [side * eyeX, eyeY + eyeRadius * 1.9, eyeZ + .015], [side * (eyeX + .09), eyeY + eyeRadius * 1.73, eyeZ - .015]], .016, darker, 10);
    brows.push(brow);
    if (type !== 'owl') ball(head, 'warm-cheek', blushMaterial, [side * (wide ? .44 : .36), -.125, type === 'frog' ? .31 : .35], [.073, .04, .018], true);
  }

  const mouth = pivot(head, 'animated-mouth', [0, type === 'frog' ? -.105 : -.185, type === 'owl' ? .402 : .438]);
  if (type === 'dog' || type === 'otter' || type === 'bear' || type === 'cat' || type === 'rabbit') {
    for (const side of [-1, 1]) ball(head, 'round-cream-muzzle', cream, [side * .104, -.14, .367], [type === 'otter' ? .194 : .17, .136, .13]);
  }
  const openMouth = ball(mouth, 'mouth-cavity', ink, [0, -.015, .016], [.073, .055, .036], true);
  const tongue = ball(mouth, 'little-tongue', tongueMaterial, [0, -.038, .048], [.044, .018, .008], true);
  const smile = tube(mouth, 'curved-smile', [[-.105, .016, .052], [-.068, -.022, .068], [0, -.04, .072], [.068, -.022, .068], [.105, .016, .052]], .011, ink, 16);
  const sadMouth = tube(mouth, 'soft-frown', [[-.07, -.028, .07], [0, .007, .075], [.07, -.028, .07]], .010, ink, 12);
  sadMouth.visible = false;
  if (type === 'frog') {
    mouth.scale.setScalar(1.55);
    for (const side of [-1, 1]) ball(head, 'tiny-nostril', darker, [side * .105, .015, .417], [.014, .013, .009], true);
  } else if (type === 'owl') {
    const beak = petal(head, 'rounded-golden-beak', mustard, [0, -.025, .435], [.22, .09, .085], .025, true);
    beak.rotation.z = Math.PI;
    mouth.position.y = -.245;
    mouth.scale.setScalar(.65);
  } else {
    const nose = ball(head, 'velvet-button-nose', type === 'rabbit' || type === 'cat' ? tongueMaterial : ink, [0, -.085, .492], [type === 'bear' ? .095 : .071, .049, .043], true);
    if (type === 'otter') nose.scale.x = .102;
    ball(nose, 'nose-glint', glintMaterial, [-.25, .36, .82], [.20, .10, .045], true);
    if (type === 'rabbit') {
      for (const side of [-1, 1]) ball(mouth, 'tiny-front-tooth', glintMaterial, [side * .021, -.006, .076], [.021, .032, .012], true);
    }
    if (type === 'otter' || type === 'cat') {
      for (const side of [-1, 1]) {
        for (let whisker = -1; whisker <= 1; whisker++) {
          tube(head, 'sculpted-short-whisker', [[side * .225, -.13 + whisker * .031, .433], [side * .35, -.125 + whisker * .051, .42], [side * .46, -.11 + whisker * .069, .373]], .006, darker, 9);
        }
      }
    }
  }

  const tail = pivot(actor, 'tail-pivot', [0, .54, -.26]);
  if (type === 'cat') {
    tube(tail, 'curled-question-mark-tail', [[0, 0, 0], [.32, -.02, -.2], [.58, .2, -.29], [.61, .63, -.29], [.42, .86, -.23], [.25, .76, -.20]], .079, skin, 34);
    tube(tail, 'cream-tail-tip', [[.43, .859, -.23], [.31, .836, -.21], [.25, .76, -.20]], .080, cream, 10);
  } else if (type === 'otter') {
    const otterTail = petal(tail, 'long-paddle-tail', darker, [0, 0, 0], [1.01, .18, .092], -.12);
    otterTail.rotation.x = -Math.PI * .66;
    otterTail.rotation.z = -.19;
  } else if (type === 'dog') {
    tube(tail, 'happy-curved-tail', [[0, 0, 0], [.03, .10, -.19], [.06, .34, -.32], [.04, .48, -.27]], .069, skin, 20);
    ball(tail, 'tail-cream-tip', cream, [.04, .48, -.27], [.071, .089, .071], true);
  } else if (type === 'rabbit' || type === 'bear') {
    ball(tail, 'round-pom-tail', type === 'rabbit' ? cream : skin, [0, .015, -.11], [type === 'rabbit' ? .20 : .13, .18, .17]);
  } else if (type === 'owl') {
    for (const side of [-1, 0, 1]) {
      const feather = petal(tail, 'short-tail-feather', darker, [side * .09, -.03, 0], [.38, .069, .045], -.07);
      feather.rotation.x = -Math.PI * .72;
      feather.rotation.z = side * .21;
    }
  }

  // Accessories are sculpted, not painted: a strap wraps around the body;
  // satchels have a flap, edge, seams and a button; scarves have actual ends.
  if (type === 'dog' || type === 'otter' || type === 'owl') {
    tube(body, 'cross-body-satchel-strap', [[-.36, .38, .17], [-.20, .24, .355], [.04, .015, .397], [.29, -.20, .32], [.44, -.15, .025], [.27, .04, -.30], [-.13, .4, -.245], [-.36, .38, .17]], .031, bagMaterial, 36);
    const bag = pivot(body, 'little-satchel', [.37, -.13, .23]);
    bag.rotation.z = -.13;
    ball(bag, 'satchel-body', type === 'owl' ? sage : bagMaterial, [0, 0, 0], [.185, .20, .086]);
    ball(bag, 'satchel-flap', type === 'owl' ? sage : bagMaterial, [0, .075, .055], [.19, .123, .057]);
    tube(bag, 'satchel-stitched-edge', [[-.143, .038, .09], [-.10, -.027, .107], [0, -.045, .116], [.10, -.027, .107], [.143, .038, .09]], .007, stitchMaterial, 16);
    ball(bag, 'wooden-bag-button', mustard, [0, -.005, .117], [.031, .029, .012], true);
    if (type === 'otter') {
      const shell = ball(bag, 'pocket-shell', cream, [0, .155, .021], [.073, .076, .032], true);
      for (const side of [-1, 0, 1]) tube(bag, 'shell-ridge', [[side * .039, .19, .049], [side * .024, .157, .054], [0, .116, .05]], .005, stitchMaterial, 5);
    }
    if (type === 'owl') {
      ball(bag, 'book-pages', cream, [.02, .185, .007], [.12, .083, .048], true);
      ball(bag, 'book-cover-edge', sage, [.02, .197, -.023], [.126, .095, .018], true);
    }
  } else if (type === 'rabbit' || type === 'bear') {
    const scarfMaterial = type === 'rabbit' ? blue : mustard;
    const collar = part(body, 'soft-scarf-collar', ownGeometry(new THREE.TorusGeometry(.3, .071, 10, 32)), scarfMaterial, [0, .47, 0], [1, 1, .78]);
    collar.rotation.x = Math.PI / 2;
    ball(body, 'scarf-knot', scarfMaterial, [.20, .40, .25], [.106, .088, .07]);
    const scarfEnd = petal(body, 'hanging-scarf-end', scarfMaterial, [.205, .4, .26], [.35, .082, .026], .056);
    scarfEnd.rotation.z = Math.PI - .20;
    tube(body, 'scarf-end-stitch', [[.205, .133, .314], [.25, .13, .315], [.278, .149, .31]], .008, cream, 8);
  } else if (type === 'cat') {
    const collar = part(body, 'little-green-collar', ownGeometry(new THREE.TorusGeometry(.29, .041, 8, 30)), sage, [0, .465, 0], [1, 1, .86]);
    collar.rotation.x = Math.PI / 2;
    ball(body, 'moon-shaped-name-charm', mustard, [0, .369, .3], [.059, .069, .028], true);
    ball(body, 'moon-charm-inlay', sage, [.023, .394, .321], [.043, .042, .008], true);
  } else if (type === 'frog') {
    const leaf = petal(body, 'tiny-lily-leaf-cape', sage, [0, .5, -.05], [.68, .32, .027], -.13, true);
    leaf.rotation.x = -Math.PI * .74;
    tube(body, 'leaf-stem-necklace', [[-.25, .37, .23], [0, .27, .34], [.26, .37, .23]], .026, sage, 18);
    ball(body, 'dew-drop-pendant', mustard, [0, .265, .357], [.045, .065, .027], true);
  }
  if (type === 'owl') {
    for (let row = 0; row < 2; row++) {
      for (let feather = -1; feather <= 1; feather++) {
        tube(body, 'chest-feather-engraving', [[feather * .13 - .036, .04 - row * .15, .398], [feather * .13, .008 - row * .15, .405], [feather * .13 + .036, .04 - row * .15, .398]], .009, darker, 7);
      }
    }
  }

  function setColor(nextColor) {
    if (typeof nextColor !== 'string' && typeof nextColor !== 'number') return;
    skin.color.set(nextColor);
    darker.color.copy(skin.color).multiplyScalar(.72);
    innerEar.color.copy(skin.color).lerp(new THREE.Color('#dea3a0'), .63);
    group.userData.color = `#${skin.color.getHexString()}`;
  }
  setColor(color ?? preset.color);
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(actor);
  const nativeHeight = bounds.max.y - bounds.min.y;
  fit.scale.setScalar(2.2 / nativeHeight);
  fit.position.y = -bounds.min.y * fit.scale.y;
  group.userData.restHeight = 2.2;
  group.userData.triangles = 0;
  group.userData.meshes = 0;
  group.traverse(node => {
    if (node.isMesh) {
      group.userData.meshes++;
      group.userData.triangles += (node.geometry.index?.count || node.geometry.attributes.position.count) / 3;
    }
  });

  let action = 'idle';
  let expression = 'happy';
  let disposed = false;
  let previousTime = null;
  const weights = Object.fromEntries([...ACTIONS].map(key => [key, key === 'idle' ? 1 : 0]));
  let expressionAmount = 0;
  function setAction(nextAction) {
    if (!ACTIONS.has(nextAction)) return false;
    action = nextAction;
    group.userData.action = action;
    return true;
  }
  function setExpression(nextExpression) {
    if (!EXPRESSIONS.has(nextExpression)) return false;
    expression = nextExpression;
    group.userData.expression = expression;
    return true;
  }
  function update(time = 0, dt) {
    if (disposed) return;
    if (!Number.isFinite(time)) time = 0;
    dt = clamp(Number.isFinite(dt) ? dt : previousTime === null ? 1 / 60 : time - previousTime, 0, .08);
    previousTime = time;
    for (const key of ACTIONS) weights[key] = damping(weights[key], key === action ? 1 : 0, dt, 8);
    const wave = weights.wave;
    const walking = weights.walk;
    const talking = weights.talk;
    const hopping = weights.hop;
    const listening = weights.listen;
    const gait = Math.sin(time * 8.5);
    const hopPhase = Math.max(0, Math.sin(time * 4.4));
    const breath = Math.sin(time * 2.15);
    actor.position.y = hopping * hopPhase * .20 + walking * Math.abs(gait) * .03;
    actor.rotation.z = Math.sin(time * 1.45) * .012 + walking * gait * .035;
    actor.scale.set(1 - hopping * hopPhase * .035, 1 + hopping * hopPhase * .06, 1 - hopping * hopPhase * .025);
    body.scale.set(1 + breath * .009, 1 + breath * .013, 1 + breath * .011);
    head.position.y = headBaseY + breath * .012;
    const curious = expression === 'curious' ? 1 : 0;
    const sad = expression === 'sad' ? 1 : 0;
    const surprised = expression === 'surprised' ? 1 : 0;
    expressionAmount = damping(expressionAmount, sad, dt, 7);
    head.rotation.z = damping(head.rotation.z, curious * -.12 + listening * -.14 + wave * .065 + Math.sin(time * 1.2) * .014, dt, 7);
    head.rotation.x = damping(head.rotation.x, expressionAmount * .13 - surprised * .06 + talking * Math.sin(time * 6.4) * .018, dt, 7);
    head.rotation.y = damping(head.rotation.y, listening * .065 + Math.sin(time * .75) * .032, dt, 6);
    arms[0].rotation.z = damping(arms[0].rotation.z, -.09 + talking * Math.sin(time * 3.6) * .12 - hopping * .35, dt);
    arms[1].rotation.z = damping(arms[1].rotation.z, .09 + wave * (2.2 + Math.sin(time * 7) * .26) + hopping * .35, dt);
    arms[0].rotation.x = damping(arms[0].rotation.x, walking * gait * .47 - listening * .14, dt);
    arms[1].rotation.x = damping(arms[1].rotation.x, -walking * gait * .47 - wave * .3, dt);
    arms[1].position.z = damping(arms[1].position.z, wave * .23, dt);
    feet[0].rotation.x = damping(feet[0].rotation.x, -walking * gait * .35, dt);
    feet[1].rotation.x = damping(feet[1].rotation.x, walking * gait * .35, dt);
    feet[0].position.y = .20 + walking * Math.max(0, gait) * .08;
    feet[1].position.y = .20 + walking * Math.max(0, -gait) * .08;
    tail.rotation.y = Math.sin(time * (wave + talking > .1 ? 5.5 : 2.7)) * (type === 'dog' ? .27 : .08);
    for (let i = 0; i < ears.length; i++) {
      const ear = ears[i];
      ear.rotation.z = ear.userData.rest.z + (i === 0 ? -1 : 1) * (Math.sin(time * 2 + i) * .025 + hopping * hopPhase * .12 + curious * .07);
      ear.rotation.x = ear.userData.rest.x + Math.sin(time * 2.4 + i) * .02 + talking * Math.sin(time * 6) * .035;
    }
    const blinkPhase = ((time + .85) % 4.7);
    const blink = blinkPhase < .17 ? Math.sin(blinkPhase / .17 * Math.PI) : 0;
    for (const eye of eyes) {
      const { pupil, lid, radius, side } = eye.userData;
      const droop = expressionAmount * .34;
      const closure = Math.max(blink, droop);
      lid.visible = closure > .015;
      lid.scale.y = Math.max(.0001, radius * 1.48 * closure);
      lid.position.y = radius * (1.35 - closure * 1.24);
      pupil.position.x = damping(pupil.position.x, side * -.008 + listening * .018 + curious * .006, dt);
      eye.scale.y = damping(eye.scale.y, 1 + surprised * .15 - sad * .06, dt, 7);
    }
    for (let i = 0; i < brows.length; i++) {
      brows[i].position.y = damping(brows[i].position.y, surprised * .035 + curious * (i === 0 ? .024 : -.012), dt);
      brows[i].rotation.z = damping(brows[i].rotation.z, expressionAmount * (i === 0 ? -.11 : .11), dt);
    }
    const syllable = .24 + .76 * Math.pow(Math.max(0, Math.sin(time * 12.4) * .65 + Math.sin(time * 7.7) * .35), .7);
    const openness = talking * syllable + surprised * .75;
    openMouth.visible = openness > .045;
    tongue.visible = openness > .14 && !surprised;
    openMouth.scale.y = .019 + .065 * openness;
    openMouth.scale.x = .049 + .033 * openness;
    smile.visible = !sad && !surprised && talking < .4;
    sadMouth.visible = !!sad && talking < .4;
    if (tongue.visible) tongue.position.y = -.022 - openness * .039;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    for (const geometry of geometries) geometry.dispose();
    for (const value of materials) value.dispose();
  }
  setAction('idle');
  setExpression('happy');
  update(0, 1 / 60);
  return { group, update, setAction, setExpression, setColor, dispose };
}
