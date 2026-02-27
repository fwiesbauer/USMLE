import { describe, it, expect } from 'vitest';
import { z } from 'zod';

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
});

const GeneratedQuestionsSchema = z.array(GeneratedQuestionSchema);

describe('Question validation schema', () => {
  it('validates a well-formed question', () => {
    const validQuestion = [
      {
        position: 1,
        topic: 'Acute Coronary Syndrome',
        section: 'Section 3.1 — ACS Management',
        cor_loe: 'COR 1, LOE A',
        vignette:
          'A 62-year-old man presents with crushing substernal chest pain radiating to his left arm. HR 98 bpm, BP 142/88 mmHg.',
        question_text:
          'Which of the following is the most appropriate next step?',
        options: [
          { letter: 'A', text: 'Administer aspirin 325 mg' },
          { letter: 'B', text: 'Order a chest X-ray' },
          { letter: 'C', text: 'Start IV heparin' },
          { letter: 'D', text: 'Obtain troponin levels' },
          { letter: 'E', text: 'Perform echocardiography' },
        ],
        correct_answer: 'A',
        explanation:
          'Aspirin should be administered immediately to all patients with suspected ACS. Troponin and imaging are important but aspirin takes priority.',
        nuggets: [
          'Aspirin 325 mg is first-line in ACS.',
          'Do not delay aspirin for diagnostic studies.',
        ],
      },
    ];

    const result = GeneratedQuestionsSchema.safeParse(validQuestion);
    expect(result.success).toBe(true);
  });

  it('rejects a question with only 3 options', () => {
    const invalid = [
      {
        position: 1,
        topic: 'Test',
        section: 'Section 1',
        cor_loe: 'COR 1',
        vignette: 'Test vignette',
        question_text: 'Test question?',
        options: [
          { letter: 'A', text: 'Option A' },
          { letter: 'B', text: 'Option B' },
          { letter: 'C', text: 'Option C' },
        ],
        correct_answer: 'A',
        explanation: 'Test explanation',
        nuggets: ['Pearl 1', 'Pearl 2'],
      },
    ];

    const result = GeneratedQuestionsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects a question with too many nuggets', () => {
    const invalid = [
      {
        position: 1,
        topic: 'Test',
        section: 'Section 1',
        cor_loe: 'COR 1',
        vignette: 'Test vignette',
        question_text: 'Test question?',
        options: [
          { letter: 'A', text: 'Option A' },
          { letter: 'B', text: 'Option B' },
          { letter: 'C', text: 'Option C' },
          { letter: 'D', text: 'Option D' },
          { letter: 'E', text: 'Option E' },
        ],
        correct_answer: 'A',
        explanation: 'Test explanation',
        nuggets: ['Pearl 1', 'Pearl 2', 'Pearl 3', 'Pearl 4', 'Pearl 5'],
      },
    ];

    const result = GeneratedQuestionsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects a question with missing required fields', () => {
    const invalid = [
      {
        position: 1,
        topic: 'Test',
      },
    ];

    const result = GeneratedQuestionsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
