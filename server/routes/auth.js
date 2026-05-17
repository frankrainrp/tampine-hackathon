import { Router } from 'express';
import { createHash } from 'crypto';
import db from '../db.js';

const router = Router();

// ─── 密码哈希 (SHA-256，MVP 足够；生产环境建议 bcrypt) ──────────
function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

// ─── POST /api/auth/login ─ 用户登录 ─────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Please enter username and password' });
  }

  const user = db.prepare(
    'SELECT * FROM users WHERE username = ?'
  ).get(username);

  if (!user) {
    return res.status(401).json({ ok: false, error: 'Username not found' });
  }

  const hashed = hashPassword(password);
  if (hashed !== user.password_hash) {
    return res.status(401).json({ ok: false, error: 'Incorrect password' });
  }

  // 更新最后登录时间
  db.prepare('UPDATE users SET last_login = unixepoch() WHERE id = ?').run(user.id);

  res.json({
    ok: true,
    data: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

// ─── GET /api/auth/users ─ 获取所有用户（仅开发环境）─────────────
router.get('/users', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ ok: false, error: 'Not available in production' });
  }

  const users = db.prepare(
    'SELECT id, username, display_name, role, avatar, created_at, last_login FROM users ORDER BY role, username'
  ).all();

  res.json({ ok: true, data: users });
});

export default router;
