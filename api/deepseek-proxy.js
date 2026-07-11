/**
 * Vercel Serverless Function — DeepSeek API Proxy
 *
 * 前端调用 /api/deepseek-proxy，由本函数从环境变量中读取 DEEPSEEK_API_KEY
 * 并转发请求到 DeepSeek API，从而避免 API Key 暴露在前端代码中。
 *
 * 部署前请在 Vercel 项目设置中添加环境变量：
 *   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
 */

module.exports = async function handler(req, res) {
  // ---- CORS 头 ----
  res.setHeader('Access-Control-Allow-Origin', '*');
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

  // 读取环境变量中的 API Key
  var apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured on server' });
    return;
  }

  try {
    // 转发请求体到 DeepSeek
    var deepseekRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(req.body)
    });

    var data = await deepseekRes.json();

    // 透传 DeepSeek 的状态码和响应体
    res.status(deepseekRes.status).json(data);
  } catch (err) {
    console.error('[deepseek-proxy]', err.message);
    res.status(502).json({ error: 'Failed to reach AI service: ' + err.message });
  }
};
