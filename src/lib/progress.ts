import type { LearnerProgress, QuestionAttempt } from '@/types/quiz';

const STORAGE_PREFIX = 'quizforge_progress_';

function getStorageKey(shareToken: string): string {
  return `${STORAGE_PREFIX}${shareToken}`;
}

export function getProgress(shareToken: string): LearnerProgress | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(getStorageKey(shareToken));
    if (!stored) return null;
    return JSON.parse(stored) as LearnerProgress;
  } catch {
    return null;
  }
}

export function saveProgress(progress: LearnerProgress): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      getStorageKey(progress.share_token),
      JSON.stringify(progress)
    );
  } catch {
    // localStorage might be full or unavailable
  }
}

export function clearProgress(shareToken: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(getStorageKey(shareToken));
  } catch {
    // Ignore
  }
}

export function initProgress(
  quizId: string,
  shareToken: string,
  quizTitle: string
): LearnerProgress {
  return {
    quiz_id: quizId,
    share_token: shareToken,
    quiz_title: quizTitle,
    attempts: [],
    started_at: new Date().toISOString(),
  };
}

export function addAttempt(
  progress: LearnerProgress,
  attempt: QuestionAttempt
): LearnerProgress {
  return {
    ...progress,
    attempts: [...progress.attempts, attempt],
  };
}

export function getIncorrectQuestionIds(progress: LearnerProgress): string[] {
  const latestAttempts = new Map<string, QuestionAttempt>();

  for (const attempt of progress.attempts) {
    latestAttempts.set(attempt.question_id, attempt);
  }

  return Array.from(latestAttempts.entries())
    .filter(([, attempt]) => !attempt.is_correct)
    .map(([id]) => id);
}

export function calculateScore(progress: LearnerProgress): {
  correct: number;
  total: number;
  percentage: number;
} {
  const latestAttempts = new Map<string, QuestionAttempt>();

  for (const attempt of progress.attempts) {
    latestAttempts.set(attempt.question_id, attempt);
  }

  const total = latestAttempts.size;
  const correct = Array.from(latestAttempts.values()).filter(
    (a) => a.is_correct
  ).length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { correct, total, percentage };
}
