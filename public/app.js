// Jay Chou Audio - PWA Frontend

const chatArea = document.getElementById('chatArea');
const welcome = document.getElementById('welcome');
const typing = document.getElementById('typing');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const clock = document.getElementById('clock');
const statusBar = document.getElementById('statusBar');

let ws = null;
let isConnected = false;
let isProcessing = false;

// 时钟
function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}
updateClock();
setInterval(updateClock, 1000);

// 添加消息气泡
function addMessage(content, role) {
  if (welcome) welcome.style.display = 'none';

  const div = document.createElement('div');
  div.className = `message ${role}`;

  if (role === 'ai') {
    div.innerHTML = `<span class="label">🎵 DJ</span>${escapeHtml(content)}`;
  } else {
    div.textContent = content;
  }

  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
  return div;
}

// HTML 转义
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// 连接 WebSocket
function connect() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}/ws`);

  ws.onopen = () => {
    isConnected = true;
    statusBar.className = 'status-bar connected';
    statusBar.textContent = '● 已连接';
    sendBtn.disabled = false;
  };

  ws.onclose = () => {
    isConnected = false;
    statusBar.className = 'status-bar disconnected';
    statusBar.textContent = '⚠ 未连接';
    sendBtn.disabled = true;
    // 3秒后重连
    setTimeout(connect, 3000);
  };

  ws.onerror = () => {
    console.error('WebSocket error');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleMessage(data);
    } catch {
      // 纯文本消息（兼容旧格式）
      if (event.data) {
        currentMsg.textContent += event.data;
      }
    }
  };
}

// 处理消息
let currentMsg = null;

function handleMessage(data) {
  switch (data.type) {
    case 'user_message':
      addMessage(data.content, 'user');
      break;

    case 'token':
      if (!currentMsg) {
        currentMsg = addMessage('', 'ai');
        typing.classList.remove('show');
      }
      // 更新最后一句 AI 消息的内容
      const aiContent = currentMsg.textContent || '';
      currentMsg.innerHTML = `<span class="label">🎵 DJ</span>${escapeHtml(aiContent + data.content)}`;
      chatArea.scrollTop = chatArea.scrollHeight;
      break;

    case 'done':
      currentMsg = null;
      typing.classList.remove('show');
      break;

    case 'error':
      typing.classList.remove('show');
      currentMsg = null;
      addMessage(data.content || '抱歉，出了点小问题。', 'ai');
      break;
  }
}

// 发送消息
function sendMessage() {
  const text = input.value.trim();
  if (!text || !isConnected || isProcessing) return;

  isProcessing = true;
  input.value = '';
  typing.classList.add('show');

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'message', content: text }));
  }

  setTimeout(() => { isProcessing = false; }, 1000);
}

// 事件绑定
sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// 注册 Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('SW registered'))
    .catch((err) => console.log('SW registration failed:', err));
}

// 启动
connect();
