import { describe, it, expect, beforeEach } from 'vitest';
import {
  initProgress,
  addAttempt,
  getIncorrectQuestionIds,
  calculateScore,
} from './progress';
import type { LearnerProgress, QuestionAttempt } from '@/types/quiz';

describe('progress utilities', () => {
  let progress: LearnerProgress;

  beforeEach(() => {
    progress = initProgress('quiz-1', 'token-abc', 'Test Quiz');
  });

  describe('initProgress', () => {
    it('creates a fresh progress object', () => {
      expect(progress.quiz_id).toBe('quiz-1');
      expect(progress.share_token).toBe('token-abc');
      expect(progress.quiz_title).toBe('Test Quiz');
      expect(progress.attempts).toEqual([]);
      expect(progress.started_at).toBeTruthy();
      expect(progress.completed_at).toBeUndefined();
    });
  });

  describe('addAttempt', () => {
    it('adds an attempt to progress', () => {
      const attempt: QuestionAttempt = {
        question_id: 'q1',
        selected_answer: 'A',
        is_correct: true,
        attempted_at: new Date().toISOString(),
      };

      const updated = addAttempt(progress, attempt);
      expect(updated.attempts).toHaveLength(1);
      expect(updated.attempts[0].question_id).toBe('q1');
    });

    it('does not mutate the original progress', () => {
      const attempt: QuestionAttempt = {
        question_id: 'q1',
        selected_answer: 'A',
        is_correct: true,
        attempted_at: new Date().toISOString(),
      };

      addAttempt(progress, attempt);
      expect(progress.attempts).toHaveLength(0);
    });
  });

  describe('getIncorrectQuestionIds', () => {
    it('returns IDs of incorrect questions', () => {
      let updated = addAttempt(progress, {
        question_id: 'q1',
        selected_answer: 'A',
        is_correct: true,
        attempted_at: new Date().toISOString(),
      });
      updated = addAttempt(updated, {
        question_id: 'q2',
        selected_answer: 'B',
        is_correct: false,
        attempted_at: new Date().toISOString(),
      });
      updated = addAttempt(updated, {
        question_id: 'q3',
        selected_answer: 'C',
        is_correct: false,
        attempted_at: new Date().toISOString(),
      });

      const incorrect = getIncorrectQuestionIds(updated);
      expect(incorrect).toEqual(['q2', 'q3']);
    });

    it('uses the latest attempt for each question', () => {
      let updated = addAttempt(progress, {
        question_id: 'q1',
        selected_answer: 'B',
        is_correct: false,
        attempted_at: '2024-01-01T00:00:00Z',
      });
      updated = addAttempt(updated, {
        question_id: 'q1',
        selected_answer: 'A',
        is_correct: true,
        attempted_at: '2024-01-01T00:01:00Z',
      });

      const incorrect = getIncorrectQuestionIds(updated);
      expect(incorrect).toEqual([]);
    });
  });

  describe('calculateScore', () => {
    it('calculates score correctly', () => {
      let updated = addAttempt(progress, {
        question_id: 'q1',
        selected_answer: 'A',
        is_correct: true,
        attempted_at: new Date().toISOString(),
      });
      updated = addAttempt(updated, {
        question_id: 'q2',
        selected_answer: 'B',
        is_correct: false,
        attempted_at: new Date().toISOString(),
      });
      updated = addAttempt(updated, {
        question_id: 'q3',
        selected_answer: 'C',
        is_correct: true,
        attempted_at: new Date().toISOString(),
      });

      const score = calculateScore(updated);
      expect(score.correct).toBe(2);
      expect(score.total).toBe(3);
      expect(score.percentage).toBe(67);
    });

    it('returns 0 for empty progress', () => {
      const score = calculateScore(progress);
      expect(score.correct).toBe(0);
      expect(score.total).toBe(0);
      expect(score.percentage).toBe(0);
    });
  });
});
