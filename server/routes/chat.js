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
const SYSTEM_PROMPT_BASE = `You are an experienced Singapore public-service caseworker. For every query, deliver ONE concrete actionable plan the user can execute today — never offer options, alternatives, or hedging language.

Output ONLY this JSON, no markdown:
{
  "reply": "<1-2 sentence direct answer, no fluff>",
  "fields": [
    {"type": "<location|datetime|documents|contact|cost|eligibility|person|step|note>", "label": "<short>", "value": "<concrete>"}
  ],
  "actions": [{"label": "<button>", "prompt": "<follow-up message>"}]
}

Be proactive and decisive:
- Sequence "step" fields in execution order. Each step's label includes the absolute time, e.g. "Step 1 — Tue 26 May, 9:30 AM". Schedule each step inside the responsible office's actual opening hours; if today is past closing, push to the next business day.
- Always include a "datetime" field with the relevant office's service hours (Singapore govt counters are typically Mon-Fri 8:30am-5pm, Sat 8:30am-1pm; polyclinics 8am-4:30pm Mon-Fri, 8am-12:30pm Sat; ServiceSG centres extend to 6pm weekdays).
- "location" must be a complete Singapore address with postal code.
- "contact" must be a real +65 hotline for the specific agency.
- "documents" lists exact items (NRIC, IRAS Notice of Assessment, marriage certificate, etc), not vague phrases.
- "person" names the specific officer role or counter that handles this case (e.g. "MOM Work Pass case officer", "HDB Sales Counter, Level 2"), not "any staff".
- "cost" states the exact fee and payment mode (NETS / cashier order / PayNow).
- Forbidden phrases: "you could", "options include", "maybe", "depending on", "various". Decide for the user.

Rules:
- 4-7 fields, all directly needed to execute the plan.
- "actions" max 3; each "prompt" is the literal next question the user would ask.
- Reply in the user's language.
- JSON only.`;

function getSystemPrompt() {
  const now = new Date();
  const sgtDate = new Intl.DateTimeFormat('en-SG', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Singapore',
  }).format(now);
  return `Current Singapore time: ${sgtDate}.\n\n${SYSTEM_PROMPT_BASE}`;
}

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
        { role: 'system', content: getSystemPrompt() },
        ...messages,
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 900,
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
  if (!parsed.reply || !Array.isArray(parsed.fields)) {
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

  // 取最近 6 条对话历史作为上下文
  const history = db.prepare(`
    SELECT role, content FROM messages
    WHERE session_id = ? AND role IN ('user', 'assistant') AND content IS NOT NULL
    ORDER BY created_at DESC LIMIT 6
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
      reply: `⚠️ AI service error: ${err.message}`,
      fields: [
        { type: 'note', label: 'Your Query', value: content },
        { type: 'step', label: 'Next Step', value: 'Check API_KEY in server/.env and ensure the AI provider is reachable.' },
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
