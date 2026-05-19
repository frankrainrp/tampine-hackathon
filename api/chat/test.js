// ─── GET /api/chat/test ─ 真实调用 API 验证连通性 ─────────────────
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const baseUrl = process.env.API_BASE_URL || '';
  const apiKey = process.env.API_KEY || '';
  const model = process.env.API_MODEL || 'deepseek-v4-flash';
  const configured = Boolean(baseUrl && apiKey && apiKey.length > 10 && !apiKey.includes('xxxxx'));

  if (!configured) {
    return res.json({
      ok: false,
      error: 'API_KEY not configured',
      config: { base_url: baseUrl, model, configured },
    });
  }

  try {
    const startTime = Date.now();
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a connectivity test. Reply with valid json: {"status":"ok"}' },
          { role: 'user', content: 'ping' },
        ],
        max_tokens: 20,
      }),
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      return res.json({
        ok: false,
        error: `HTTP ${response.status}: ${errText}`,
        config: { base_url: baseUrl, model, configured },
        latency_ms: latency,
      });
    }

    const data = await response.json();
    res.json({
      ok: true,
      message: 'API connection successful',
      config: { base_url: baseUrl, model, configured },
      latency_ms: latency,
      response_preview: data.choices?.[0]?.message?.content?.slice(0, 100),
    });
  } catch (err) {
    res.json({
      ok: false,
      error: err.message,
      config: { base_url: baseUrl, model, configured },
    });
  }
}
