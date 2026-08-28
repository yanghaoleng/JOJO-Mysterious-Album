function backgroundConfig(value) {
  return value?.background || value || {
    color: { saturation: 1, brightness: 1, contrast: 1, hue: 0 },
    paint: { opacity: 1, grain: 0 },
    depth: { haze: 0, blur: 0 },
  };
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}

export function applyBackgroundCanvasStyle(canvas, value) {
  const style = backgroundConfig(value);
  const context = canvas?.getContext?.('2d');
  if (!context || !canvas.width || !canvas.height) return canvas;

  const source = document.createElement('canvas');
  source.width = canvas.width;
  source.height = canvas.height;
  source.getContext('2d').drawImage(canvas, 0, 0);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.globalAlpha = style.paint.opacity;
  context.filter = [
    `saturate(${style.color.saturation})`,
    `brightness(${style.color.brightness})`,
    `contrast(${style.color.contrast})`,
    `hue-rotate(${style.color.hue}deg)`,
    `blur(${style.depth.blur}px)`,
  ].join(' ');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  context.restore();

  if (style.color.tintStrength > 0) {
    const tint = style.color.tint || '#f1ead8';
    const red = parseInt(tint.slice(1, 3), 16);
    const green = parseInt(tint.slice(3, 5), 16);
    const blue = parseInt(tint.slice(5, 7), 16);
    context.fillStyle = `rgba(${red},${green},${blue},${style.color.tintStrength})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (style.depth.haze > 0) {
    context.fillStyle = `rgba(241, 234, 216, ${style.depth.haze})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (style.paint.grain > 0) {
    const random = seededRandom((canvas.width * 73856093) ^ (canvas.height * 19349663));
    const count = Math.min(3200, Math.round(canvas.width * canvas.height / 420 * style.paint.grain));
    context.fillStyle = `rgba(57, 61, 51, ${.075 * style.paint.grain})`;
    for (let index = 0; index < count; index++) {
      const size = .45 + random() * 1.25;
      context.fillRect(random() * canvas.width, random() * canvas.height, size, size);
    }
  }
  return canvas;
}
