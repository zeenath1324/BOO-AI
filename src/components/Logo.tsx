import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showTagline = false,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-9 h-9 text-base',
    lg: 'w-12 h-12 text-xl',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* BOO AI Mascot Badge */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 text-white font-bold shadow-md shadow-pink-500/20 ring-1 ring-white/20 select-none flex-shrink-0 transition-transform hover:scale-105`}
      >
        {/* Subtle cute ghost/heart face */}
        <span className="tracking-tighter">💗</span>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span
            className={`${textSizes[size]} font-extrabold tracking-tight bg-gradient-to-r from-neutral-900 via-pink-600 to-purple-600 dark:from-white dark:via-pink-400 dark:to-purple-300 bg-clip-text text-transparent`}
          >
            BOO AI
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200/50 dark:border-pink-800/50">
            PRO
          </span>
        </div>
        {showTagline && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium tracking-tight">
            Your AI. Your World. Your BOO.
          </span>
        )}
      </div>
    </div>
  );
};
