# 本轮生图提示词

生成方式：内置 imagegen。所有对象先在均匀纯白背景上生成，再转为真实透明 alpha、裁边并输出 WebP；没有使用 CLI/API 回退。

## 共享风格规范

```text
Use case: stylized-concept
Asset type: isolated 2D environment prop / billboard for an orthographic children's interactive picture-book scene engine
Input images: current game scene as palette/context reference only; existing story item illustrations as material-finish and detail-quality references.
Style/medium: refined hand-painted watercolor and colored pencil, delicate graphite wobble contours, visible pigment blooms and fibrous-paper texture inside the painted object, slightly irregular handmade silhouette.
Color palette: muted moss and sage, dusty teal/blue-gray, warm paper cream, clay rose/brown, restrained warm-gold accents; low-to-medium contrast.
Backdrop: perfectly uniform pure white #FFFFFF only, no texture, checkerboard, gradient, or shadow.
Constraints: one isolated coherent asset; no characters, text, logo, watermark, border, UI, cast shadow, display platform, or unrelated scenery.
Avoid: glossy 3D, vector clip art, hard black outline, photorealism, neon colors, dense micro-detail.
```

## 对象规格

- `far-mountain-range`：三座柔和重叠山峰与一层低矮前丘；超宽、低矮、正视、底部平直；雾感低对比。
- `story-tree`：一棵微弯的老阔叶树，五组圆润树冠；完整根部，底部中心锚点，无脸、果实或秋千。
- `tree-grove`：五棵高低错落的细树形成一体树丛，树干间有少量低矮苔藓灌木；连续底线。
- `moss-cottage`：圆润灰泥小屋、苔藓屋顶、歪烟囱、木门和暖光窗；近正视，轻微三分之四感。
- `tiny-village`：三座高低错落、陡屋顶的小房子组成一体村落；灰蓝、苔绿与陶土红屋顶，暖光窗。
- `ringed-planet`：一颗略不规则的柔和行星，一圈宽阔倾斜星环和几块大尺度水彩纹理；完整星环，不带星空。
- `crater-moon`：略椭圆的手作月球，五个浅大陨石坑与一侧冷色阴影；无表情、旗帜或火箭。
- `cloud-bank`：三组相互叠合的宽云团，手绘不规则云瓣与淡雾蓝底部；低对比、无雨和彩虹。
