const { createServer } = require('https');
const { parse } = require('url');       // ✅ 确保这一行存在
const fs = require('fs');
const os = require('os');
const next = require('next');

const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      const { family, address, internal } = iface;
      if (family === 'IPv4' && !internal) return address;
    }
  }
  return 'localhost';
}

app.prepare().then(() => {
  const server = createServer(
    {
      key: fs.readFileSync('./certs/server.key'),
      cert: fs.readFileSync('./certs/server.crt')
    },
    (req, res) => {
      const parsedUrl = parse(req.url, true);  // ✅ parse 正确使用
      handle(req, res, parsedUrl);
    }
  );

  const port = 3000;
  server.listen(port, () => {
    const ip = getLocalIP();
    console.log(`HTTPS Server running at https://${ip}:${port}`);
  });
});
