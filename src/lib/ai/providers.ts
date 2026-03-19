import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type AIProvider = 'anthropic' | 'openai' | 'google';

export const AI_PROVIDERS: { value: AIProvider; label: string; placeholder: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
  { value: 'openai', label: 'OpenAI (GPT)', placeholder: 'sk-...' },
  { value: 'google', label: 'Google (Gemini)', placeholder: 'AIza...' },
];

interface CompletionOptions {
  apiKey: string;
  provider: AIProvider;
  model?: string;
  maxTokens: number;
  prompt: string;
}

/** Default models per provider for question generation (high quality) */
const DEFAULT_MODELS: Record<AIProvider, string> = {
  anthropic: 'claude-sonnet-4-5-20250929',
  openai: 'gpt-4o',
  google: 'gemini-2.0-flash',
};

/** Fast/cheap models per provider for lightweight tasks */
const FAST_MODELS: Record<AIProvider, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  google: 'gemini-2.0-flash-lite',
};

export function getDefaultModel(provider: AIProvider): string {
  return DEFAULT_MODELS[provider];
}

export function getFastModel(provider: AIProvider): string {
  return FAST_MODELS[provider];
}

/**
 * Unified text completion across providers.
 * Returns the text content of the response.
 */
export async function createCompletion(options: CompletionOptions): Promise<string> {
  const { apiKey, provider, maxTokens, prompt } = options;
  const model = options.model ?? DEFAULT_MODELS[provider];

  switch (provider) {
    case 'anthropic': {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text content in Anthropic response');
      }
      return textBlock.text;
    }

    case 'openai': {
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new Error('No text content in OpenAI response');
      }
      return text;
    }

    case 'google': {
      const client = new GoogleGenerativeAI(apiKey);
      const generativeModel = client.getGenerativeModel({ model });
      const response = await generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      });
      const text = response.response.text();
      if (!text) {
        throw new Error('No text content in Google response');
      }
      return text;
    }

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
