# 水彩场景对象包

这组对象延续当前项目的暖纸、水彩颗粒、彩铅细节和轻微石墨抖线。`runtime/` 是前端直接加载的透明 WebP，`masters/` 是保留细节的透明 PNG 母版。

## 文件结构

- `runtime/`：8 个经过裁边和压缩的透明 WebP。
- `masters/`：对应的高分辨率透明 PNG。
- `manifest.json`：运行时尺寸、归一化锚点、建议层级与视口占比。
- `preview-contact-sheet.png`：在项目暖纸背景上的总览。
- `integration-scenes-desktop.png` / `integration-scenes-mobile.png`：六幕故事的桌面与手机实装预览。
- `PROMPTS.md`：本轮可复用的生图提示词。

## 当前故事接入

《不见了的回声》现已直接复用角色模拟器的程序化场景画布，不再叠加这组远景素材。本目录仍保留为其他页面和后续视觉实验使用。

故事舞台只保留模拟器场景画布、角色和语音交互，不再添加可点击的远景对象，避免抢占角色和麦克风的操作区域。

## 引擎约定

地面对象的锚点在底部接地点，天空对象锚点在图片中心。Canvas 可按下面的方式摆放：

```js
const drawAnchored = (ctx, image, x, y, width, asset) => {
  const height = width * asset.height / asset.width;
  ctx.drawImage(
    image,
    x - width * asset.anchor[0],
    y - height * asset.anchor[1],
    width,
    height,
  );
};
```

Three.js billboard 建议使用 `MeshBasicMaterial`，开启 `transparent`，关闭 `depthWrite`，并给贴图设置 `SRGBColorSpace`。锚点可以通过平移平面几何体实现：

```js
const height = width / (asset.width / asset.height);
const geometry = new THREE.PlaneGeometry(width, height);
geometry.translate(
  (0.5 - asset.anchor[0]) * width,
  (asset.anchor[1] - 0.5) * height,
  0,
);

const texture = await new THREE.TextureLoader().loadAsync(asset.file);
texture.colorSpace = THREE.SRGBColorSpace;
const material = new THREE.MeshBasicMaterial({
  map: texture,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
});
```

`suggestedViewportWidth` 是对象初次入场时相对视口宽度的建议值，不是强制尺寸；远山和云团可以水平翻转或轻微缩放，树、房屋和月球不建议做非等比拉伸。
