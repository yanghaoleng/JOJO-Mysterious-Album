/**
 * Document-family NPCs: original procedural interpretations of supplied text.
 * Only the three core children have supplied 3D turnarounds; these adult clothes,
 * palettes and profession props are interpretations, not additional canon.
 * Geometry, animation and materials are owned by the returned model instance.
 */
import * as THREE from '../../vendor/three.module.js';
import { createNPCToolkit, buildBirdNPC, buildCatNPC, buildPigNPC } from './models.js';

const IDS = new Set(['jiaojiao-mom', 'jiaojiao-dad', 'zhuxiaodi-mom', 'zhuxiaodi-dad', 'lingdang-mom', 'lingdang-dad', 'nini', 'xiaomaoqiu', 'xiaolu-teacher', 'miao-boss', 'zhuxiaoyu']);

function lathe(b, parent, name, material, profile, position, depth = .78) {
  return b.mesh(parent, name, new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(...p)), 28), material, position, [1, 1, depth]);
}

function book(b, parent, position, color = '#647d70', size = 1) {
  const root = b.pivot(parent, 'bound-profession-notebook', position); root.scale.setScalar(size);
  const cover = b.mat(color, 'fabric'), paper = b.mat('#eadcc0', 'paper');
  b.mesh(root, 'notebook-page-block', new THREE.BoxGeometry(.20, .29, .036), paper);
  for (const z of [-.025, .025]) b.mesh(root, 'notebook-cloth-cover', new THREE.BoxGeometry(.22, .315, .014), cover, [0, 0, z]);
  b.line(root, 'notebook-rounded-spine', cover, [[-.112, -.148, 0], [-.115, 0, 0], [-.112, .148, 0]], .025, 10);
  for (const y of [-.055, 0, .055]) b.line(root, 'notebook-page-edge', b.mat('#cabda5', 'paper'), [[.103, y, -.013], [.103, y, .013]], .002, 3);
  return root;
}

function buttons(b, x, y, z, material, count = 3, step = .12) {
  for (let i = 0; i < count; i++) b.ball(b.rig, 'sewn-clothing-button', material, [x, y - i * step, z], [.023, .023, .012], true);
}

function adultize(b, species) {
  // Longer clothed torsos/limbs and proportionally smaller heads, not a scaled
  // child wearing its original costume. Keep face anatomy / family resemblance.
  for (const child of [...b.rig.children]) {
    if (child === b.head) continue;
    child.position.y *= species === 'pig' ? 1.48 : 1.42;
    child.scale.y *= species === 'pig' ? 1.48 : 1.42;
  }
  b.head.scale.setScalar(species === 'pig' ? .79 : .78);
  b.head.position.y = species === 'pig' ? 1.92 : 2.03;
}

function shoes(b, color = '#77614e', width = .11) {
  const material = b.mat(color, 'paint');
  b.legs.forEach(leg => b.ball(leg, 'adult-rounded-shoe', material, [0, -.335, .05], [width, .077, .15]));
}

function birdParent(b, mother) {
  buildBirdNPC(b, { cape: false, bow: false });
  const torso = b.rig.getObjectByName('mango-shaped-chick'); torso.position.y = 1.19; torso.scale.set(.95, 1.13, .98);
  b.head.position.y = 1.80; b.head.scale.setScalar(.88);
  b.rig.getObjectByName('two-part-chick-cowlick').position.y = 2.075;
  for (const arm of b.arms) { arm.position.y = 1.12; arm.scale.y = 1.15; }
  for (const leg of b.legs) { leg.position.y = .28; leg.scale.y = 1.28; }
  const cloth = b.mat(mother ? '#a77983' : '#60788a', 'fabric'), cream = b.mat('#f2e4ce', 'fabric');
  lathe(b, b.rig, mother ? 'adult-office-dress' : 'adult-radio-waistcoat', cloth,
    [[0, 0], [.46, 0], [.64, .07], [.64, .31], [.57, .59], [.49, .69], [0, .69]], [0, .30, -.008], .77);
  b.sheet(b.rig, 'cream-front-blouse', cream, (u, v) => {
    const x = (u - .5) * .43; return [x, .64 + v * .37, .49 * Math.sqrt(1 - (x / .68) ** 2)];
  }, 10, 6, .014);
  for (const side of [-1, 1]) {
    const collar = b.ball(b.rig, 'adult-rounded-collar', cream, [side * .112, 1.018, .466], [.12, .055, .045]); collar.rotation.z = side * .2;
    b.ball(b.arms[side < 0 ? 0 : 1], 'tailored-wing-sleeve', cloth, [side * .016, -.055, -.015], [.137, .15, .12]);
  }
  buttons(b, 0, .87, .503, b.mat('#d8bb8c', 'paint'), 2, .13);
  if (mother) {
    // Office folder and an adult hair clasp distinguish her from red-caped Jiao.
    book(b, b.arms[0], [-.055, -.31, .13], '#c0b087', 1.03).rotation.z = -.16;
    b.ball(b.rig, 'small-adult-hair-clasp', b.mat('#b47475', 'paint'), [-.105, 2.17, .061], [.061, .026, .029], true);
  } else {
    const microphone = b.pivot(b.arms[1], 'radio-announcer-microphone', [.02, -.27, .18]); microphone.rotation.z = -.16;
    b.mesh(microphone, 'microphone-handle', new THREE.CylinderGeometry(.018, .025, .21, 12), b.mat('#776a60', 'paint'), [0, 0, 0]);
    b.ball(microphone, 'rounded-microphone-grille', b.mat('#a79c89', 'stone'), [0, .137, 0], [.055, .077, .051]);
    for (const y of [.10, .125, .15, .17]) b.line(microphone, 'microphone-grille-band', b.mat('#70695e', 'ink'), [[-.043, y, .021], [0, y, .049], [.043, y, .021]], .003, 7);
    b.bow(b.rig, [0, .976, .511], '#8a4c47', .47);
  }
}

function catParent(b, mother) {
  buildCatNPC(b, { shirtColor: mother ? '#d9ded0' : '#e2ceb0', pantsColor: '#667465', emblem: false }); adultize(b, 'cat');
  const coat = b.mat(mother ? '#c4d2bc' : '#b69572', 'fabric'), dark = b.mat(mother ? '#62785f' : '#87674d', 'fabric');
  // Open field coat and full-length trousers; no child's purple shorts/emblem.
  lathe(b, b.rig, 'adult-field-coat', coat, [[0, 0], [.40, 0], [.39, .16], [.325, .54], [.265, .62], [0, .62]], [0, .72, -.008], .75);
  b.line(b.rig, 'coat-front-opening', dark, [[0, .75, .295], [0, 1.04, .267], [0, 1.34, .202]], .008, 14);
  for (const side of [-1, 1]) {
    const lapel = b.patch(b.rig, 'field-coat-soft-lapel', coat, [[0, 0], [side * .115, -.20], [side * .17, -.08]], .012, .018); lapel.position.set(side * .04, 1.43, .224);
    b.ball(b.legs[side < 0 ? 0 : 1], 'long-adult-trouser-leg', dark, [0, -.1, .006], [.09, .245, .093]);
    b.ball(b.arms[side < 0 ? 0 : 1], 'long-field-coat-sleeve', coat, [side * .055, -.21, .0], [.09, .22, .092]);
    b.ball(b.rig, 'coat-patch-pocket', dark, [side * .24, .92, .245], [.079, .072, .015]);
  }
  shoes(b, mother ? '#807164' : '#78604b');
  book(b, b.arms[0], [-.065, -.32, .12], mother ? '#6e8667' : '#927552', 1.09).rotation.z = -.1;
  if (mother) {
    const sprig = b.pivot(b.arms[1], 'botanist-specimen-sprig', [.085, -.23, .12]);
    b.line(sprig, 'botanical-stem', b.mat('#73885a', 'wood'), [[0, -.13, 0], [0, .05, 0], [.04, .21, 0]], .009, 12);
    for (let i = 0; i < 4; i++) { const side = i % 2 ? -1 : 1; const leaf = b.ball(sprig, 'plant-specimen-leaf', b.mat('#91a672', 'foliage'), [side * .045, -.025 + i * .063, 0], [.069, .027, .014]); leaf.rotation.z = side * .45; }
  } else {
    const brush = b.pivot(b.arms[1], 'archaeology-soft-dusting-brush', [.055, -.24, .12]); brush.rotation.z = -.2;
    b.mesh(brush, 'wooden-brush-handle', new THREE.CylinderGeometry(.016, .026, .26, 12), b.mat('#9d7853', 'wood'));
    b.mesh(brush, 'soft-dusting-bristles', new THREE.CylinderGeometry(.044, .030, .11, 14), b.mat('#d3b691', 'fabric'), [0, .175, 0]);
    b.line(b.rig, 'archaeologist-satchel-strap', dark, [[-.265, 1.48, .16], [0, 1.16, .293], [.345, .80, .21]], .023, 16);
    b.ball(b.rig, 'archaeologist-side-satchel', dark, [.36, .77, .095], [.133, .15, .076]);
  }
}

function pigParent(b, mother) {
  buildPigNPC(b, { shirtColor: mother ? '#e9dcc4' : '#e7dccb', pantsColor: mother ? '#ad7775' : '#586678', bowColor: null, suspenders: false }); adultize(b, 'pig');
  const cloth = b.mat(mother ? '#ae7e7c' : '#667488', 'fabric');
  if (mother) {
    lathe(b, b.rig, 'adult-long-craft-dress', cloth, [[0, 0], [.62, 0], [.70, .08], [.64, .53], [.52, .72], [0, .72]], [0, .12, -.02], .73);
    const apron = b.mat('#e1c99c', 'fabric');
    b.sheet(b.rig, 'rounded-craft-apron', apron, (u, v) => {
      const x = (u - .5) * (.74 - .18 * v); return [x, .31 + .76 * v, .54 * Math.sqrt(Math.max(.25, 1 - (x / .70) ** 2))];
    }, 16, 14, .018);
    b.ball(b.rig, 'apron-tool-pocket', b.mat('#be9d77', 'fabric'), [0, .66, .555], [.17, .098, .018]);
    for (let i = 0; i < 3; i++) b.line(b.rig, 'safe-craft-colour-pencil', b.mat(['#b56758', '#648a71', '#c79b52'][i], 'wood'), [[-.078 + i * .075, .68, .575], [-.06 + i * .063, .90 + i % 2 * .024, .55]], .010, 4);
    b.bow(b.head, [-.37, .44, .05], '#a25d65', .52);
  } else {
    // Broad adult businessman vest and tie; no blue child bow or suspenders.
    b.sheet(b.rig, 'adult-tailored-waistcoat', cloth, (u, v) => {
      const x = (u - .5) * 1.08, y = .64 + .81 * v;
      return [x, y, .459 * Math.sqrt(Math.max(.08, 1 - (x / .66) ** 2 - ((y - .998) / .78) ** 2)) + .012];
    }, 24, 16, .020);
    const tie = b.mat('#aa7060', 'fabric');
    const pendant = b.patch(b.rig, 'adult-business-necktie', tie, [[-.045, .12], [.045, .12], [.071, -.17], [0, -.25], [-.071, -.17]], .018, .012); pendant.position.set(0, 1.22, .475);
    buttons(b, .11, .92, .465, b.mat('#c6aa74', 'paint'), 2, .16);
    const briefcase = b.pivot(b.arms[0], 'rounded-business-briefcase', [-.065, -.39, .06]);
    b.mesh(briefcase, 'briefcase-body', new THREE.BoxGeometry(.30, .23, .105), b.mat('#87694f', 'fabric'));
    b.line(briefcase, 'briefcase-loop-handle', b.mat('#5e483a', 'paint'), [[-.065, .12, 0], [-.047, .18, 0], [.047, .18, 0], [.065, .12, 0]], .013, 14);
  }
}

function mammal(b, species) {
  const deer = species === 'deer', sheep = species === 'sheep';
  const cream = b.mat(sheep ? '#f4e9d4' : '#f2dcaf', 'paper');
  b.head = b.pivot(b.rig, `${species}-individual-head`, [0, deer ? 1.81 : 1.61, 0]);
  b.ball(b.head, `${species}-head-solid`, b.skin, [0, 0, 0], deer ? [.32, .40, .285] : sheep ? [.395, .385, .30] : [.35, .30, .28]);
  b.ball(b.head, `${species}-projecting-muzzle`, cream, [0, -.10, .236], deer ? [.18, .17, .16] : sheep ? [.23, .17, .10] : [.215, .11, .155]);
  for (const side of [-1, 1]) {
    const ear = b.pivot(b.head, `${species}-ear-${side}`, [side * (deer ? .25 : sheep ? .38 : .28), deer ? .28 : .19, -.025]); ear.rotation.z = side * (deer ? -.53 : sheep ? -1.06 : -.3);
    b.ball(ear, `${species}-outer-ear`, b.skin, [0, .08, 0], deer ? [.10, .225, .065] : sheep ? [.098, .197, .057] : [.095, .105, .064]);
    b.ball(ear, `${species}-inner-ear`, b.mat('#d8ad95', 'paint'), [0, .08, .044], deer ? [.052, .161, .013] : sheep ? [.054, .137, .011] : [.054, .065, .015]);
    b.eye(b.head, side, [side * (deer ? .137 : .149), .023, deer ? .275 : .279], deer ? .091 : .101, deer ? .118 : .124, b.skin, sheep || deer);
    b.brow(b.head, side, [side * .147, .211, .250], .087);
    const arm = b.pivot(b.rig, `${species}-arm-${side}`, [side * .245, deer ? 1.26 : 1.03, 0]);
    b.ball(arm, `${species}-slender-forearm`, b.skin, [side * .039, -.19, .01], [.068, deer ? .25 : .20, .071]);
    b.ball(arm, `${species}-rounded-hand`, sheep || deer ? cream : b.skin, [side * .045, deer ? -.393 : -.348, .035], [.074, .083, .069]); b.arms.push(arm);
    const leg = b.pivot(b.rig, `${species}-leg-${side}`, [side * .132, deer ? .55 : .37, 0]);
    b.ball(leg, `${species}-slender-leg`, b.skin, [0, deer ? -.23 : -.14, .0], [.071, deer ? .285 : .205, .077]);
    b.ball(leg, `${species}-rounded-foot`, b.mat(sheep || deer ? '#76604e' : '#b58b56', 'paint'), [0, deer ? -.473 : -.298, .052], [.095, .064, .125]); b.legs.push(leg);
  }
  b.ball(b.head, `${species}-soft-nose`, b.mat('#79513e', 'ink'), [0, -.095, deer ? .383 : sheep ? .335 : .378], [.052, .035, .028], true);
  b.mouth(b.head, [0, -.218, deer ? .324 : sheep ? .282 : .304], .081, .070);
  if (sheep) {
    // Distinct sheep wool silhouette: separate soft curls, not cat ears/tail.
    const wool = b.mat('#e9dcc4', 'paper');
    for (let i = 0; i < 13; i++) { const a = i / 13 * Math.PI * 2; b.ball(b.head, 'rounded-wool-crown-curl', wool, [Math.sin(a) * .28, .18 + Math.cos(a) * .19, -.045], [.142, .136, .20], true); }
    for (const x of [-.19, 0, .19]) b.ball(b.head, 'forehead-wool-ringlet', wool, [x, .254, .218], [.12, .096, .080], true);
    const dress = b.mat('#b6a7bd', 'fabric'); lathe(b, b.rig, 'nini-soft-child-dress', dress, [[0, 0], [.34, 0], [.38, .05], [.245, .75], [.14, .82], [0, .82]], [0, .33, 0]);
    b.ball(b.rig, 'soft-lamb-neck', b.skin, [0, 1.21, -.01], [.105, .15, .11]);
    for (const side of [-1, 1]) b.ball(b.arms[side < 0 ? 0 : 1], 'nini-puff-sleeve', dress, [side * .02, -.05, 0], [.116, .115, .11]);
    b.bow(b.rig, [0, 1.03, .225], '#e6d3b1', .38);
    b.tail = b.pivot(b.rig, 'small-lamb-tail', [0, .51, -.25]); b.ball(b.tail, 'wool-tail', wool, [0, 0, -.03], [.10, .12, .10]);
    const doll = b.pivot(b.arms[0], 'nini-small-cloth-doll', [-.02, -.34, .115]);
    b.ball(doll, 'doll-cloth-body', b.mat('#d5aa94', 'fabric'), [0, 0, 0], [.057, .089, .034], true);
    b.ball(doll, 'doll-head', cream, [0, .104, 0], [.06, .06, .037], true);
    for (const x of [-.021, .021]) b.ball(doll, 'embroidered-doll-eye', b.ink, [x, .11, .035], [.004, .005, .003], true);
  } else if (deer) {
    const dress = b.mat('#889b89', 'fabric'); lathe(b, b.rig, 'teacher-adult-midi-dress', dress, [[0, 0], [.36, 0], [.39, .07], [.26, .84], [0, .85]], [0, .46, 0], .73);
    b.ball(b.rig, 'deer-long-neck', b.skin, [0, 1.46, 0], [.115, .22, .12]);
    for (const side of [-1, 1]) {
      b.ball(b.arms[side < 0 ? 0 : 1], 'teacher-dress-sleeve', dress, [side * .025, -.07, -.004], [.102, .17, .098]);
      for (let i = 0; i < 3; i++) b.ball(b.head, 'cream-deer-cheek-spot', cream, [side * (.225 + i % 2 * .028), -.057 + i * .089, .229 - i % 2 * .017], [.023, .033, .008], true);
    }
    b.bow(b.rig, [0, 1.28, .211], '#e6d4ac', .39);
    book(b, b.arms[0], [-.035, -.38, .103], '#bd937d', .9);
    b.tail = b.pivot(b.rig, 'short-doe-tail', [0, .65, -.255]); b.ball(b.tail, 'white-under-deer-tail', cream, [0, .055, -.041], [.066, .139, .058]);
  } else {
    b.ball(b.rig, 'long-slender-weasel-torso', b.skin, [0, .94, 0], [.245, .48, .20]);
    b.ball(b.rig, 'connected-weasel-neck', b.skin, [0, 1.38, -.015], [.127, .18, .12]);
    b.ball(b.rig, 'connected-weasel-hip', b.skin, [0, .49, -.006], [.183, .16, .16]);
    b.ball(b.rig, 'cream-weasel-throat-and-belly', cream, [0, 1.06, .153], [.153, .345, .058]);
    const vest = b.mat('#788c78', 'fabric');
    for (const side of [-1, 1]) b.ball(b.rig, 'weasel-short-open-vest-panel', vest, [side * .183, 1.0, .074], [.089, .263, .15]);
    const pouch = b.mat('#a5754e', 'fabric');
    b.line(b.rig, 'treasure-bag-crossbody-strap', pouch, [[-.212, 1.26, .13], [0, .97, .228], [.255, .60, .16]], .018, 16);
    b.ball(b.rig, 'found-treasure-collection-pouch', pouch, [.26, .62, .13], [.137, .155, .083]);
    b.ball(b.rig, 'treasure-pouch-folded-flap', b.mat('#bf9263', 'fabric'), [.26, .707, .192], [.135, .065, .025]);
    b.ball(b.rig, 'small-found-glass-marble', b.mat('#94b9aa', 'paint'), [.27, .748, .177], [.031, .031, .028], true);
    b.tail = b.pivot(b.rig, 'long-weasel-tail', [0, .57, -.155]);
    b.line(b.tail, 'long-tapered-mustelid-tail', b.skin, [[0, 0, -.08], [.19, -.20, -.27], [.40, -.27, -.24], [.55, -.08, -.20], [.56, .15, -.18]], .079, 28);
    b.ball(b.tail, 'rounded-weasel-tail-tip', b.skin, [.56, .15, -.18], [.078, .084, .075]);
    for (const side of [-1, 1]) for (const dy of [-.025, .025]) b.line(b.head, 'fine-weasel-whisker', b.ink, [[side * .15, -.13 + dy, .341], [side * .28, -.12 + dy * 2, .34]], .002, 6);
  }
}

function merchantCat(b) {
  buildCatNPC(b, { shirtColor: '#e8ceb0', pantsColor: '#776450', emblem: false }); adultize(b, 'cat');
  b.head.scale.set(.96, .79, .86); b.head.position.y = 2.10;
  const vest = b.mat('#9e765b', 'fabric');
  b.ball(b.rig, 'merchant-large-round-waistcoat', vest, [0, 1.00, -.01], [.62, .61, .41]);
  for (const side of [-1, 1]) {
    const arm = b.arms[side < 0 ? 0 : 1]; arm.position.x = side * .57;
    b.ball(arm, 'merchant-wide-long-sleeve', vest, [side * .048, -.15, -.01], [.145, .22, .14]);
    b.ball(b.legs[side < 0 ? 0 : 1], 'merchant-long-trouser', b.mat('#776450', 'fabric'), [0, -.11, 0], [.124, .244, .10]);
    b.legs[side < 0 ? 0 : 1].position.x = side * .27;
    // Calm squints retain animated internal eyes for genuine surprises.
    b.eyes[side < 0 ? 0 : 1].root.scale.y = .22;
    b.line(b.head, 'smiling-narrow-cat-eye', b.ink, [[side * .202 - .10, -.022, .432], [side * .202, -.002, .456], [side * .202 + .10, -.022, .432]], .013, 12);
    for (let i = 0; i < 3; i++) b.line(b.head, 'orange-tabby-cheek-stripe', b.mat('#a36635', 'paint'), [[side * .48, -.14 + i * .08, .225], [side * .54, -.16 + i * .09, .15]], .021, 9);
  }
  for (const x of [-.10, 0, .10]) b.line(b.head, 'orange-tabby-forehead-mark', b.mat('#a36635', 'paint'), [[x, .30, .279], [x * .8, .205, .347]], .017, 10);
  buttons(b, 0, 1.32, .40, b.mat('#d7b77c', 'paint'), 4, .15);
  b.bow(b.rig, [0, 1.52, .305], '#76664c', .54);
  const apron = b.mat('#cab486', 'fabric');
  b.sheet(b.rig, 'merchant-short-shop-apron', apron, (u, v) => { const x = (u - .5) * .75; return [x, .56 + v * .49, .40 * Math.sqrt(1 - (x / .70) ** 2) + .03]; }, 12, 8, .017);
  const purse = b.pivot(b.arms[0], 'merchant-round-coin-purse', [-.08, -.4, .11]);
  b.ball(purse, 'coin-purse-fabric-bag', b.mat('#96724e', 'fabric'), [0, -.02, 0], [.096, .12, .054]);
  b.ball(purse, 'coin-purse-clasp', b.mat('#cfac6a', 'paint'), [0, .075, .035], [.074, .016, .024], true);
}

function jadePig(b) {
  buildPigNPC(b, { shirtColor: '#e8dbc8', pantsColor: '#a1adb1', bowColor: null, suspenders: false }); adultize(b, 'pig');
  for (const node of [...b.rig.children]) if (node.name === 'white-rounded-polo-collar') node.removeFromParent();
  b.head.getObjectByName('small-combed-brown-hair-tuft')?.removeFromParent();
  b.head.scale.setScalar(.70); b.head.position.y = 1.98;
  const robe = b.mat('#a8b7ba', 'fabric'), sleeve = b.mat('#e4d2bc', 'fabric'), rose = b.mat('#b98082', 'fabric');
  lathe(b, b.rig, 'flowing-full-length-hanfu-skirt', robe, [[0, 0], [.68, 0], [.72, .09], [.50, 1.13], [0, 1.14]], [0, .08, -.018], .77);
  for (const side of [-1, 1]) {
    const arm = b.arms[side < 0 ? 0 : 1]; arm.position.x = side * .46;
    lathe(b, arm, 'hanfu-wide-flowing-sleeve', sleeve, [[0, -.46], [.255, -.46], [.25, -.30], [.12, .08], [0, .08]], [side * .04, -.04, 0], .79);
    b.line(b.rig, 'hanfu-front-pleat', b.mat('#8e9fa3', 'fabric'), [[side * .20, 1.12, .365], [side * .34, .56, .445], [side * .43, .12, .488]], .006, 16);
  }
  // The document explicitly describes a cloud collar, forehead ornament, mole,
  // round fan and flowing hanfu. These are separate 3D objects, not a decal.
  for (let i = 0; i < 7; i++) {
    const a = -.92 + i / 6 * 1.84;
    const cloud = b.ball(b.rig, 'scalloped-cloud-collar-lobe', sleeve, [Math.sin(a) * .47, 1.45 - Math.cos(a) * .10, Math.cos(a) * .355], [.16, .065, .10]); cloud.rotation.z = a * .18;
  }
  b.line(b.rig, 'crossed-hanfu-collar', rose, [[-.30, 1.46, .33], [0, 1.17, .46], [.31, 1.43, .33]], .026, 18);
  b.line(b.rig, 'hanfu-waist-sash', rose, [[-.47, 1.02, .28], [0, 1.02, .423], [.47, 1.02, .28]], .045, 18);
  for (const side of [-1, 1]) b.line(b.rig, 'hanging-sash-ribbon', rose, [[side * .07, 1.04, .442], [side * .11, .76, .461], [side * .08, .54, .470]], .025, 14);
  b.ball(b.head, 'small-beauty-mole', b.ink, [.31, -.18, .467], [.014, .014, .008], true);
  const huadian = b.mat('#b55f61', 'paint');
  for (let i = 0; i < 3; i++) { const petal = b.ball(b.head, 'forehead-huadian-petal', huadian, [(i - 1) * .028, .286 + (i === 1 ? .025 : 0), .452], [.018, .031, .007], true); petal.rotation.z = (1 - i) * .5; }
  const hair = b.mat('#61524a', 'paper');
  for (const side of [-1, 1]) b.ball(b.head, 'adult-hanfu-hair-bun', hair, [side * .38, .36, -.13], [.143, .132, .133]);
  b.line(b.head, 'simple-hanfu-hairpin', b.mat('#c5a673', 'wood'), [[-.51, .46, -.10], [.50, .46, -.10]], .014, 8);
  const fan = b.pivot(b.arms[1], 'favourite-round-silk-fan', [.15, -.13, .42]); fan.rotation.z = -.15;
  b.line(fan, 'round-fan-wood-handle', b.mat('#aa8153', 'wood'), [[0, -.23, 0], [0, .065, 0]], .018, 8);
  b.mesh(fan, 'round-fan-bamboo-frame', new THREE.TorusGeometry(.172, .011, 7, 40), b.mat('#bc9562', 'wood'), [0, .15, 0]);
  b.ball(fan, 'round-fan-silk-face', b.mat('#ecddc3', 'fabric'), [0, .15, 0], [.168, .168, .011]);
  b.line(fan, 'fan-painted-botanical-stem', b.mat('#9a9772', 'paint'), [[-.06, .04, .013], [0, .15, .014], [.07, .23, .014]], .005, 12);
  for (let i = 0; i < 3; i++) b.ball(fan, 'fan-painted-flower', b.mat('#c29389', 'paint'), [-.016 + i * .029, .13 + i * .034, .018], [.018, .018, .004], true);
}

export function supportsFamilyCharacter(id) { return IDS.has(id); }

export function createFamilyCharacter({ characterId, scale = 1 } = {}) {
  if (!supportsFamilyCharacter(characterId)) throw new RangeError(`Unsupported family character: ${String(characterId)}`);
  const species = characterId.startsWith('jiaojiao-') ? 'chicken' : characterId.startsWith('lingdang-') || characterId === 'miao-boss' ? 'cat' : characterId.startsWith('zhuxiaodi-') || characterId === 'zhuxiaoyu' ? 'pig' : characterId === 'nini' ? 'sheep' : characterId === 'xiaolu-teacher' ? 'deer' : 'weasel';
  const palette = { chicken: '#ebca75', cat: characterId === 'miao-boss' ? '#d9a05e' : '#d8a7a4', pig: '#deb09e', sheep: '#d9b99b', deer: '#be946d', weasel: '#c8a168' };
  const b = createNPCToolkit(characterId, palette[species], { scale, species });
  b.group.userData.source = 'document-text-original-3d-interpretation';
  b.group.userData.visualReference = 'text-only';
  if (species === 'chicken') birdParent(b, characterId.endsWith('-mom'));
  else if (characterId === 'miao-boss') merchantCat(b);
  else if (species === 'cat') catParent(b, characterId.endsWith('-mom'));
  else if (characterId === 'zhuxiaoyu') jadePig(b);
  else if (species === 'pig') pigParent(b, characterId.endsWith('-mom'));
  else mammal(b, species);
  const model = b.finish();
  if (characterId === 'miao-boss') {
    const squints = []; b.head.traverse(node => { if (node.name === 'smiling-narrow-cat-eye') squints.push(node); });
    const baseSet = model.setExpression;
    model.setExpression = expression => {
      const ok = baseSet(expression); if (!ok) return false;
      const surprised = expression === 'surprised';
      b.eyes.forEach(eye => { eye.root.scale.y = surprised ? 1 : .22; });
      squints.forEach(line => { line.visible = !surprised; }); return true;
    };
  }
  return model;
}
