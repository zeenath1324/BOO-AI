import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { ChatMessage } from './components/ChatMessage.js';
import { ChatInput } from './components/ChatInput.js';
import { AuthModal } from './components/AuthModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { DeleteConfirmModal } from './components/DeleteConfirmModal.js';
import { ImageGenerator } from './components/ImageGenerator.js';
import { useAuth } from './context/AuthContext.js';
import { api } from './services/api.js';
import { Conversation, Message } from './types.js';

export default function App() {
  const { user, isLoading: isAuthLoading, continueAsGuest } = useAuth();

  // App State
  const [viewMode, setViewMode] = useState<'chat' | 'image-generator'>('chat');
  const [chats, setChats] = useState<Conversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deleteTargetChatId, setDeleteTargetChatId] = useState<string | null>(null);
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Load user chats
  const fetchChats = useCallback(async () => {
    if (!user) {
      setChats([]);
      return;
    }
    try {
      const res = await api.getChats();
      setChats(res.chats);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    }
  }, [user]);

  // Load chats on user change
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Load messages when activeChatId changes
  useEffect(() => {
    if (!activeChatId || !user) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    api
      .getChat(activeChatId)
      .then((res) => {
        if (isMounted) {
          setMessages(res.messages);
          if (res.chat.model) {
            setSelectedModel(res.chat.model);
          }
          setTimeout(() => scrollToBottom('auto'), 50);
        }
      })
      .catch((err) => {
        console.error('Failed to load chat messages:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [activeChatId, user]);

  // Scroll down when new messages or chunks arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('smooth');
    }
  }, [messages.length, isStreaming]);

  // Handle New Chat
  const handleNewChat = () => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
    setViewMode('chat');
    setActiveChatId(null);
    setMessages([]);
    setInput('');
  };

  // Ensure an authenticated session exists (if not, auto-create guest session)
  const ensureAuthenticated = async () => {
    if (!user) {
      await continueAsGuest();
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || input).trim();
    if (!content || isStreaming) return;

    setInput('');

    try {
      await ensureAuthenticated();

      let currentChatId = activeChatId;

      // If no active chat, create one now
      if (!currentChatId) {
        const titleSnippet = content.slice(0, 30);
        const title = titleSnippet.length < content.length ? `${titleSnippet}...` : titleSnippet;
        const newChatRes = await api.createChat(title, selectedModel);
        currentChatId = newChatRes.chat.id;
        setActiveChatId(currentChatId);
        setChats((prev) => [newChatRes.chat, ...prev]);
      }

      // Optimistic user message in UI
      const tempUserMsg: Message = {
        id: `temp-${Date.now()}`,
        chatId: currentChatId,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };

      // Empty assistant placeholder message for streaming
      const tempAssistantMsg: Message = {
        id: `temp-assistant-${Date.now()}`,
        chatId: currentChatId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempUserMsg, tempAssistantMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      api.streamMessage(
        currentChatId,
        content,
        {
          onUserMessage: (savedUserMsg) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempUserMsg.id ? savedUserMsg : m))
            );
          },
          onDelta: (textChunk) => {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + textChunk },
                ];
              }
              return prev;
            });
          },
          onDone: (savedAssistantMsg) => {
            setMessages((prev) => [
              ...prev.slice(0, -1),
              savedAssistantMsg,
            ]);
            setIsStreaming(false);
            fetchChats();
          },
          onStopped: (stoppedMsg) => {
            setMessages((prev) => [
              ...prev.slice(0, -1),
              stoppedMsg,
            ]);
            setIsStreaming(false);
            fetchChats();
          },
          onError: (errMsg) => {
            setMessages((prev) => [
              ...prev.slice(0, -1),
              {
                id: `err-${Date.now()}`,
                chatId: currentChatId!,
                role: 'assistant',
                content: errMsg,
                createdAt: new Date().toISOString(),
                error: true,
              },
            ]);
            setIsStreaming(false);
          },
        },
        controller.signal
      );
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setIsStreaming(false);
    }
  };

  // Stop generating
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  // Regenerate last response
  const handleRegenerate = () => {
    if (!activeChatId || isStreaming || messages.length === 0) return;

    // Pop the last assistant message
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;

    // Remove the current assistant message from UI
    setMessages((prev) => prev.filter((_, idx) => idx !== prev.length - 1));

    const tempAssistantMsg: Message = {
      id: `temp-regen-${Date.now()}`,
      chatId: activeChatId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempAssistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    api.regenerateMessage(
      activeChatId,
      {
        onDelta: (textChunk) => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + textChunk },
              ];
            }
            return prev;
          });
        },
        onDone: (savedMsg) => {
          setMessages((prev) => [...prev.slice(0, -1), savedMsg]);
          setIsStreaming(false);
          fetchChats();
        },
        onStopped: (stoppedMsg) => {
          setMessages((prev) => [...prev.slice(0, -1), stoppedMsg]);
          setIsStreaming(false);
          fetchChats();
        },
        onError: (errMsg) => {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              id: `err-${Date.now()}`,
              chatId: activeChatId!,
              role: 'assistant',
              content: errMsg,
              createdAt: new Date().toISOString(),
              error: true,
            },
          ]);
          setIsStreaming(false);
        },
      },
      controller.signal
    );
  };

  // Rename chat
  const handleRenameChat = async (chatId: string, newTitle: string) => {
    try {
      const res = await api.updateChat(chatId, { title: newTitle });
      setChats((prev) => prev.map((c) => (c.id === chatId ? res.chat : c)));
    } catch (err) {
      console.error('Failed to rename chat:', err);
    }
  };

  // Pin/Unpin chat
  const handleTogglePinChat = async (chatId: string, isPinned: boolean) => {
    try {
      const res = await api.updateChat(chatId, { isPinned });
      setChats((prev) =>
        prev
          .map((c) => (c.id === chatId ? res.chat : c))
          .sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          })
      );
    } catch (err) {
      console.error('Failed to pin/unpin chat:', err);
    }
  };

  // Delete chat confirmation flow
  const handleDeleteChatRequest = (chatId: string) => {
    setDeleteTargetChatId(chatId);
  };

  const handleConfirmDeleteChat = async () => {
    if (!deleteTargetChatId) return;
    setIsDeletingChat(true);
    try {
      await api.deleteChat(deleteTargetChatId);
      setChats((prev) => prev.filter((c) => c.id !== deleteTargetChatId));
      if (activeChatId === deleteTargetChatId) {
        setActiveChatId(null);
        setMessages([]);
      }
      setDeleteTargetChatId(null);
    } catch (err) {
      console.error('Failed to delete chat:', err);
    } finally {
      setIsDeletingChat(false);
    }
  };

  const activeChat = chats.find((c) => c.id === activeChatId);
  const deleteTargetChat = chats.find((c) => c.id === deleteTargetChatId);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors">
      {/* ChatGPT-style collapsible sidebar */}
      {/* ChatGPT-style collapsible sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          setActiveChatId(id);
          setViewMode('chat');
        }}
        onNewChat={handleNewChat}
        onRenameChat={handleRenameChat}
        onTogglePinChat={handleTogglePinChat}
        onDeleteChat={handleDeleteChatRequest}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenImageGenerator={() => setViewMode('image-generator')}
        isImageGeneratorActive={viewMode === 'image-generator'}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onNewChat={handleNewChat}
          isStreaming={isStreaming}
          selectedModel={selectedModel}
          onSelectModel={async (model) => {
            setSelectedModel(model);
            if (activeChatId) {
              await api.updateChat(activeChatId, { model }).catch(console.error);
            }
          }}
        />

        {/* Dynamic View: AI Image Studio or Chat Workspace */}
        {viewMode === 'image-generator' ? (
          <ImageGenerator
            onBackToChat={() => setViewMode('chat')}
            onSendToChat={(promptText) => {
              setViewMode('chat');
              setInput(promptText);
            }}
          />
        ) : (
          <>
            {/* Chat / Welcome Area */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {messages.length === 0 ? (
                <WelcomeScreen
                  onSelectPrompt={(suggestedPrompt) => {
                    setInput(suggestedPrompt);
                    handleSendMessage(suggestedPrompt);
                  }}
                />
              ) : (
                <div className="flex-1 py-4">
                  {messages.map((msg, index) => (
                    <ChatMessage
                      key={msg.id || index}
                      message={msg}
                      isStreaming={isStreaming && index === messages.length - 1 && msg.role === 'assistant'}
                      canRegenerate={index === messages.length - 1 && msg.role === 'assistant'}
                      onRegenerate={handleRegenerate}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Bottom Input Area */}
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={() => handleSendMessage()}
              onStop={handleStopGenerating}
              onOpenImageGenerator={() => setViewMode('image-generator')}
              isStreaming={isStreaming}
              disabled={isAuthLoading}
            />
          </>
        )}
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={() => {
          fetchChats();
        }}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deleteTargetChatId)}
        chatTitle={deleteTargetChat?.title || 'this conversation'}
        onConfirm={handleConfirmDeleteChat}
        onCancel={() => setDeleteTargetChatId(null)}
        isDeleting={isDeletingChat}
      />
    </div>
  );
}
