# 开口造世界独立版

入口 `/kkzsj`，章末占位登录 `/kkzsj/login`，独立后台 `/kkzsj/data`。游客 UID 是三位 A–Z、0–9 混合码，由 SQLite 唯一约束分配；空间为 28,080 个，耗尽返回错误，不复用已有 UID。UID 只作展示；存档访问依赖随机 256 位 HttpOnly 会话，不能通过输入 UID 读取他人数据。Cookie 限定 `/kkzsj`，180 天有效。清除 Cookie 后会产生新游客，SDK 接入前无跨设备恢复。

学习数据包括年龄选择、路线与稳定题目 ID、世界快照、主题完成标记、章末续玩位置、访客事件与作答统计。`kk_users` 一份最新进度，revision 防止旧版本覆盖；`kk_completions` 保留完成历史，`word_attempts` 等表按服务器解析的 UID 关联。保存失败会在页面显示；登录跳转必须等待保存成功。数据库独立于 JMA。后台账号表显示 guest/mock，绝不将模拟登录计作叫叫正式登录。

SDK 接入时替换 `/api/login/mock`：服务端验证 SDK 授权码/签名，以供应方稳定用户 ID 唯一绑定游客 UID；已存在账号须设计显式合并规则。不能信任浏览器传来的叫叫用户 ID。`KKZSJ_MOCK_LOGIN=0` 可关闭占位成功接口。当前模拟成功标记保存在游客记录中，后续章可直接继续；没有采集手机、密码或叫叫账号凭证。

发布：先运行 `node dev/tools/build.mjs`、测试并提交，再运行 `node tools/package-release.mjs /tmp/kkzsj.tar.gz`；解包到全新发布目录，运行 `node tools/prepare-kkzsj.mjs <目录>`。独立 systemd 服务执行 `python3 kkzsj/server.py`，设置 `KKZSJ_DB_PATH`、`DATA_SESSION_SECRET`、`DATA_ADMIN_PASSWORD`、`PORT` 与 `APP_ENV=production`。数据与口令不放进静态发布包。主域名 Nginx 只增加 `/kkzsj` 路由；语音请求代理到现有 JMA 语音服务，SDK/数据请求进入独立进程。发布不切换 JMA current。

验证：`python3 -m unittest kkzsj.test_server` 测会话与进度隔离、唯一 UID、冲突保护、登录门槛与后台；`QA_ORIGIN=http://127.0.0.1:8854 node kkzsj/verify-ui.mjs` 验证六步完成、占位登录、下一章、恢复、两用户隔离和移动后台。使用受控语音事件，不能代表真实儿童口音识别准确度。生产复核只读资源、服务健康与数据后台，不向生产写入测试作答。
