# 元素映射

| 俗称 | 正式名称 | 页面/变量 | 修改提示 |
| --- | --- | --- | --- |
| 小墨点、小怪物、奇妙生物 | 玩家角色 | `creature`、`profile` | 外观来自程序化 recipe，名字和能力在 `profile` |
| 小芽、引导员、旁白 | 教学引导 | `#guide`、`say()`、`VoiceGuide` | 屏幕文字和预制 Fish Audio 要保持语义一致，不使用系统 TTS |
| 三颗星、萤火种、发光种子 | 关卡收集物 | `seeds`、`.seed-dot` | 一共 3 颗，驱动灯的三个亮度阶段 |
| 中间小灯、雾灯、花园灯 | 任务中心灯 | `lantern` | 收集进度通过灯芯亮度和光晕表现 |
| 白雾、雾墙 | 环境阻挡 | `fogs` | 集齐萤火种后变淡，能力使用后散开 |
| 勇字门、石门、终点门 | 能力验证门 | `gate`、`#guide-action` | 必须使用最初选择或生成的能力通过 |
| 第一页、叫醒页 | 欢迎引导 | `#panel-welcome` | JS 场景就绪前按钮显示加载状态 |
| 能力页、害怕变化页 | 特质选择 | `#panel-trait`、`TRAITS` | 三个预设和一个自由输入入口 |
| 树洞题、性格题 | 内心选择 | `#panel-heart`、`HEARTS` | 只描述行为倾向，不做道德打分 |
| 取名页 | 命名步骤 | `#panel-name`、`profile.name` | 最多保存 8 个字符 |
| 世界生长页、生成页 | 等待游戏化步骤 | `#panel-forming`、`.forming-row` | 用四步生长代替空白加载 |
| 游戏提示、底部气泡 | 关卡目标提示 | `#guide`、`#guide-copy` | 不能遮挡移动和能力按钮 |
| 能力按钮 | 关卡关键动作 | `#guide-action` | 文案随 `profile.traitLabel` 变化 |
| 成长报告、图鉴页、结算页 | 冒险结果 | `#ending` | 总结创作、数感、推理和情绪概念 |
| 收进图鉴 | 本机保存 | `#save-card`、`mengmeng-atlas` | 只写入当前浏览器 `localStorage` |
| 自由想法、AI 输入 | 世界导演入口 | `#custom-idea-form`、`/api/director` | 只有此处把能力描述发给服务端配置的世界导演模型 |
| 声音按钮、语音开关（已移除） | 不再提供全局声音开关 | `VoiceGuide` 固定启用，`#sound-toggle` 已删除 | 教学与反馈默认播放 Fish Audio，所有内容保留文字替代 |
| 草地点击圈、落脚圈 | 移动目标反馈 | `targetRipple` | 点击或轻触场景后立即出现 |
| 主页、三个入口、模式扉页 | 三入口主页 | `#mode-gate`、`.mode-choice` | 根地址固定显示，可选回声故事、雾灯花园或角色模拟器 |
| 返回主页、角落主页 | 统一主页按钮 | `#mode-switch`、`.home-button`、`showHome()` | 原故事和模拟器复用角落按钮，回声故事在页头显示文字按钮 |
| 调试模式、角色实验室、角色模拟器 | 角色实验环境 | `#debug-lab`、`activateLab()` | 与故事模式共用角色生成体系，但状态独立 |
| 头顶问题、说话泡泡 | Calligraph 实时对话气泡 | `#lab-bubble`、`#lab-bubble-text`、`setBubble()` | 每次换句重新入场并逐字显示；通过角色头顶锚点定位，不固定在场景顶部 |
| 气泡尖角、纸尾巴 | 气泡中心指示尾 | `.lab-bubble-tail`、`positionBubble()` | `left: 50%` 水平居中，并随头顶投影一起移动 |
| 气泡里的字、打字效果 | Calligraph 文字过渡组件 | `src/calligraph-bubble.jsx`、`mengmeng:bubble-text` | 34ms 追加一个字形，减弱动态时立即显示全文 |
| 左边工具、实验台 | 角色工具区 | `.lab-workbench`、`.lab-tabs` | 包含成长问答、角色模板、捏脸、身体、动作、场景、声音和对话 |
| 整体捏脸、预制角色 | 完整角色模板样本册 | `[data-lab-tab="templates"]`、`#template-grid`、`CHARACTER_TEMPLATES` | 12 个小动物、3 个特色人物，套用后仍可继续调整 |
| 小动物模板 | 动物角色模板组 | `group: "小动物"`、`makeTemplateRecipe()` | 使用真实 recipe、站姿和器官组合，不是静态贴图 |
| 人物模板 | 特色人物模板组 | `group: "人物"` | 星路探险家、安静小画家、云顶发明家 |
| 右边记录、兴趣档案 | 分组儿童画像笔记 | `.lab-notebook`、`[data-profile-group]`、`summarizeProfileGroups()` | 6 组摘要只保存在当前设备；手机端隐藏以留出操作空间 |
| 17 个问题、深入认识 | 第三版儿童画像访谈 | `QUESTIONS`、`PROFILE_FIELDS`、`mengmeng-child-profile-v3` | 6 个阶段可断点续答；旧 v1/v2 档案自动迁移并补答新增字段 |
| 已记住几项、绿色进度条 | 画像完成度 | `#question-memory-count`、`#interview-progress`、`profileCompletion()` | 每次选择立即从 0/17 递增，不必等整套完成 |
| 大眼睛、豆豆眼、大耳朵 | 信息偏好核心特征 | `QUESTIONS[1]`、学习偏好选项的 `apply()` | 后续兴趣只叠加特征，不能覆盖它们 |
| 孩子画像怎样影响关卡 | 游戏启发上下文 | `buildGameInspiration()`、`gameInspiration` | 开场、收集、雾门鼓励和结局读取本机画像；图鉴只保存最小主题摘要 |
| 放大糊、像贴图 | Canvas 部件纹理清晰度 | `setRender({ u: 176 })`、`displayPixelRatio`、`makePart()` | 角色不是 SVG；提高部件绘制密度、画布超采样和纹理过滤，不移除手绘颗粒 |
| 四种音色、声音卡 | 内置音色试听 | `.voice-grid`、`VOICE_PRESETS` | 小芽、泡泡、阿绒、星仔；播放静态 MP3 |
| 默认声音、星仔声音 | 玩家默认音色 | `DEFAULT_VOICE`、`VOICE_PRESETS.star` | 首次进入、旧档案迁移和重新开始都默认选中星仔 |
| 模拟说话、对话测试 | 自由对话面板 | `#dialogue-form`、`LabSpeaker` | 动态台词调用 `/api/tts`；失败时保留气泡和口型，不使用设备系统 TTS |
| 离线反馈、预制星仔语音 | 固定 Fish Audio 资源 | `assets/voice/star/`、`offlineAudioPath()` | 包含 17 问画像、模板、选择、动作、对话、场景和连续脚本，共 155 段 |
| Fish 语音接口 | 角色实验室 TTS 代理 | `/api/tts`、`fishWithCache()` | 固定星仔台词优先缓存，动态台词在线生成；不降级到系统 TTS |
| 眼神跟着鼠标、看按钮 | 连续目光目标 | `animator.setGaze()`、`pointGazeAt()` | 鼠标和触摸都可驱动；靠近底部按钮时向下看 |
| 点人物、戳角色 | 角色射线点击反馈 | `hitsCharacter()`、`respondToCharacterTap()` | 命中角色后轮换 4 条文字、动作和缓存星仔语音 |
| 动作页、动作模拟 | 角色动作工作台 | `[data-lab-tab="actions"]`、`#action-options`、`performAction()` | 提供 6 种连续动作和 5 种表情，结束后回到待机 |
| 连续问题、小故事 | 预制互动脚本 | `INTERACTION_SCRIPTS`、`#script-session` | 5 套脚本，每套 3 问；选项保留，反馈结束后才出现下一题 |
| 已选答案、选择记录 | 脚本选择历史 | `#script-history`、`.script-answers .is-selected` | 当前选择保持高亮，历史答案持续显示到脚本结束 |
| 随机换一只、换角色 | 角落随机印章 | `#lab-random`、`.lab-random-icon` | 仅显示“换”图标，低强调度固定在角色预览右下角 |
| 场景页、背景页 | 角色场景册 | `[data-lab-tab="scene"]`、`#scene-grid` | 22 个缩略舞台，按日常、自然、奇遇筛选 |
| 默认地面、纸地面 | 基础角色场景 | `paper-ground`、`DEFAULT_SCENE` | 第一次进入默认选中，保留铅笔地面线 |
| 宇宙、失重 | 星星宇宙场景 | `space`、`motion: "zero-g"` | 取消地面，角色持续轻微上下和左右漂浮 |
| 云朵、海底漂流 | 轻漂浮场景 | `clouds`、`underwater`、`motion: "float"` | 比宇宙幅度更小，减弱动态时停止 |
| 教室桌面、书桌 | 缩小落脚场景 | `classroom-desk` | 调整角色比例和桌面落脚高度 |
| 复制配方 | 角色与档案导出 | `#copy-recipe` | 复制 recipe 和兴趣小档案，不上传数据 |
| 数据后台、访问统计 | 自托管匿名运营后台 | `/Data`、`data.html`、`src/data.js` | 六位口令进入，查看 UV、PV、停留、事件、深度和每日趋势 |
| 罗师傅密码盘、数字键盘 | 六位后台口令门 | `#code-form`、`.code-display`、`.keypad` | 顺序为 1 至 9、清除、0、退格；六位自动提交，错误抖动清空 |
| 去重用户、访问人数 | 匿名浏览器 UV | `mengmeng-visitor-v1`、`visitor_id`、`COUNT(DISTINCT visitor_id)` | 同一浏览器稳定随机号；不使用账号、姓名或原始 IP |
| 页面访问、页面人数 | 页面 PV / UV | `page_views`、`view_id`、`page` | 页面分为三入口主页、雾灯花园、回声故事、角色模拟器 |
| 停留时长 | 前台有效停留 | `activeMs`、`active_ms` | 只累计页面可见且窗口聚焦的时间，15 秒心跳与离页补报 |
| 交互事件 | 预设匿名事件 | `interaction_events`、`trackAnalytics()` | 只发固定事件名和深度，不发送按钮文字或孩子输入 |
| 交互深度 | 单次页面最高进度 | `depth`、`max_depth` | 故事按开始、收集、雾门、通关递增；实验室按画像与脚本进度递增 |
| 统计数据库 | SQLite WAL 持久化 | `/var/lib/kindergrimm/analytics.db`、`ANALYTICS_DB_PATH` | 位于发布目录外，版本切换不覆盖 |
| 新腾讯服务器、锐驰服务器 | KinderGrimm 生产主机 | `lhins-qgi1l9jg`、`124.221.104.244`、`ssh mikeywa-rive` | 与 Rive 服务隔离端口、目录、systemd 和 Nginx 站点 |
| 统计服务、站点后端 | Python 零依赖服务 | `kindergrimm.service`、`127.0.0.1:8137`、`serve.py` | 火山、Fish、匿名统计与后台鉴权，只经 Nginx `/api/` 暴露 |
| 新故事、不见了的回声 | 连续语音故事 | `/story-v2`、`story-v2.html`、`src/story-v2.js` | 主页第一入口，与雾灯花园并列且不替换原关卡 |
| 随机提问的人、图鉴员 | 新版开场引导角色 | `GUIDES`、`state.guide`、`#guide-avatar` | 小芽、阿页、钟果随机出现，问题相同但节奏和音色不同 |
| 四轮聊天、先认识孩子 | 新版低敏感度偏好访谈 | `INTERVIEW_QUESTIONS`、`/api/story-turn` | 主题、探索、陪伴、节奏；不询问身份信息 |
| 签给我的宠物、页灵 | 由回答生成的同行宠物 | `state.pet`、`PetRenderer`、`recipe` | 回答映射 species、palette、feature 和可复现 seed |
| 三个印章、开口仪式 | 宠物声音激活步骤 | `.voice-seals`、`wakePet()` | 名字、听见、声音依次亮起，之后宠物才使用独立音色 |
| 右边冒出来的人 | 当前场景 NPC | `#npc-wrap`、`scene.npc.entrance` | 支持 door、grass、box、reflection、curtain、lantern 六种出场 |
| 角落小包、道具包 | 连续故事背包 | `#backpack-button`、`state.inventory` | 数字只统计未使用物品，已送出物品仍可查看说明 |
| 贝壳、听声音的贝 | 听风贝 | `ITEMS.listeningShell`、`listening-shell.png` | 放大小声音，不替别人说话 |
| 红线团、星星毛线 | 星线团 | `ITEMS.starThread`、`star-thread.png` | 连接没有说完的话 |
| 叶子信、没寄出的信 | 没寄出的问候 | `ITEMS.unsentGreeting`、`unsent-greeting.png` | 第二章暂存并送给慢钟先生 |
| 发光种子、灯种 | 灯塔种子 | `ITEMS.lighthouseSeed`、`lighthouse-seed.png` | 第三章种在灯塔顶部并消耗 |
| 豆包在理解、故事 AI | 儿童安全偏好理解 | `/api/story-turn`、`story_turn_result()` | 只返回回应、偏好和受限宠物提示，失败走确定性映射 |
| 火山语音识别、豆包听写 | 句末豆包 ASR 校准 | `/api/asr`、`volc_asr.py`、`doubaoTranscript()` | 浏览器先显示中间文本，PCM 经同源服务端送豆包，最终结果回填；Access Token 不下发 |
| 故事语音应用、流式语音应用 | 火山豆包语音专用应用 | `kindergrimm_story_voice`、AppID `6570862201` | ASR/TTS 2.0 与大模型兼容能力使用试用包；真实 Token 仅在服务端环境 |
| 豆包宠物声音、火山 TTS | 可切换动态语音代理 | `/api/tts`、`volc_tts()`、`PET_TTS_PROVIDER` | 当前本机为 `volc`，四个角色音色名映射不同语速；`fish` 保留回退配置 |
| 语音是否真的接通 | 语音健康状态 | `speechRecognition`、`doubaoTts`、`petTtsProvider` | 只返回布尔状态和供应方，不返回 AppID、Token 或音色凭证 |
