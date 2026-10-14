export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarColor?: string;
  passwordHash?: string;
  isGuest?: boolean;
  createdAt: string;
}

export interface UserSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  error?: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  isPinned: boolean;
  model: string;
  createdAt: string;
  updatedAt: string;
  lastMessageSnippet?: string;
}

export interface UserSettings {
  userId: string;
  theme: 'dark' | 'light' | 'system';
  systemPrompt: string;
  temperature: number;
  aiPersonality: 'friendly' | 'concise' | 'creative' | 'analytical' | 'humorous';
  defaultModel: string;
  enableMarkdown: boolean;
}

export interface GeneratedImage {
  id: string;
  userId: string;
  prompt: string;
  enhancedPrompt: string;
  style: string;
  aspectRatio: '1:1' | '9:16' | '16:9' | '3:4' | '4:3';
  provider: 'boo-flux' | 'gemini-image';
  imageUrl: string;
  width: number;
  height: number;
  createdAt: string;
}

