import { randomUUID } from 'crypto';
import { getSession, addMessage, getRecentMessages, updateSessionTitle, updateSessionTimestamp } from '../lib/store.js';

// ─── 读取 API 配置 ──────────────────────────────────────────────
function getApiConfig() {
  const baseUrl = process.env.API_BASE_URL || '';
  const apiKey = process.env.API_KEY || '';
  const model = process.env.API_MODEL || 'deepseek-v4-flash';
  const configured = Boolean(baseUrl && apiKey && apiKey.length > 10 && !apiKey.includes('xxxxx'));
  return { baseUrl, apiKey, model, configured };
}

// ─── System Prompt ──────────────────────────────────────────────
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

// ─── 调用 LLM ──────────────────────────────────────────────────
async function callLLM(messages) {
  const { baseUrl, apiKey, model, configured } = getApiConfig();

  if (!configured) {
    throw new Error('API_KEY not configured. Set API_KEY in Vercel Environment Variables.');
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

  const parsed = JSON.parse(raw);
  if (!parsed.type || !parsed.reply) {
    throw new Error('Invalid AI response structure');
  }
  return parsed;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { session_id, content, attachments } = req.body || {};

  if (!session_id || !content) {
    return res.status(400).json({ ok: false, error: 'session_id and content are required' });
  }

  const session = getSession(session_id);
  if (!session) {
    return res.status(404).json({ ok: false, error: 'Session not found' });
  }

  // 保存用户消息
  const userMsgId = randomUUID();
  addMessage(
    userMsgId,
    session_id,
    'user',
    content,
    null,
    attachments ? JSON.stringify(attachments) : null,
  );

  // 取最近 10 条历史
  const history = getRecentMessages(session_id, 10);

  try {
    const aiResponse = await callLLM(history);

    // 自动设置会话标题
    if (history.length <= 1) {
      const title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
      updateSessionTitle(session_id, title);
    } else {
      updateSessionTimestamp(session_id);
    }

    // 保存 AI 回复
    const aiMsgId = randomUUID();
    addMessage(
      aiMsgId,
      session_id,
      'assistant',
      aiResponse.reply,
      JSON.stringify(aiResponse),
      null,
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

    const fallback = {
      type: 'summary_list',
      reply: `⚠️ AI service error: ${err.message}`,
      bullet_points: [
        { icon: 'what', label: 'Your Query', value: content },
        { icon: 'how', label: 'Next Step', value: 'Check API_KEY in Vercel Environment Variables and ensure the AI provider is reachable.' },
      ],
    };

    const aiMsgId = randomUUID();
    addMessage(
      aiMsgId,
      session_id,
      'assistant',
      fallback.reply,
      JSON.stringify(fallback),
      null,
    );

    return res.json({
      ok: true,
      data: { user_message_id: userMsgId, ai_message_id: aiMsgId, ai_response: fallback },
    });
  }
}
