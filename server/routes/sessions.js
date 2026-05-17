import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';

const router = Router();

// ─── GET /api/sessions ─ 列出所有会话（按最新更新排序）───────────
router.get('/', (req, res) => {
  try {
    const sessions = db.prepare(`
      SELECT s.*, COUNT(m.id) as message_count
      FROM sessions s
      LEFT JOIN messages m ON m.session_id = s.id
      GROUP BY s.id
      ORDER BY s.updated_at DESC
      LIMIT 50
    `).all();
    res.json({ ok: true, data: sessions });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /api/sessions ─ 创建新会话 ─────────────────────────────
router.post('/', (req, res) => {
  try {
    const { role = 'resident', title = 'New Conversation' } = req.body;
    const id = randomUUID();
    db.prepare(`
      INSERT INTO sessions (id, role, title) VALUES (?, ?, ?)
    `).run(id, role, title);
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    res.status(201).json({ ok: true, data: session });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/sessions/:id/messages ─ 获取会话下的消息 ────────────
router.get('/:id/messages', (req, res) => {
  try {
    const messages = db.prepare(`
      SELECT * FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(req.params.id);

    // 解析 JSON 字段
    const parsed = messages.map((m) => ({
      ...m,
      ai_response: m.ai_response ? JSON.parse(m.ai_response) : null,
      attachments: m.attachments ? JSON.parse(m.attachments) : null,
    }));

    res.json({ ok: true, data: parsed });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── DELETE /api/sessions/:id ─ 删除会话（级联删消息）────────────
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── PATCH /api/sessions/:id ─ 更新会话标题 ──────────────────────
router.patch('/:id', (req, res) => {
  try {
    const { title } = req.body;
    db.prepare(`
      UPDATE sessions SET title = ?, updated_at = unixepoch() WHERE id = ?
    `).run(title, req.params.id);
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
    res.json({ ok: true, data: session });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
