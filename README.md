# Jay Chou Audio

一个个人 AI 电台项目，以周杰伦为主题，由 Claude 驱动。

## 第一步：骨架搭建

- [x] 项目初始化
- [ ] 安装依赖
- [ ] 后端核心
- [ ] PWA 仪表盘
- [ ] 本地测试
- [ ] 推送到 GitHub

## 技术栈

- **后端**: Hono (轻量 Web 框架) + better-sqlite3 (本地数据库)
- **AI**: Anthropic Claude API
- **前端**: 原生 HTML/CSS/JS + WebSocket
- **PWA**: Service Worker + manifest.json

## 快速开始

```bash
npm install
# 创建 .env 文件，填入 ANTHROPIC_API_KEY
npm start
# 访问 http://localhost:3000
```
