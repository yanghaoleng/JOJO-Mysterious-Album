import * as THREE from 'three';
import { createYellowFour } from '../yellow-four-models.js';

// Independent cover and inside scenes: the closed screen never crops from a
// four-character image. Both screens are live views of our existing models.
export function createCharacterScreens(renderer) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const views = {};
  for (const kind of ['inner', 'outer']) {
    const width = kind === 'inner' ? 1600 : 774, height = 1125;
    const backdrop = document.createElement('canvas');
    backdrop.width = width; backdrop.height = height;
    const ctx = backdrop.getContext('2d');
    ctx.fillStyle = '#faf2d8'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#aa986e'; ctx.textAlign = 'center';
    ctx.font = '500 22px "PingFang SC", sans-serif';
    ctx.fillText('萌 萌 星', width / 2, 113);
    ctx.fillStyle = '#564422'; ctx.font = `600 ${kind === 'inner' ? 78 : 66}px "PingFang SC", sans-serif`;
    ctx.fillText(kind === 'inner' ? '黄色四巨头' : '你好，我是叫叫', width / 2, 224);
    ctx.fillStyle = '#a38e62'; ctx.font = '400 26px "PingFang SC", sans-serif';
    ctx.fillText(kind === 'inner' ? '一个颜色，四种可爱。' : '打开看看，谁也来啦？', width / 2, 283);
    ctx.fillStyle = '#87734c'; ctx.font = '500 25px "PingFang SC", sans-serif';
    if (kind === 'inner') {
      ['黄牛', '圆滚滚', '叫叫', '袋鼠'].forEach((name, i) => ctx.fillText(name, [296, 630, 954, 1250][i], 940));
    } else ctx.fillText('把快乐，藏进口袋。', width / 2, 946);
    ctx.fillStyle = '#d6c59b'; ctx.fillRect(width / 2 - 35, 1012, 70, 3);
    const scene = new THREE.Scene();
    const background = new THREE.CanvasTexture(backdrop);
    background.colorSpace = THREE.SRGBColorSpace;
    scene.background = background;
    scene.add(new THREE.HemisphereLight('#fff8da', '#bd955b', 1.9));
    const key = new THREE.DirectionalLight('#fff4d4', 2.6);
    key.position.set(-5, 9, 7); scene.add(key);
    const fill = new THREE.DirectionalLight('#fffbed', 1.2);
    fill.position.set(6, 5, -3); scene.add(fill);
    const all = createYellowFour();
    const actors = kind === 'inner' ? all : all.filter(actor => actor.id === 'jiaojiao');
    all.filter(actor => !actors.includes(actor)).forEach(actor => actor.dispose());
    const positions = [[-3.40, 0, 0], [-1.15, 0, .10], [1.04, 0, .42], [3.03, 0, -.02]];
    actors.forEach((actor, i) => {
      actor.group.position.set(...(kind === 'inner' ? positions[i] : [0, 0, .2]));
      actor.group.rotation.y = kind === 'inner' ? [-.04, 0, -.07, -.12][i] : -.08;
      scene.add(actor.group);
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(.7, 40), new THREE.MeshBasicMaterial({color:'#b2a074',transparent:true,opacity:.12,depthWrite:false}));
      shadow.rotation.x = -Math.PI / 2; shadow.scale.y = .64;
      shadow.position.set(actor.group.position.x, -.01, actor.group.position.z);
      scene.add(shadow);
    });
    const halfWidth = kind === 'inner' ? 5.4 : 1.86;
    const halfHeight = halfWidth * height / width;
    const camera = new THREE.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, .1, 60);
    const centerY = kind === 'inner' ? 1.7 : 1.28;
    camera.position.set(0, centerY + 1.65, 15); camera.lookAt(0, centerY, 0);
    const target = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearMipmapLinearFilter, generateMipmaps: true,
      samples: Math.min(4, renderer.capabilities.maxSamples),
    });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    views[kind] = { scene, camera, actors, target, width, height };
  }
  let lastFrame = -1, elapsed = 0;
  return {
    views,
    update(time, delta, angle) {
      // Thirty screen frames per second is enough for a gentle idle; the phone
      // itself continues to render at the display refresh rate while folding.
      elapsed += delta;
      if (lastFrame >= 0 && time - lastFrame < 1 / 30) return;
      lastFrame = time;
      const previousTarget = renderer.getRenderTarget();
      for (const [kind, view] of Object.entries(views)) {
        if (kind === 'inner' && angle === 0 || kind === 'outer' && angle === 180) continue;
        view.actors.forEach((actor, i) => {
          actor.setAction('idle'); actor.update(reducedMotion ? 0 : time, elapsed);
          const pose = kind === 'outer' ? [-.45, .75] : [[0, 1.06], [-1.02, 1.05], [-.45, .48], [-.75, .02]][i];
          actor.arms.forEach((arm, side) => arm.rotation.z = pose[side]);
        });
        renderer.setRenderTarget(view.target); renderer.render(view.scene, view.camera);
      }
      renderer.setRenderTarget(previousTarget);
      elapsed = 0;
    },
  };
}
