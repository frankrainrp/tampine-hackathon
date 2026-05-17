import Database from 'better-sqlite3';
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

// ─── 初始化表结构 ────────────────────────────────────────────────

db.exec(`
  -- 用户/会话表
  CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
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

console.log('[DB] SQLite initialized at', join(DATA_DIR, 'sssa.db'));

export default db;
