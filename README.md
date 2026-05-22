# 游戏 × AI 资讯

每日追踪游戏行业 AI 动态 | 24 个专业信源 + 150+ AI 信源

## 项目简介

静态资讯聚合网站，从 JSON 数据文件读取每日游戏 AI 资讯并展示。纯前端实现，无需后端服务。

## 目录结构

```
/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式
├── js/
│   └── app.js          # 应用逻辑
├── data/
│   ├── latest.json     # 最新数据（每日更新）
│   └── YYYY-MM-DD.json # 历史数据
└── README.md
```

## 数据格式

每日数据以 `data/YYYY-MM-DD.json` 格式存储，同时将最新一天的数据复制为 `data/latest.json`。

JSON 结构：

```json
{
  "date": "2026-05-22",
  "generated_at": "2026-05-22T02:30:50Z",
  "total_count": 25,
  "items": [
    {
      "title": "标题",
      "url": "原文链接",
      "summary": "摘要",
      "source": "来源",
      "published_at": "ISO 时间",
      "category": "分类 slug",
      "category_secondary": null,
      "tags": ["标签"],
      "recommendation": "推荐原因",
      "source_type": "primary|secondary"
    }
  ],
  "stats": { "by_category": { "creation": 5 } }
}
```

分类 slug 对照：
- `creation` - AI 游戏生成与创作
- `in-game` - 游戏内 AI 体验
- `dev-tools` - 游戏开发 AI 工具
- `ops` - 游戏运营&商业化 AI 实践
- `industry` - 游戏行业&公司 AI 动态
- `research` - 游戏 AI 应用前沿研究

## 部署到 GitHub Pages

### 方式一：直接部署（推荐）

1. 创建 GitHub 仓库（如 `ai-game-news`）

2. 推送代码：
   ```bash
   git init
   git add .
   git commit -m "init: 游戏 × AI 资讯网站"
   git remote add origin https://github.com/你的用户名/ai-game-news.git
   git push -u origin main
   ```

3. 开启 GitHub Pages：
   - 进入仓库 Settings > Pages
   - Source 选择 `Deploy from a branch`
   - Branch 选择 `main`，目录选 `/ (root)`
   - 点击 Save

4. 等待 1-2 分钟，访问 `https://你的用户名.github.io/ai-game-news/`

### 方式二：使用 GitHub Actions 自动部署

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - id: deployment
        uses: actions/deploy-pages@v4
```

## 每日数据更新

配合 CI/CD 或 cron 脚本，每天生成新的 JSON 文件并推送：

```bash
# 生成当日数据（由爬虫/脚本完成）
python generate_daily.py > data/$(date +%Y-%m-%d).json

# 更新 latest.json
cp data/$(date +%Y-%m-%d).json data/latest.json

# 提交并推送
git add data/
git commit -m "data: $(date +%Y-%m-%d)"
git push
```

## 本地开发

直接用任意静态文件服务器：

```bash
# Python
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# 然后访问 http://localhost:8080
```

## 功能

- 分类筛选（6 个分类 + 全部）
- 日期切换（← → 按钮，支持键盘左右方向键）
- URL hash 路由（`#2026-05-22` 直接跳转指定日期）
- 展开/收起详情（摘要 + 推荐原因）
- 转载标记（source_type 为 secondary 的条目）
- 响应式设计（桌面 + 移动端）
- 纯静态，无框架依赖

## License

MIT
