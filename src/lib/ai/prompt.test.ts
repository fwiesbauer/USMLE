import { describe, it, expect } from 'vitest';
import { buildQuestionGenerationPrompt } from './prompt';

describe('buildQuestionGenerationPrompt', () => {
  it('includes the question count in the prompt', () => {
    const prompt = buildQuestionGenerationPrompt('Sample text', 10);
    expect(prompt).toContain('create 10');
  });

  it('includes the source text in the prompt', () => {
    const sourceText = 'This is the clinical guideline content.';
    const prompt = buildQuestionGenerationPrompt(sourceText, 5);
    expect(prompt).toContain(sourceText);
  });

  it('includes USMLE formatting rules', () => {
    const prompt = buildQuestionGenerationPrompt('Text', 3);
    expect(prompt).toContain('USMLE Step 2 CK');
    expect(prompt).toContain('vignette-based');
    expect(prompt).toContain('5 options (A–E)');
    expect(prompt).toContain('JSON array');
  });

  it('includes the output schema', () => {
    const prompt = buildQuestionGenerationPrompt('Text', 3);
    expect(prompt).toContain('"position"');
    expect(prompt).toContain('"topic"');
    expect(prompt).toContain('"vignette"');
    expect(prompt).toContain('"correct_answer"');
    expect(prompt).toContain('"nuggets"');
  });
});
