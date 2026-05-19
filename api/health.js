// ─── GET /api/health ─ 健康检查 ──────────────────────────────────
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.API_KEY || '';
  const configured = Boolean(apiKey && apiKey.length > 10 && !apiKey.includes('xxxxx'));

  res.json({
    ok: true,
    status: 'running',
    timestamp: new Date().toISOString(),
    ai_configured: configured,
    model: process.env.API_MODEL || 'deepseek-v4-flash',
    base_url: process.env.API_BASE_URL || 'https://api.deepseek.com/v1',
  });
}
