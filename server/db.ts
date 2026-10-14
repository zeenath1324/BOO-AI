import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MongoClient, Db } from 'mongodb';
import { User, UserSession, Conversation, Message, UserSettings, GeneratedImage } from './types.js';

interface DatabaseSchema {
  users: User[];
  sessions: UserSession[];
  chats: Conversation[];
  messages: Message[];
  settings: Record<string, UserSettings>;
  images: GeneratedImage[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

class DatabaseManager {
  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private isMongoConnected = false;
  private localData: DatabaseSchema = {
    users: [],
    sessions: [],
    chats: [],
    messages: [],
    settings: {},
    images: [],
  };
  private saveTimeout: NodeJS.Timeout | null = null;

  private mongoNote: string = '';

  constructor() {
    this.initLocal();
    this.initMongo();
  }

  private initLocal() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.localData = {
          users: parsed.users || [],
          sessions: parsed.sessions || [],
          chats: parsed.chats || [],
          messages: parsed.messages || [],
          settings: parsed.settings || {},
          images: parsed.images || [],
        };
      } else {
        this.saveLocalSync();
      }
    } catch (err) {
      console.warn('[DB] Could not load local db.json, initializing fresh store:', err);
    }
  }

  private async initMongo() {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) {
      this.mongoNote = 'Persistent local JSON storage active';
      return;
    }

    // Check for unconfigured MongoDB connection string placeholders
    if (
      uri.includes('<db_password>') ||
      uri.includes('<password>') ||
      uri.includes('<PASSWORD>') ||
      uri.includes('YOUR_PASSWORD') ||
      uri.includes('MY_MONGODB_URI')
    ) {
      this.isMongoConnected = false;
      this.mongoNote = 'MONGODB_URI contains <db_password> placeholder. Using persistent local JSON storage.';
      console.log('[DB] Notice: MONGODB_URI contains placeholder "<db_password>". Local persistent JSON storage is active.');
      return;
    }

    try {
      this.mongoClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
      });
      await this.mongoClient.connect();
      this.mongoDb = this.mongoClient.db('booai');
      this.isMongoConnected = true;
      this.mongoNote = 'Connected to MongoDB Atlas';
      console.log('[DB] Successfully connected to MongoDB Atlas');
    } catch (err: any) {
      this.isMongoConnected = false;
      const cleanMsg = err?.message?.replace(/[\r\n]+/g, ' ').slice(0, 100) || 'Connection failed';
      this.mongoNote = `MongoDB connection unavailable (${cleanMsg}). Using persistent local JSON storage.`;
      console.log(`[DB] Notice: MongoDB unavailable (${cleanMsg}). Using persistent local JSON storage.`);
    }
  }

  private saveLocal() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveLocalSync();
    }, 200);
  }

  private saveLocalSync() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.localData, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('[DB] Failed to save local db:', err);
    }
  }

  public getStatus() {
    const rawUri = process.env.MONGODB_URI?.trim();
    const hasPlaceholder = Boolean(
      rawUri &&
      (rawUri.includes('<db_password>') ||
        rawUri.includes('<password>') ||
        rawUri.includes('YOUR_PASSWORD'))
    );

    return {
      type: this.isMongoConnected ? 'MongoDB Atlas' : 'Local Persistent JSON',
      connected: true,
      mongoActive: this.isMongoConnected,
      mongoNote: this.mongoNote,
      hasPlaceholder,
      usersCount: this.localData.users.length,
      chatsCount: this.localData.chats.length,
      messagesCount: this.localData.messages.length,
      imagesCount: this.localData.images.length,
    };
  }

  // --- Users ---
  public async getUserById(id: string): Promise<User | null> {
    if (this.isMongoConnected && this.mongoDb) {
      const u = await this.mongoDb.collection('users').findOne({ id });
      if (u) return u as unknown as User;
    }
    return this.localData.users.find(u => u.id === id) || null;
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    if (this.isMongoConnected && this.mongoDb) {
      const u = await this.mongoDb.collection('users').findOne({ email: normalized });
      if (u) return u as unknown as User;
    }
    return this.localData.users.find(u => u.email.toLowerCase() === normalized) || null;
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    const normalized = username.toLowerCase().trim();
    if (this.isMongoConnected && this.mongoDb) {
      const u = await this.mongoDb.collection('users').findOne({ username: normalized });
      if (u) return u as unknown as User;
    }
    return this.localData.users.find(u => u.username.toLowerCase() === normalized) || null;
  }

  public async createUser(userData: {
    email: string;
    username: string;
    name: string;
    passwordHash?: string;
    isGuest?: boolean;
  }): Promise<User> {
    const colors = ['#ec4899', '#a855f7', '#8b5cf6', '#d946ef', '#f43f5e'];
    const user: User = {
      id: crypto.randomUUID(),
      email: userData.email.toLowerCase().trim(),
      username: userData.username.trim(),
      name: userData.name.trim(),
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
      passwordHash: userData.passwordHash,
      isGuest: userData.isGuest || false,
      createdAt: new Date().toISOString(),
    };

    if (this.isMongoConnected && this.mongoDb) {
      await this.mongoDb.collection('users').insertOne(user as any);
    }
    this.localData.users.push(user);
    this.saveLocal();
    return user;
  }

  // --- Sessions ---
  public async createSession(userId: string): Promise<UserSession> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    const session: UserSession = {
      token,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    if (this.isMongoConnected && this.mongoDb) {
      await this.mongoDb.collection('sessions').insertOne(session as any);
    }
    this.localData.sessions.push(session);
    this.saveLocal();
    return session;
  }

  public async getSession(token: string): Promise<UserSession | null> {
    if (this.isMongoConnected && this.mongoDb) {
      const s = await this.mongoDb.collection('sessions').findOne({ token });
      if (s) {
        if (new Date((s as any).expiresAt) < new Date()) return null;
        return s as unknown as UserSession;
      }
    }
    const session = this.localData.sessions.find(s => s.token === token);
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) return null;
    return session;
  }

  public async deleteSession(token: string): Promise<void> {
    if (this.isMongoConnected && this.mongoDb) {
      await this.mongoDb.collection('sessions').deleteOne({ token });
    }
    this.localData.sessions = this.localData.sessions.filter(s => s.token !== token);
    this.saveLocal();
  }

  // --- Conversations ---
  public async getChats(userId: string, search?: string): Promise<Conversation[]> {
    let chats: Conversation[] = [];
    if (this.isMongoConnected && this.mongoDb) {
      chats = (await this.mongoDb.collection('chats').find({ userId }).sort({ updatedAt: -1 }).toArray()) as unknown as Conversation[];
    } else {
      chats = this.localData.chats.filter(c => c.userId === userId);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      chats = chats.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.lastMessageSnippet && c.lastMessageSnippet.toLowerCase().includes(q))
      );
    }

    // Sort pinned to top, then most recently updated
    return chats.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  public async getChat(chatId: string, userId: string): Promise<Conversation | null> {
    if (this.isMongoConnected && this.mongoDb) {
      const chat = await this.mongoDb.collection('chats').findOne({ id: chatId, userId });
      if (chat) return chat as unknown as Conversation;
    }
    return this.localData.chats.find(c => c.id === chatId && c.userId === userId) || null;
  }

  public async createChat(userId: string, title?: string, model?: string): Promise<Conversation> {
    const chat: Conversation = {
      id: crypto.randomUUID(),
      userId,
      title: title || 'New Conversation',
      isPinned: false,
      model: model || 'gemini-3.8-flash',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageSnippet: '',
    };

    if (this.isMongoConnected && this.mongoDb) {
      await this.mongoDb.collection('chats').insertOne(chat as any);
    }
    this.localData.chats.unshift(chat);
    this.saveLocal();
    return chat;
  }

  public async updateChat(
    chatId: string,
    userId: string,
    updates: Partial<Pick<Conversation, 'title' | 'isPinned' | 'lastMessageSnippet' | 'model'>>
  ): Promise<Conversation | null> {
    const now = new Date().toISOString();
    const chatIndex = this.localData.chats.findIndex(c => c.id === chatId && c.userId === userId);
    if (chatIndex === -1) return null;

    const updated = {
      ...this.localData.chats[chatIndex],
      ...updates,
      updatedAt: now,
    };
    this.localData.chats[chatIndex] = updated;

    if (this.isMongoConnected && this.mongoDb) {
      await this.mongoDb.collection('chats').updateOne(
        { id: chatId, userId },
        { $set: { ...updates, updatedAt: now } }
      );
    }

    this.saveLocal();
    return updated;
  }

  public async deleteChat(chatId: string, userId: string): Promise<boolean> {
    const chatIndex = this.localData.chats.findIndex(c => c.id === chatId && c.userId === userId);
    if (chatIndex === -1) return false;

    this.localData.chats.splice(chatIndex, 1);
    this.localData.messages = this.localData.messages.filter(m => m.chatId !== chatId);

    if (this.isMongoConnected && this.mongoDb) {
      await this.mongoDb.collection('chats').deleteOne({ id: chatId, userId });
      await this.mongoDb.collection('messages').deleteMany({ chatId });
    }

    this.saveLocal();
    return true;
  }

  // --- Messages ---
  public async getMessages(chatId: string): Promise<Message[]> {
    if (this.isMongoConnected && this.mongoDb) {
      const msgs = await this.mongoDb
        .collection('messages')
        .find({ chatId })
        .sort({ createdAt: 1 })
        .toArray();
      return msgs as unknown as Message[];
    }
    return this.localData.messages
      .filter(m => m.chatId === chatId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public async addMessage(
    chatId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    error?: boolean
  ): Promise<Message> {
    const message: Message = {
      id: crypto.randomUUID(),
      chatId,
      role,
      content,
      createdAt: new Date().toISOString(),
      error,
    };

    if (this.isMongoConnected && this.mongoDb) {
      await this.mongoDb.collection('messages').insertOne(message as any);
    }
    this.localData.messages.push(message);

    // Update snippet in conversation
    const snippet = content.length > 70 ? content.slice(0, 67) + '...' : content;
    const chat = this.localData.chats.find(c => c.id === chatId);
    if (chat) {
      chat.lastMessageSnippet = snippet;
      chat.updatedAt = message.createdAt;
      if (this.isMongoConnected && this.mongoDb) {
        await this.mongoDb.collection('chats').updateOne(
          { id: chatId },
          { $set: { lastMessageSnippet: snippet, updatedAt: message.createdAt } }
        );
      }
    }

    this.saveLocal();
    return message;
  }

  public async updateMessageContent(messageId: string, content: string): Promise<void> {
    const msg = this.localData.messages.find(m => m.id === messageId);
    if (msg) {
      msg.content = content;
      if (this.isMongoConnected && this.mongoDb) {
        await this.mongoDb.collection('messages').updateOne({ id: messageId }, { $set: { content } });
      }
      this.saveLocal();
    }
  }

  public async deleteMessagesAfter(chatId: string, messageId: string): Promise<void> {
    const msgs = this.localData.messages.filter(m => m.chatId === chatId);
    const targetIdx = msgs.findIndex(m => m.id === messageId);
    if (targetIdx !== -1) {
      const idsToRemove = new Set(msgs.slice(targetIdx).map(m => m.id));
      this.localData.messages = this.localData.messages.filter(m => !idsToRemove.has(m.id));

      if (this.isMongoConnected && this.mongoDb) {
        await this.mongoDb.collection('messages').deleteMany({ id: { $in: Array.from(idsToRemove) } });
      }
      this.saveLocal();
    }
  }

  // --- Settings ---
  public async getSettings(userId: string): Promise<UserSettings> {
    const defaultSettings: UserSettings = {
      userId,
      theme: 'dark',
      systemPrompt: 'You are BOO AI, a smart, warm, and helpful AI assistant. Always be kind, concise, and helpful.',
      temperature: 0.7,
      aiPersonality: 'friendly',
      defaultModel: 'gemini-3.8-flash',
      enableMarkdown: true,
    };

    if (this.isMongoConnected && this.mongoDb) {
      const s = await this.mongoDb.collection('settings').findOne({ userId });
      if (s) return { ...defaultSettings, ...(s as any) };
    }

    return this.localData.settings[userId] || defaultSettings;
  }

  public async updateSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings(userId);
    const updated: UserSettings = {
      ...current,
      ...updates,
      userId,
    };

    if (this.isMongoConnected && this.mongoDb) {
      await this.mongoDb.collection('settings').updateOne(
        { userId },
        { $set: updated },
        { upsert: true }
      );
    }
    this.localData.settings[userId] = updated;
    this.saveLocal();
    return updated;
  }

  // --- Generated Images ---
  public async saveGeneratedImage(image: GeneratedImage): Promise<GeneratedImage> {
    if (this.isMongoConnected && this.mongoDb) {
      await this.mongoDb.collection('images').insertOne(image as any);
    }
    this.localData.images.unshift(image);
    this.saveLocal();
    return image;
  }

  public async getGeneratedImages(userId: string): Promise<GeneratedImage[]> {
    if (this.isMongoConnected && this.mongoDb) {
      const imgs = await this.mongoDb
        .collection('images')
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
      return imgs as unknown as GeneratedImage[];
    }
    return this.localData.images
      .filter((img) => img.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async deleteGeneratedImage(id: string, userId: string): Promise<boolean> {
    const idx = this.localData.images.findIndex((img) => img.id === id && img.userId === userId);
    if (idx === -1) return false;

    this.localData.images.splice(idx, 1);
    if (this.isMongoConnected && this.mongoDb) {
      await this.mongoDb.collection('images').deleteOne({ id, userId });
    }
    this.saveLocal();
    return true;
  }
}

export const db = new DatabaseManager();
