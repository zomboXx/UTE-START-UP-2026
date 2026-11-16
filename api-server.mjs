import {createServer} from 'node:http';
import planHandler from './api/plans.mjs';

const port = Number(process.env.PORT || 4180);
const hostname = process.env.HOST || '127.0.0.1';

const server = createServer((req, res) => {
  const path = req.url.split('?', 1)[0];
  if (path === '/api/plans' || path === '/v1/plans') {
    return planHandler(req, res).catch(() => {
      if (res.headersSent) return res.destroy();
      res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({error: 'Máy chủ Brain10 chưa xử lý được yêu cầu.'}));
    });
  }
  res.writeHead(404).end();
});
server.listen(port, hostname, () => console.log(`Brain10 planning API listening on port ${server.address().port}`));
