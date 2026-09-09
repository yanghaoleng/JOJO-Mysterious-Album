# 共享语音输入组件

`src/voice-input-control.js` 和 `src/voice-input-control.css` 是麦克风按钮、收音反馈、等待动画、当前转写和状态提示的唯一实现。2D 绘本、原绘本的 3D 开关、`/dev` 四条故事、角色实验室的普通及调试通话均直接使用它。

页面只保留控件的摆放、安全区与场景避让；不要在页面内复制按钮结构、圆点动画、波形样式或转写气泡。`speech-bubble.css` 的导入用于兼容旧入口，不再维护另一份语音样式。

```js
import { createVoiceInput } from './voice-input-control.js?v=20260909-shared-voice';
const voiceUi = createVoiceInput({ button, transcript, status, sanitize });
voiceUi.setState('listening', { message: '我在听，你可以慢慢说' });
voiceUi.setLevel(measuredLevel); // 0–1；来自当前录音管线
voiceUi.setTranscript(interimWords, { interim: true });
voiceUi.setState('transcribing');
voiceUi.setTranscript(finalWords);
voiceUi.setState('thinking'); // 保留孩子的原话
voiceUi.setState('paused'); // 可见按钮与读屏标签一起更新
voiceUi.clearTranscript(); // 新输入或显式重开时由业务决定
```

支持 setup、requesting、listening、receiving、transcribing、thinking、speaking、paused、quiet、short、empty、error、complete，并兼容旧 off、idle、streaming 状态。`setState` 可提供 `message`、`label`、`disabled`、`pressed`，通话可据此保留边听边说和打断能力；组件不申请麦克风、不调用 API、不推进故事。

- 2D 与 `/dev` 用原 PCM 采集的真实音量驱动波形；静音保持安静，取消原先脱离音量的循环跳动。
- 通话的 Web Speech 不暴露 PCM。使用 `setActivity(true/false)` 呈现浏览器实际声音/说话事件，只显示稳定的活动条，不虚构响度，也不为音量表增加第二条录音流，以保留 iOS 原有声音输出。
- 临时转写不反复打断读屏，最终转写为 polite 通知。最终原话在思考、朗读和暂停时保留；长句可在三行高度内滚动阅读。转写与状态均通过可选 `sanitize` 处理并用 textContent 写入。
- `reset()` 清空原话、音量和提示；重复挂载同一按钮返回同一实例。`getState()` 只读，供回归验证。
- 页面需要观测整个语音区域尺寸，给动态字幕和提示留出场景空间。减少动态模式关闭等待与入场动画，但继续呈现状态和真实输入。

运行 `PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node scripts/verify-voice-input-ui.mjs` 可验证状态、真实音量、静音、通话活动、转写保留、隐私文本、320/390/844 宽度、减少动态和幂等挂载；该脚本不打开麦克风、不调用语音接口。产品入口的实际事件流程另外用受控录音/接口响应验证。
