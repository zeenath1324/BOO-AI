import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import {
  hashPassword,
  verifyPassword,
  authenticateToken,
  optionalAuthenticateToken,
  AuthenticatedRequest,
} from './server/auth.js';
import { streamChatResponse, isGeminiConfigured } from './server/gemini.js';
import { generateImages, checkRateLimit } from './server/images.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// API Status & Health Check
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    app: 'BOO AI',
    tagline: 'Your AI. Your World. Your BOO.',
    status: 'online',
    geminiConfigured: isGeminiConfigured(),
    database: db.getStatus(),
    timestamp: new Date().toISOString(),
  });
});

// --- Auth Routes ---
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password, name } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existingEmail = await db.getUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const existingUsername = await db.getUserByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ error: 'This username is already taken.' });
    }

    const passwordHash = hashPassword(password);
    const user = await db.createUser({
      email,
      username,
      name: name || username,
      passwordHash,
      isGuest: false,
    });

    const session = await db.createSession(user.id);
    const { passwordHash: _, ...safeUser } = user;

    res.status(201).json({ user: safeUser, token: session.token });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier (email or username) and password are required.' });
    }

    let user = await db.getUserByEmail(identifier);
    if (!user) {
      user = await db.getUserByUsername(identifier);
    }

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email/username or password.' });
    }

    const session = await db.createSession(user.id);
    const { passwordHash: _, ...safeUser } = user;

    res.json({ user: safeUser, token: session.token });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

app.post('/api/auth/guest', async (_req: Request, res: Response) => {
  try {
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const user = await db.createUser({
      email: `guest_${randSuffix}@booai.local`,
      username: `boo_guest_${randSuffix}`,
      name: `Guest Friend`,
      isGuest: true,
    });

    const session = await db.createSession(user.id);
    const { passwordHash: _, ...safeUser } = user;

    res.status(201).json({ user: safeUser, token: session.token });
  } catch (err: any) {
    console.error('Guest creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to start guest session.' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { passwordHash: _, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

app.post('/api/auth/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await db.deleteSession(token);
  }
  res.json({ success: true });
});

// --- Chat Conversations ---
app.get('/api/chats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.q as string | undefined;
    const chats = await db.getChats(req.user!.id, search);
    res.json({ chats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, model } = req.body;
    const chat = await db.createChat(req.user!.id, title, model);
    res.status(201).json({ chat });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chats/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const chat = await db.getChat(req.params.id, req.user!.id);
    if (!chat) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    const messages = await db.getMessages(chat.id);
    res.json({ chat, messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/chats/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, isPinned, model } = req.body;
    const updated = await db.updateChat(req.params.id, req.user!.id, {
      ...(title !== undefined && { title }),
      ...(isPinned !== undefined && { isPinned }),
      ...(model !== undefined && { model }),
    });

    if (!updated) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    res.json({ chat: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chats/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await db.deleteChat(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Chat Messages with SSE Streaming ---
app.post('/api/chats/:id/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { content, model: requestedModel } = req.body;
  const chatId = req.params.id;
  const userId = req.user!.id;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content cannot be empty.' });
  }

  const chat = await db.getChat(chatId, userId);
  if (!chat) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  // Save the user's message
  const userMsg = await db.addMessage(chatId, 'user', content.trim());

  // Auto-generate title if it's the first message and title is default
  if (chat.title === 'New Conversation') {
    const firstSnippet = content.trim().slice(0, 32);
    const newTitle = firstSnippet.length < content.trim().length ? `${firstSnippet}...` : firstSnippet;
    await db.updateChat(chatId, userId, { title: newTitle });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send the saved user message ID
  res.write(`data: ${JSON.stringify({ type: 'user_message', message: userMsg })}\n\n`);

  // Check if Gemini is configured
  if (!isGeminiConfigured()) {
    const errText =
      "⚠️ **GEMINI_API_KEY is not configured.**\n\nTo enable live responses, please add your Gemini API Key in the **Secrets** panel in AI Studio.";
    const assistantMsg = await db.addMessage(chatId, 'assistant', errText, true);
    res.write(`data: ${JSON.stringify({ type: 'delta', text: errText })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMsg })}\n\n`);
    res.end();
    return;
  }

  let fullResponse = '';
  const assistantMsg = await db.addMessage(chatId, 'assistant', '');

  // Detect client abort / stop generation
  let isAborted = false;
  req.on('close', () => {
    isAborted = true;
  });

  try {
    const settings = await db.getSettings(userId);
    const allMessages = await db.getMessages(chatId);

    // Stream from Gemini
    for await (const chunk of streamChatResponse(
      allMessages,
      settings,
      requestedModel || chat.model || 'gemini-3.8-flash'
    )) {
      if (isAborted) break;
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ type: 'delta', text: chunk })}\n\n`);
    }

    if (!isAborted) {
      await db.updateMessageContent(assistantMsg.id, fullResponse);
      assistantMsg.content = fullResponse;
      res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMsg })}\n\n`);
    } else {
      await db.updateMessageContent(assistantMsg.id, fullResponse + ' [Stopped]');
      assistantMsg.content = fullResponse + ' [Stopped]';
      res.write(`data: ${JSON.stringify({ type: 'stopped', message: assistantMsg })}\n\n`);
    }
  } catch (err: any) {
    console.error('Error during chat stream:', err);
    const errorMessage = `⚠️ Error communicating with BOO AI: ${err.message || 'Please try again.'}`;
    fullResponse += (fullResponse ? '\n\n' : '') + errorMessage;
    await db.updateMessageContent(assistantMsg.id, fullResponse);
    res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
  } finally {
    res.end();
  }
});

// Regenerate response for the latest user message
app.post('/api/chats/:id/regenerate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const chatId = req.params.id;
  const userId = req.user!.id;

  const chat = await db.getChat(chatId, userId);
  if (!chat) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  const messages = await db.getMessages(chatId);
  if (messages.length === 0) {
    return res.status(400).json({ error: 'No messages to regenerate.' });
  }

  // Remove the last assistant message if exists
  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role === 'assistant') {
    await db.deleteMessagesAfter(chatId, lastMsg.id);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!isGeminiConfigured()) {
    const errText =
      "⚠️ **GEMINI_API_KEY is not configured.**\n\nPlease add your Gemini API Key in the **Secrets** panel in AI Studio.";
    const assistantMsg = await db.addMessage(chatId, 'assistant', errText, true);
    res.write(`data: ${JSON.stringify({ type: 'delta', text: errText })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMsg })}\n\n`);
    res.end();
    return;
  }

  let fullResponse = '';
  const assistantMsg = await db.addMessage(chatId, 'assistant', '');

  let isAborted = false;
  req.on('close', () => {
    isAborted = true;
  });

  try {
    const settings = await db.getSettings(userId);
    const updatedMessages = await db.getMessages(chatId);

    for await (const chunk of streamChatResponse(
      updatedMessages.slice(0, -1), // exclude the empty assistant message just added
      settings,
      chat.model || 'gemini-3.8-flash'
    )) {
      if (isAborted) break;
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ type: 'delta', text: chunk })}\n\n`);
    }

    if (!isAborted) {
      await db.updateMessageContent(assistantMsg.id, fullResponse);
      assistantMsg.content = fullResponse;
      res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMsg })}\n\n`);
    } else {
      await db.updateMessageContent(assistantMsg.id, fullResponse + ' [Stopped]');
      assistantMsg.content = fullResponse + ' [Stopped]';
      res.write(`data: ${JSON.stringify({ type: 'stopped', message: assistantMsg })}\n\n`);
    }
  } catch (err: any) {
    console.error('Error during regenerate stream:', err);
    const errorMessage = `⚠️ Error communicating with BOO AI: ${err.message || 'Please try again.'}`;
    fullResponse += (fullResponse ? '\n\n' : '') + errorMessage;
    await db.updateMessageContent(assistantMsg.id, fullResponse);
    res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
  } finally {
    res.end();
  }
});

// --- User Settings ---
app.get('/api/settings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await db.getSettings(req.user!.id);
    res.json({ settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await db.updateSettings(req.user!.id, req.body);
    res.json({ settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI Image Generation Routes ---
app.post('/api/images/generate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  // Rate limiting check
  const rateLimitResult = checkRateLimit(userId);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      error: `Rate limit reached. Please wait ${rateLimitResult.retryAfter || 10} seconds before generating more images.`,
      retryAfter: rateLimitResult.retryAfter,
    });
  }

  const { prompt, style, aspectRatio, provider, variations } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Please provide a valid image description prompt.' });
  }

  if (prompt.trim().length > 1000) {
    return res.status(400).json({ error: 'Prompt is too long (maximum 1000 characters).' });
  }

  try {
    const images = await generateImages(userId, {
      prompt: prompt.trim(),
      style,
      aspectRatio,
      provider,
      variations: Number(variations) || 1,
    });

    res.status(201).json({ success: true, images });
  } catch (err: any) {
    console.error('Image generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate image. Please try again.' });
  }
});

app.get('/api/images', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const images = await db.getGeneratedImages(req.user!.id);
    res.json({ images });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/images/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await db.deleteGeneratedImage(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: 'Image not found.' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Vite Middleware / Static Server ---
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌸 BOO AI Server running at http://0.0.0.0:${PORT} [${isDev ? 'development' : 'production'}]`);
  });
}

startServer();
