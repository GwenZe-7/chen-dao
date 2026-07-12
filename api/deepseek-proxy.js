/**
 * Vercel Serverless Function — DeepSeek API Proxy
 *
 * 前端调用 /api/deepseek-proxy，由本函数从环境变量中读取 DEEPSEEK_API_KEY
 * 并转发请求到 DeepSeek API，从而避免 API Key 暴露在前端代码中。
 *
 * 部署前请在 Vercel 项目设置中添加环境变量：
 *   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
 */

// ---- 允许的来源（你的网站域名） ----
var ALLOWED_ORIGINS = [
  'https://chen-dao.vercel.app',
  'https://chen-dao-gwenzes-projects.vercel.app',
  /^http:\/\/localhost(:\d+)?$/
];

function isOriginAllowed(origin) {
  if (!origin) return false;
  // 同站请求（无 Origin 头，如同域 fetch 或直接访问）
  for (var i = 0; i < ALLOWED_ORIGINS.length; i++) {
    var allowed = ALLOWED_ORIGINS[i];
    if (typeof allowed === 'string' && allowed === origin) return true;
    if (allowed instanceof RegExp && allowed.test(origin)) return true;
  }
  return false;
}

// ---- 简易频率限制（内存级，跨冷启动重置） ----
var REQUEST_WINDOW_MS = 60 * 1000; // 1 分钟窗口
var MAX_REQUESTS_PER_WINDOW = 30;   // 每分钟最多 30 次（平均 2 秒一次）
var requestTimestamps = [];

function isRateLimited() {
  var now = Date.now();
  // 清理过期记录
  requestTimestamps = requestTimestamps.filter(function (ts) {
    return now - ts < REQUEST_WINDOW_MS;
  });
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) return true;
  requestTimestamps.push(now);
  return false;
}

// ---- 请求体大小限制 ----
var MAX_BODY_SIZE = 4096; // 4KB，AI 对话请求体很小

// ---- 速率限制专用响应 ----
function sendRateLimited(res) {
  res.status(429).json({ error: '请求太频繁，请稍后再试' });
}

module.exports = async function handler(req, res) {
  // ---- 检查来源 ----
  var origin = req.headers.origin || req.headers.referer || '';
  // 提取 referer 中的 origin 部分
  if (!origin || origin === '') {
    // 没有 Origin 头的同域请求也允许（但 Referer 可能仍然有效）
    // Vercel 函数通常会收到 Origin 头
  }

  // ---- CORS 头 ----
  var requestOrigin = req.headers.origin;
  if (requestOrigin) {
    if (isOriginAllowed(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    } else {
      // 未知来源 — 仍然可以响应，但浏览器会阻止跨域读取
      // 同时记录日志（可在 Vercel 日志中查看）
      console.warn('[deepseek-proxy] 拒绝未知来源:', requestOrigin);
      res.setHeader('Access-Control-Allow-Origin', 'https://chen-dao.vercel.app');
    }
  } else {
    // 同域请求，设置宽松的 CORS
    res.setHeader('Access-Control-Allow-Origin', 'https://chen-dao.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 预检请求直接返回
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 仅允许 POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ---- 频率限制 ----
  if (isRateLimited()) {
    sendRateLimited(res);
    return;
  }

  // ---- 请求体大小检查 ----
  var bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  if (bodyStr.length > MAX_BODY_SIZE) {
    res.status(413).json({ error: '请求体过大' });
    return;
  }

  // ---- 验证请求体格式 ----
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }
  if (!req.body.messages || !Array.isArray(req.body.messages)) {
    res.status(400).json({ error: 'Missing messages array' });
    return;
  }

  // 限制消息数量（防止滥用）
  if (req.body.messages.length > 50) {
    res.status(400).json({ error: '消息数量过多' });
    return;
  }

  // 读取环境变量中的 API Key
  var apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured on server' });
    return;
  }

  // 强制覆盖 model 为你自己的账户用过的模型
  var body = req.body;
  body.model = 'deepseek-chat';

  try {
    // 转发请求体到 DeepSeek
    var deepseekRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(body)
    });

    var data = await deepseekRes.json();

    // 透传 DeepSeek 的状态码和响应体
    res.status(deepseekRes.status).json(data);
  } catch (err) {
    console.error('[deepseek-proxy]', err.message);
    res.status(502).json({ error: 'Failed to reach AI service: ' + err.message });
  }
};
