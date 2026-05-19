import { listSessions, createSession as createSess } from '../lib/store.js';

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const data = listSessions();
      return res.json({ ok: true, data });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { role = 'resident', title = 'New Conversation' } = req.body || {};
      const session = createSess(role, title);
      return res.status(201).json({ ok: true, data: session });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
