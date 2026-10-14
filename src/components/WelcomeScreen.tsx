import React from 'react';
import {
  Sparkles,
  Code2,
  Lightbulb,
  Compass,
  PenTool,
  Heart,
  ArrowRight,
} from 'lucide-react';

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectPrompt }) => {
  const suggestions = [
    {
      icon: <Lightbulb className="h-4 w-4 text-amber-500" />,
      title: 'Brainstorm ideas',
      desc: 'Creative concepts for an aesthetic coffee shop brand',
      prompt: 'Help me brainstorm unique concepts, brand values, and signature drinks for an aesthetic modern coffee shop.',
    },
    {
      icon: <Code2 className="h-4 w-4 text-purple-500" />,
      title: 'Write & debug code',
      desc: 'Build a reusable custom React hook for debounce',
      prompt: 'Write a clean TypeScript React hook for debouncing input values with an explanation and example.',
    },
    {
      icon: <Compass className="h-4 w-4 text-pink-500" />,
      title: 'Plan & organize',
      desc: 'A relaxed 3-day weekend itinerary in Kyoto',
      prompt: 'Create a cozy and relaxed 3-day itinerary for visiting Kyoto in autumn, focusing on peaceful temples, gardens, and cafes.',
    },
    {
      icon: <PenTool className="h-4 w-4 text-rose-500" />,
      title: 'Draft creative content',
      desc: 'A warm welcome email for a new community member',
      prompt: 'Draft an engaging, friendly, and warm welcome email for new members joining a design and tech community.',
    },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 max-w-4xl mx-auto w-full">
      {/* Hero Badge & Mascot */}
      <div className="relative mb-6">
        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-pink-500/20 via-rose-500/20 to-purple-500/20 blur-xl"></div>
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 text-white shadow-xl shadow-pink-500/25 ring-2 ring-white/30 dark:ring-white/10 animate-subtle-bounce">
          <span className="text-3xl select-none">💗</span>
        </div>
      </div>

      {/* Brand Title & Tagline */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100/80 dark:bg-pink-950/50 border border-pink-200 dark:border-pink-800 text-xs font-semibold text-pink-700 dark:text-pink-300">
          <Sparkles className="h-3 w-3" />
          <span>Next-Gen Conversational Intelligence</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-neutral-900 via-pink-600 to-purple-600 dark:from-white dark:via-pink-400 dark:to-purple-300 bg-clip-text text-transparent">
          BOO AI
        </h1>

        <p className="text-sm md:text-base font-semibold text-neutral-600 dark:text-neutral-300 tracking-wide">
          &ldquo;Your AI. Your World. Your BOO.&rdquo;
        </p>

        <p className="text-sm md:text-base text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto pt-2">
          Hey there! 💗 I&apos;m <span className="font-semibold text-pink-500">BOO AI</span>. What can I help you with today?
        </p>
      </div>

      {/* Suggestion prompt cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {suggestions.map((item, index) => (
          <button
            key={index}
            onClick={() => onSelectPrompt(item.prompt)}
            className="group flex flex-col text-left p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 hover:border-pink-500/40 dark:hover:border-pink-500/40 shadow-xs hover:shadow-md hover:shadow-pink-500/5 transition-all"
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {item.title}
                </span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2">
              {item.desc}
            </p>
          </button>
        ))}
      </div>

      {/* Subtle feature tags */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
        <span className="flex items-center gap-1">
          <Heart className="h-3 w-3 text-pink-400" /> Context Aware Memory
        </span>
        <span>•</span>
        <span>Markdown & Code Highlighting</span>
        <span>•</span>
        <span>Persistent Cloud History</span>
      </div>
    </div>
  );
};
