/**
 * In-Memory Data Store — 替代 SQLite，适配 Vercel Serverless
 *
 * 注意：Vercel Serverless 无法使用 better-sqlite3（原生模块），
 * 也无法持久化文件系统写入。使用内存 Map 存储，每次冷启动重置。
 * 对于 Hackathon 演示足够使用。
 */
import { createHash, randomUUID } from 'crypto';

// ─── 密码哈希工具 ──────────────────────────────────────────────────
function hashPwd(password) {
  return createHash('sha256').update(password).digest('hex');
}

// ─── 数据存储 ──────────────────────────────────────────────────────
const users = new Map();
const sessions = new Map();
const messages = new Map(); // key: message_id, value: message object

// ─── 种子用户数据 ──────────────────────────────────────────────────
const seedUsers = [
  { id: 'u-resident-01', username: 'zhangwei',    password: 'Zhang@2026',   display_name: 'Zhang Wei',     role: 'resident', avatar: '👤' },
  { id: 'u-resident-02', username: 'limei',       password: 'LiMei@2026',   display_name: 'Li Mei',        role: 'resident', avatar: '👩' },
  { id: 'u-resident-03', username: 'wangfang',    password: 'Wang@2026',    display_name: 'Wang Fang',     role: 'resident', avatar: '👧' },
  { id: 'u-resident-04', username: 'resident',    password: 'resident123',  display_name: 'Test Resident', role: 'resident', avatar: '🧑' },
  { id: 'u-staff-01',    username: 'admin',        password: 'Admin@2026',   display_name: 'System Admin',  role: 'staff',    avatar: '👨‍💼' },
  { id: 'u-staff-02',    username: 'chenliang',    password: 'Chen@2026',    display_name: 'Chen Liang',    role: 'staff',    avatar: '🧑‍💻' },
  { id: 'u-staff-03',    username: 'staff',        password: 'staff123',     display_name: 'Test Staff',    role: 'staff',    avatar: '👩‍💼' },
];

// 初始化种子数据
for (const u of seedUsers) {
  users.set(u.username, {
    id: u.id,
    username: u.username,
    password_hash: hashPwd(u.password),
    display_name: u.display_name,
    role: u.role,
    avatar: u.avatar,
    created_at: Math.floor(Date.now() / 1000),
    last_login: null,
  });
}

// ─── 导出查询工具函数 ──────────────────────────────────────────────

export function getUserByUsername(username) {
  return users.get(username) || null;
}

export function updateUserLogin(userId) {
  for (const u of users.values()) {
    if (u.id === userId) {
      u.last_login = Math.floor(Date.now() / 1000);
      break;
    }
  }
}

export function getAllUsers() {
  return [...users.values()].map(({ password_hash, ...rest }) => rest);
}

// ─── 会话操作 ────────────────────────────────────────────────────

export function createSession(role, title = 'New Conversation') {
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const session = { id, user_id: null, role, title, created_at: now, updated_at: now };
  sessions.set(id, session);
  return { ...session, message_count: 0 };
}

export function getSession(id) {
  return sessions.get(id) || null;
}

export function listSessions() {
  const result = [];
  for (const s of sessions.values()) {
    let count = 0;
    for (const m of messages.values()) {
      if (m.session_id === s.id) count++;
    }
    result.push({ ...s, message_count: count });
  }
  result.sort((a, b) => b.updated_at - a.updated_at);
  return result.slice(0, 50);
}

export function deleteSession(id) {
  sessions.delete(id);
  // 级联删除消息
  for (const [mid, m] of messages.entries()) {
    if (m.session_id === id) messages.delete(mid);
  }
}

export function renameSession(id, title) {
  const s = sessions.get(id);
  if (s) {
    s.title = title;
    s.updated_at = Math.floor(Date.now() / 1000);
  }
  return s ? { ...s } : null;
}

export function updateSessionTimestamp(id) {
  const s = sessions.get(id);
  if (s) {
    s.updated_at = Math.floor(Date.now() / 1000);
  }
}

export function updateSessionTitle(id, title) {
  const s = sessions.get(id);
  if (s) {
    s.title = title;
    s.updated_at = Math.floor(Date.now() / 1000);
  }
}

// ─── 消息操作 ────────────────────────────────────────────────────

export function addMessage(id, session_id, role, content, ai_response = null, attachments = null) {
  const now = Math.floor(Date.now() / 1000);
  const msg = { id, session_id, role, content, ai_response, attachments, created_at: now };
  messages.set(id, msg);
  return msg;
}

export function getSessionMessages(sessionId) {
  const result = [];
  for (const m of messages.values()) {
    if (m.session_id === sessionId) {
      result.push({
        ...m,
        ai_response: m.ai_response ? (typeof m.ai_response === 'string' ? JSON.parse(m.ai_response) : m.ai_response) : null,
        attachments: m.attachments ? (typeof m.attachments === 'string' ? JSON.parse(m.attachments) : m.attachments) : null,
      });
    }
  }
  result.sort((a, b) => a.created_at - b.created_at);
  return result;
}

export function getRecentMessages(sessionId, limit = 10) {
  const all = [];
  for (const m of messages.values()) {
    if (m.session_id === sessionId && (m.role === 'user' || m.role === 'assistant') && m.content) {
      all.push({ role: m.role, content: m.content });
    }
  }
  all.sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
  return all.slice(-limit);
}
