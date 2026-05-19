import { getAllUsers } from '../lib/store.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  res.json({ ok: true, data: getAllUsers() });
}
