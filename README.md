# ✦ NexusAI — Claude Chatbot with Node.js Backend

A full-stack AI chatbot powered by Claude, with a proper Node.js backend to avoid CORS issues.

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set your API key
Open `.env` and replace `your_api_key_here`:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```
Get your key at: https://console.anthropic.com

### 3. Start the server
```bash
node server.js
```
Or for development (auto-restart):
```bash
npm run dev
```

### 4. Open in browser
```
http://localhost:3000
```

---

## 📁 Project Structure
```
nexusai/
├── server.js          ← Node.js Express backend
├── .env               ← Your API key (keep secret!)
├── .env.example       ← Template for .env
├── package.json       ← Dependencies
├── .gitignore         ← Excludes node_modules & .env
└── public/
    └── index.html     ← Full frontend chatbot UI
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check server + API key status |
| POST | `/api/chat/stream` | Streaming chat (SSE) |
| POST | `/api/chat` | Non-streaming chat |

### POST `/api/chat/stream`
```json
{
  "messages": [{ "role": "user", "content": "Hello!" }],
  "system": "You are a helpful assistant."
}
```

## ⚙️ Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | **Required.** Your Anthropic API key |
| `PORT` | `3000` | Server port |
| `ALLOWED_ORIGIN` | `*` | CORS origin |

## 🌐 Deploy to Production
- **Railway**: `railway up`
- **Render**: Connect GitHub repo, set env vars
- **VPS**: `node server.js` behind nginx
