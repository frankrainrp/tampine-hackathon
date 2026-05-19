import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';

// ─── 读取统一的 API 配置 ─────────────────────────────────────────
function getApiConfig() {
  const baseUrl = process.env.API_BASE_URL || '';
  const apiKey = process.env.API_KEY || '';
  const model = process.env.API_MODEL || 'deepseek-v4-flash';
  const configured = Boolean(baseUrl && apiKey && apiKey.length > 10 && !apiKey.includes('xxxxx'));
  return { baseUrl, apiKey, model, configured };
}

// ─── DeepSeek / OpenAI 兼容的 System Prompt ──────────────────────
const SYSTEM_PROMPT = `You are an AI assistant for a Smart Public Service Terminal.

CRITICAL: You MUST always respond with a valid JSON object only. No markdown fences, no extra text.

Choose the response format based on the user's request:

FORMAT 1 — Standard 5W1H summary (for most queries):
{
  "type": "summary_list",
  "reply": "A short, friendly reply to the user in English.",
  "bullet_points": [
    { "icon": "who|what|when|where|why|how", "label": "Field Name", "value": "Field Value" }
  ],
  "actions": [
    { "label": "Button Label", "action_id": "snake_case_id" }
  ]
}

FORMAT 2 — Composite with special cards (for multi-agency or progress tracking):
{
  "type": "composite",
  "reply": "A short, friendly reply.",
  "bullet_points": [ ... ],
  "special_components": [
    {
      "component_name": "RouteCard",
      "data": {
        "routes": [
          { "step": 1, "title": "Agency Name", "desc": "Task description" }
        ]
      }
    }
  ]
}

Special component options:
- "RouteCard": for multi-step agency routing. data requires "routes" array.
- "ProgressCard": for tracking application status. data requires "progress" (0-100) and "status" string.
- "LoopCard": for inter-agency coordination. data requires "agencies" array with "name" and "status".

Icons for bullet_points MUST be one of: "who", "what", "when", "where", "why", "how"

Always extract: Who is involved, What is the task, When is the deadline, Where to go, Why (conditions), How (steps/documents needed).`;

const router = Router();

// ─── 工具函数：调用 LLM API ──────────────────────────────────────
async function callLLM(messages) {
  const { baseUrl, apiKey, model, configured } = getApiConfig();

  if (!configured) {
    throw new Error('API_KEY not configured. Set API_KEY in server/.env');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API Error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Empty response from LLM');

  // 解析并验证 JSON
  const parsed = JSON.parse(raw);
  if (!parsed.type || !parsed.reply) {
    throw new Error('Invalid AI response structure');
  }
  return parsed;
}

// ─── POST /api/chat ─ 发送消息并获取 AI 响应 ─────────────────────
router.post('/', async (req, res) => {
  const { session_id, content, attachments } = req.body;

  if (!session_id || !content) {
    return res.status(400).json({ ok: false, error: 'session_id and content are required' });
  }

  // 验证 session 存在
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id);
  if (!session) {
    return res.status(404).json({ ok: false, error: 'Session not found' });
  }

  // 保存用户消息到 SQLite
  const userMsgId = randomUUID();
  db.prepare(`
    INSERT INTO messages (id, session_id, role, content, attachments)
    VALUES (?, ?, 'user', ?, ?)
  `).run(
    userMsgId,
    session_id,
    content,
    attachments ? JSON.stringify(attachments) : null,
  );

  // 取最近 10 条对话历史作为上下文
  const history = db.prepare(`
    SELECT role, content FROM messages
    WHERE session_id = ? AND role IN ('user', 'assistant') AND content IS NOT NULL
    ORDER BY created_at DESC LIMIT 10
  `).all(session_id).reverse();

  try {
    // 调用大模型
    const aiResponse = await callLLM(
      history.map((m) => ({ role: m.role, content: m.content })),
    );

    // 自动生成会话标题（取第一条消息的前 30 字）
    if (history.length <= 1) {
      const title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
      db.prepare('UPDATE sessions SET title = ?, updated_at = unixepoch() WHERE id = ?')
        .run(title, session_id);
    } else {
      db.prepare('UPDATE sessions SET updated_at = unixepoch() WHERE id = ?')
        .run(session_id);
    }

    // 保存 AI 回复到 SQLite
    const aiMsgId = randomUUID();
    db.prepare(`
      INSERT INTO messages (id, session_id, role, content, ai_response)
      VALUES (?, ?, 'assistant', ?, ?)
    `).run(
      aiMsgId,
      session_id,
      aiResponse.reply,
      JSON.stringify(aiResponse),
    );

    res.json({
      ok: true,
      data: {
        user_message_id: userMsgId,
        ai_message_id: aiMsgId,
        ai_response: aiResponse,
      },
    });
  } catch (err) {
    console.error('[AI Error]', err.message);

    // API 调用失败时的降级 Mock 响应
    const fallback = {
      type: 'summary_list',
      reply: `⚠️ AI service error: ${err.message}`,
      bullet_points: [
        { icon: 'what', label: 'Your Query', value: content },
        { icon: 'how', label: 'Next Step', value: 'Check API_KEY in server/.env and ensure the AI provider is reachable.' },
      ],
    };

    const aiMsgId = randomUUID();
    db.prepare(`
      INSERT INTO messages (id, session_id, role, content, ai_response)
      VALUES (?, ?, 'assistant', ?, ?)
    `).run(aiMsgId, session_id, fallback.reply, JSON.stringify(fallback));

    return res.json({
      ok: true,
      data: { user_message_id: userMsgId, ai_message_id: aiMsgId, ai_response: fallback },
    });
  }
});

// ─── GET /api/chat/models ─ 返回当前配置信息 ─────────────────────
router.get('/models', (req, res) => {
  const { baseUrl, model, configured } = getApiConfig();
  res.json({
    ok: true,
    data: { base_url: baseUrl, model, configured },
  });
});

// ─── GET /api/chat/test ─ 真实调用 API 验证连通性 ─────────────────
router.get('/test', async (req, res) => {
  const { baseUrl, apiKey, model, configured } = getApiConfig();

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
});

export default router;
