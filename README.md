# 🏢 Smart Service Agent

AI-Powered Public Service Terminal — 基于 DeepSeek V4 Flash 的智能公共服务终端

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite + Framer Motion
- **Backend (Local)**: Express + SQLite (better-sqlite3)
- **Backend (Vercel)**: Vercel Serverless Functions + In-Memory Store
- **AI Model**: DeepSeek V4 Flash (`deepseek-v4-flash`)
- **State**: Zustand

---

## 🚀 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp server/.env.example server/.env
# 编辑 server/.env，填入你的 DeepSeek API Key

# 3. 启动前后端（并行）
npm run dev:all
```

- 前端: http://localhost:5173
- 后端 API: http://localhost:3001

---

## ☁️ Vercel 部署（一键部署）

### 步骤 1: 推送到 GitHub

```bash
git add .
git commit -m "feat: vercel deployment ready"
git push origin main
```

### 步骤 2: 在 Vercel 导入项目

1. 打开 [vercel.com](https://vercel.com) → **Add New Project**
2. 选择你的 GitHub 仓库
3. Framework Preset 会自动检测为 **Vite**
4. 点击 **Deploy**

### 步骤 3: 配置环境变量

在 Vercel Dashboard → **Settings** → **Environment Variables** 中添加：

| 变量名 | 值 | 说明 |
|--------|------|------|
| `API_BASE_URL` | `https://api.deepseek.com/v1` | DeepSeek API 地址 |
| `API_KEY` | `sk-你的密钥` | DeepSeek API 密钥 |
| `API_MODEL` | `deepseek-v4-flash` | 模型名称 |

> ⚠️ **重要**: `API_KEY` 千万不要提交到 Git！已在 `.gitignore` 中排除。

### 步骤 4: 重新部署

添加完环境变量后，点击 **Redeploy** 使其生效。

---

## 📂 项目结构

```
├── api/                    # Vercel Serverless Functions
│   ├── lib/store.js        #   内存数据存储（替代 SQLite）
│   ├── auth/               #   登录认证
│   ├── chat/               #   AI 对话
│   ├── sessions/           #   会话管理
│   └── health.js           #   健康检查
├── server/                 # 本地 Express 后端（开发用）
│   ├── .env                #   环境变量（不提交 Git）
│   ├── db.js               #   SQLite 数据库
│   ├── routes/             #   路由
│   └── data/               #   数据库文件
├── src/                    # React 前端
│   ├── api/client.ts       #   API 客户端
│   ├── components/         #   UI 组件
│   ├── pages/              #   页面
│   └── store/              #   Zustand 状态
├── vercel.json             # Vercel 部署配置
└── vite.config.ts          # Vite 配置（含开发代理）
```

---

## 🔑 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `resident` | `resident123` | 居民 |
| `staff` | `staff123` | 工作人员 |
| `admin` | `Admin@2026` | 管理员 |
