/** A small, living paper theatre. No images, libraries, network or stored user data. */
export function createWowStage(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { update() {}, destroy() {} };
  const W = 1100;
  const H = 650;
  const INK = '#3e5266';
  const PAPER = '#faf6eb';
  const PALETTES = ['#f2d989', '#a8cde0', '#dce5eb', '#b7cf9a', '#e7bdca', '#e8d599'];
  let state = { chapter: 1, scene: 0, kind: 'observe', lit: false, color: '#f8ce5b', colors: [], visual: null, props: [], answer: '', momo: '鼓鼓' };
  let alive = true;
  let raf = 0;
  let lastFrame = 0;
  let light = 0;
  let flash = 0;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const grain = document.createElement('canvas');
  grain.width = 550;
  grain.height = 325;
  const gctx = grain.getContext('2d');
  let seed = 732451;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  if (gctx) {
    for (let i = 0; i < 8500; i += 1) {
      const x = random() * 550;
      const y = random() * 325;
      gctx.fillStyle = `rgba(82,68,40,${0.018 + random() * 0.034})`;
      gctx.fillRect(x, y, random() * 1.3 + 0.3, random() * 0.5 + 0.25);
    }
  }

  function path(draw, fill, stroke = INK, width = 2.5) {
    ctx.beginPath(); draw();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function ellipse(x, y, rx, ry, fill, stroke = null, angle = 0, width = 2) {
    path(() => ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2), fill, stroke, width);
  }
  function line(points, color = INK, width = 2.4) {
    path(() => {
      ctx.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
    }, null, color, width);
  }
  function text(str, x, y, size = 20, color = INK, align = 'center') {
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.font = `500 ${size}px "PingFang SC", "Hiragino Sans GB", sans-serif`;
    ctx.fillText(str, x, y);
  }
  function roundRect(x, y, w, h, r, fill, stroke = INK, width = 2.4) {
    path(() => ctx.roundRect(x, y, w, h, r), fill, stroke, width);
  }
  function star(x, y, r, color, rotation = 0, inner = 0.49, stroke = INK) {
    path(() => {
      for (let i = 0; i < 10; i += 1) {
        const a = -Math.PI / 2 + i * Math.PI / 5 + rotation;
        const d = r * (i % 2 ? inner : 1);
        if (i === 0) ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
        else ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
      }
      ctx.closePath();
    }, color, stroke, 2.4);
  }
  function cloud(x, y, scale, color = '#fffdf6', outline = true) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    path(() => {
      ctx.moveTo(-91, 26);
      ctx.bezierCurveTo(-138, 4, -118, -50, -76, -41);
      ctx.bezierCurveTo(-85, -108, -6, -118, 10, -64);
      ctx.bezierCurveTo(47, -113, 106, -82, 97, -30);
      ctx.bezierCurveTo(150, -16, 140, 43, 87, 43);
      ctx.bezierCurveTo(27, 42, -26, 38, -91, 26);
      ctx.closePath();
    }, color, outline ? INK : null, 2.5);
    ctx.restore();
  }
  function leaf(x, y, scale, color, rotation = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(scale, scale);
    path(() => {
      ctx.moveTo(0, 28); ctx.bezierCurveTo(-42, 7, -43, -25, 0, -48);
      ctx.bezierCurveTo(34, -22, 36, 12, 0, 28); ctx.closePath();
    }, color, INK, 2);
    path(() => { ctx.moveTo(0, 26); ctx.quadraticCurveTo(-5, -7, 0, -37); }, null, INK, 1.7);
    ctx.restore();
  }
  function grass(x, y, scale = 1, color = '#97ad8e') {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    path(() => {
      ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-29, -34, -18, -43);
      ctx.moveTo(0, 1); ctx.quadraticCurveTo(-8, -43, 3, -52);
      ctx.moveTo(11, 0); ctx.quadraticCurveTo(33, -26, 31, -38);
    }, null, color, 4);
    ctx.restore();
  }
  function face(x, y, scale = 1, blink = false, shy = false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    if (blink) {
      path(() => { ctx.moveTo(-28, -1); ctx.quadraticCurveTo(-22, 4, -16, -1); ctx.moveTo(16, -1); ctx.quadraticCurveTo(22, 4, 28, -1); }, null, INK, 3.8);
    } else {
      ellipse(-23, 0, 4.2, 6.1, INK);
      ellipse(23, 0, 4.2, 6.1, INK);
    }
    ellipse(-44, 20, 13, 6, 'rgba(204,131,123,.24)');
    ellipse(44, 20, 13, 6, 'rgba(204,131,123,.24)');
    path(() => { ctx.moveTo(-7, 18); ctx.quadraticCurveTo(0, shy ? 18 : 27, 8, 18); }, null, INK, 2.4);
    ctx.restore();
  }
  function organicBody(x, y, sx, sy, color, phase = 0) {
    path(() => {
      for (let i = 0; i <= 84; i += 1) {
        const a = i / 84 * Math.PI * 2;
        const wiggle = 1 + Math.sin(a * 13 + phase) * .018 + Math.cos(a * 19) * .01;
        const px = x + Math.cos(a) * sx * wiggle;
        const py = y + Math.sin(a) * sy * wiggle;
        if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }, color, INK, 2.5);
  }

  function background(t, progress) {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    const c = Math.max(0, Math.min(5, state.chapter - 1));
    const halo = ctx.createRadialGradient(540, 350, 20, 540, 350, 495);
    halo.addColorStop(0, PALETTES[c] + '65');
    halo.addColorStop(1, PALETTES[c] + '00');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
    if (c === 1) {
      for (let j = 0; j < 4; j += 1) {
        path(() => {
          ctx.moveTo(-10, 360 + j * 40);
          for (let x = 0; x <= 1140; x += 30) ctx.lineTo(x, 360 + j * 40 + Math.sin(x * .009 + j + t * .23) * 12);
          ctx.lineTo(1110, 540); ctx.lineTo(-10, 540); ctx.closePath();
        }, ['#d0e4e7', '#bbd9df', '#c8e0dd', '#dfe7d4'][j], null);
      }
      for (let i = 0; i < 8; i += 1) {
        const x = 90 + i * 125;
        const y = 185 + (i % 3) * 74 - Math.sin(t * .55 + i) * 9;
        ellipse(x, y, 5 + i % 3 * 3, 7 + i % 3 * 3, 'rgba(255,255,255,.28)', '#94b5c4', 0, 1.4);
      }
      for (let i = 0; i < 7; i += 1) grass(70 + i * 160, 485 + i % 2 * 25, .5 + i % 3 * .14, '#6eaaa5');
      ellipse(180, 487, 31, 13, '#eee1c7', INK, -.13, 1.6);
      line([[158, 483], [170, 479], [181, 478], [191, 480]], '#b29f84', 1.2);
      if (state.scene < 4) {
        ctx.save(); ctx.translate(531, 450); ctx.rotate(-.18);
        roundRect(-16, -35, 35, 70, 9, '#dfdfd3', '#88949a', 1.8);
        roundRect(-8, -49, 19, 18, 2, '#d0d6d1', '#88949a', 1.8);
        line([[-10, -3], [11, -3]], '#b8bdb7', 2); ctx.restore();
        path(() => { ctx.moveTo(584, 455); ctx.lineTo(623, 436); ctx.lineTo(657, 450); ctx.lineTo(634, 479); ctx.closePath(); }, '#d6d5c5', '#88949a', 1.6);
      }
    } else if (c === 2) {
      cloud(162, 195 + Math.sin(t * .2) * 6, .65, '#ebeeed', false);
      cloud(923, 126 - Math.sin(t * .18) * 8, .82, '#e9eeee', false);
      cloud(575, 487, 2.15, '#f2f0e5', false);
      path(() => { ctx.moveTo(460, 444); ctx.bezierCurveTo(566, 359, 696, 384, 704, 450); ctx.bezierCurveTo(626, 490, 535, 488, 460, 444); }, '#c2d3b4', '#8aa194', 2);
      path(() => { ctx.moveTo(476, 447); ctx.quadraticCurveTo(584, 429, 680, 443); }, null, '#8aa194', 1.6);
      if (state.scene >= 4) for (let i = 0; i < 5; i += 1) {
        const y = 398 + ((t * 38 + i * 19) % 74);
        line([[257 + i * 23, y], [254 + i * 23, y + 10]], '#8faebb', 2);
      }
    } else if (c === 5) {
      for (let i = 0; i < 32; i += 1) {
        const x = 55 + (i * 157) % 1000;
        const y = 57 + (i * 97) % 365;
        const r = 1.5 + (i % 3) + Math.sin(t * .8 + i) * .5;
        if (i % 6 === 0) star(x, y, r * 2.1, '#c8b480', .3, .35, null);
        else ellipse(x, y, r, r, '#c8b480');
      }
      path(() => { ctx.moveTo(113, 455); ctx.bezierCurveTo(396, 511, 803, 311, 1025, 431); }, null, '#c1b89e', 1.5);
      path(() => { ctx.moveTo(114, 477); ctx.bezierCurveTo(377, 528, 830, 348, 1028, 451); }, null, '#e0d7b8', 8);
      ellipse(551, 482, 420, 30, '#e9e2c8');
    } else {
      path(() => {
        ctx.moveTo(-20, 454); ctx.bezierCurveTo(170, 343, 309, 474, 489, 422);
        ctx.bezierCurveTo(680, 365, 841, 382, 1120, 454); ctx.lineTo(1120, 537); ctx.lineTo(-20, 537); ctx.closePath();
      }, c === 4 ? '#e5d4d3' : c === 3 ? '#d5dfc3' : '#e7e3bb', null);
      path(() => { ctx.moveTo(-20, 496); ctx.bezierCurveTo(240, 419, 455, 530, 682, 479); ctx.bezierCurveTo(862, 432, 1002, 458, 1120, 467); ctx.lineTo(1120, 550); ctx.lineTo(-20, 550); ctx.closePath(); }, '#efead8', null);
      for (let i = 0; i < 7; i += 1) grass(56 + i * 167, 493 - (i % 2) * 31, .42 + (i % 3) * .1, c === 4 ? '#b898a1' : '#a0b292');
      if (c === 3) {
        line([[127, 112], [127, 222]], '#809088', 2);
        path(() => { ctx.moveTo(94, 213); ctx.quadraticCurveTo(126, 184, 160, 213); ctx.closePath(); }, '#d5c29a', INK, 2);
        line([[102, 212], [102, 253]], '#809088', 1.5);
        line([[125, 212], [125, 271]], '#809088', 1.5);
        line([[149, 212], [149, 248]], '#809088', 1.5);
        ellipse(125, 277, 6, 11, '#cfbc88', INK, Math.sin(t) * .16, 1.5);
        star(954, 136, 17, '#d7cd99', .13, .5, null);
      } else if (c === 4) {
        path(() => { ctx.moveTo(418, 473); ctx.bezierCurveTo(510, 392, 541, 500, 626, 442); ctx.bezierCurveTo(694, 403, 724, 453, 785, 429); }, null, '#faf4e6', 23);
        ellipse(991, 173, 23, 23, '#e6d7a2');
      } else {
        cloud(204, 148, .36, '#ede8d6', false);
        cloud(935, 174, .5, '#eee6ce', false);
        for (let i = 0; i < 4; i += 1) {
          const x = 82 + i * 296;
          line([[x, 476], [x + 5, 451]], '#a5b18c', 2);
          for (let k = 0; k < 5; k += 1) ellipse(x + 5 + Math.cos(k * 1.25) * 7, 444 + Math.sin(k * 1.25) * 7, 5, 8, '#e7cd9d', null, k * 1.25);
          ellipse(x + 5, 444, 4, 4, '#cfb282');
        }
      }
    }
    ctx.save(); ctx.globalAlpha = .62; ctx.drawImage(grain, 0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalAlpha = Math.max(0, .34 - progress * .33);
    ctx.fillStyle = '#e6e5df'; ctx.fillRect(0, 0, W, 542); ctx.restore();
  }

  function momo(t) {
    const c = state.chapter;
    const bob = Math.sin(t * 1.7) * 4;
    const breath = 1 + Math.sin(t * 1.7) * .012;
    const blink = Math.sin(t * .69) > .995;
    const x = c === 3 ? 321 : 320;
    const y = c === 3 ? 330 : 360;
    ellipse(x + 5, 464, 109, 17, 'rgba(79,83,67,.08)');
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(breath, 1 / breath);
    if (c === 1) {
      ellipse(-63, -111, 24, 38, '#dfc48c', INK, -.18);
      ellipse(64, -111, 24, 37, '#dfc48c', INK, .18);
      ellipse(-62, -113, 10, 19, '#edd6ac'); ellipse(63, -113, 10, 19, '#edd6ac');
      organicBody(0, -4, 107, 103, '#efda9c');
      ellipse(-73, 83, 28, 13, '#e5cb94', INK, -.1);
      ellipse(69, 84, 28, 13, '#e5cb94', INK, .1);
      face(0, -32, 1, blink);
      path(() => { ctx.moveTo(-38, 39); ctx.lineTo(-34, 81); ctx.quadraticCurveTo(0, 95, 35, 79); ctx.lineTo(39, 39); }, '#c9aa8e', INK, 2);
      ellipse(0, 40, 39, 15, '#f5e8c5', INK);
      line([[-31, 49], [-18, 79], [-2, 55], [16, 80], [30, 49]], '#977d68', 1.8);
      path(() => { ctx.moveTo(-89, 23); ctx.quadraticCurveTo(-70, 56, -44, 40); ctx.moveTo(90, 25); ctx.quadraticCurveTo(72, 58, 44, 40); }, null, INK, 2.4);
    } else if (c === 2) {
      path(() => { ctx.moveTo(80, -19); ctx.bezierCurveTo(114, -75, 144, -50, 153, -61); ctx.quadraticCurveTo(142, -10, 155, 42); ctx.bezierCurveTo(125, 23, 103, 63, 78, 14); }, '#9fbcd0', INK, 2.8);
      path(() => { ctx.moveTo(-33, -72); ctx.quadraticCurveTo(8, -131, 44, -78); ctx.moveTo(-19, 65); ctx.quadraticCurveTo(22, 108, 43, 61); }, '#a5c5d4', INK, 2.2);
      organicBody(0, -5, 103, 76, state.scene >= 4 ? '#a8cee0' : '#c1c9c9');
      face(-34, -20, 1, blink);
      path(() => { ctx.moveTo(39, -19); ctx.quadraticCurveTo(8, 10, 44, 32); ctx.quadraticCurveTo(54, 8, 39, -19); }, '#88aebe', INK, 1.8);
      for (let i = 0; i < 3; i += 1) path(() => { ctx.arc(65 + i * 9, -20 + i * 15, 10, 1.3, 4.4); }, null, '#7f9dab', 1.1);
    } else if (c === 3) {
      cloud(0, 3, 1.05, '#f2f3ed');
      face(-1, -15, 1, blink, state.scene < 4);
      path(() => { ctx.moveTo(-59, 30); ctx.quadraticCurveTo(-40, 51, -21, 36); ctx.moveTo(58, 30); ctx.quadraticCurveTo(41, 51, 23, 36); }, null, INK, 2.3);
    } else if (c === 4) {
      line([[-67, 78], [-82, 101]], INK, 8); line([[68, 79], [82, 101]], INK, 8);
      path(() => { ctx.moveTo(-67, -77); ctx.quadraticCurveTo(-99, -107, -123, -70); ctx.lineTo(-83, -47); ctx.closePath(); }, '#b2c391', INK, 2.4);
      path(() => { ctx.moveTo(69, -77); ctx.quadraticCurveTo(104, -107, 124, -69); ctx.lineTo(84, -47); ctx.closePath(); }, '#b2c391', INK, 2.4);
      ellipse(0, -2, 102, 105, '#b9cda3', INK, 0, 3);
      ellipse(0, -2, 86, 89, '#f5f0db', INK, 0, 1.4);
      for (let i = 0; i < 12; i += 1) {
        const a = i * Math.PI / 6;
        line([[Math.sin(a) * 72, Math.cos(a) * 74 - 2], [Math.sin(a) * 79, Math.cos(a) * 81 - 2]], '#84957e', 2);
      }
      const a = state.scene >= 4 ? -.72 : .65 + Math.sin(t * .35) * .07;
      line([[0, -2], [Math.sin(a) * 43, -2 - Math.cos(a) * 43]], INK, 3.7);
      line([[0, -2], [-34, 17]], INK, 3.2);
      ellipse(0, -2, 5, 5, '#aa8b5d');
      face(0, 33, .75, blink);
    } else if (c === 5) {
      path(() => {
        ctx.moveTo(-111, 99); ctx.bezierCurveTo(-123, 40, -82, 23, -88, -35);
        ctx.bezierCurveTo(-106, -109, -12, -125, 24, -79);
        ctx.bezierCurveTo(58, -115, 114, -75, 100, -27);
        ctx.bezierCurveTo(79, 13, 96, 40, 120, 95);
        ctx.bezierCurveTo(62, 78, 58, 112, 4, 98); ctx.bezierCurveTo(-39, 80, -62, 113, -111, 99); ctx.closePath();
      }, '#cab8c2', INK, 2.6);
      path(() => { ctx.moveTo(-87, 83); ctx.bezierCurveTo(-22, 50, 20, 124, 99, 82); }, null, '#dfc4ce', 9);
      face(2, -22, 1, blink, state.scene < 4);
      path(() => { ctx.moveTo(-55, 36); ctx.quadraticCurveTo(-24, 58, -7, 35); ctx.moveTo(62, 38); ctx.quadraticCurveTo(32, 61, 10, 37); }, null, INK, 2.2);
    } else {
      ctx.save(); ctx.rotate(Math.sin(t * .4) * .035);
      star(0, -2, 131, '#e8d499', .06, .57);
      face(-2, -15, 1, blink, state.scene < 4);
      if (state.scene >= 4) {
        const halo = ctx.createRadialGradient(0, 10, 60, 0, 10, 175);
        halo.addColorStop(0, '#ead09a00'); halo.addColorStop(.5, '#ead09a24'); halo.addColorStop(1, '#ead09a00');
        ctx.fillStyle = halo; ctx.fillRect(-175, -175, 350, 350);
      }
      ctx.restore();
    }
    ctx.restore();
    const displayName = state.chapter === 1 && state.scene < 4 ? 'MOMO' : state.momo || ['', '鼓鼓', '灰灰', '憋憋', '乱乱', '躲躲', '点点'][state.chapter];
    text(displayName, x, 510, 22, '#68736f');
  }

  function door(t) {
    const x = 794;
    const y = 300;
    const open = state.kind === 'color' || state.kind === 'finale' || (state.chapter === 1 && state.scene >= 7) || (state.chapter > 1 && state.scene >= 4);
    const edge = PALETTES[state.chapter - 1] || '#ddd0b5';
    ellipse(x, 469, 122, 15, 'rgba(89,86,64,.075)');
    path(() => {
      ctx.moveTo(x - 94, 464); ctx.lineTo(x - 91, 250);
      ctx.bezierCurveTo(x - 91, 136, x + 95, 147, x + 94, 253);
      ctx.lineTo(x + 98, 464); ctx.closePath();
    }, '#f3ebd9', '#809084', 3);
    path(() => {
      ctx.moveTo(x - 77, 458); ctx.lineTo(x - 75, 254);
      ctx.bezierCurveTo(x - 72, 159, x + 78, 167, x + 76, 256);
      ctx.lineTo(x + 79, 458); ctx.closePath();
    }, open ? edge : '#e7e3d8', INK, 2.4);
    if (open) {
      ctx.save(); ctx.globalAlpha = .52;
      path(() => { ctx.moveTo(x - 75, 445); ctx.quadraticCurveTo(x, 313, x + 75, 389); ctx.lineTo(x + 75, 458); ctx.lineTo(x - 75, 458); }, '#f7f2d9', null);
      ctx.restore();
      path(() => { ctx.moveTo(x - 75, 458); ctx.lineTo(x - 75, 254); ctx.quadraticCurveTo(x - 65, 189, x - 24, 176); ctx.lineTo(x - 24, 430); ctx.closePath(); }, '#e7e0c9', INK, 2);
      for (let i = 0; i < 4; i += 1) star(x + 17 + i % 2 * 27, 272 + i * 36 + Math.sin(t + i) * 3, 5, '#fff9dc', .1, .45, null);
    } else {
      path(() => { ctx.moveTo(x - 63, 247); ctx.lineTo(x - 60, 445); ctx.moveTo(x + 60, 247); ctx.lineTo(x + 58, 445); }, null, '#c8cabb', 1.4);
      if (!state.visual) {
        roundRect(x - 43, 292, 86, 67, 7, '#f8f4e7', '#9b9d88', 1.8);
        text(state.kind === 'create' ? '你的想法' : '……', x, 333, 16, '#86918a');
      }
      ellipse(x + 51, 382, 6, 6, '#b3a179', INK, 0, 1.4);
    }
    leaf(x - 123, 427, .58, '#c1ceb1', -.65);
    leaf(x + 119, 421, .48, '#c1ceb1', .67);
  }

  function key(t) {
    if (!state.visual) return;
    const shape = String(state.visual.shape || 'star').toLowerCase();
    const color = typeof state.visual.color === 'string' ? state.visual.color : state.color;
    ctx.save(); ctx.translate(790, 290 + Math.sin(t * 1.9) * 3); ctx.rotate(-.21);
    const halo = ctx.createRadialGradient(0, 10, 18, 0, 10, 111);
    halo.addColorStop(0, '#fffbe3b8'); halo.addColorStop(1, '#fffbe300');
    ctx.fillStyle = halo; ctx.fillRect(-115, -105, 230, 230);
    roundRect(-8, 16, 17, 104, 5, color, INK, 2.6);
    path(() => { ctx.moveTo(7, 89); ctx.lineTo(27, 89); ctx.lineTo(27, 104); ctx.lineTo(7, 104); }, color, INK, 2.6);
    path(() => { ctx.moveTo(7, 111); ctx.lineTo(20, 111); ctx.lineTo(20, 122); ctx.lineTo(-7, 122); }, color, INK, 2.6);
    if (/moon|月/.test(shape)) {
      path(() => { ctx.moveTo(23, -38); ctx.bezierCurveTo(-42, -58, -58, 22, -9, 38); ctx.bezierCurveTo(20, 47, 41, 21, 39, 5); ctx.bezierCurveTo(2, 18, -4, -27, 23, -38); ctx.closePath(); }, color, INK, 2.5);
    } else if (/leaf|叶/.test(shape)) leaf(0, 0, .97, color, -.12);
    else if (/heart|心/.test(shape)) {
      path(() => { ctx.moveTo(0, 37); ctx.bezierCurveTo(-85, -10, -28, -66, 0, -31); ctx.bezierCurveTo(33, -67, 79, -9, 0, 37); ctx.closePath(); }, color, INK, 2.5);
    } else if (/cloud|云/.test(shape)) cloud(0, 0, .36, color, true);
    else if (/fish|鱼/.test(shape)) {
      path(() => { ctx.moveTo(26, -3); ctx.lineTo(48, -27); ctx.lineTo(48, 28); ctx.lineTo(26, 8); }, color, INK, 2.4);
      ellipse(-8, 0, 38, 29, color, INK, 0, 2.5); ellipse(-27, -5, 3, 3, INK);
    } else star(0, 0, 47, color, 0, .53);
    ctx.restore();
    text('你的想法，有了形状', 790, 426, 17, '#657366');
  }

  function props(t) {
    const unlocked = new Set(Array.isArray(state.props) ? state.props : []);
    if (!unlocked.size) return;
    const base = 588;
    if (unlocked.has('torch')) {
      ctx.save(); ctx.translate(164, base - 12); ctx.rotate(-.3);
      if (light > .05) {
        const glow = ctx.createLinearGradient(0, -24, 0, -109);
        glow.addColorStop(0, '#f3d6875c'); glow.addColorStop(1, '#f3d68700');
        path(() => { ctx.moveTo(-17, -26); ctx.lineTo(-52, -121); ctx.lineTo(52, -121); ctx.lineTo(18, -26); ctx.closePath(); }, glow, null);
      }
      roundRect(-12, -18, 25, 55, 7, '#c4cbb1', INK, 2);
      path(() => { ctx.moveTo(-12, -12); ctx.lineTo(-24, -37); ctx.quadraticCurveTo(0, -43, 24, -37); ctx.lineTo(13, -12); ctx.closePath(); }, '#cfd5bc', INK, 2);
      ellipse(0, -37, 24, 7, '#f0dca2', INK, 0, 1.5); ellipse(0, 6, 4, 5, '#8ca094');
      ctx.restore(); text('好奇手电筒', 164, 640, 17, '#6f7a71');
    }
    if (unlocked.has('radio')) {
      const x = 322;
      line([[x + 20, base - 31], [x + 39, base - 72]], INK, 2.3);
      roundRect(x - 45, base - 28, 92, 65, 12, '#b8cbd0', INK, 2.3);
      roundRect(x - 29, base - 16, 38, 19, 4, '#e8eedf', '#879998', 1.5);
      for (let i = 0; i < 4; i += 1) line([[x - 28, base + 12 + i * 5], [x + 7, base + 12 + i * 5]], '#7f9293', 1.3);
      ellipse(x + 28, base - 3, 10, 10, '#e6d8b2', INK, 0, 1.5);
      ellipse(x + 28, base + 21, 5, 5, '#e6d8b2', INK, 0, 1.2);
      text('唔姆收音机', x, 640, 17, '#6f7a71');
    }
    if (unlocked.has('jar')) {
      const x = 479;
      path(() => { ctx.moveTo(x - 29, base - 29); ctx.lineTo(x - 28, base - 13); ctx.quadraticCurveTo(x - 41, base - 7, x - 40, base + 15); ctx.lineTo(x - 36, base + 34); ctx.quadraticCurveTo(x, base + 46, x + 35, base + 34); ctx.lineTo(x + 40, base + 15); ctx.quadraticCurveTo(x + 41, base - 6, x + 28, base - 13); ctx.lineTo(x + 29, base - 29); ctx.closePath(); }, '#f8f6eaaa', INK, 2.2);
      roundRect(x - 33, base - 34, 66, 11, 3, '#c9bc99', INK, 1.7);
      const colors = Array.isArray(state.colors) ? state.colors : [];
      colors.slice(0, 6).forEach((col, i) => {
        const fill = typeof col === 'string' ? col : col?.color || PALETTES[i];
        ellipse(x - 19 + i % 3 * 19, base + 28 - Math.floor(i / 3) * 18, 12, 9, fill, '#87938c', (i - 2) * .2, 1);
      });
      path(() => { ctx.moveTo(x - 28, base + 4); ctx.lineTo(x - 26, base + 20); }, null, '#ffffff', 3);
      text('颜色罐', x, 640, 17, '#6f7a71');
    }
  }

  function firstWindow(t) {
    const x = 554;
    const y = 285;
    ellipse(x, 473, 164, 18, '#d9dace6b');
    path(() => { ctx.moveTo(x - 126, 456); ctx.lineTo(x - 124, 218); ctx.bezierCurveTo(x - 124, 103, x + 121, 100, x + 126, 218); ctx.lineTo(x + 130, 456); ctx.closePath(); }, '#eeecdf', '#758181', 3);
    path(() => { ctx.moveTo(x - 108, 442); ctx.lineTo(x - 106, 222); ctx.bezierCurveTo(x - 106, 128, x + 105, 128, x + 108, 222); ctx.lineTo(x + 110, 442); ctx.closePath(); }, '#d5d9d2', '#97a195', 1.5);
    const glow = ctx.createRadialGradient(x, y + 70, 0, x, y + 70, 173);
    glow.addColorStop(0, state.scene > 0 ? '#f0dfaa77' : '#f0dfaa14'); glow.addColorStop(1, '#f0dfaa00');
    ctx.fillStyle = glow; ctx.fillRect(x - 180, 110, 360, 355);
    if (state.scene >= 2) {
      ellipse(x - 42, y + 5 + Math.sin(t) * 2, 19, 32, '#d6cba6', INK, -.18);
      ellipse(x + 42, y + 5 + Math.sin(t) * 2, 19, 32, '#d6cba6', INK, .18);
      cloud(x, y + 90, 1.12, '#d8dbd4', false);
    }
    const pulse = Math.sin(t * 2) * 3;
    text('咚', x - 27, y + 51 + pulse, 31, '#7f8b83');
    text('咚', x + 31, y + 90 - pulse, 23, '#99a198');
    text(state.scene === 0 ? '有个声音，想被你听见。' : state.scene === 1 ? '你说的话，变成了光。' : '雾后面，露出了小耳朵。', x, 508, 22, '#788478');
  }

  function fog(t, progress) {
    const alpha = Math.max(0, .48 - progress * .53);
    if (alpha <= .005) return;
    ctx.save(); ctx.globalAlpha = alpha;
    for (let i = 0; i < 4; i += 1) {
      const x = 100 + i * 298 + Math.sin(t * .13 + i) * 15;
      cloud(x, 459 + (i % 2) * 34, 1.65, '#eeede5', false);
    }
    ctx.restore();
  }

  function render(now = 0) {
    raf = 0;
    if (!alive || document.hidden) return;
    const elapsed = lastFrame ? Math.min(64, now - lastFrame) : 32;
    lastFrame = now;
    const t = motion.matches ? 0 : now / 1000;
    const count = state.chapter === 1 ? 10 : state.chapter === 6 ? 7 : 6;
    const base = Math.min(1, Math.max(0, state.scene / (count - 1)));
    const target = Math.min(1, base + (state.lit ? .2 : 0));
    light += (target - light) * (motion.matches ? 1 : 1 - Math.exp(-elapsed / 380));
    flash *= motion.matches ? 0 : Math.exp(-elapsed / 1000);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    background(t, light);
    const first = state.chapter === 1 && state.scene < 3;
    if (first) firstWindow(t);
    else {
      momo(t);
      if (state.chapter !== 1 || state.scene >= 6) door(t);
      else {
        path(() => { ctx.moveTo(566, 392); ctx.quadraticCurveTo(648, 352, 707, 370); }, null, '#babba58a', 2);
        for (let i = 0; i < 3; i += 1) ellipse(603 + i * 34, 357 - i * 10 + Math.sin(t + i) * 3, 3, 3, '#b8b491');
        text(state.scene >= 4 ? '慢慢听，就会有新的发现。' : '把问候，寄到它身边。', 761, 301, 22, '#7b8677');
      }
    }
    fog(t, light);
    if (state.visual && (state.kind === 'create' || state.lit)) key(t);
    if (flash > .05) {
      ctx.save(); ctx.globalAlpha = flash * .65;
      for (let i = 0; i < 7; i += 1) {
        const a = i / 7 * Math.PI * 2;
        const r = 83 + (1 - flash) * 77;
        star(550 + Math.cos(a) * r, 315 + Math.sin(a) * r, 4 + flash * 3, '#d4b970', .12, .45, null);
      }
      ctx.restore();
    }
    props(t);
    if (!motion.matches) raf = requestAnimationFrame(render);
  }
  function requestRender() {
    if (alive && !document.hidden && !raf) raf = requestAnimationFrame(render);
  }
  function resize() {
    if (!alive) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round((rect.width || W) * dpr));
    const height = Math.max(1, Math.round((rect.height || (rect.width || W) * H / W) * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    requestRender();
  }
  function onVisibility() {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; lastFrame = 0; }
    else requestRender();
  }
  function onMotion() { if (raf) cancelAnimationFrame(raf); raf = 0; requestRender(); }
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  if (motion.addEventListener) motion.addEventListener('change', onMotion);
  else motion.addListener?.(onMotion);
  resize();
  return {
    update(next) {
      if (!alive || !next) return;
      const oldChapter = state.chapter;
      if (next.lit && (!state.lit || next.answer !== state.answer)) flash = 1;
      state = { ...state, ...next };
      state.chapter = Math.min(6, Math.max(1, Number(state.chapter) || 1));
      state.scene = Math.max(0, Number(state.scene) || 0);
      if (oldChapter !== state.chapter) light = 0;
      requestRender();
    },
    destroy() {
      alive = false; cancelAnimationFrame(raf); observer?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      if (motion.removeEventListener) motion.removeEventListener('change', onMotion);
      else motion.removeListener?.(onMotion);
    },
  };
}
