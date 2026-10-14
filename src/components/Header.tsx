import React from 'react';
import {
  Menu,
  Sun,
  Moon,
  Settings as SettingsIcon,
  User as UserIcon,
  Sparkles,
  LogOut,
  Plus,
} from 'lucide-react';
import { Logo } from './Logo.js';
import { useTheme } from '../context/ThemeContext.js';
import { useAuth } from '../context/AuthContext.js';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onNewChat: () => void;
  isStreaming: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenSettings,
  onOpenAuth,
  onNewChat,
  isStreaming,
  selectedModel,
  onSelectModel,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-neutral-200/80 bg-white/80 px-3 md:px-5 backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-900/80 transition-colors">
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation sidebar"
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800/80 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-pink-50 hover:text-pink-600 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-pink-400 border border-neutral-200/60 dark:border-neutral-700/60 transition-all"
          title="Start a new chat"
        >
          <Plus className="h-3.5 w-3.5 text-pink-500" />
          <span className="hidden sm:inline">New Chat</span>
        </button>

        <div className="hidden lg:flex items-center gap-2 pl-2">
          <Logo size="sm" />
        </div>
      </div>

      {/* Model Selector pill in center */}
      <div className="flex items-center gap-1.5 rounded-full bg-neutral-100/90 dark:bg-neutral-800/90 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700/70">
        <Sparkles className="h-3.5 w-3.5 text-pink-500 animate-pulse" />
        <select
          value={selectedModel}
          onChange={(e) => onSelectModel(e.target.value)}
          disabled={isStreaming}
          aria-label="Select AI model"
          className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-1 disabled:opacity-50"
        >
          <option value="gemini-3.8-flash" className="dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
            BOO 3.8 Flash (Fast & Smart)
          </option>
          <option value="gemini-3.1-flash-lite" className="dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
            BOO 3.1 Lite (Ultra Fast)
          </option>
        </select>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-neutral-700" />}
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          aria-label="Open settings"
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
          title="Settings & System Status"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>

        {/* Auth / Profile button */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 rounded-full p-1 pl-1.5 pr-2.5 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 transition-colors"
            >
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-bold"
                style={{ backgroundColor: user.avatarColor || '#ec4899' }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline max-w-[90px] truncate text-neutral-800 dark:text-neutral-200">
                {user.name}
              </span>
            </button>

            {showUserDropdown && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowUserDropdown(false)}
                />
                <div className="absolute right-0 mt-2 z-40 w-48 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {user.isGuest ? 'Guest User' : `@${user.username}`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenSettings();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <SettingsIcon className="h-3.5 w-3.5" />
                    Settings
                  </button>
                  <button
                    onClick={async () => {
                      setShowUserDropdown(false);
                      await logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-pink-600 hover:to-purple-700 transition-all"
          >
            <UserIcon className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
