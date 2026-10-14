import { Conversation, Message, User, UserSettings, AppStatus, GeneratedImage, ImageGeneratePayload } from '../types.js';

const TOKEN_KEY = 'booai_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Status
  async getStatus(): Promise<AppStatus> {
    const res = await fetch('/api/status');
    return res.json();
  },

  // Auth
  async register(data: { email: string; username: string; password: string; name?: string }) {
    return request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: { identifier: string; password: string }) {
    return request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async continueAsGuest() {
    return request<{ user: User; token: string }>('/api/auth/guest', {
      method: 'POST',
    });
  },

  async getMe() {
    return request<{ user: User }>('/api/auth/me');
  },

  async logout() {
    try {
      await request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    } finally {
      setStoredToken(null);
    }
  },

  // Chats
  async getChats(search?: string) {
    const query = search ? `?q=${encodeURIComponent(search)}` : '';
    return request<{ chats: Conversation[] }>(`/api/chats${query}`);
  },

  async createChat(title?: string, model?: string) {
    return request<{ chat: Conversation }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({ title, model }),
    });
  },

  async getChat(chatId: string) {
    return request<{ chat: Conversation; messages: Message[] }>(`/api/chats/${chatId}`);
  },

  async updateChat(chatId: string, updates: { title?: string; isPinned?: boolean; model?: string }) {
    return request<{ chat: Conversation }>(`/api/chats/${chatId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async deleteChat(chatId: string) {
    return request<{ success: boolean }>(`/api/chats/${chatId}`, {
      method: 'DELETE',
    });
  },

  // Settings
  async getSettings() {
    return request<{ settings: UserSettings }>('/api/settings');
  },

  async updateSettings(settings: Partial<UserSettings>) {
    return request<{ settings: UserSettings }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // AI Image Generation
  async generateImage(payload: ImageGeneratePayload) {
    return request<{ success: boolean; images: GeneratedImage[] }>('/api/images/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getGeneratedImages() {
    return request<{ images: GeneratedImage[] }>('/api/images');
  },

  async deleteGeneratedImage(id: string) {
    return request<{ success: boolean }>(`/api/images/${id}`, {
      method: 'DELETE',
    });
  },

  // Stream user message
  streamMessage(
    chatId: string,
    content: string,
    callbacks: {
      onUserMessage?: (msg: Message) => void;
      onDelta?: (text: string) => void;
      onDone?: (msg: Message) => void;
      onStopped?: (msg: Message) => void;
      onError?: (err: string) => void;
    },
    signal?: AbortSignal
  ) {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content }),
      signal,
    })
      .then(async response => {
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Response body stream not available');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (data.type === 'user_message' && callbacks.onUserMessage) {
                  callbacks.onUserMessage(data.message);
                } else if (data.type === 'delta' && callbacks.onDelta) {
                  callbacks.onDelta(data.text);
                } else if (data.type === 'done' && callbacks.onDone) {
                  callbacks.onDone(data.message);
                } else if (data.type === 'stopped' && callbacks.onStopped) {
                  callbacks.onStopped(data.message);
                } else if (data.type === 'error' && callbacks.onError) {
                  callbacks.onError(data.error);
                }
              } catch {
                // Ignore parse error on chunk boundary
              }
            }
          }
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          // aborted by user
          return;
        }
        if (callbacks.onError) {
          callbacks.onError(err.message || 'Stream connection error');
        }
      });
  },

  // Regenerate message stream
  regenerateMessage(
    chatId: string,
    callbacks: {
      onDelta?: (text: string) => void;
      onDone?: (msg: Message) => void;
      onStopped?: (msg: Message) => void;
      onError?: (err: string) => void;
    },
    signal?: AbortSignal
  ) {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(`/api/chats/${chatId}/regenerate`, {
      method: 'POST',
      headers,
      signal,
    })
      .then(async response => {
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Response body stream not available');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (data.type === 'delta' && callbacks.onDelta) {
                  callbacks.onDelta(data.text);
                } else if (data.type === 'done' && callbacks.onDone) {
                  callbacks.onDone(data.message);
                } else if (data.type === 'stopped' && callbacks.onStopped) {
                  callbacks.onStopped(data.message);
                } else if (data.type === 'error' && callbacks.onError) {
                  callbacks.onError(data.error);
                }
              } catch {
                // Ignore chunk parse error
              }
            }
          }
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        if (callbacks.onError) {
          callbacks.onError(err.message || 'Stream connection error');
        }
      });
  },
};
