import { Sketch, chaikin } from './sketch.js';
import { CURRENT_RENDER_STYLE, normalizeRenderStyle } from './render-style-config.js?v=20260828-style-editor-v2';

const clamp = value => Math.max(0, Math.min(255, Math.round(value)));

export class SoftStorySketch extends Sketch {
  constructor(width, height, renderStyle = CURRENT_RENDER_STYLE) {
    super(width, height);
    this.renderStyle = normalizeRenderStyle(renderStyle).character;
  }

  blobPts(cx, cy, rx, ry, rot, wob = 1) {
    const { wobble, smoothness } = this.renderStyle.stroke;
    const points = super.blobPts(cx, cy, rx, ry, rot, wob * wobble);
    const passes = Math.round(smoothness * 1.7);
    return passes ? chaikin(points, true, passes) : points;
  }

  wobbly(cx, cy, rx, ry) {
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2);
  }

  smoothPath(pts, close = false) {
    if (!pts?.length) return;
    const c = this.ctx;
    const passes = Math.round(this.renderStyle.stroke.smoothness * 1.4);
    const path = pts.length > 3 && passes ? chaikin(pts, close, passes) : pts;
    c.beginPath();
    c.moveTo(path[0][0], path[0][1]);
    for (let index = 1; index < path.length; index++) c.lineTo(path[index][0], path[index][1]);
    if (close) c.closePath();
  }

  stroke(pts, width, options = {}) {
    if (!pts || pts.length < 2) return;
    const c = this.ctx;
    const settings = this.renderStyle.stroke;
    const alpha = Math.min(1, options.alpha ?? .9) * (settings.opacity / .82);
    const closed = pts.length > 3
      && Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < Math.max(2, width * 1.2);
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    this.smoothPath(pts, closed);
    if (settings.softOpacity > 0) {
      c.strokeStyle = this.inkA(Math.min(1, alpha * settings.softOpacity));
      c.lineWidth = Math.max(.8, width * settings.softWidth);
      c.stroke();
    }
    this.smoothPath(pts, closed);
    c.strokeStyle = this.inkA(alpha * .82);
    c.lineWidth = Math.max(.65, width * settings.width);
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

  hatch(...args) {
    const grain = this.renderStyle.stroke.grain;
    if (grain <= .01) return;
    const values = [...args];
    values[6] = (Number(values[6]) || .4) * grain;
    super.hatch(...values);
  }

  hatchFill(...args) {
    const grain = this.renderStyle.stroke.grain;
    if (grain <= .01) return;
    const values = [...args];
    values[3] = (Number(values[3]) || .35) * grain;
    super.hatchFill(...values);
  }

  scribbleFill(...args) {
    const grain = this.renderStyle.stroke.grain;
    if (grain <= .01) return;
    const values = [...args];
    values[2] = (Number(values[2]) || .35) * grain;
    super.scribbleFill(...values);
  }

  stippleFill(...args) {
    const grain = this.renderStyle.stroke.grain;
    if (grain <= .01) return;
    const values = [...args];
    values[2] = (Number(values[2]) || .35) * grain;
    super.stippleFill(...values);
  }

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
    const fill = this.renderStyle.fill;
    const light = this.renderStyle.highlight;
    const shade = this.renderStyle.formShadow;
    const average = color.reduce((sum, channel) => sum + channel, 0) / color.length;
    const base = color.map(channel => clamp((average + (channel - average) * fill.saturation) * fill.brightness));
    const dark = base.map(channel => clamp(channel * shade.darkness));
    const lightStrength = highlight * (light.strength / .3);
    const shadeStrength = shadow * (shade.strength / .2);

    c.save();
    this.smoothPath(pts, true);
    c.clip();
    c.fillStyle = this.colA(base, Math.min(1, alpha * fill.opacity));
    c.fillRect(x0 - 2, y0 - 2, width + 4, height + 4);

    const topLight = c.createRadialGradient(
      x0 + width * light.x, y0 + height * light.y, 0,
      x0 + width * light.x, y0 + height * light.y, Math.max(width, height) * light.size,
    );
    topLight.addColorStop(0, `rgba(255,255,255,${lightStrength})`);
    topLight.addColorStop(light.spread, `rgba(255,255,255,${lightStrength * .32})`);
    topLight.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = topLight;
    c.fillRect(x0 - 2, y0 - 2, width + 4, height + 4);

    const lowerShade = c.createLinearGradient(0, y0 + height * shade.start, 0, y1);
    lowerShade.addColorStop(0, 'rgba(255,255,255,0)');
    lowerShade.addColorStop(.62, `rgba(${dark[0]},${dark[1]},${dark[2]},${shadeStrength * .3})`);
    lowerShade.addColorStop(1, `rgba(${dark[0]},${dark[1]},${dark[2]},${shadeStrength})`);
    c.fillStyle = lowerShade;
    c.fillRect(x0 - 2, y0 - 2, width + 4, height + 4);

    const gloss = c.createLinearGradient(x0, y0, x1, y1);
    gloss.addColorStop(0, `rgba(255,255,255,${light.gloss})`);
    gloss.addColorStop(.26, 'rgba(255,255,255,0)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gloss;
    c.fillRect(x0 - 2, y0 - 2, width + 4, height + 4);

    const grain = this.renderStyle.stroke.grain;
    if (grain > .01) {
      const dots = Math.min(220, Math.round((width * height / 440) * grain));
      c.fillStyle = this.inkA(.055 * grain);
      for (let index = 0; index < dots; index++) {
        const size = this.jr(.45, 1.2);
        c.fillRect(this.jr(x0, x1), this.jr(y0, y1), size, size);
      }
    }
    c.restore();
  }
}
