import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  User as UserIcon,
} from 'lucide-react';
import { Message } from '../types.js';
import { useAuth } from '../context/AuthContext.js';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  canRegenerate?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  onRegenerate,
  canRegenerate = false,
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const isUser = message.role === 'user';

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleCopyCode = async (code: string, blockId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeId(blockId);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div
      className={`group w-full py-4 px-3 sm:px-6 transition-colors ${
        isUser
          ? 'bg-transparent'
          : 'bg-neutral-100/50 dark:bg-neutral-900/40 border-y border-neutral-200/40 dark:border-neutral-800/40'
      }`}
    >
      <div className="max-w-3xl mx-auto flex items-start gap-3 sm:gap-4">
        {/* Avatar badge */}
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white text-xs font-bold shadow-xs select-none"
              style={{ backgroundColor: user?.avatarColor || '#a855f7' }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
            </div>
          ) : (
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 text-white shadow-xs ring-1 ring-pink-500/30 select-none">
              <span className="text-xs">💗</span>
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Header label */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              {isUser ? user?.name || 'You' : 'BOO AI'}
            </span>

            {/* Time or actions */}
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopyMessage}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors"
                title="Copy entire response"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-500 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {!isUser && canRegenerate && onRegenerate && !isStreaming && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-neutral-400 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40 transition-colors"
                  title="Regenerate this response"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          {message.error ? (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs">
              <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="markdown-body flex-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              </div>
            </div>
          ) : isUser ? (
            <div className="text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          ) : (
            <div className="markdown-body text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed space-y-2">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code(props) {
                    const { children, className, ...rest } = props;
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match && !String(children).includes('\n');
                    const codeString = String(children).replace(/\n$/, '');
                    const blockId = `code-${Math.random().toString(36).substring(2, 9)}`;

                    if (isInline) {
                      return (
                        <code
                          className="px-1.5 py-0.5 rounded-md bg-pink-500/10 dark:bg-pink-500/15 text-pink-600 dark:text-pink-300 text-xs font-mono font-medium"
                          {...rest}
                        >
                          {children}
                        </code>
                      );
                    }

                    const lang = match ? match[1] : 'code';
                    const isCopied = copiedCodeId === blockId;

                    return (
                      <div className="relative my-3 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-900 text-neutral-100 shadow-sm">
                        <div className="flex items-center justify-between px-3.5 py-1.5 bg-neutral-950 border-b border-neutral-800 text-[11px] font-mono text-neutral-400">
                          <span className="uppercase tracking-wider font-semibold text-pink-400">
                            {lang}
                          </span>
                          <button
                            onClick={() => handleCopyCode(codeString, blockId)}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                            title="Copy code"
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy code</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed bg-neutral-900/90">
                          <code {...rest}>{children}</code>
                        </pre>
                      </div>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>

              {/* Streaming typing cursor */}
              {isStreaming && (
                <div className="inline-flex items-center gap-1.5 pt-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-pink-500 animate-boo-pulse-1" />
                  <span className="inline-block h-2 w-2 rounded-full bg-purple-500 animate-boo-pulse-2" />
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-400 animate-boo-pulse-3" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
