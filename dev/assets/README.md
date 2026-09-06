# 小小陶土剧场 · 原创 3D 角色资源

作者：Codex，为「萌萌星的奇妙图鉴」本次 `/dev/` 实验版本独立创作，2026 年 9 月。

这是一套重新建模的体积角色。`../models.js` 是权威、可复现的程序化模型源文件，直接使用项目已提供的 Three.js r160，不依赖旧版角色的 recipe、rig、骨骼、平面贴图或动画资源。没有使用外部下载模型、图片、字体或外部素材。源码授权沿用项目根目录的 LICENSE；原创造型与说明沿用 LICENSE-CONTENT.md，署名为 JOJO Mysterious Album contributors。

七种角色：豆豆小狗、雪团小兔、阿獭小水獭、咕咕猫头鹰、月牙小猫、蜜糖小熊、小荷青蛙。轮廓分别包含垂耳、长耳、长桨尾、心形脸盘与翅膀、尖耳卷尾、圆耳和隆起蛙眼。模型由圆润实体面部、眼球高光、独立眼睑、嘴部、局部耳尾和有厚度的包/围巾/荷叶组成。

## 资源与复现

运行 `node --experimental-default-type=module dev/tools/export-models.mjs` 可将七个静态参考模型重新导出至本目录的 `characters/*.json`，并更新 `manifest.json`。JSON 是 Three.js 原生 Object3D 场景格式，可由 `THREE.ObjectLoader` 加载；动态故事使用源文件工厂创建，以保留眼睑、表情与动作控制。

这些导出文件是项目原创的实际网格资源，不是远程链接或截图。面和法线在本地计算，配色保存在材质内。新版材质通过本地程序化表面处理呈现纸浆、纸艺、织物、木头与水彩涂绘的手作感；不下载外部贴图，也不使用电影画面、模型或其他素材。

## 手作表面分类

每个实际材质在创建时显式声明 `material.userData.handcraftedSurface`，Three.js 原生 JSON 导出和 `ObjectLoader` 回读会保留这一字段。运行时由 `../storybook.js` 按分类应用表面处理，离线使用者也可读取分类选择自己的材质；标准材质属性与几何在没有自定义着色器的查看器里仍可独立使用。

| 分类 | 本套原创资源中的用途 |
| --- | --- |
| `paper` | 角色身体、耳朵、奶油色嵌块、纸书与手工纸云 |
| `fabric` | 围巾、布包、肩带、缝线、布口袋、旗帜和风车帆布 |
| `wood` | 树干、木栅栏、桥、船、桌子、梯子、线轴与木纽扣 |
| `stone` | 石头、月面、环形坑、烤炉、珊瑚与贝壳 |
| `foliage` | 树冠、草、花、荷叶披肩与植物茎 |
| `water` | 溪水、涟漪与绕球水带，不使用纸纤维 |
| `paint` | 彩绘金属、玻璃、彩绘钮扣、吊坠和干净的腮红 |
| `ink` | 眼白、瞳孔、眼口高光、嘴、眉毛、胡须及微小图案线条 |

相同颜色但不同物质只拆分必要的共享材质：例如眼白不再与纸浆肚皮共用一个材质，眉毛细线也不与耳朵共用强颗粒表面。角色换色仍同步暗部与相应细线。分类未改变原角色的顶点、法线、UV、索引、体型或动画；导出的模型版本仍为 1。

## 调用接口

```js
import { CHARACTER_CATALOG, createCharacter } from './models.js';
const model = createCharacter({ type: 'dog', color: '#c99561', scale: 1 });
scene.add(model.group);
model.setAction('wave');
model.setExpression('happy');
model.update(elapsedSeconds, deltaSeconds);
// model.setColor('#ac9277');
// model.dispose();
```

`CHARACTER_CATALOG` 提供 `id`、中文 `name`、`description` 和默认 `color`。`createCharacter` 支持 `dog`、`rabbit`、`otter`、`owl`、`cat`、`bear`、`frog`。无效类型回退到 dog。根组前方为 +Z，静止高度约 2.2 单位，脚底 y=0；外部可自由移动/旋转根组，动作只控制内部子组。`scale` 为全模型尺寸倍数。

- `setAction`：`idle`、`talk`、`wave`、`hop`、`listen`、`walk`，成功返回 true，无效值返回 false。动作循环、平滑过渡。
- `setExpression`：`happy`、`curious`、`sad`、`surprised`，返回规则同上。
- `update(time, dt)`：时间与帧间隔单位均为秒；自动处理眨眼、呼吸、嘴部和动作。间隔最多按 0.08 秒推进，避免后台恢复时跳动。
- `setColor(color)`：更换主体配色并联动耳朵暗部；保留配件与奶油色嵌块。
- `dispose()`：清理当前角色专属几何体与材质，可重复调用。

所有活动均为 mesh/group 局部变换与几何缩放，无 Bone、Skeleton、SkinnedMesh。每个模型的 `group.userData.triangles` 与 `meshes` 提供实际预算，导出清单包含七个角色的三角形与网格统计。动画不在逐帧创建几何体或材质；低复杂度球面在同一角色中共享，场景切换时可完整回收。
