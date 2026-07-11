# 晨岛

个人仪表盘 — 天气、待办、日记、情绪追踪，单页面暖色调极简风格。

## 部署到 Vercel

1. Fork 或上传本项目到你的 GitHub。
2. 在 [Vercel](https://vercel.com) 中 Import 该仓库。
3. **设置环境变量**：在项目 Settings → Environment Variables 中添加：

```
DEEPSEEK_API_KEY = sk-你的DeepSeek-API-Key
```

4. Deploy，Vercel 会自动识别 `api/` 目录下的 Serverless 函数。
5. 部署完成后，打开 Vercel 分配的域名即可使用。

## 本地开发

```bash
npx serve . -p 3456
# 或
node server.js
```

> 本地开发时 API 代理不可用（依赖 Vercel Serverless 运行时），待办解析和 AI 对话功能需部署到 Vercel 后生效。

## 技术栈

- 单文件 HTML + Tailwind CSS CDN
- Vercel Serverless Function（API 代理）
- DeepSeek API（deepseek-chat）
- Open-Meteo 天气 API（免费，无需 Key）
- 数据存储：localStorage
