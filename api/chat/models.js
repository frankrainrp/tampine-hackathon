// ─── GET /api/chat/models ─ 返回当前配置信息 ─────────────────────
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const baseUrl = process.env.API_BASE_URL || '';
  const model = process.env.API_MODEL || 'deepseek-v4-flash';
  const apiKey = process.env.API_KEY || '';
  const configured = Boolean(baseUrl && apiKey && apiKey.length > 10 && !apiKey.includes('xxxxx'));

  res.json({
    ok: true,
    data: { base_url: baseUrl, model, configured },
  });
}
