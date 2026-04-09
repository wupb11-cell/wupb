# AI市集

AI市集是一个适合移动端和微信内浏览器访问的 AI 工具聚合站原型，目标是把全球热门 AI 工具、GitHub 开源项目、Skill 集市、明星工具评价和模型选择建议集中到一个可筛选、可扩展的网站里。

## 当前能力

- 首页高优推荐区
- 按类型、使用场景、地区筛选
- 搜索工具名称、简介和标签
- 今日更新模块
- Skill 集市
- 明星 AI 工具深度评价
- 模型选择建议
- 适配手机端浏览

## 当前目录

- `index.html`：页面结构
- `styles.css`：视觉样式与移动端适配
- `app.js`：筛选、渲染和交互逻辑
- `data/source-tools.json`：原始工具数据、Skill、评价与模型指南
- `data/generated/public-sources.json`：抓取 GitHub / Hugging Face 后生成的公开数据
- `data/tools.js`：构建后的前端数据文件
- `scripts/build-tools.mjs`：生成前端数据的本地脚本
- `scripts/fetch-public-sources.mjs`：单独抓取公开平台数据
- `scripts/refresh-marketplace.mjs`：一步完成抓取并刷新前端数据
- `scripts/prepare-dist.mjs`：准备静态部署产物
- `.github/workflows/deploy-pages.yml`：GitHub Pages 自动部署和每日刷新

## 如何使用

直接用浏览器打开 `index.html` 即可预览。

如需重新生成前端数据，可运行：

```powershell
node .\scripts\build-tools.mjs
```

如需抓取公开平台数据再生成前端数据，可运行：

```powershell
node .\scripts\fetch-public-sources.mjs
node .\scripts\build-tools.mjs
```

如需一步完成抓取并刷新站点数据，可运行：

```powershell
node .\scripts\refresh-marketplace.mjs
```

如需生成部署目录，可运行：

```powershell
node .\scripts\prepare-dist.mjs
```

可选环境变量：

- `GITHUB_TOKEN`
  - 可选，不填也能抓公开仓库；填写后 GitHub API 速率限制更宽松

## 下一步建议

1. 接入真实数据源
   - GitHub Trending / GitHub API
   - Hugging Face 热门模型
   - Product Hunt
   - 公开评测榜单

2. 做自动更新
   - 用 `scripts/fetch-public-sources.mjs` 或 `scripts/refresh-marketplace.mjs` 抓取公开数据
   - 生成新的 `data/generated/public-sources.json` 和 `data/tools.js`
   - 部署到静态托管平台

## GitHub Pages 上线

当前项目已经补好了 GitHub Pages 自动上线配置：

1. 把当前仓库推到 GitHub
2. 默认分支使用 `main`
3. 在 GitHub 仓库里打开 `Settings > Pages`
4. Source 选择 `GitHub Actions`
5. 推送一次代码后，工作流会自动：
   - 抓取 GitHub 公开热门 AI 数据
   - 更新 `data/tools.js`
   - 生成静态站点
   - 部署到 GitHub Pages

工作流还会每天自动刷新一次数据。

3. 上线到微信可访问环境
   - Vercel
   - Netlify
   - Cloudflare Pages
   - 国内服务器或静态托管

4. 补充能力
   - 工具详情页
   - 榜单页
   - 管理后台录入工具
   - 收藏和最近浏览
