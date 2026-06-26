import callClaude from './claude.js';

/**
 * 处理一条用户消息，通过 WebSocket 流式推送回复
 * @param {import('hono').Context} c - Hono context
 * @param {import('ws').WebSocket} ws - WebSocket 连接
 */
export async function handleChat(c, ws, userInput) {
  try {
    await callClaude(userInput, (token) => {
      if (ws.readyState === 1) { // OPEN
        ws.send(JSON.stringify({ type: 'token', content: token }));
      }
    });

    // 发送完成信号
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'done' }));
    }
  } catch (error) {
    console.error('Claude API error:', error);
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'error',
        content: '抱歉，出了点小问题，请稍后再试。',
      }));
    }
  }
}

export default handleChat;
