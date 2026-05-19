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
      let session = renameSession(id, title);
      
      // 容错：如果 Vercel 冷启动导致 session 丢失，我们可以静默创建一个并重命名
      if (!session) {
        import('../lib/store.js').then(({ createSessionWithId }) => {
           createSessionWithId(id, 'resident', title);
        });
        session = { id, title, role: 'resident' };
      }
      return res.json({ ok: true, data: session });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
