import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  Download,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Maximize2,
  X,
  AlertCircle,
  Clock,
  Layers,
  Image as ImageIcon,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { GeneratedImage, ImageGeneratePayload } from '../types.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

interface ImageGeneratorProps {
  onBackToChat: () => void;
  initialPrompt?: string;
  onSendToChat?: (prompt: string, imageUrl: string) => void;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  onBackToChat,
  initialPrompt = '',
  onSendToChat,
}) => {
  const { user, continueAsGuest } = useAuth();

  const [prompt, setPrompt] = useState(initialPrompt);
  const [style, setStyle] = useState<ImageGeneratePayload['style']>('Realistic');
  const [aspectRatio, setAspectRatio] = useState<ImageGeneratePayload['aspectRatio']>('1:1');
  const [provider, setProvider] = useState<ImageGeneratePayload['provider']>('boo-flux');
  const [variations, setVariations] = useState<number>(1);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [currentResults, setCurrentResults] = useState<GeneratedImage[]>([]);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load history on mount or user change
  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const res = await api.getGeneratedImages();
      setHistory(res.images || []);
    } catch (err) {
      console.error('Failed to load image history:', err);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setError(null);
    setIsGenerating(true);
    setGenerationStep('Contacting AI image generator...');

    try {
      if (!user) {
        await continueAsGuest();
      }

      const timer1 = setTimeout(() => {
        setGenerationStep('Synthesizing details & textures...');
      }, 1500);

      const timer2 = setTimeout(() => {
        setGenerationStep('Finalizing render & color grading...');
      }, 3500);

      const res = await api.generateImage({
        prompt: prompt.trim(),
        style,
        aspectRatio,
        provider,
        variations,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      setCurrentResults(res.images);
      setHistory((prev) => [...res.images, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleDownload = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = img.imageUrl;
    link.download = `boo-ai-${img.prompt.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPrompt = async (img: GeneratedImage) => {
    try {
      await navigator.clipboard.writeText(img.prompt);
      setCopiedId(img.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  const handleDeleteImage = async (imgId: string) => {
    try {
      await api.deleteGeneratedImage(imgId);
      setHistory((prev) => prev.filter((i) => i.id !== imgId));
      setCurrentResults((prev) => prev.filter((i) => i.id !== imgId));
      if (lightboxImage?.id === imgId) {
        setLightboxImage(null);
      }
    } catch (err) {
      console.error('Failed to delete image:', err);
    }
  };

  const handleRemix = (img: GeneratedImage) => {
    setPrompt(img.prompt);
    if (img.style) setStyle(img.style as any);
    if (img.aspectRatio) setAspectRatio(img.aspectRatio as any);
    setActiveTab('create');
  };

  const samplePrompts = [
    'A mystical cyberpunk cat barista serving glowing pink latte in neon Shinjuku',
    'A tranquil Japanese garden with cherry blossoms, mossy stone lanterns, and koi pond at sunset',
    'Cute 3D Pixar-style fluffy pink monster wearing oversized vintage headphones',
    'Cinematic portrait of an astronaut looking at a bioluminescent cosmic nebula',
    'Delicate watercolor illustration of a cozy cottage surrounded by lavender and wild roses',
  ];

  const styleOptions: { id: ImageGeneratePayload['style']; label: string; icon: string }[] = [
    { id: 'Realistic', label: 'Realistic', icon: '📸' },
    { id: 'Anime', label: 'Anime', icon: '✨' },
    { id: '3D', label: '3D Render', icon: '🧸' },
    { id: 'Cartoon', label: 'Cartoon', icon: '🎨' },
    { id: 'Digital Art', label: 'Digital Art', icon: '🖌️' },
    { id: 'Watercolor', label: 'Watercolor', icon: '🌸' },
    { id: 'Cinematic', label: 'Cinematic', icon: '🎬' },
    { id: 'None', label: 'Raw / Direct', icon: '🎯' },
  ];

  const aspectOptions: { id: ImageGeneratePayload['aspectRatio']; label: string; desc: string }[] = [
    { id: '1:1', label: 'Square (1:1)', desc: '768 × 768 • Profile & Socials' },
    { id: '9:16', label: 'Portrait (9:16)', desc: '576 × 1024 • Stories & Wallpaper' },
    { id: '16:9', label: 'Landscape (16:9)', desc: '1024 × 576 • Desktop & Banners' },
    { id: '3:4', label: 'Classic (3:4)', desc: '768 × 1024 • Posters' },
    { id: '4:3', label: 'Standard (4:3)', desc: '1024 × 768 • Displays' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950 p-3 sm:p-6 transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200/80 dark:border-neutral-800/80">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToChat}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Chat</span>
            </button>
            <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700" />
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-xs">
                <Wand2 className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
                  BOO AI Image Studio
                </h1>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Generate stunning, original high-resolution artwork from text
                </p>
              </div>
            </div>
          </div>

          {/* View Tab Switch */}
          <div className="flex rounded-xl bg-neutral-200/60 dark:bg-neutral-800/60 p-1 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <Wand2 className="h-3.5 w-3.5 text-pink-500" />
              <span>Generate</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                loadHistory();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-purple-500" />
              <span>History ({history.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Create View */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* Input Card */}
            <form
              onSubmit={handleGenerate}
              className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm space-y-5"
            >
              {/* Text Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                    <span>Describe your image</span>
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    {prompt.length}/1000 characters
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A serene glass greenhouse in the clouds with glowing plants and warm lighting, octane render..."
                  className="w-full rounded-xl border border-neutral-300/80 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-800/50 p-3.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all resize-none"
                />

                {/* Inspiration Chips */}
                <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mr-1">
                    Try:
                  </span>
                  {samplePrompts.slice(0, 3).map((sp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(sp)}
                      className="rounded-lg bg-neutral-100 dark:bg-neutral-800/80 hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-950/30 dark:hover:text-pink-300 px-2 py-1 text-[11px] text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60 transition-colors text-left truncate max-w-[240px]"
                    >
                      {sp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-2">
                  Artistic Style
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {styleOptions.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStyle(st.id)}
                      className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-medium border text-left transition-all ${
                        style === st.id
                          ? 'border-pink-500 bg-pink-50/60 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 font-bold shadow-xs'
                          : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <span className="text-base select-none">{st.icon}</span>
                      <span>{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio & Variations Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Aspect Ratio */}
                <div>
                  <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-2">
                    Aspect Ratio
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {aspectOptions.slice(0, 3).map((ar) => (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => setAspectRatio(ar.id)}
                        className={`rounded-xl p-2.5 text-left border transition-all ${
                          aspectRatio === ar.id
                            ? 'border-pink-500 bg-pink-50/60 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 font-bold'
                            : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <p className="text-xs font-bold">{ar.label}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{ar.desc.split('•')[0]}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Engine & Variations */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-2">
                      Generation Engine
                    </label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as any)}
                      className="w-full rounded-xl border border-neutral-300/80 dark:border-neutral-700/80 bg-neutral-50/60 dark:bg-neutral-800/60 p-2.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    >
                      <option value="boo-flux">
                        BOO Flux Engine (Fast, High-Fidelity & 100% Free)
                      </option>
                      <option value="gemini-image">
                        Google Gemini Flash Image (gemini-3.1-flash-lite-image)
                      </option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Number of Variations: {variations}
                      </label>
                      <span className="text-[11px] text-neutral-400">1 to 4 images</span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 4].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVariations(v)}
                          className={`flex-1 rounded-xl py-1.5 text-xs font-bold border transition-all ${
                            variations === v
                              ? 'border-pink-500 bg-pink-500 text-white shadow-xs'
                              : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                        >
                          {v} {v === 1 ? 'image' : 'variations'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error display */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Image Generation Error</p>
                    <p className="text-[11px]">{error}</p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <Info className="h-3.5 w-3.5 text-pink-500" />
                  <span className="hidden sm:inline">Images are generated in real-time and saved to your history</span>
                </div>

                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-pink-500/20 hover:from-pink-600 hover:to-purple-700 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>{generationStep || 'Generating...'}</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      <span>Generate Image</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Current Generated Results */}
            {currentResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                    <span>Latest Results ({currentResults.length})</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentResults.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-all flex flex-col"
                    >
                      {/* Image Preview */}
                      <div
                        onClick={() => setLightboxImage(img)}
                        className="relative cursor-pointer overflow-hidden bg-neutral-900 aspect-square flex items-center justify-center"
                      >
                        <img
                          src={img.imageUrl}
                          alt={img.prompt}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors"
                            title="Expand preview"
                          >
                            <Maximize2 className="h-5 w-5" />
                          </button>
                        </div>
                        <span className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                          {img.style}
                        </span>
                      </div>

                      {/* Details & Actions */}
                      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                          {img.prompt}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800/80 text-[11px]">
                          <span className="text-[10px] text-neutral-400">
                            {img.aspectRatio} • {img.width}×{img.height}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCopyPrompt(img)}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                              title="Copy prompt"
                            >
                              {copiedId === img.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleRemix(img)}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40 transition-colors"
                              title="Remix prompt"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownload(img)}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                              title="Download image"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteImage(img.id)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Delete from history"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: History View */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 p-12 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  No images generated yet
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  Type a prompt in the Generate tab to create your first artwork with BOO AI!
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs px-4 py-2 transition-colors"
                >
                  Create Image
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map((img) => (
                  <div
                    key={img.id}
                    className="group relative rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-all flex flex-col"
                  >
                    <div
                      onClick={() => setLightboxImage(img)}
                      className="relative cursor-pointer overflow-hidden bg-neutral-900 aspect-square flex items-center justify-center"
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.prompt}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors"
                          title="Expand preview"
                        >
                          <Maximize2 className="h-5 w-5" />
                        </button>
                      </div>
                      <span className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                        {img.style}
                      </span>
                    </div>

                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                      <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                        {img.prompt}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800/80 text-[11px]">
                        <span className="text-[10px] text-neutral-400">
                          {new Date(img.createdAt).toLocaleDateString()}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopyPrompt(img)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            title="Copy prompt"
                          >
                            {copiedId === img.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRemix(img)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40 transition-colors"
                            title="Remix prompt"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownload(img)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                            title="Download image"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteImage(img.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lightbox Modal */}
        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setLightboxImage(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setLightboxImage(null)}
                aria-label="Close image preview"
                className="absolute top-3 right-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="relative flex-1 overflow-hidden flex items-center justify-center bg-black/90 max-h-[70vh]">
                <img
                  src={lightboxImage.imageUrl}
                  alt={lightboxImage.prompt}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="p-4 bg-neutral-900 text-white space-y-2 border-t border-neutral-800">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs text-neutral-200 leading-relaxed flex-1">
                    {lightboxImage.prompt}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleCopyPrompt(lightboxImage)}
                      className="flex items-center gap-1 rounded-xl bg-neutral-800 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-700 transition-colors"
                    >
                      {copiedId === lightboxImage.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDownload(lightboxImage)}
                      className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-3 py-1.5 text-xs font-semibold hover:from-pink-600 hover:to-purple-700 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                  <span>Style: <strong className="text-neutral-200">{lightboxImage.style}</strong></span>
                  <span>•</span>
                  <span>Ratio: <strong className="text-neutral-200">{lightboxImage.aspectRatio}</strong></span>
                  <span>•</span>
                  <span>Engine: <strong className="text-neutral-200">{lightboxImage.provider}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
