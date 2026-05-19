import { createHash } from 'crypto';
import { getUserByUsername, updateUserLogin } from '../lib/store.js';

export default function handler(req, res) {
  // 仅允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Please enter username and password' });
  }

  const user = getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Username not found' });
  }

  const hashed = createHash('sha256').update(password).digest('hex');
  if (hashed !== user.password_hash) {
    return res.status(401).json({ ok: false, error: 'Incorrect password' });
  }

  updateUserLogin(user.id);

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
}
