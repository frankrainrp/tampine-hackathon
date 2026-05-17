import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

// 确保 data 目录存在
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'sssa.db'), {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// ─── 开启 WAL 模式（写性能更好）────────────────────────────────────
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── 密码哈希工具 ──────────────────────────────────────────────────
function hashPwd(password) {
  return createHash('sha256').update(password).digest('hex');
}

// ─── 初始化表结构 ────────────────────────────────────────────────
db.exec(`
  -- 用户表
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name  TEXT NOT NULL,
    role          TEXT NOT NULL CHECK(role IN ('resident', 'staff')),
    avatar        TEXT DEFAULT '',
    created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    last_login    INTEGER
  );

  -- 会话表
  CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id),
    role        TEXT NOT NULL CHECK(role IN ('resident', 'staff')),
    title       TEXT NOT NULL DEFAULT 'New Conversation',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- 消息记录表
  CREATE TABLE IF NOT EXISTS messages (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role          TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content       TEXT,
    ai_response   TEXT,           -- JSON 字符串，存储结构化 AI 响应
    attachments   TEXT,           -- JSON 字符串，存储附件信息
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- 上传文件记录表
  CREATE TABLE IF NOT EXISTS uploads (
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    message_id  TEXT,
    filename    TEXT NOT NULL,
    mimetype    TEXT NOT NULL,
    size        INTEGER NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

// ─── 种子数据：内置测试账号 ─────────────────────────────────────
const seedUsers = [
  // Resident accounts
  { id: 'u-resident-01', username: 'zhangwei',    password: 'Zhang@2026',   display_name: 'Zhang Wei',     role: 'resident', avatar: '👤' },
  { id: 'u-resident-02', username: 'limei',       password: 'LiMei@2026',   display_name: 'Li Mei',        role: 'resident', avatar: '👩' },
  { id: 'u-resident-03', username: 'wangfang',    password: 'Wang@2026',    display_name: 'Wang Fang',     role: 'resident', avatar: '👧' },
  { id: 'u-resident-04', username: 'resident',    password: 'resident123',  display_name: 'Test Resident', role: 'resident', avatar: '🧑' },
  // Staff accounts
  { id: 'u-staff-01',    username: 'admin',        password: 'Admin@2026',   display_name: 'System Admin',  role: 'staff',    avatar: '👨‍💼' },
  { id: 'u-staff-02',    username: 'chenliang',    password: 'Chen@2026',    display_name: 'Chen Liang',    role: 'staff',    avatar: '🧑‍💻' },
  { id: 'u-staff-03',    username: 'staff',        password: 'staff123',     display_name: 'Test Staff',    role: 'staff',    avatar: '👩‍💼' },
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, username, password_hash, display_name, role, avatar)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const seedTx = db.transaction(() => {
  for (const u of seedUsers) {
    insertUser.run(u.id, u.username, hashPwd(u.password), u.display_name, u.role, u.avatar);
  }
});

seedTx();

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log(`[DB] SQLite initialized at ${join(DATA_DIR, 'sssa.db')} | ${userCount.count} users`);

export default db;
