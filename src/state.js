import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.resolve(projectRoot, 'data/state.db');
const wasmPath = path.resolve(projectRoot, 'data/sql-wasm.wasm');

let SQL;
let db = null;

/**
 * 下载 WASM 文件（首次启动时需要）
 */
function ensureWasmFile() {
  if (fs.existsSync(wasmPath)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    console.log('正在下载 sql.js WASM 文件...');
    const url = 'https://sql.js.org/dist/sql-wasm.wasm';
    https.get(url, (res) => {
      const file = fs.createWriteStream(wasmPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('WASM 文件下载完成');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(wasmPath);
      reject(err);
    });
  });
}

/**
 * 初始化数据库
 */
export async function initDatabase() {
  await ensureWasmFile();

  SQL = await initSqlJs({
    locateFile: () => wasmPath,
  });

  // 加载已有数据库
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 初始化表
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_title TEXT,
      timestamp TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prefs (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  saveDb();
}

/**
 * 持久化到磁盘
 */
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

/**
 * 保存一条消息
 */
export function saveMessage(role, content) {
  db.run('INSERT INTO messages (role, content) VALUES (?, ?)', [role, content]);
  saveDb();
}

/**
 * 获取最近的对话历史
 */
export function getHistory(limit = 10) {
  const results = db.exec(
    'SELECT role, content FROM messages ORDER BY id DESC LIMIT ?',
    [limit]
  );
  if (!results.length) return [];

  const rows = results[0].values.reverse();
  const columns = results[0].columns;
  return rows.map((row) => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

/**
 * 获取所有用户偏好
 */
export function getPrefs() {
  const results = db.exec('SELECT key, value FROM prefs');
  if (!results.length) return {};

  const rows = results[0].values;
  const obj = {};
  rows.forEach((r) => { obj[r[0]] = r[1]; });
  return obj;
}

/**
 * 设置偏好
 */
export function setPref(key, value) {
  db.run('INSERT OR REPLACE INTO prefs (key, value) VALUES (?, ?)', [key, value]);
  saveDb();
}

/**
 * 清空消息历史
 */
export function clearMessages() {
  db.run('DELETE FROM messages');
  saveDb();
}

export { db };
export default { initDatabase, saveMessage, getHistory, getPrefs, setPref, clearMessages };
