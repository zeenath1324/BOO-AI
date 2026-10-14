import { GoogleGenAI } from '@google/genai';
import { Message, UserSettings } from './types.js';

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
}

export async function* streamChatResponse(
  messages: Message[],
  settings?: Partial<UserSettings>,
  preferredModel: string = 'gemini-3.8-flash'
) {
  const ai = getAIClient();

  // Build system instruction based on BOO AI persona & user settings
  let personalityTone = 'warm, intelligent, polite, and encouraging';
  if (settings?.aiPersonality === 'concise') {
    personalityTone = 'concise, direct, highly focused, and efficient';
  } else if (settings?.aiPersonality === 'creative') {
    personalityTone = 'imaginative, expressive, colorful, and engaging';
  } else if (settings?.aiPersonality === 'analytical') {
    personalityTone = 'logical, rigorous, deeply reasoned, and structured';
  } else if (settings?.aiPersonality === 'humorous') {
    personalityTone = 'witty, playful, charming, and fun with tasteful humor';
  }

  const baseSystemInstruction = [
    `You are BOO AI, an original, state-of-the-art AI assistant.`,
    `Brand Tagline: "Your AI. Your World. Your BOO."`,
    `Greeting phrase when welcomed: "Hey there! 💗 I'm BOO AI. What can I help you with today?"`,
    `Persona tone: ${personalityTone}.`,
    `Guidelines:`,
    `- When asked questions or given tasks, directly dive into the answer with clarity and depth.`,
    `- Format your answers clearly using clean GitHub-flavored Markdown.`,
    `- Use code blocks with appropriate language tags for code snippets.`,
    `- Provide complete, accurate, high-quality answers.`,
    `- Never break character or refer to yourself as ChatGPT or generic LLM; your name is proudly BOO AI.`,
    settings?.systemPrompt ? `User's Custom Instructions: ${settings.systemPrompt}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  // Convert past messages into contents format
  // We exclude any error messages
  const validMessages = messages.filter(m => !m.error && m.content.trim());

  // Convert to GenAI contents structure: { role: 'user' | 'model', parts: [{ text: ... }] }
  const contents = validMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  if (contents.length === 0) {
    throw new Error('No valid messages provided for conversation.');
  }

  const candidateModels = [
    preferredModel || 'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ];
  // Deduplicate preserving order
  const modelList = Array.from(new Set(candidateModels));

  let lastError: any = null;

  for (const modelToTry of modelList) {
    try {
      let chunkCount = 0;
      const responseStream = await ai.models.generateContentStream({
        model: modelToTry,
        contents,
        config: {
          systemInstruction: baseSystemInstruction,
          temperature: settings?.temperature ?? 0.7,
        },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          chunkCount++;
          yield chunk.text;
        }
      }

      if (chunkCount > 0) {
        return; // Streamed successfully!
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[BOO AI] Model ${modelToTry} failed (${err.message?.slice(0, 80)}...), trying alternate model...`);
      continue;
    }
  }

  // Format error nicely if all attempts failed
  let readableError = 'An error occurred while generating a response.';
  if (lastError?.message) {
    let msg = lastError.message;
    for (let i = 0; i < 3; i++) {
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error?.message) {
          msg = parsed.error.message;
        } else if (parsed.message) {
          msg = parsed.message;
        } else {
          break;
        }
      } catch {
        break;
      }
    }
    readableError = msg;
  }

  throw new Error(readableError);
}

