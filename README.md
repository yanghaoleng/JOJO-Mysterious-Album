# 萌萌星的奇妙图鉴

面向 5 至 8 岁孩子的 AI 原生创意箱庭。孩子先说出一个角色特质，再亲手为角色选择性格、取名并进入世界。这个特质会在后续冒险中真正解决问题，让孩子直观看见“我的想象改变了世界”。

当前交付包含两种入口：完整的新手引入与箱庭关卡“雾灯花园”，以及可独立测试角色、声音和儿童访谈脚本的“角色实验室”。首次进入时选择模式，之后可用角落按钮随时切换。

## 角色实验室

- “成长问答”用 6 个阶段、17 个儿童友好问题认识年龄段、感官与专注节奏、探索和受挫习惯、表达与社交、角色与玩法兴趣、情绪支持和希望避开的体验；不采集姓名、学校、住址或精确生日。
- 回答会直接改变角色：擅长看会长出更醒目的眼睛，擅长听会保留豆豆眼并长出两只大软耳朵；后续兴趣只叠加雀斑、胡须等次级特征，不覆盖核心特征。
- “角色模板”提供 12 种小动物和 3 种特色人物，每张缩略图都由真实 recipe 和 Three.js 角色生成器绘制；套用后仍可继续修改脸、身体和场景。
- “捏脸”和“身体”可独立调整眼睛、脸形、耳朵、嘴巴、体形、四肢、尾巴等选项。
- “动作”集中提供挥手、行走、奔跑、坐下、休息、勇气动作和 5 种表情模拟；原先悬浮在预览底部的测试按钮已经收回面板。
- “动作”内置 5 套三问连续互动脚本。每次选择会留在记录中，角色先用动作和语音反馈，再出现下一问；完成后把简短的兴趣与性格观察写入本机档案。
- “声音”内置小芽、泡泡、阿绒和星仔四种试听音色；“对话”可输入或选择台词，角色会显示头顶气泡并同步口型。气泡使用 Calligraph 驱动逐字过渡，每次换句都会重新入场。
- 气泡通过 Three.js 角色包围盒计算头顶锚点，尖角始终水平居中并随角色、场景比例和漂浮动画移动，不再固定在场景顶部。
- “场景”内置 22 个程序化水彩舞台，覆盖纸上地面、草地、城堡窗台、云朵、宇宙、教室书桌、图书馆、海底等环境；宇宙、云朵与海底会改变角色的漂浮动作。
- 角色会平滑注视鼠标、触摸位置和底部操作按钮；直接点击角色会触发轮换的文字、动作和星仔语音反馈。
- 星仔是玩家的默认音色。后续问答、场景和模拟对话优先由 Fish Audio 生成，固定台词均有星仔离线资源。
- 角色配方和兴趣小档案只保存在当前设备，也可一键复制用于产品调试。
- 儿童画像会被第一关读取：主题和玩法会进入开场提示，受挫与鼓励偏好会进入雾门挑战，角色称号和故事感觉会进入结局；它不是只展示在右侧笔记里。
- 角色不是 SVG，而是由程序化 recipe 把每个器官绘制到 Canvas，再挂到 Three.js 骨骼平面上。实验室和第一关现以 176px/世界单位绘制部件，并在 1× 屏上至少 1.5× 超采样，放大后仍保留清楚的石墨边缘。

## 第一关体验闭环

1. 发现一团没有名字的小墨点。
2. 决定它害怕时会发生什么，也可以输入自己的想法。
3. 通过情境选择它会怎样帮助朋友，并给它取名。
4. 等待世界生长，进入雾灯花园。
5. 点击草地移动，收集 3 颗萤火种，点亮雾灯。
6. 用最初创造的能力穿过雾门，理解“勇敢不是一点都不怕，是害怕时仍然愿意试一试”。
7. 获得成长记录并把角色保存在本机图鉴中。

关卡同时自然覆盖 `1 + 2 = 3`、条件推理、主动表达和情绪认知，不插入脱离剧情的考试题。

## 本地运行

项目不需要安装依赖，使用支持 ES Modules 的现代浏览器即可。

```bash
cp .env.example .env.local
# 按需填写服务密钥
python3 serve.py 8137
```

打开 `http://localhost:8137/`。

如需修改气泡文字组件，先安装开发依赖并重新打包：

```bash
npm install
npm run build:bubble
```

运行时直接加载已经生成的 `vendor/calligraph-bubble.js`，不依赖外部 CDN。

操作方式：

- 电脑：点击草地移动，也支持方向键或 WASD。
- 手机和平板：轻触草地移动。
- 声音：教学和反馈按剧情自动播放 Fish Audio，页面不提供全局声音开关；所有信息同时有文字版本。

## API

### `GET /api/health`

返回服务状态、AI 是否配置、内置语音文件数量。不会返回密钥。

### `POST /api/director`

只在孩子选择“我有自己的想法”时调用火山方舟的 Doubao Seed 2.0 Mini。输入：

```json
{ "idea": "会把耳朵变成小雨伞" }
```

返回可执行能力、儿童友好的能力名称、叙述句和过门方式：

```json
{
  "mechanic": "transparent",
  "abilityLabel": "耳朵雨伞",
  "narratorLine": "它害怕时，耳朵轻轻张开，像两把小伞遮住雨滴。",
  "gateLine": "雨伞耳朵挡住迷雾，让它安全穿过雾门。"
}
```

服务端限制输入长度并提供确定性降级。即使 AI 暂时不可用，孩子的原始想法也会被保留并映射到本地能力，不会中断游戏。

### `POST /api/tts`

把不超过 120 个字符的动态台词和音色 ID 发送到服务端。`PET_TTS_PROVIDER=volc` 时使用豆包语音，`fish` 时保留原 Fish Audio 链路；密钥都不会进入浏览器。接口返回 `audio/mpeg`，并用 `X-TTS-Provider` 标记实际供应方。`star`、`sprout`、`bubble`、`moss` 在豆包链路中使用同一儿童友好音色的不同语速，保证宠物与图鉴员的听感有区分。远端不可用时只保留文字、口型和动作，不切换设备机械 TTS。

### `POST /api/asr`

新版故事页将一次发言的 16kHz 单声道 PCM 发送到同源服务端，由服务端通过豆包大模型语音识别 WebSocket 返回最终文本。浏览器看不到 AppID 对应的 Access Token。Safari 支持时先用浏览器中间结果即时显示，发言结束后再用豆包结果校准；失败时保留浏览器文本、打字和点选入口。单次音频上限 30 秒，服务端不写入音频文件或统计库。

### 匿名访问统计与 `/Data`

- `POST /api/analytics/collect`：接收匿名浏览器访客号、页面访问、有效前台停留、最高交互深度和预设事件名。不会接收孩子填写的文字、角色名、声音或原始 IP。
- `POST /api/data/login`：校验六位服务端管理口令，成功后写入 12 小时有效的 `HttpOnly + SameSite=Strict + Secure` 会话。
- `GET /api/data/summary`：按今日、近 7 天、近 30 天或全部聚合 UV、PV、平均有效停留、页面数据、交互事件和深度。
- `POST /api/data/logout`：退出统计后台。

统计后台入口为正式域名加 `/Data`。口令键盘复用罗师傅档期页的六格圆点、`1 至 9 / 清除 / 0 / 退格` 顺序、六位自动提交和错误抖动体验。数据库使用服务器本机 SQLite WAL，位于发布目录之外，切换版本不会丢失。

## 语音

项目内置 169 段 MP3：10 段故事教学、4 段音色试听，以及 155 段星仔问答、模板、反馈、动作、场景和连续脚本提示。默认星仔的固定台词直接使用本地 Fish Audio 缓存；切换其他音色或输入自由台词时调用在线 Fish Audio。无论语音是否成功，气泡和口型都会正常工作，角色实验室不会调用系统 TTS。

如需重新生成：

```bash
python3 scripts/generate_voice.py
python3 scripts/generate_lab_voices.py
python3 scripts/generate_star_offline.py
```

生成器支持 `--keys` 只更新指定台词、`--force` 覆盖旧文件，以及 `--jobs 1-4` 受控并发和自动重试。

## 关键架构

- `index.html`：产品结构、响应式 UI、设计变量和无障碍信息。
- `src/mode.js`：首次模式选择、本机记忆、故事/实验室切换和按模式加载，入口不提前下载两个完整场景。
- `src/analytics.js`：匿名访客号、有效停留、模式页面、交互事件和深度采集。
- `data.html`、`src/data.js`、`src/data.css`：六位口令门与自托管访问数据后台。
- `src/lab.js`、`src/lab.css`：角色实验室、15 个完整角色模板、6 种动作、5 套连续脚本、17 问画像塑形、音色和三端布局。
- `src/child-profile.js`：第三版本机儿童画像、旧档案迁移、17 维完成度、分组摘要和关卡启发映射。
- `src/calligraph-bubble.jsx`、`vendor/calligraph-bubble.js`：Calligraph 逐字气泡组件及其本地浏览器包。
- `src/lab-scenes.js`：22 个程序化水彩场景、缩略图、角色落脚位置和环境动作参数。
- `src/adventure.js`：Three.js 场景、引导状态机、角色能力、关卡和成长记录。
- `src/rig.js`、`src/anim.js`、`src/parts/`：继承 Kindergrimm 的程序化水彩角色、骨骼和动画系统。
- `api/director.js`：Vercel Serverless 版本的世界导演接口。
- `api/tts.js`、`api/asr.js`：Vercel 版豆包/Fish TTS 代理与豆包 ASR 代理。
- `volc_asr.py`：不依赖第三方 Python 包的豆包 WebSocket 鉴权、协议封装和最终文本解析。
- `serve.py`：零依赖静态服务、世界导演、豆包语音、Fish Audio 回退、SQLite 统计聚合与后台会话。
- `assets/voice/`：游戏运行时使用的内置引导语音。
- `scripts/star_script_lines.py`：动作与 5 套连续脚本的星仔固定台词清单，由离线语音生成器统一打包。

角色仍然由可复现的 recipe 生成，同一份 `{seed, media, color, parts}` 可以重建同一个角色。世界场景采用低面数几何体、手绘纹理、纸张颗粒和正交镜头，保持原 Kindergrimm 的绘本感。

## 隐私与密钥

- `.env.local` 已被 Git 忽略，禁止把真实密钥提交到仓库。
- 孩子的名字、选择、图鉴、实验室角色配方和兴趣小档案仅保存在当前设备的 `localStorage`；画像不询问姓名、学校、住址或精确生日。
- 预设能力全程离线运行；正式第一关只把自由能力描述发送给火山方舟，新版 `/story-v2` 还会把 4 轮自由回答文本发送给 `/api/story-turn` 做低敏感度偏好理解。
- 角色实验室不调用大语言模型；需要朗读的动态台词只发送文字与音色 ID 到所选 TTS 服务，不上传麦克风声音，也不由项目服务端保存。
- 正式第一关和角色实验室不录音。新版 `/story-v2` 获得麦克风许可后，会把单次发言送到同源 `/api/asr`，服务端再转给豆包识别；当前实现不落盘、不进入统计，但正式上线前仍需单独说明、家长授权和数据保留策略。打字和点选始终可用。产品不建立儿童账号，匿名统计不保存孩子输入、声音或原始 IP。

## 部署变量

- `ARK_API_KEY`：火山方舟服务端密钥，用于世界导演。
- `ARK_BASE_URL`：默认 `https://ark.cn-beijing.volces.com/api/v3`。
- `ARK_LLM_MODEL`：默认 `doubao-seed-2-0-mini-260428`，使用最小推理强度以缩短儿童等待时间。
- `ARK_IMAGE_MODEL`：预留图片模型，默认 `doubao-seedream-5-0-lite-260128`。
- `ARK_IMAGE_SIZE`：预留图片规格，默认 `4K`；正式图片功能上线前不开放公网生成接口。
- `FISH_AUDIO_API_KEY`：角色实验室在线语音和开发阶段静态语音生成。
- `FISH_AUDIO_REFERENCE_ID`：儿童感中文音色 ID。
- `VOLC_SPEECH_APP_ID`、`VOLC_SPEECH_ACCESS_TOKEN`、`VOLC_SPEECH_RESOURCE_ID`：豆包大模型语音识别服务端鉴权；小时版 Resource ID 为 `volc.bigasr.sauc.duration`。
- `VOLC_TTS_SPEAKER_ID`、`VOLC_TTS_RESOURCE_ID`：豆包 TTS 音色与资源；当前音色为 `zh_female_cancan_mars_bigtts`，资源为 `volc.service_type.10029`。
- `PET_TTS_PROVIDER`：动态语音供应方，`volc` 或 `fish`；当前本机已切到 `volc`。
- `DATA_ADMIN_PASSWORD`：六位统计后台口令，只放服务器环境变量。
- `DATA_SESSION_SECRET`：统计后台签名密钥，至少 32 字节随机值。
- `ANALYTICS_DB_PATH`：SQLite 路径，生产固定为 `/var/lib/kindergrimm/analytics.db`。

正式站部署在腾讯云轻量服务器 `lhins-qgi1l9jg / 124.221.104.244`，使用 Nginx、受限 systemd 服务、独立发布目录和持久化统计目录。Vercel 项目 `jma` 与 `https://jma-zeta.vercel.app` 保留为回滚点。

## 新版故事模式原型

独立入口 `http://localhost:8137/story-v2` 实现《不见了的回声》完整结构原型，暂不替换正式第一关：

- 随机出现小芽、阿页或钟果，通过 4 轮自由语音、打字或点选认识主题、探索方式、陪伴方式和节奏偏好。
- `POST /api/story-turn` 使用豆包把回答整理为即时回应、低敏感度偏好和宠物特征提示；无网络时使用确定性映射继续。
- 回答生成可复现的 Kindergrimm 宠物 recipe。宠物先用动作交流，完成“名字、听见、声音”三枚声印后使用不同音色开口。
- 《不见了的回声》共 3 章、6 个场景，NPC 分别从门、草堆、箱子、倒影、帘子和灯罩出场。
- 听风贝、星线团、没寄出的问候和灯塔种子进入角落背包，显示来历、用途与已送出状态。
- 四套故事发散、世界观、三章脚本与技术分工见 `STORY-BIBLE.md`。

豆包文本理解、豆包 TTS 与豆包 ASR 均已实测可用。Safari 端采用“浏览器中间文本 + 豆包句末校准”的混合体验；Python 本地服务与 Vercel API 版本都完成了真实 TTS→ASR 回环测试。打字和点选始终保留。

火山旧版豆包语音控制台已创建专用应用 `kindergrimm_story_voice`（AppID `6570862201`），开通豆包流式语音识别模型 2.0、豆包语音合成模型 2.0、流式语音识别大模型和语音合成大模型。Access Token 已读取并只写入被 Git 忽略的 `.env.local`，文档、前端与健康检查均不返回密钥。当前只使用试用包，未触发正式开通或付费切换。

新增关键文件：

- `story-v2.html`、`src/story-v2.css`、`src/story-v2.js`：新版连续故事原型。
- `src/story-blueprints.js`：章节、场景、NPC、选项、道具和图鉴员数据。
- `api/story-turn.js`：儿童安全偏好理解接口。
- `api/asr.js`、`volc_asr.py`：Vercel 与 Python 两套安全豆包识别中继。
- `assets/story/items/`：4 个透明水墨道具图标。

`GET /api/health` 额外返回 `storyAi`、`speechRecognition`、`doubaoTts` 和 `petTtsProvider`，只显示能力是否配置，不返回任何密钥。

## 项目来源与许可

本项目以 [albertobeiz/kindergrimm](https://github.com/albertobeiz/kindergrimm) 的程序化绘本角色系统为基础继续设计。原项目及当前代码采用 [Unlicense](LICENSE)，属于公共领域。
