import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { fileURLToPath } from 'url';
import path from 'path';
import { initDatabase } from './src/state.js';
import handleChat from './src/router.js';

const app = new Hono();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 静态文件服务
import { serveStatic } from '@hono/node-server/serve-static';

app.use('/*', serveStatic({
  root: path.join(__dirname, 'public'),
  index: 'index.html',
}));

// WebSocket 处理
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.get('/ws', upgradeWebSocket((c) => ({
  onMessage: async (event, ws) => {
    try {
      const data = JSON.parse(event.data.toString());
      if (data.type === 'message' && data.content) {
        // 先回显用户消息
        ws.send(JSON.stringify({
          type: 'user_message',
          content: data.content,
        }));
        // 调用 Claude
        await handleChat(c, ws, data.content);
      }
    } catch (err) {
      console.error('WebSocket error:', err);
    }
  },
  onClose: () => {
    console.log('WebSocket client disconnected');
  },
})));

// 健康检查
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// 启动
const port = process.env.PORT || 3000;

initDatabase().then(() => {
  console.log('数据库已初始化');

  const server = serve({ fetch: app.fetch, port });
  injectWebSocket(server);

  console.log(`\n🎵 Jay Chou Audio 已启动`);
  console.log(`   访问: http://localhost:${port}\n`);
}).catch((err) => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});
