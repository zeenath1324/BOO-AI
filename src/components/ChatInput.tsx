import React, { useRef, useEffect } from 'react';
import { ArrowUp, Square, Wand2 } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onOpenImageGenerator?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  onOpenImageGenerator,
  isStreaming,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height up to 200px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && input.trim() && !disabled) {
        onSend();
      }
    }
  };

  return (
    <div className="w-full bg-gradient-to-t from-white via-white/95 to-transparent dark:from-neutral-950 dark:via-neutral-950/95 dark:to-transparent px-3 sm:px-6 pt-2 pb-4 sm:pb-6 transition-colors">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex flex-col w-full rounded-2xl border border-neutral-300/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-md shadow-pink-500/5 focus-within:border-pink-500/80 focus-within:ring-2 focus-within:ring-pink-500/20 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Message BOO AI... (Enter to send, Shift + Enter for new line)"
            className="w-full resize-none bg-transparent px-4 py-3.5 pr-14 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none disabled:opacity-50 max-h-[180px]"
          />

          <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
            <div className="flex items-center gap-2">
              {onOpenImageGenerator && (
                <button
                  type="button"
                  onClick={onOpenImageGenerator}
                  className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:text-pink-600 hover:bg-pink-50 dark:text-neutral-400 dark:hover:text-pink-400 dark:hover:bg-pink-950/40 border border-neutral-200/70 dark:border-neutral-800 transition-colors"
                  title="Generate images with AI"
                >
                  <Wand2 className="h-3.5 w-3.5 text-pink-500" />
                  <span className="hidden sm:inline">Image Studio</span>
                </button>
              )}
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 hidden md:inline">
                Your AI. Your World. Your BOO.
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {isStreaming ? (
                <button
                  onClick={onStop}
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl bg-neutral-900 dark:bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-xs"
                  title="Stop generating"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  onClick={onSend}
                  disabled={!input.trim() || disabled}
                  type="button"
                  aria-label="Send message"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-xs disabled:opacity-30 disabled:cursor-not-allowed hover:from-pink-600 hover:to-purple-700 active:scale-95 transition-all"
                  title="Send message"
                >
                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
          BOO AI can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
};
