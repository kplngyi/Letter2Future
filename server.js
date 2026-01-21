const { createServer } = require('http');
const { parse } = require('url');
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
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const port = 3000;
  server.listen(port, () => {
    const ip = getLocalIP();
    console.log(`HTTP Server running at http://${ip}:${port}`);
  });
});
