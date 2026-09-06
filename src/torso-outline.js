import { chaikin } from './sketch.js';

// Shared by the drawing and the joints: both use the same finished silhouette.
export function torsoOutline(P, B) {
  const hw = B.halfW, top = B.top, bot = B.bot;
    // the silhouette: shape families, all drawn as one closed path
    let pts;
    if (B.quad) {
      // ON ALL FOURS: a long low barrel that runs AWAY from the head,
      // not a torso hanging under it
      const c = B.cx, d = B.dir;
      pts = [[c - d * hw, top + B.h * .42], [c - d * hw * .78, top + B.h * .05],
             [c + d * hw * .5, top], [c + d * hw, top + B.h * .34],
             [c + d * hw * .96, bot], [c - d * hw * .9, bot]];
    } else if (B.sit) {
      // SITTING: one mass, narrow at the shoulders and spreading to a
      // wide base — the haunches. No legs are drawn: the paws are a
      // part of their own and the rest is a bag sitting on the floor.
      pts = [[-hw * .58, top], [hw * .58, top],
             [hw * .92, top + B.h * .45], [hw, bot],
             [hw * .5, bot + B.h * .04], [-hw * .5, bot + B.h * .04],
             [-hw, bot], [-hw * .92, top + B.h * .45]];
    } else if (P.shape === 'square') {
      pts = [[-hw, top], [hw, top], [hw * 1.04, bot], [-hw * 1.04, bot]];
    } else if (P.shape === 'pear') {
      pts = [[-hw * .62, top], [hw * .62, top], [hw * 1.05, bot - B.h * .3], [hw * .8, bot], [-hw * .8, bot], [-hw * 1.05, bot - B.h * .3]];
    } else if (P.shape === 'tiny') {
      // narrow, not short: every silhouette must reach `bot`, because
      // the hips (and so the legs and the floor) are measured from it
      pts = [[-hw * .6, top], [hw * .6, top], [hw * .5, bot], [-hw * .5, bot]];
    } else if (P.shape === 'round') {
      pts = [];
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2;
        pts.push([Math.cos(a) * hw, (top + bot) / 2 + Math.sin(a) * B.h / 2]);
      }
    } else if (P.shape === 'barrel') {
      // straight sides bulging at the middle: a little tank
      pts = [[-hw * .88, top], [hw * .88, top], [hw * 1.06, top + B.h * .5],
             [hw * .9, bot], [-hw * .9, bot], [-hw * 1.06, top + B.h * .5]];
    } else if (P.shape === 'drop') {
      // narrow shoulders over a heavy bottom, the opposite of pear
      pts = [[-hw * .44, top], [hw * .44, top], [hw * .95, top + B.h * .55],
             [hw * .7, bot], [-hw * .7, bot], [-hw * .95, top + B.h * .55]];
    } else { // bean: shoulders narrower than the belly
      pts = [[-hw * .78, top], [hw * .78, top], [hw, top + B.h * .5], [hw * .82, bot], [-hw * .82, bot], [-hw, top + B.h * .5]];
    }
    // the whole body tips: the lean grows toward the shoulders, so the
    // base stays flat on the floor
    if (P.lean) pts = pts.map(([x, y]) => [x + P.lean * (bot - y), y]);
    pts = chaikin(pts, true, 2);

    return pts;
}

export function torsoSpanAt(poly, y) {
  const xs = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (a[1] === b[1] || y < Math.min(a[1], b[1]) || y > Math.max(a[1], b[1])) continue;
    xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
  }
  return [Math.min(...xs), Math.max(...xs)];
}
