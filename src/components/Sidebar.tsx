import React, { useState } from 'react';
import {
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Edit2,
  Check,
  X,
  MessageSquare,
  Sparkles,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  Wand2,
} from 'lucide-react';
import { Conversation } from '../types.js';
import { Logo } from './Logo.js';
import { useAuth } from '../context/AuthContext.js';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Conversation[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onRenameChat: (chatId: string, newTitle: string) => Promise<void>;
  onTogglePinChat: (chatId: string, isPinned: boolean) => Promise<void>;
  onDeleteChat: (chatId: string) => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenImageGenerator?: () => void;
  isImageGeneratorActive?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onTogglePinChat,
  onDeleteChat,
  onOpenSettings,
  onOpenAuth,
  onOpenImageGenerator,
  isImageGeneratorActive = false,
}) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.lastMessageSnippet && chat.lastMessageSnippet.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pinnedChats = filteredChats.filter(c => c.isPinned);
  const recentChats = filteredChats.filter(c => !c.isPinned);

  const handleStartRename = (e: React.MouseEvent, chat: Conversation) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveRename = async (e: React.MouseEvent | React.KeyboardEvent, chatId: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      await onRenameChat(chatId, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
  };

  const renderChatItem = (chat: Conversation) => {
    const isActive = chat.id === activeChatId;
    const isEditing = editingChatId === chat.id;

    return (
      <div
        key={chat.id}
        onClick={() => {
          if (!isEditing) {
            onSelectChat(chat.id);
            if (window.innerWidth < 1024) onClose();
          }
        }}
        className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium cursor-pointer transition-all ${
          isActive
            ? 'bg-gradient-to-r from-pink-500/15 to-purple-500/15 text-neutral-900 dark:text-white font-semibold border border-pink-500/30 dark:border-pink-500/40 shadow-xs'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-1">
          {chat.isPinned ? (
            <Pin className="h-3.5 w-3.5 text-pink-500 flex-shrink-0" />
          ) : (
            <MessageSquare className="h-3.5 w-3.5 text-neutral-400 group-hover:text-pink-500 flex-shrink-0 transition-colors" />
          )}

          {isEditing ? (
            <div
              className="flex items-center gap-1 flex-1 min-w-0"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename(e, chat.id);
                  if (e.key === 'Escape') setEditingChatId(null);
                }}
                autoFocus
                className="w-full bg-white dark:bg-neutral-900 px-2 py-0.5 rounded text-xs text-neutral-900 dark:text-neutral-100 border border-pink-500 focus:outline-none"
              />
              <button
                onClick={(e) => handleSaveRename(e, chat.id)}
                className="p-1 hover:text-emerald-500"
                title="Save"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleCancelRename}
                className="p-1 hover:text-rose-500"
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <span className="truncate">{chat.title}</span>
          )}
        </div>

        {/* Action icons on hover */}
        {!isEditing && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 flex-shrink-0 transition-opacity">
            <button
              onClick={(e) => handleStartRename(e, chat)}
              className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 rounded"
              title="Rename"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePinChat(chat.id, !chat.isPinned);
              }}
              className={`p-1 rounded hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 ${
                chat.isPinned
                  ? 'text-pink-500 hover:text-pink-600'
                  : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
              title={chat.isPinned ? 'Unpin conversation' : 'Pin conversation'}
            >
              {chat.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat.id);
              }}
              className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 rounded"
              title="Delete conversation"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-neutral-200/80 bg-neutral-50/95 dark:border-neutral-800/80 dark:bg-neutral-900/95 backdrop-blur-md transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding & Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200/60 dark:border-neutral-800/60">
          <Logo size="md" showTagline={true} />
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-800 lg:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Top Action Buttons */}
        <div className="p-3 space-y-2">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-pink-500/20 hover:from-pink-600 hover:via-rose-600 hover:to-purple-700 active:scale-[0.99] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
          </button>

          {onOpenImageGenerator && (
            <button
              onClick={() => {
                onOpenImageGenerator();
                if (window.innerWidth < 1024) onClose();
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold border transition-all ${
                isImageGeneratorActive
                  ? 'bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-purple-500/15 border-pink-500/40 text-pink-600 dark:text-pink-300 shadow-xs'
                  : 'border-neutral-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Wand2 className="h-3.5 w-3.5 text-pink-500" />
                <span>AI Image Generator</span>
              </div>
              <span className="rounded-md bg-gradient-to-r from-pink-500 to-purple-500 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                Studio
              </span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-neutral-200/60 dark:bg-neutral-800/60 py-1.5 pl-8 pr-7 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-pink-500/60 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
          {/* Pinned section */}
          {pinnedChats.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                <Pin className="h-3 w-3 text-pink-500" />
                <span>Pinned</span>
              </div>
              <div className="space-y-0.5">
                {pinnedChats.map(renderChatItem)}
              </div>
            </div>
          )}

          {/* Recent section */}
          <div>
            {pinnedChats.length > 0 && (
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Recent Chats
              </div>
            )}
            {recentChats.length > 0 ? (
              <div className="space-y-0.5">
                {recentChats.map(renderChatItem)}
              </div>
            ) : pinnedChats.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-neutral-400 dark:text-neutral-500">
                {searchQuery ? (
                  <p>No conversations matching &quot;{searchQuery}&quot;</p>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Sparkles className="h-6 w-6 text-pink-400/60" />
                    <p>No conversations yet.</p>
                    <p className="text-[11px] text-neutral-400">Start talking to BOO AI!</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Bottom User Area */}
        <div className="p-3 border-t border-neutral-200/60 dark:border-neutral-800/60 bg-white/50 dark:bg-neutral-900/50">
          {user ? (
            <div className="flex items-center justify-between rounded-xl p-2 bg-neutral-100/70 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: user.avatarColor || '#ec4899' }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                    {user.isGuest ? 'Guest' : `@${user.username}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={onOpenSettings}
                  aria-label="Settings"
                  className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-700/60 transition-colors"
                  title="Settings"
                >
                  <SettingsIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={async () => {
                    await logout();
                  }}
                  aria-label="Sign out"
                  className="rounded-lg p-1.5 text-neutral-500 hover:text-rose-500 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-700/60 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={onOpenAuth}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-300 border border-pink-200 dark:border-pink-800/50 px-3 py-2 text-xs font-semibold hover:bg-pink-100 dark:hover:bg-pink-900/40 transition-colors"
              >
                Sign In / Sign Up
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
