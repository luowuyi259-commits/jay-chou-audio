import Anthropic from '@anthropic-ai/sdk';
import assembleContext from './context.js';
import { saveMessage } from './state.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * 调用 Claude API，返回流式响应
 * @param {string} userInput - 用户输入
 * @param {(chunk: string) => void} onToken - 每个 token 的回调
 */
export async function callClaude(userInput, onToken) {
  const systemPrompt = assembleContext();

  // 保存用户消息
  saveMessage('user', userInput);

  // 获取历史对话（用于多轮上下文）
  const history = assembleContext().match(/<user>[\s\S]*?<\/user>|<DJ>[\s\S]*?<\/DJ>/g) || [];
  const messages = [];

  // 从 system prompt 中提取的历史消息转为 messages 格式
  const recentHistory = getRecentHistory();
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
  messages.push({ role: 'user', content: userInput });

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  let fullResponse = '';

  stream.on('text', (text) => {
    fullResponse += text;
    onToken(text);
  });

  stream.on('end', () => {
    // 保存 AI 回复
    saveMessage('assistant', fullResponse);
  });

  // 等待流结束
  return stream.finalMessage();
}

/**
 * 从 context 中提取最近的对话历史
 */
function getRecentHistory() {
  const context = assembleContext();
  const match = context.match(/\【最近对话\】([\s\S]*)$/);
  if (!match) return [];

  const lines = match[1].trim().split('\n');
  const result = [];
  let currentRole = null;
  let currentContent = '';

  for (const line of lines) {
    const userMatch = line.match(/<user>(.*?)<\/user>/);
    const djMatch = line.match(/<DJ>(.*?)<\/DJ>/);

    if (userMatch) {
      if (currentRole && currentContent) {
        result.push({ role: currentRole, content: currentContent });
      }
      currentRole = 'user';
      currentContent = userMatch[1];
    } else if (djMatch) {
      if (currentRole && currentContent) {
        result.push({ role: currentRole, content: currentContent });
      }
      currentRole = 'assistant';
      currentContent = djMatch[1];
    } else if (currentRole) {
      currentContent += ' ' + line;
    }
  }

  if (currentRole && currentContent) {
    result.push({ role: currentRole, content: currentContent.trim() });
  }

  return result.slice(-6);
}

export default callClaude;
