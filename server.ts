import { createServer } from 'http';
import next from 'next';
import { initWebSocket } from './src/lib/ws/server';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });
  
  initWebSocket(server);
  
  const port = process.env.PORT || 3100;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
    console.log('> WebSocket server initialized at /api/socket');
  });
});
