import { z } from 'zod';
import { buildQuestionGenerationPrompt } from './prompt';
import { createCompletion, getDefaultModel, type AIProvider } from './providers';
import type { GeneratedQuestion, QuizOption } from '@/types/quiz';

const QuizOptionSchema = z.object({
  letter: z.string(),
  text: z.string(),
});

const GeneratedQuestionSchema = z.object({
  position: z.number(),
  topic: z.string(),
  section: z.string(),
  cor_loe: z.string(),
  vignette: z.string(),
  question_text: z.string(),
  options: z.array(QuizOptionSchema).length(5),
  correct_answer: z.string(),
  explanation: z.string(),
  nuggets: z.array(z.string()).min(2).max(4),
  organ_systems: z.array(z.string()).min(1),
  physician_tasks: z.array(z.string()).min(1),
  disciplines: z.array(z.string()).min(1),
});

const GeneratedQuestionsSchema = z.array(GeneratedQuestionSchema);

export async function generateQuestions(
  sourceText: string,
  questionCount: number,
  apiKey: string,
  provider: AIProvider = 'anthropic'
): Promise<GeneratedQuestion[]> {
  const prompt = buildQuestionGenerationPrompt(sourceText, questionCount);

  const responseText = await createCompletion({
    apiKey,
    provider,
    model: getDefaultModel(provider),
    maxTokens: 16000,
    prompt,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    // Try to extract JSON array from the response if it has surrounding text
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }
    parsed = JSON.parse(jsonMatch[0]);
  }

  const validated = GeneratedQuestionsSchema.parse(parsed);

  // Validate each question has a valid correct answer matching one option
  for (const q of validated) {
    const validLetters = q.options.map((o: QuizOption) => o.letter);
    if (!validLetters.includes(q.correct_answer)) {
      throw new Error(
        `Question "${q.topic}" has correct_answer "${q.correct_answer}" which doesn't match any option letter`
      );
    }
  }

  return validated;
}
