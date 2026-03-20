'use client';

import { useState } from 'react';
import { getVisitorId } from '@/lib/visitor';

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug Report', icon: '🐛' },
  { value: 'suggestion', label: 'Suggestion', icon: '💡' },
  { value: 'question', label: 'Question', icon: '❓' },
  { value: 'other', label: 'Other', icon: '💬' },
] as const;

type FeedbackType = (typeof FEEDBACK_TYPES)[number]['value'];

interface FeedbackWidgetProps {
  quizToken?: string;
}

export function FeedbackWidget({ quizToken }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('suggestion');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/public/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_url: window.location.href,
          feedback_type: feedbackType,
          message: message.trim(),
          email: email.trim() || undefined,
          visitor_id: getVisitorId(),
          quiz_token: quizToken,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit feedback');
      }

      setSubmitted(true);
      setMessage('');
      setEmail('');

      setTimeout(() => {
        setSubmitted(false);
        setIsOpen(false);
      }, 2500);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-white shadow-lg transition-all hover:scale-105 ${
          isOpen
            ? 'bg-gray-500 hover:bg-gray-600'
            : 'bg-brand-mid hover:bg-brand-dark'
        }`}
        aria-label={isOpen ? 'Close feedback' : 'Send feedback'}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {!isOpen && <span className="text-sm font-medium">Feedback</span>}
      </button>

      {/* Feedback panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-5 z-50 w-80 rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden animate-in">
          {/* Header */}
          <div className="bg-brand-dark px-4 py-3">
            <h3 className="text-white font-semibold text-sm">Send us feedback</h3>
            <p className="text-brand-light text-xs mt-0.5">
              Help us improve this tool
            </p>
          </div>

          {submitted ? (
            <div className="px-4 py-8 text-center">
              <div className="text-3xl mb-2">✓</div>
              <p className="text-brand-dark font-semibold">Thank you!</p>
              <p className="text-gray-500 text-sm mt-1">Your feedback has been received.</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Type selector */}
              <div className="grid grid-cols-4 gap-1.5">
                {FEEDBACK_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFeedbackType(type.value)}
                    className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-xs transition-colors ${
                      feedbackType === type.value
                        ? 'bg-brand-light text-brand-dark border border-brand-border'
                        : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-base">{type.icon}</span>
                    <span className="leading-tight">{type.label}</span>
                  </button>
                ))}
              </div>

              {/* Message */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-mid focus:outline-none focus:ring-1 focus:ring-brand-mid resize-none"
              />

              {/* Email (optional) */}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional — for follow-up)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-mid focus:outline-none focus:ring-1 focus:ring-brand-mid"
              />

              {error && (
                <p className="text-xs text-red-600">{error}</p>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || submitting}
                className="w-full rounded-lg bg-brand-mid px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
