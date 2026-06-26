import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getHistory } from './state.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 读取模板文件
 */
function readTemplate(filename) {
  const filePath = path.resolve(__dirname, `../../${filename}`);
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 组装完整的 system prompt
 * 将用户语料、时间、对话历史拼接到系统提示词中
 */
export function assembleContext() {
  let systemPrompt = readTemplate('prompts/system.md');

  // 替换时间占位符
  const now = new Date();
  const timeStr = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  systemPrompt = systemPrompt.replace('{TIME_PLACEHOLDER}', timeStr);

  // 注入最近对话历史
  const history = getHistory(10);
  if (history.length > 0) {
    systemPrompt += '\n\n【最近对话】\n';
    for (const msg of history.slice(-6)) {
      const label = msg.role === 'user' ? '用户' : 'DJ';
      systemPrompt += `<${label}>${msg.content}</${label}>\n`;
    }
  }

  return systemPrompt;
}

export default assembleContext;
