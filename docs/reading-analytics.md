# 跟读活动统计

正式入口为 `/words`、`/midautumn`、`/national`。Beta 保留独立存档且不写正式统计。原版已合入九个主题、27 条路线和 162 个主练习；两个节日的独立内容和存档键保持不变。

前端统一记录 activity、theme、routeIndex、runId、lessonId、lessonIndex 和 lessonCount。刷新同一轮保留 runId，新一轮重新生成。年龄仅来自原版显式选龄；节日不采集年龄。

`/data` 提供三活动概览、活动切换、年龄分布、逐题表现和主题路线表。活动用户包含仅进入未作答者；平均深度为统计范围内每位活动用户最高到达题号的均值，平均进度除以对应路线题数。完成率按范围内完成用户除以活动用户，完成轮数按用户与 runId 去重。范围外开始、范围内完成的用户也计入完成。

正确率是目标词完整覆盖比例，不是发音评分；通过率是允许继续的作答比例。语音和点词分开计数。分享成功指系统分享返回或复制链接，不代表送达。

升级仅向 word_attempts 追加 theme、route_index、run_id、lesson_count、analytics_version 列，保留旧数据。节日新记录 age=0 表示未采集，兼容既有非空列，界面不显示为年龄。旧中秋记录按 lesson_id 前缀归类；未记录的路线标为历史路线；此前被拒收的国庆作答不补造。

发布前备份 SQLite；服务启动执行幂等加列迁移。验证入口：`tests/test_reading_analytics.py`、`dev/tools/verify-reading-analytics-ui.mjs`、`verify-word-theme-ui.mjs` 和 `verify-national-day-ui.mjs`。带模拟数据的统计 UI 测试只允许访问本地服务，不能向生产灌测试事件。
