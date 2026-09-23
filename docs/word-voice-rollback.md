# 英语小游戏语音方案与回滚

## 当前状态

- 默认仍为经典 ASR + TTS；原实现保存在 `dev/voice.js`、`volc_asr.py`，原发布提交 `2d1f459` 可追溯。
- 豆包端到端实时对话接入 `/api/word-realtime`，模型 O2.0 `1.2.1.1`，音色为女声 VV。
- 2026-09-23：现有本地及线上语音凭证连接端到端服务返回 HTTP 403，尚不能验证真实对话效果和时延，因此没有将未经验证的服务设为默认。
- 新模式不提供逐词时间戳，不伪造与音频的逐词对齐；经典领读保留真实时间戳效果。

## 试用和立即回滚

单词菜单底部可以切换“实时对话 / 经典语音”，选择保存在本机。切换会保存游戏进度并重新进入年龄推荐流程。

- 试用：`/dev/words?voice=realtime`
- 回滚：`/dev/words?voice=legacy`（或菜单“切回经典语音”）
- 实时连接失败或断线会回退本次访问的经典方案。
- 暂停、离开页面和换章节关闭实时连接；服务器单次连接最多五分钟，断开后回到经典方案。

## 服务配置

在服务器环境文件配置 `VOLC_REALTIME_APP_ID`、`VOLC_REALTIME_ACCESS_TOKEN`；未配置时复用已有 `VOLC_SPEECH_APP_ID` 与 `VOLC_SPEECH_ACCESS_TOKEN`。应用必须开通 `volc.speech.dialog` 服务权限。不要把密钥放入浏览器、仓库或聊天。

Nginx `/api/word-realtime` 必须代理 WebSocket Upgrade 到现有 8137 服务，同源校验必须保留 Host、X-Forwarded-Proto。修改后先检查配置再 reload。

资源英文名、别名和 R 线单词由 `dev/tools/build.mjs` 自动生成到 `dev/content/speech-vocabulary.json`。角色 JOJO / BOBO / DOMI 排在热词前列。实时模式开启二遍识别以启用热词，不盲目替换相似发音。

官方协议：https://www.volcengine.com/docs/6561/1594356?lang=zh

欢迎引导默认尝试实时对话，403 等连接错误仍自动回退经典语音。显式 `?voice=legacy` 或已保存的经典选择也适用于欢迎页。欢迎会话仅询问昵称与年龄；昵称不进入本地存档，进入游戏会释放欢迎会话并重新创建语音实例。
