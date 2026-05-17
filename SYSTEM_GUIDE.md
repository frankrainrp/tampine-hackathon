# Smart Service Agent (SSSA) — 系统启动说明与测试账号

> **Smart Service Agent** 是一款基于 AI 大模型的智能公共服务协同终端，
> 集成 DeepSeek 大模型、SQLite 数据库持久化与毛玻璃 UI 设计。

---

## 📋 目录

1. [环境要求](#环境要求)
2. [快速启动](#快速启动)
3. [测试账号](#测试账号)
4. [环境变量配置](#环境变量配置)
5. [功能概览](#功能概览)
6. [API 接口列表](#api-接口列表)
7. [常见问题](#常见问题)

---

## 环境要求

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| **Node.js** | v20+ | 需支持 `--env-file` 标志 |
| **npm** | v9+ | 用于安装依赖 |
| **浏览器** | Chrome / Edge (最新) | 语音输入需 Web Speech API |

---

## 快速启动

### 1. 安装依赖

```bash
cd SSSUI
npm install
```

### 2. 配置环境变量

复制示例配置文件：

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`，填入您的 AI API Key：

```env
# ─── AI 大模型配置 ───
API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx   # 必填：您的 DeepSeek API Key
API_BASE_URL=https://api.deepseek.com/v1
API_MODEL=deepseek-chat

# ─── 服务配置 ───
PORT=3001
NODE_ENV=development
```

> ⚠️ **安全提醒**：请勿将含有真实 API Key 的 `.env` 文件提交到 Git！

### 3. 一键启动（前后端并行）

```bash
npm run dev:all
```

启动成功后将看到：

```
╔═══════════════════════════════════════╗
║   Smart Service Agent — Backend API   ║
╠═══════════════════════════════════════╣
║  Server  : http://localhost:3001      ║
║  Frontend: http://localhost:5173      ║
╚═══════════════════════════════════════╝
```

### 4. 打开浏览器

访问 **http://localhost:5173/**，使用下方测试账号登录。

---

## 测试账号

### 居民账号（Resident）

| 用户名 | 密码 | 显示名称 | 说明 |
|--------|------|----------|------|
| `resident` | `resident123` | Test Resident | 🧑 快速测试账号（推荐） |
| `zhangwei` | `Zhang@2026` | 张伟 | 👤 中文居民测试 |
| `limei` | `LiMei@2026` | 李梅 | 👩 中文居民测试 |
| `wangfang` | `Wang@2026` | 王芳 | 👧 中文居民测试 |

### 工作人员账号（Staff）

| 用户名 | 密码 | 显示名称 | 说明 |
|--------|------|----------|------|
| `admin` | `Admin@2026` | 系统管理员 | 👨‍💼 管理员账号（推荐） |
| `staff` | `staff123` | Test Staff | 👩‍💼 快速测试账号 |
| `chenliang` | `Chen@2026` | 陈亮 | 🧑‍💻 工作人员测试 |

> 💡 **快速登录**：登录页面底部有 **「居民」** 和 **「管理员」** 快捷按钮，
> 点击即可自动填充对应的测试账号信息。

---

## 环境变量配置

文件路径：`server/.env`

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `API_KEY` | ✅ | — | DeepSeek / OpenAI 兼容 API Key |
| `API_BASE_URL` | ❌ | `https://api.deepseek.com/v1` | API 基础地址 |
| `API_MODEL` | ❌ | `deepseek-chat` | 模型名称 |
| `PORT` | ❌ | `3001` | 后端服务端口 |
| `NODE_ENV` | ❌ | `development` | 运行环境 |

---

## 功能概览

### 🔐 用户认证
- 用户名 + 密码登录
- 两种角色：居民（Resident）/ 工作人员（Staff）
- SHA-256 密码哈希存储
- 错误登录提示（用户名不存在 / 密码错误）

### 💬 AI 对话
- 集成 DeepSeek 大模型，返回 5W1H 结构化响应
- 支持多轮对话（上下文记忆最近 10 条）
- **快捷按钮**：AI 回复底部的操作按钮点击后自动发送对应 prompt
- API 不可用时自动降级为 Mock 模式

### 🎤 语音输入
- 基于 Web Speech API 的实时语音识别
- 默认中文（zh-CN），同时自动识别英文
- 录音时按钮显示红色脉冲动画
- 不支持的浏览器自动隐藏按钮

### 📝 聊天历史 CRUD
- **创建**：新建对话会自动创建 session
- **读取**：侧边栏加载历史对话列表，点击恢复完整消息记录
- **更新**：右键菜单 → 重命名会话标题
- **删除**：右键菜单 → 删除会话（级联删除所有消息）

### 📎 文件附件
- 拖拽或点击上传文件
- 附件信息随消息一起存储到数据库

---

## API 接口列表

### 认证 `/api/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/auth/login` | 用户登录 |
| `GET` | `/api/auth/users` | 用户列表（仅开发环境） |

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 服务状态 + AI 配置检测 |
| `GET` | `/api/chat/test` | 真实调用 API 验证连通性 |

### 会话 `/api/sessions`

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/sessions` | 列出所有会话 |
| `POST` | `/api/sessions` | 创建新会话 |
| `PATCH` | `/api/sessions/:id` | 更新会话标题 |
| `DELETE` | `/api/sessions/:id` | 删除会话 |
| `GET` | `/api/sessions/:id/messages` | 获取会话消息 |

### 对话 `/api/chat`

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/chat` | 发送消息并获取 AI 响应 |
| `GET` | `/api/chat/models` | 查看当前模型配置 |
| `GET` | `/api/chat/test` | API 连通性测试 |

---

## 常见问题

### Q: 登录时提示 "用户名不存在"？
确认使用上方测试账号表中的用户名（区分大小写），或点击登录页底部的快捷填充按钮。

### Q: AI 回复全是 Mock 内容？
检查 `server/.env` 中的 `API_KEY` 是否已填入有效的 DeepSeek Key。
可以访问 `http://localhost:3001/api/chat/test` 验证连通性。

### Q: 右上角状态灯是黄色/灰色？
- **灰色**：后端未启动，运行 `npm run dev:all`
- **黄色**：后端在线但 AI Key 未配置
- **绿色**：一切正常

### Q: 语音输入按钮看不到？
语音输入依赖 Web Speech API，目前仅 Chrome / Edge 完整支持。
Firefox 和 Safari 不支持此功能，按钮会自动隐藏。

### Q: 如何重置数据库？
删除 `server/data/sssa.db` 文件后重启服务，系统会自动重建表结构并插入种子数据。

```bash
rm server/data/sssa.db*
npm run dev:all
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React + TypeScript + Vite |
| **状态管理** | Zustand |
| **动画** | Framer Motion |
| **后端** | Express.js (Node 20+) |
| **数据库** | SQLite (better-sqlite3, WAL 模式) |
| **AI 模型** | DeepSeek Chat (OpenAI 兼容接口) |
| **语音** | Web Speech API (SpeechRecognition) |

---

*最后更新：2026-05-17*
