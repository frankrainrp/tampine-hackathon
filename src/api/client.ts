/**
 * API Client — 统一封装对后端 Express 服务的调用
 * Base URL: http://localhost:3001
 */

const BASE = 'http://localhost:3001/api';

// ─── 通用请求封装 ────────────────────────────────────────────────
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'API Error');
  return json.data as T;
}

// ─── 健康检查 ────────────────────────────────────────────────────
export interface HealthStatus {
  ok: boolean;
  status: string;
  ai_configured: boolean;
  model: string;
  base_url: string;
}

export async function checkHealth(): Promise<HealthStatus> {
  const res = await fetch(`${BASE}/health`);
  return res.json() as Promise<HealthStatus>;
}

// ─── API 连通性测试（真实调用一次 LLM）──────────────────────────
export interface ApiTestResult {
  ok: boolean;
  message?: string;
  error?: string;
  config: { base_url: string; model: string; configured: boolean };
  latency_ms?: number;
  response_preview?: string;
}

export async function testApiConnection(): Promise<ApiTestResult> {
  const res = await fetch(`${BASE}/chat/test`);
  return res.json() as Promise<ApiTestResult>;
}

// ─── 会话管理 (CRUD) ────────────────────────────────────────────
export interface DBSession {
  id: string;
  role: 'resident' | 'staff';
  title: string;
  created_at: number;
  updated_at: number;
  message_count?: number;
}

export function listSessions() {
  return request<DBSession[]>('/sessions');
}

export function createSession(role: 'resident' | 'staff', title?: string) {
  return request<DBSession>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ role, title }),
  });
}

export function deleteSession(id: string) {
  return request<void>(`/sessions/${id}`, { method: 'DELETE' });
}

export function renameSession(id: string, title: string) {
  return request<DBSession>(`/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

// ─── 消息管理 ────────────────────────────────────────────────────
export interface DBMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string | null;
  ai_response: import('../store/useAppStore').AIResponse | null;
  attachments: { name: string; type: string; url: string }[] | null;
  created_at: number;
}

export function getSessionMessages(sessionId: string) {
  return request<DBMessage[]>(`/sessions/${sessionId}/messages`);
}

// ─── AI 对话 ─────────────────────────────────────────────────────
export interface SendMessageResult {
  user_message_id: string;
  ai_message_id: string;
  ai_response: import('../store/useAppStore').AIResponse;
}

export function sendMessage(
  session_id: string,
  content: string,
  attachments?: { name: string; type: string; url: string }[],
) {
  return request<SendMessageResult>('/chat', {
    method: 'POST',
    body: JSON.stringify({ session_id, content, attachments }),
  });
}
