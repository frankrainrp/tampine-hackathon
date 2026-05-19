import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 初始化路由
import authRouter from './routes/auth.js';
import sessionsRouter from './routes/sessions.js';
import chatRouter from './routes/chat.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();

// ─── 中间件 ────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── 请求日志 ──────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── 路由注册 ──────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/chat', chatRouter);

// ─── 健康检查 ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
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
});

// ─── 404 处理 ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ ok: false, error: `Route not found: ${req.method} ${req.path}` });
});

// ─── 全局错误处理 ──────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ ok: false, error: err.message });
});

// ─── 启动服务器 ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔═══════════════════════════════════════╗`);
  console.log(`║   Smart Service Agent — Backend API   ║`);
  console.log(`╠═══════════════════════════════════════╣`);
  console.log(`║  Server  : http://localhost:${PORT}      ║`);
  console.log(`║  Frontend: http://localhost:5173      ║`);
  console.log(`╚═══════════════════════════════════════╝\n`);
});
