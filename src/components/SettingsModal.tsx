import React, { useState, useEffect } from 'react';
import {
  X,
  Sun,
  Moon,
  Sliders,
  Database,
  Bot,
  Save,
  Check,
  Server,
} from 'lucide-react';
import { UserSettings, AppStatus } from '../types.js';
import { useTheme } from '../context/ThemeContext.js';
import { api } from '../services/api.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'system'>('general');
  const [personality, setPersonality] = useState<UserSettings['aiPersonality']>('friendly');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [defaultModel, setDefaultModel] = useState('gemini-3.8-flash');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getSettings().then((res) => {
        if (res.settings) {
          setPersonality(res.settings.aiPersonality || 'friendly');
          setSystemPrompt(res.settings.systemPrompt || '');
          setTemperature(res.settings.temperature ?? 0.7);
          setDefaultModel(res.settings.defaultModel || 'gemini-3.8-flash');
        }
      }).catch(console.error);

      api.getStatus().then(setAppStatus).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateSettings({
        aiPersonality: personality,
        systemPrompt,
        temperature,
        defaultModel,
        theme,
      });
      setSaveSuccess(true);
      if (onSettingsSaved) onSettingsSaved();
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const personalities = [
    { id: 'friendly', name: 'Friendly', icon: '💗', desc: 'Warm, encouraging, and supportive' },
    { id: 'concise', name: 'Concise', icon: '⚡', desc: 'Direct, focused, and minimal fluff' },
    { id: 'creative', name: 'Creative', icon: '🎨', desc: 'Expressive, colorful, and poetic' },
    { id: 'analytical', name: 'Analytical', icon: '🔬', desc: 'Deep logic, STEM-oriented, structured' },
    { id: 'humorous', name: 'Humorous', icon: '😄', desc: 'Playful, charming, and witty' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-pink-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              BOO AI Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings modal"
            className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 px-5 bg-neutral-50 dark:bg-neutral-900/50">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'general'
                ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'ai'
                ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            AI Persona
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'system'
                ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Database & System
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Theme Appearance
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-semibold border transition-all ${
                      theme === 'light'
                        ? 'border-pink-500 bg-pink-50/50 text-pink-600 dark:bg-pink-950/20'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>Light Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-semibold border transition-all ${
                      theme === 'dark'
                        ? 'border-pink-500 bg-pink-950/20 text-pink-400'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <Moon className="h-4 w-4 text-purple-400" />
                    <span>Dark Mode</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Default AI Model
                </label>
                <select
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
                >
                  <option value="gemini-3.8-flash">BOO 3.8 Flash (Recommended - Fast, Smart & Free)</option>
                  <option value="gemini-3.1-flash-lite">BOO 3.1 Flash Lite (Ultra Lightweight)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Creativity / Temperature: {temperature}
                  </label>
                  <span className="text-[10px] text-neutral-400">
                    {temperature <= 0.3 ? 'Focused' : temperature >= 0.8 ? 'Creative' : 'Balanced'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  BOO AI Personality
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {personalities.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPersonality(p.id as any)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                        personality === p.id
                          ? 'border-pink-500 bg-pink-50/50 dark:bg-pink-950/20'
                          : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      <span className="text-base select-none">{p.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                          {p.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Custom Instructions (System Prompt)
                </label>
                <textarea
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Tell BOO AI how you would like it to respond (e.g. 'I am a web developer who likes clean TypeScript and concise bullet points')..."
                  className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    <Database className="h-4 w-4 text-pink-500" />
                    Storage Provider
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {appStatus?.database.type || 'Persistent Storage'}
                  </span>
                </div>

                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Conversations stored:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">{appStatus?.database.chatsCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Messages stored:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">{appStatus?.database.messagesCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Registered users:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">{appStatus?.database.usersCount ?? 0}</span>
                  </div>
                </div>

                {appStatus?.database.hasPlaceholder && (
                  <div className="mt-2 rounded-lg bg-pink-50/70 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-800/40 p-2 text-[11px] text-pink-700 dark:text-pink-300 leading-relaxed">
                    💡 <strong>Tip:</strong> Your <code>MONGODB_URI</code> contains an unreplaced <code>&lt;db_password&gt;</code> placeholder. When you update it with your real Atlas password, BOO AI will automatically connect to MongoDB Atlas. Until then, your conversations are reliably saved in local persistent storage.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    <Bot className="h-4 w-4 text-purple-500" />
                    Gemini AI Model API
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      appStatus?.geminiConfigured
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        appStatus?.geminiConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    {appStatus?.geminiConfigured ? 'Live & Connected' : 'Checking Config'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Powered by Google GenAI TypeScript SDK with server-side proxy security.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-3.5 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  <Server className="h-4 w-4 text-pink-500" />
                  Application Version
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  BOO AI v1.0.0 &bull; Tagline: &ldquo;Your AI. Your World. Your BOO.&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800 px-5 py-3 bg-neutral-50 dark:bg-neutral-900/50">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-200/50 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-pink-600 hover:to-purple-700 active:scale-[0.99] disabled:opacity-50 transition-all"
          >
            {saveSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-white" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
