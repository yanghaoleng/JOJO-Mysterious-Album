# iPhone Duo · 黄色四巨头

独立入口 `/dev/iphone-duo/`。默认合起，外屏只渲染叫叫；展开后，内屏显示黄牛、圆滚滚、叫叫、袋鼠。原 `/dev/yellow-four.html` 保留。按钮可往返展开/合起，滑杆可停在 0–180° 任意角度，支持拖动旋转、缩放、方向键调整、Home/重置按钮回正面。减少动态效果偏好下按钮立即切换。

基于用户指定的 [chuspeeism/iphone-duo](https://github.com/chuspeeism/iphone-duo)，固定源版本 `2662ebbeb6aa844cd4f6888f7d6f8958662249fd`。保留上游的手机模型加载、固定后摄半边/活动外屏半边、柔性铰链、固定投影屏幕与折叠模糊着色器；替换原壁纸/启动器为两套独立实时角色场景，并增加中文控制、默认闭合、响应式取景、状态与错误提示。

- `main.js`：设备与交互，改编自上游 `main.js`。
- `characters.js`：外屏和内屏分别渲染到独立纹理，复用 `../yellow-four-models.js`；外屏场景只包含叫叫。
- `vendor/three/`：上游随附 Three.js 0.186.0 和 USDLoader/fflate；构建统一角色和手机所用的 Three.js，不改变原工坊运行时。
- `assets/`：由上游官方 Apple USDZ 准备的 Landscape 模型及纹理。所有运行资源随本站提供，不在访客端访问第三方。
- `app.bundle.js`：提交后的浏览器入口。构建：`node dev/tools/build-iphone-duo.mjs`。
- 模型重建：`uv run --python 3.12 --with usd-core==26.8 dev/tools/prepare-iphone-duo-assets.py`。原始 USDZ 缓存在不发布的 `output/`。

代码许可证保留于 `licenses/IPHONE-DUO-MIT`、`vendor/three/LICENSE`、`vendor/three/examples/jsm/libs/fflate.LICENSE`。Apple 模型与纹理版权归 Apple，**不在 MIT 授权范围内**；来源与上游说明见 `licenses/UPSTREAM-NOTICES.md` 及项目根 `THIRD_PARTY_NOTICES.md`。
