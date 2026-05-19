import { getSession, deleteSession, renameSession } from '../lib/store.js';

export default function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      deleteSession(id);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { title } = req.body || {};
      const session = renameSession(id, title);
      if (!session) {
        return res.status(404).json({ ok: false, error: 'Session not found' });
      }
      return res.json({ ok: true, data: session });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
