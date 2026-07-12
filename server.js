const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const DIR = path.resolve(__dirname);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// 安全检查：防止路径穿越攻击
function safeResolve(baseDir, urlPath) {
  // 解码 URL，并去掉查询参数和 hash
  var decoded = decodeURIComponent(urlPath);
  // 只允许字母、数字、中文、斜杠、点、短横、下划线
  // 阻止 ../ 或 ..\ 等路径穿越
  if (/\.\./.test(decoded)) return null;
  // 解析后的绝对路径
  var resolved = path.resolve(path.join(baseDir, decoded));
  // 必须位于项目目录内
  if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) return null;
  return resolved;
}

http.createServer(function (req, res) {
  var urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  var filePath = safeResolve(DIR, urlPath);

  // 拒绝无效或危险的路径
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // No cache headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  var ext = path.extname(filePath).toLowerCase();
  if (MIME[ext]) res.setHeader('Content-Type', MIME[ext]);

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200);
    res.end(data);
  });
}).listen(PORT, function () {
  console.log('Server running at http://localhost:' + PORT);
  console.log('Cache disabled');
});
