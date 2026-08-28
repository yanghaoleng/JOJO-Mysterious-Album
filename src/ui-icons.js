import { House, Mic, Paintbrush, RotateCcw, createIcons } from 'lucide';

// Keep the icon set deliberately small: the browser bundle only contains the
// symbols used by the product chrome, while Lucide provides consistent SVG.
const productIcons = { House, Mic, Paintbrush, RotateCcw };

export function mountProductIcons(root = document) {
  createIcons({
    icons: productIcons,
    root,
    attrs: { width: 24, height: 24, 'stroke-width': 2.75 },
  });
}
