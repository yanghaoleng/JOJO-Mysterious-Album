import { Sketch, chaikin } from './sketch.js';

const clamp = value => Math.max(0, Math.min(255, Math.round(value)));

export class SoftStorySketch extends Sketch {
  blobPts(cx, cy, rx, ry, rot, wob = 1) {
    return chaikin(super.blobPts(cx, cy, rx, ry, rot, wob * .36), true, 1);
  }

  wobbly(cx, cy, rx, ry) {
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2);
  }

  smoothPath(pts, close = false) {
    if (!pts?.length) return;
    const c = this.ctx;
    const path = pts.length > 3 ? chaikin(pts, close, 1) : pts;
    c.beginPath();
    c.moveTo(path[0][0], path[0][1]);
    for (let index = 1; index < path.length; index++) c.lineTo(path[index][0], path[index][1]);
    if (close) c.closePath();
  }

  stroke(pts, width, options = {}) {
    if (!pts || pts.length < 2) return;
    const c = this.ctx;
    const alpha = Math.min(1, options.alpha ?? .9);
    const closed = pts.length > 3
      && Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < Math.max(2, width * 1.2);
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    this.smoothPath(pts, closed);
    c.strokeStyle = this.inkA(alpha * .18);
    c.lineWidth = Math.max(.8, width * 1.5);
    c.stroke();
    this.smoothPath(pts, closed);
    c.strokeStyle = this.inkA(alpha * .82);
    c.lineWidth = Math.max(.65, width * 1.02);
    c.stroke();
    c.restore();
  }

  broken(pts, width, options = {}) {
    this.stroke(pts, width, options);
  }

  sline(pts, width, alpha = .7, color) {
    if (!pts || pts.length < 2) return;
    const c = this.ctx;
    c.save();
    if (color) this.setInk(this.colorToRgb(color));
    this.stroke(pts, width, { alpha: Math.min(1, alpha) });
    if (color) this.setInk(null);
    c.restore();
  }

  hatch() {}
  hatchFill() {}
  scribbleFill() {}
  stippleFill() {}

  colorToRgb(color) {
    if (Array.isArray(color)) return color;
    const match = String(color || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return match ? match.slice(1, 4).map(Number) : this.ink;
  }

  softFill(pts, color, { alpha = .94, highlight = .26, shadow = .2 } = {}) {
    if (!pts?.length) return;
    const c = this.ctx;
    const xs = pts.map(point => point[0]);
    const ys = pts.map(point => point[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const width = Math.max(1, x1 - x0);
    const height = Math.max(1, y1 - y0);
    const base = color.map(clamp);
    const dark = base.map(channel => clamp(channel * .68));

    c.save();
    this.smoothPath(pts, true);
    c.clip();
    c.fillStyle = this.colA(base, alpha);
    c.fillRect(x0 - 2, y0 - 2, width + 4, height + 4);

    const topLight = c.createRadialGradient(
      x0 + width * .34, y0 + height * .12, 0,
      x0 + width * .34, y0 + height * .12, Math.max(width, height) * .88,
    );
    topLight.addColorStop(0, `rgba(255,255,255,${highlight})`);
    topLight.addColorStop(.48, `rgba(255,255,255,${highlight * .32})`);
    topLight.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = topLight;
    c.fillRect(x0 - 2, y0 - 2, width + 4, height + 4);

    const lowerShade = c.createLinearGradient(0, y0 + height * .38, 0, y1);
    lowerShade.addColorStop(0, 'rgba(255,255,255,0)');
    lowerShade.addColorStop(.62, `rgba(${dark[0]},${dark[1]},${dark[2]},${shadow * .3})`);
    lowerShade.addColorStop(1, `rgba(${dark[0]},${dark[1]},${dark[2]},${shadow})`);
    c.fillStyle = lowerShade;
    c.fillRect(x0 - 2, y0 - 2, width + 4, height + 4);

    const gloss = c.createLinearGradient(x0, y0, x1, y1);
    gloss.addColorStop(0, 'rgba(255,255,255,.18)');
    gloss.addColorStop(.26, 'rgba(255,255,255,0)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gloss;
    c.fillRect(x0 - 2, y0 - 2, width + 4, height + 4);
    c.restore();
  }
}
