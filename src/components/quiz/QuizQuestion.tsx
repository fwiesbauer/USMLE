'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { getVisitorId } from '@/lib/visitor';
import type { PublicQuestion, QuizOption, RevealResponse, QuestionComment } from '@/types/quiz';

interface QuizQuestionProps {
  question: PublicQuestion;
  currentIndex: number;
  totalQuestions: number;
  onAnswer: (questionId: string, selectedAnswer: string) => Promise<RevealResponse>;
  onNext: () => void;
}

export function QuizQuestion({
  question,
  currentIndex,
  totalQuestions,
  onAnswer,
  onNext,
}: QuizQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [reveal, setReveal] = useState<RevealResponse | null>(null);
  const [loading, setLoading] = useState(false);

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
      // We don't have a separate endpoint to check visitor's vote,
      // so we store it locally
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

  const handleSelect = async (letter: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(letter);
    setLoading(true);

    try {
      const result = await onAnswer(question.id, letter);
      setReveal(result);
    } catch {
      setSelectedAnswer(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (vote: 1 | -1) => {
    if (votingLoading) return;
    // If clicking the same vote, do nothing
    if (myVote === vote) return;

    setVotingLoading(true);
    const visitorId = getVisitorId();

    try {
      const res = await fetch(`/api/public/questions/${question.id}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId, vote }),
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

    if (!reveal) {
      return `${base} border-gray-200 opacity-50 cursor-not-allowed`;
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

  // Build DOI URL
  const doiUrl = reveal?.doi ? `https://doi.org/${reveal.doi}` : '';

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
            disabled={!!selectedAnswer || loading}
            className={getOptionClass(option)}
          >
            <span className="font-bold mr-2">{option.letter}.</span>
            {option.text}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center text-gray-500 text-sm">
          Checking answer...
        </div>
      )}

      {/* Feedback panel */}
      {reveal && (
        <div className="space-y-3">
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
                    <span className="mr-2">•</span>
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

          {/* Source reference with DOI link */}
          {(reveal.source_reference || reveal.section) && (
            <div className="border-t border-gray-200 pt-3">
              <p className="text-xs text-gray-500">
                {reveal.source_reference && (
                  <>
                    {doiUrl ? (
                      <a
                        href={doiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-mid hover:text-brand-dark underline"
                      >
                        {reveal.source_reference}
                      </a>
                    ) : (
                      <span>{reveal.source_reference}</span>
                    )}
                  </>
                )}
                {reveal.source_reference && reveal.section && ' · '}
                {reveal.section && (
                  <>
                    {doiUrl ? (
                      <a
                        href={doiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-mid hover:text-brand-dark underline"
                      >
                        {reveal.section}
                      </a>
                    ) : (
                      <span>{reveal.section}</span>
                    )}
                  </>
                )}
              </p>
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
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              {showComments ? 'Hide' : 'Show'} Comments{comments.length > 0 ? ` (${comments.length})` : ''}
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
