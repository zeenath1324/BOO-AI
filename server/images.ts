import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { GeneratedImage } from './types.js';

// Sliding-window rate limiter (10 requests per minute per user/IP)
const rateLimits = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

export function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const timestamps = rateLimits.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = validTimestamps[0];
    const retryAfter = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }

  validTimestamps.push(now);
  rateLimits.set(key, validTimestamps);
  return { allowed: true };
}

export interface ImageGenerationOptions {
  prompt: string;
  style?: 'Realistic' | 'Anime' | '3D' | 'Cartoon' | 'Digital Art' | 'Watercolor' | 'Cinematic' | 'None';
  aspectRatio?: '1:1' | '9:16' | '16:9' | '3:4' | '4:3';
  provider?: 'boo-flux' | 'gemini-image';
  variations?: number; // 1, 2, or 4
}

const STYLE_PROMPTS: Record<string, string> = {
  Realistic: 'photorealistic, ultra-detailed 8k photography, natural volumetric lighting, high resolution, sharp focus, masterpiece',
  Anime: 'studio anime aesthetic, Makoto Shinkai style, vibrant colors, detailed line art, expressive character, high quality 4k anime',
  '3D': '3D Pixar and Disney animation style, smooth rendering, cute stylized lighting, octane 3d render, vivid details, 3D character design',
  Cartoon: 'playful colorful cartoon style, bold clean outlines, vibrant saturated palette, expressive character art, charming illustration',
  'Digital Art': 'trending digital illustration on ArtStation, dynamic lighting, high detail, rich textures, concept art, artistic flair',
  Watercolor: 'delicate watercolor painting, artistic paper texture, soft translucent wash, graceful brush strokes, pastel tones, fine pigments',
  Cinematic: 'cinematic still, 35mm film grain, moody dramatic lighting, anamorphic lens flare, movie scene masterpiece, atmospheric composition',
};

export function enhancePrompt(prompt: string, style?: string): string {
  const cleanPrompt = prompt.trim();
  if (!style || style === 'None' || !STYLE_PROMPTS[style]) {
    return cleanPrompt;
  }
  return `${cleanPrompt}, ${STYLE_PROMPTS[style]}`;
}

export function getDimensions(aspectRatio?: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16':
      return { width: 576, height: 1024 };
    case '16:9':
      return { width: 1024, height: 576 };
    case '3:4':
      return { width: 768, height: 1024 };
    case '4:3':
      return { width: 1024, height: 768 };
    case '1:1':
    default:
      return { width: 768, height: 768 };
  }
}

async function generateSingleFluxImage(
  enhancedPrompt: string,
  width: number,
  height: number,
  seed: number
): Promise<string> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'BOO-AI-Studio/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Flux Image Service returned HTTP status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

async function generateSingleGeminiImage(
  enhancedPrompt: string,
  aspectRatio: string = '1:1'
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('Google Gemini API Key is not configured on the server.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Allowed aspect ratios for Gemini: "1:1", "3:4", "4:3", "9:16", "16:9"
  const validAspectRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
  const ar = validAspectRatios.includes(aspectRatio) ? aspectRatio : '1:1';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [{ text: enhancedPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: ar as any,
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          return `data:${mime};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error('Gemini model did not return image data in candidate parts.');
  } catch (err: any) {
    if (err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'))) {
      throw new Error(
        'Google Gemini image models (gemini-3.1-flash-lite-image) have 0 quota on free tier and require a Google Cloud billing plan. Please use the BOO Flux Engine or upgrade your Gemini key.'
      );
    }
    throw err;
  }
}

export async function generateImages(
  userId: string,
  options: ImageGenerationOptions
): Promise<GeneratedImage[]> {
  const { prompt, style = 'Realistic', aspectRatio = '1:1', provider = 'boo-flux', variations = 1 } = options;

  if (!prompt || !prompt.trim()) {
    throw new Error('Image prompt cannot be empty.');
  }

  if (prompt.trim().length > 1000) {
    throw new Error('Image prompt cannot exceed 1000 characters.');
  }

  const count = Math.min(Math.max(variations, 1), 4);
  const enhancedPrompt = enhancePrompt(prompt, style);
  const { width, height } = getDimensions(aspectRatio);

  const results: GeneratedImage[] = [];

  for (let i = 0; i < count; i++) {
    const seed = Math.floor(Math.random() * 1000000) + i;
    let imageUrl: string;

    if (provider === 'gemini-image') {
      try {
        imageUrl = await generateSingleGeminiImage(enhancedPrompt, aspectRatio);
      } catch (geminiError: any) {
        // If Gemini failed due to free-tier quota=0, fallback gracefully to Flux Engine
        console.warn('[BOO AI] Gemini image generation failed, falling back to BOO Flux Engine:', geminiError.message);
        imageUrl = await generateSingleFluxImage(enhancedPrompt, width, height, seed);
      }
    } else {
      imageUrl = await generateSingleFluxImage(enhancedPrompt, width, height, seed);
    }

    const imageRecord: GeneratedImage = {
      id: crypto.randomUUID(),
      userId,
      prompt: prompt.trim(),
      enhancedPrompt,
      style: style || 'None',
      aspectRatio: (aspectRatio as any) || '1:1',
      provider: provider || 'boo-flux',
      imageUrl,
      width,
      height,
      createdAt: new Date().toISOString(),
    };

    await db.saveGeneratedImage(imageRecord);
    results.push(imageRecord);
  }

  return results;
}
