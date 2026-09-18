# 项目维护

- 三章游戏与模块目录遵循 `dev/AGENTS.md`，架构说明在 `dev/ARCHITECTURE.md`。
- 首页迭代历程包含模块陈列馆；页脚的更新日志按北京时间以天为最小单位，覆盖当前发布主线的全部历史提交。
- 每次有用户可见变化，更新 `src/changelog/entries.json` 对应日期的中文摘要；同一天合并同类变更，不堆砌逐条提交标题。
- 运行 `npm run build:changelog` 或现有构建生成更新日志。新提交日缺少摘要、仓库历史不完整时构建会报错；需要先补全历史和内容。
- 提交后用 `node tools/package-release.mjs /tmp/<release>.tar.gz` 打发布包。它包含当前提交生成的日志页面；不要只用 `git archive`，避免遗漏生成页面或最后一条提交。`changelog/` 是生成目录，不手改、不提交。
- 首页或日志改动后，运行 `tools/verify-updates.mjs` 检查历史覆盖、入口、手机排版和旧模拟器；用 `QA_ORIGIN` 选择地址，`PLAYWRIGHT_MODULE` 指定浏览器依赖。
- 当次用户明确限定仅本地、仅提交或仅推送时，遵守该范围；其他发布约定沿用用户已授权范围。
