import { randomUUID } from 'crypto';
import { getSession, createSessionWithId, addMessage, getRecentMessages, updateSessionTitle, updateSessionTimestamp } from '../lib/store.js';

// ─── 读取 API 配置 ──────────────────────────────────────────────
function getApiConfig() {
  const baseUrl = process.env.API_BASE_URL || '';
  const apiKey = process.env.API_KEY || '';
  const model = process.env.API_MODEL || 'deepseek-v4-flash';
  const configured = Boolean(baseUrl && apiKey && apiKey.length > 10 && !apiKey.includes('xxxxx'));
  return { baseUrl, apiKey, model, configured };
}

// ─── System Prompt ──────────────────────────────────────────────
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

  const parsed = JSON.parse(raw);
  if (!parsed.reply || !Array.isArray(parsed.fields)) {
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

  let session = getSession(session_id);
  if (!session) {
    // Vercel Serverless 冷启动会导致内存中的 session 丢失，这里我们静默帮用户重建一个，避免报错
    session = createSessionWithId(session_id, 'resident', 'Restored Conversation');
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

  // 取最近 6 条历史
  const history = getRecentMessages(session_id, 6);

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
      reply: `⚠️ AI service error: ${err.message}`,
      fields: [
        { type: 'note', label: 'Your Query', value: content },
        { type: 'step', label: 'Next Step', value: 'Check API_KEY in Vercel Environment Variables and ensure the AI provider is reachable.' },
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
