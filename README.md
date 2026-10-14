# 💗 BOO AI — Your AI. Your World. Your BOO.

> *"Hey there! 💗 I'm BOO AI. What can I help you with today?"*

**BOO AI** is an original, intelligent conversational AI assistant platform inspired by modern interfaces like ChatGPT. Built with a sleek, premium design featuring subtle pink and purple accents, high-performance streaming AI responses, persistent conversation history, context-aware memory, full authentication, and customizable AI personas.

---

## ✨ Features

- **Real AI Intelligence**: Powered by Google's latest `gemini-3.8-flash` model via `@google/genai` TypeScript SDK (free-tier default model with high tokens/sec and reasoning capabilities).
- **Live SSE Streaming & Stop Control**: Real-time word-by-word streaming using Server-Sent Events (SSE) with instantaneous user response and cancel/stop-generating control.
- **Context-Aware Memory**: Multi-turn conversation context preserved across every chat session.
- **Full Chat Management**:
  - **Create**: Instant new chat with clean slate.
  - **Auto-Naming**: Smart conversation titles based on initial message content.
  - **Rename**: Edit any conversation title inline with one click.
  - **Search**: Real-time filtering across titles and message previews.
  - **Pin / Unpin**: Keep critical conversations sticky at the top of the sidebar.
  - **Delete**: Safe conversation deletion with confirmation modal.
- **User Authentication**:
  - Sign Up with email, username, and name.
  - Login with email or username.
  - Instant **1-Click Guest Mode** for trying BOO AI immediately without signup.
  - Persistent session tokens and secure password hashing via `crypto.scryptSync`.
- **Markdown & Code Syntax Highlighting**:
  - GitHub-flavored Markdown rendering (tables, bold, lists, quotes).
  - Code syntax blocks with language badge and 1-click **Copy Code** button.
  - Copy entire assistant response button.
  - **Regenerate Response** button to get a fresh take from BOO AI.
- **Light & Dark Mode**:
  - Seamless toggle with persistent localStorage theme state and system preference detection.
- **User Settings & Persona Customization**:
  - **AI Personalities**: Friendly 💗, Concise ⚡, Creative 🎨, Analytical 🔬, Humorous 😄.
  - **Custom Instructions (System Prompt)**: Inject your custom preferences into all conversations.
  - **Temperature / Creativity Slider**: Tune model variability from focused (0.1) to creative (1.0).
  - **Model Selector**: Switch between `gemini-3.8-flash` and `gemini-3.1-flash-lite`.
  - **System & Database Status**: Live dashboard showing database type (MongoDB or Persistent Local JSON), stored message metrics, and Gemini connectivity.
- **Database Persistence**:
  - Out of the box: Embedded, robust atomic JSON storage at `data/db.json` with zero external setup needed.
  - Production ready: Native MongoDB support by setting `MONGODB_URI`.
- **AI Image Generation Studio**:
  - Dedicated creative studio workspace accessible from sidebar or chat input.
  - Generates real, full-resolution artwork from natural text prompts.
  - **Artistic Styles**: Realistic, Anime, 3D Render, Cartoon, Digital Art, Watercolor, Cinematic, or Raw Direct.
  - **Aspect Ratios**: Square (`1:1`), Portrait (`9:16`, `3:4`), Landscape (`16:9`, `4:3`).
  - **Variations**: Generate 1, 2, or 4 image variations at once.
  - **Engines Supported**:
    - **BOO Flux Engine** (Default, 100% Free, High Quality, No Extra Setup or Paid Key required).
    - **Google Gemini Flash Image (`gemini-3.1-flash-lite-image`)** (Requires Google Cloud billing enabled; on free tier Google allocates 0 quota for image models).
  - **Image Actions**: Download Image, Copy Prompt, Remix / Generate Again, Lightbox full-screen view.
  - **Image History**: All creations are automatically saved to user history with database persistence.
  - **Rate Limiting**: Integrated sliding-window rate limiter (10 requests/min) to prevent abuse.
- **Friendly Error Handling**:
  - Helpful banners and step-by-step guidance when the AI API key, quota, or database is unavailable.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, React-Markdown, Remark-GFM
- **Backend**: Node.js, Express, tsx
- **AI Engine**: Google GenAI TypeScript SDK (`@google/genai`)
- **Database**: Local JSON File Storage (`data/db.json`) + Optional MongoDB native driver

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ installed on your machine
- A Google Gemini API Key (free tier available at [Google AI Studio](https://aistudio.google.com/))

### 2. Environment Configuration
Create or configure your `.env` file based on `.env.example`:

```env
# Required for real AI conversations
GEMINI_API_KEY="your-gemini-api-key"

# Optional: MongoDB connection string
# If omitted, BOO AI will use data/db.json automatically
MONGODB_URI="mongodb://localhost:27017/booai"

# Port (default 3000)
PORT="3000"
```

### 3. Running Locally

```bash
# Install dependencies
npm install

# Start the full-stack development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 📡 API Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | System health check, database status, and Gemini status |
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Log in with email/username and password |
| `POST` | `/api/auth/guest` | Instant guest session creation |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/auth/logout` | Invalidate current user session |
| `GET` | `/api/chats` | List all user conversations (supports `?q=search`) |
| `POST` | `/api/chats` | Create new conversation |
| `GET` | `/api/chats/:id` | Fetch conversation and message history |
| `PATCH` | `/api/chats/:id` | Rename title or pin/unpin conversation |
| `DELETE` | `/api/chats/:id` | Delete conversation and messages |
| `POST` | `/api/chats/:id/messages` | Send message and stream AI response via SSE |
| `POST` | `/api/chats/:id/regenerate` | Regenerate response for latest message via SSE |
| `GET` | `/api/settings` | Get user custom instructions & preferences |
| `PUT` | `/api/settings` | Update user custom instructions & preferences |
| `POST` | `/api/images/generate` | Generate AI artwork with prompt, style, ratio, engine |
| `GET` | `/api/images` | Fetch user's persistent generated image history |
| `DELETE` | `/api/images/:id` | Remove image from user's creation history |

---

## 🔒 Security Best Practices

1. **No Client-Side Secrets**: `GEMINI_API_KEY` is kept purely server-side in Node.js and never leaked in client bundles or network responses.
2. **Timing-Safe Password Verification**: Password verification uses constant-time comparison (`crypto.timingSafeEqual`) to prevent timing attacks.
3. **Graceful Fallback**: If MongoDB is unreachable, BOO AI falls back to the persistent local JSON store automatically so users never experience downtime.

---

## 💗 Brand & License
BOO AI &copy; 2026. "Your AI. Your World. Your BOO."
