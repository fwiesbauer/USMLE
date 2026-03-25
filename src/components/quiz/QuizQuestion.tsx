'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { getVisitorId } from '@/lib/visitor';
import type { PublicQuestion, QuizOption, RevealResponse, QuestionComment, CertaintyLevel } from '@/types/quiz';

interface QuizQuestionProps {
  question: PublicQuestion;
  currentIndex: number;
  totalQuestions: number;
  onAnswer: (questionId: string, selectedAnswer: string, certainty: CertaintyLevel) => Promise<RevealResponse>;
  onNext: () => void;
}

const CERTAINTY_MESSAGES: Record<string, Record<CertaintyLevel, string>> = {
  correct: {
    certain: 'You were certain — and you were right. Strong knowledge.',
    medium: 'You got it right, but had some doubt. Worth reviewing to build confidence.',
    uncertain: 'You were uncertain — but you got it right. Could be a lucky guess. Flag this one for review.',
  },
  wrong: {
    certain: 'You were certain — but this was actually wrong. Confident mistakes are the most important ones to address.',
    medium: 'You had some doubt — and it turned out to be wrong. Review this topic.',
    uncertain: 'You were uncertain — and you got it wrong. Keep practicing this area.',
  },
};

export function QuizQuestion({
  question,
  currentIndex,
  totalQuestions,
  onAnswer,
  onNext,
}: QuizQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [certainty, setCertainty] = useState<CertaintyLevel | null>(null);
  const [reveal, setReveal] = useState<RevealResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Voting state
  const [thumbsUp, setThumbsUp] = useState(0);
  const [thumbsDown, setThumbsDown] = useState(0);
  const [myVote, setMyVote] = useState<1 | -1 | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);

  // Comments state
  const [comments, setComments] = useState<QuestionComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commenterName, setCommenterName] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Load votes and comments when answer is revealed
  useEffect(() => {
    if (!reveal) return;

    // Load vote counts
    fetch(`/api/public/questions/${question.id}/votes`)
      .then((r) => r.json())
      .then((data) => {
        setThumbsUp(data.thumbs_up);
        setThumbsDown(data.thumbs_down);
      })
      .catch(() => {});

    // Check if visitor already voted
    const visitorId = getVisitorId();
    if (visitorId) {
      const stored = localStorage.getItem(`vote_${question.id}`);
      if (stored === '1') setMyVote(1);
      else if (stored === '-1') setMyVote(-1);
    }

    // Load comments
    fetch(`/api/public/questions/${question.id}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(data))
      .catch(() => {});

    // Restore commenter name
    const savedName = localStorage.getItem('quizforge_commenter_name');
    if (savedName) setCommenterName(savedName);
  }, [reveal, question.id]);

  const handleSelect = (letter: string) => {
    if (selectedAnswer || loading) return;
    setSelectedAnswer(letter);
  };

  const handleCertaintySelect = async (level: CertaintyLevel) => {
    if (!selectedAnswer || loading) return;
    setCertainty(level);
    setSubmitError(null);
    setLoading(true);

    try {
      const result = await onAnswer(question.id, selectedAnswer, level);
      setReveal(result);
    } catch (err) {
      console.error('Answer submission failed:', err);
      setSubmitError('Failed to submit answer. Please try again.');
      setSelectedAnswer(null);
      setCertainty(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (vote: 1 | -1) => {
    if (votingLoading) return;
    if (myVote === vote) return;

    setVotingLoading(true);
    const visitorId = getVisitorId();

    try {
      const res = await fetch(`/api/public/questions/${question.id}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId, vote, attempt_id: reveal?.attempt_id }),
      });
      if (res.ok) {
        const data = await res.json();
        setThumbsUp(data.thumbs_up);
        setThumbsDown(data.thumbs_down);
        setMyVote(vote);
        localStorage.setItem(`vote_${question.id}`, String(vote));
      }
    } finally {
      setVotingLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);

    if (commenterName.trim()) {
      localStorage.setItem('quizforge_commenter_name', commenterName.trim());
    }

    try {
      const res = await fetch(`/api/public/questions/${question.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commenter_name: commenterName.trim() || undefined,
          comment_text: commentText.trim(),
          attempt_id: reveal?.attempt_id,
        }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setCommentText('');
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const getOptionClass = (option: QuizOption) => {
    const base =
      'w-full text-left px-4 py-3 rounded-lg border-2 transition-colors font-medium text-sm';

    if (!selectedAnswer) {
      return `${base} border-gray-200 hover:border-brand-mid hover:bg-brand-light cursor-pointer`;
    }

    // Answer selected but not yet submitted (no reveal) — highlight selected, dim others
    if (!reveal) {
      const isSelected = option.letter === selectedAnswer;
      if (isSelected) {
        return `${base} border-brand-mid bg-brand-light text-brand-dark`;
      }
      return `${base} border-gray-200 opacity-50`;
    }

    const isSelected = option.letter === selectedAnswer;
    const isCorrect = option.letter === reveal.correct_answer;

    if (isCorrect) {
      return `${base} border-correct-dark bg-correct-fill text-correct-dark`;
    }
    if (isSelected && !reveal.is_correct) {
      return `${base} border-wrong-dark bg-wrong-fill text-wrong-dark`;
    }
    return `${base} border-gray-200 opacity-50`;
  };

  const progressPercent = ((currentIndex + (reveal ? 1 : 0)) / totalQuestions) * 100;

  // Build DOI URL — try explicit doi field first, then extract from reference text
  const cleanDoi = (raw: string): string => {
    // Extract just the DOI (10.XXXX/...) — stop at whitespace or "http"
    const match = raw.match(/(10\.\d{4,}\/[^\s]+)/);
    if (!match) return '';
    // Trim trailing punctuation and any URL that got concatenated
    return match[1].replace(/https?:\/\/.*$/, '').replace(/[.)]+$/, '');
  };

  const extractDoiUrl = (text: string): string => {
    const match = text.match(/https?:\/\/doi\.org\/(10\.\d{4,}\/[^\s,;)}\]"']+)/i)
      || text.match(/doi\.org\/(10\.\d{4,}\/[^\s,;)}\]"']+)/i)
      || text.match(/doi[:\s]+\s*(10\.\d{4,}\/[^\s,;)}\]"']+)/i);
    if (match?.[1]) return `https://doi.org/${cleanDoi(match[1])}`;
    return '';
  };

  const doiUrl = reveal?.doi
    ? `https://doi.org/${cleanDoi(reveal.doi)}`
    : (reveal?.source_reference ? extractDoiUrl(reveal.source_reference) : '');

  // Certainty message for the feedback panel
  const certaintyMessage = reveal && certainty
    ? CERTAINTY_MESSAGES[reveal.is_correct ? 'correct' : 'wrong'][certainty]
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-brand-mid h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Topic badge */}
      <span className="inline-block bg-brand-light text-brand-dark text-xs font-medium px-3 py-1 rounded-full mb-4">
        {question.topic}
      </span>

      {/* Vignette */}
      <div className="bg-brand-light border-l-4 border-brand-mid rounded-r-lg p-4 mb-4">
        <p className="text-gray-800 leading-relaxed">{question.vignette}</p>
      </div>

      {/* Lead-in question */}
      <p className="font-bold text-gray-900 mb-4">{question.question_text}</p>

      {/* Options */}
      <div className="space-y-2 mb-6">
        {question.options.map((option) => (
          <button
            key={option.letter}
            onClick={() => handleSelect(option.letter)}
            disabled={!!reveal || loading}
            className={getOptionClass(option)}
          >
            <span className="font-bold mr-2">{option.letter}.</span>
            {option.text}
          </button>
        ))}
      </div>

      {/* Certainty buttons — shown after answer selected, before submission */}
      {selectedAnswer && !reveal && !loading && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3 font-medium">How certain are you?</p>
          <div className="flex gap-3">
            <button
              onClick={() => handleCertaintySelect('certain')}
              className="flex-1 px-4 py-2.5 rounded-lg border-2 border-emerald-400 bg-emerald-50 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 hover:border-emerald-500 transition-colors"
            >
              Certain
            </button>
            <button
              onClick={() => handleCertaintySelect('medium')}
              className="flex-1 px-4 py-2.5 rounded-lg border-2 border-amber-400 bg-amber-50 text-amber-700 font-semibold text-sm hover:bg-amber-100 hover:border-amber-500 transition-colors"
            >
              Medium
            </button>
            <button
              onClick={() => handleCertaintySelect('uncertain')}
              className="flex-1 px-4 py-2.5 rounded-lg border-2 border-red-400 bg-red-50 text-red-700 font-semibold text-sm hover:bg-red-100 hover:border-red-500 transition-colors"
            >
              Uncertain
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center text-gray-500 text-sm">
          Checking answer...
        </div>
      )}

      {/* Error state */}
      {submitError && (
        <div className="text-center text-red-600 text-sm mb-4">
          {submitError}
        </div>
      )}

      {/* Feedback panel */}
      {reveal && (
        <div className="space-y-3">
          {/* Certainty message */}
          {certaintyMessage && (
            <div
              className={`rounded-lg px-4 py-3 text-sm font-medium ${
                reveal.is_correct
                  ? 'bg-correct-fill border border-correct-dark text-correct-dark'
                  : 'bg-wrong-fill border border-wrong-dark text-wrong-dark'
              }`}
            >
              {certaintyMessage}
            </div>
          )}

          <div className="bg-blue-50 border-l-4 border-brand-mid rounded-r-lg p-4">
            <p
              className={`font-bold text-lg ${
                reveal.is_correct ? 'text-correct-dark' : 'text-wrong-dark'
              }`}
            >
              {reveal.is_correct
                ? 'Correct!'
                : `Incorrect — the answer was ${reveal.correct_answer}`}
            </p>
            <p className="text-gray-700 mt-2 leading-relaxed">
              {reveal.explanation}
            </p>
          </div>

          {/* Key Pearls */}
          {reveal.nuggets.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-medium text-amber-800 text-sm mb-2">
                Key Pearls
              </p>
              <ul className="space-y-1">
                {reveal.nuggets.map((nugget, i) => (
                  <li key={i} className="text-sm text-amber-900 flex">
                    <span className="mr-2">&bull;</span>
                    <span>{nugget}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* COR/LOE with tooltip */}
          {reveal.cor_loe && (
            <div className="flex items-center gap-1.5">
              <p className="text-xs italic text-gray-400">{reveal.cor_loe}</p>
              <Tooltip
                content={
                  <>
                    <strong>Class of Recommendation (COR)</strong> — How strongly a treatment is recommended.
                    <br />1 = Strong, 2a = Moderate, 2b = Weak, 3 = No Benefit or Harm.
                    <br /><br />
                    <strong>Level of Evidence (LOE)</strong> — Quality of supporting evidence.
                    <br />A = High-quality RCTs, B-R = Randomized, B-NR = Non-randomized, C-LD = Limited data, C-EO = Expert opinion.
                  </>
                }
              >
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs cursor-help">
                  ?
                </span>
              </Tooltip>
            </div>
          )}

          {/* Source reference and DOI */}
          {(reveal.source_reference || reveal.section || doiUrl) && (
            <div className="border-t border-gray-200 pt-3 space-y-1">
              {reveal.source_reference && (
                <p className="text-xs text-gray-500">
                  {reveal.source_reference.replace(/^\d+\.\s*/, '')}
                </p>
              )}
              {reveal.section && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Document section:</span>{' '}
                  {reveal.section}
                </p>
              )}
              {doiUrl && (
                <p className="text-xs">
                  <a
                    href={doiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-mid hover:text-brand-dark underline"
                  >
                    {doiUrl}
                  </a>
                </p>
              )}
            </div>
          )}

          {/* Thumbs up/down voting */}
          <div className="flex items-center gap-4 pt-1">
            <span className="text-xs text-gray-400">Was this question helpful?</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleVote(1)}
                disabled={votingLoading}
                className={`flex items-center gap-1 text-sm transition-colors ${
                  myVote === 1
                    ? 'text-correct-dark font-medium'
                    : 'text-gray-400 hover:text-correct-dark'
                }`}
              >
                <span>👍</span>
                <span>{thumbsUp}</span>
              </button>
              <button
                onClick={() => handleVote(-1)}
                disabled={votingLoading}
                className={`flex items-center gap-1 text-sm transition-colors ${
                  myVote === -1
                    ? 'text-wrong-dark font-medium'
                    : 'text-gray-400 hover:text-wrong-dark'
                }`}
              >
                <span>👎</span>
                <span>{thumbsDown}</span>
              </button>
            </div>
          </div>

          {/* Comments section */}
          <div className="border-t border-gray-200 pt-3">
            <button
              onClick={() => setShowComments(!showComments)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <span>💬</span>
              {showComments ? 'Hide comments' : 'Show & leave comments'}{comments.length > 0 ? ` (${comments.length})` : ''}
            </button>

            {showComments && (
              <div className="mt-3 space-y-3">
                {/* Existing comments */}
                {comments.length > 0 && (
                  <div className="space-y-2">
                    {comments.map((c) => (
                      <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-700">
                            {c.commenter_name || 'Anonymous'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{c.comment_text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* New comment form */}
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={commenterName}
                    onChange={(e) => setCommenterName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid"
                  />
                  <textarea
                    placeholder="Leave a comment about this question..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSubmitComment}
                      loading={submittingComment}
                      disabled={!commentText.trim()}
                      variant="secondary"
                      className="text-xs"
                    >
                      Submit Comment
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={onNext} variant="primary">
              {currentIndex + 1 < totalQuestions ? 'Next Question' : 'See Results'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
