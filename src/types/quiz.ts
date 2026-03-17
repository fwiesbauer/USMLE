export interface QuizOption {
  letter: string; // "A" | "B" | "C" | "D" | "E"
  text: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  position: number;
  topic: string;
  section: string;
  cor_loe: string;
  vignette: string;
  question_text: string;
  options: QuizOption[];
  correct_answer: string;
  explanation: string;
  nuggets: string[];
  organ_systems: string[];
  physician_tasks: string[];
  disciplines: string[];
}

export interface Quiz {
  id: string;
  educator_id: string;
  title: string;
  source_filename: string;
  status: 'draft' | 'generating' | 'review' | 'published';
  share_token?: string;
  question_count_requested: number;
  questions?: Question[];
  created_at: string;
  published_at?: string;
}

/** Public question — excludes correct_answer and explanation */
export interface PublicQuestion {
  id: string;
  position: number;
  topic: string;
  vignette: string;
  question_text: string;
  options: QuizOption[];
}

/** Returned by the /reveal endpoint after learner submits answer */
export interface RevealResponse {
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  nuggets: string[];
  cor_loe: string;
}

/** Stored in localStorage — learner progress (no backend) */
export interface LearnerProgress {
  quiz_id: string;
  share_token: string;
  quiz_title: string;
  attempts: QuestionAttempt[];
  started_at: string;
  completed_at?: string;
}

export interface QuestionAttempt {
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  attempted_at: string;
}

/** AI generation input */
export interface GenerateQuestionsInput {
  source_text: string;
  question_count: number;
  api_key: string;
}

/** AI-generated question before DB insertion */
export interface GeneratedQuestion {
  position: number;
  topic: string;
  section: string;
  cor_loe: string;
  vignette: string;
  question_text: string;
  options: QuizOption[];
  correct_answer: string;
  explanation: string;
  nuggets: string[];
  organ_systems: string[];
  physician_tasks: string[];
  disciplines: string[];
}
