'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

const CATEGORIES = [
  { value: 'BUG', label: 'Bug report' },
  { value: 'FEATURE_REQUEST', label: 'Feature request' },
  { value: 'USABILITY', label: 'Usability feedback' },
  { value: 'AI_FEEDBACK', label: 'AI feedback' },
  { value: 'DOCUMENTATION', label: 'Documentation feedback' },
  { value: 'GENERAL', label: 'General suggestion' },
] as const;

type Category = (typeof CATEGORIES)[number]['value'];

/**
 * A single, reusable feedback entry point mounted in every authenticated
 * shell (cases/layout.tsx, matters/layout.tsx, dashboard/layout.tsx) — one
 * component, one POST /api/feedback contract, rather than a bespoke form
 * built three times. page_url is captured automatically from the current
 * route; the user never has to type it.
 *
 * The trigger renders as a normal in-flow header control (matching the
 * notifications bell/Log Out styling), not a `fixed` floating button. It
 * used to be `fixed bottom-5 right-5`, which on mobile permanently sat on
 * top of whatever a page had at that exact spot — filter tabs on the Case
 * Diary, the Litigation Journey heading on the Matter Workspace, and worst
 * of all the Record Court Note screen's own sticky "Save Court Note" bar.
 * A header control can never collide with page content or another fixed
 * action, so this is the fix rather than merely relocating the same bug.
 * Only the confirmation modal below is still `fixed inset-0` — an intentional
 * full-screen overlay, shown only while open.
 */
export function FeedbackWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [category, setCategory] = React.useState<Category>('GENERAL');
  const [message, setMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const reset = () => {
    setCategory('GENERAL');
    setMessage('');
    setSubmitError(null);
    setIsSubmitted(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message: message.trim(), page_url: pathname }),
      });
      if (!res.ok) {
        setSubmitError('Could not send feedback. Please try again.');
        return;
      }
      setIsSubmitted(true);
    } catch {
      setSubmitError('Network error — feedback was not sent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex-none p-1.5 sm:p-0 text-[#B0A588] hover:text-[#3A3222] transition-colors cursor-pointer bg-transparent border-none outline-none whitespace-nowrap"
        aria-label="Send feedback"
      >
        {/* Icon-only below sm — a narrow phone header has only so much room
            for hamburger + logo + Feedback + bell + Log Out, and Feedback
            is the one non-essential item here. Full text label from sm up,
            where there's room. */}
        <span className="sm:hidden text-base" aria-hidden="true">💬</span>
        <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Feedback</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Send feedback">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 space-y-4">
            {isSubmitted ? (
              <>
                <p className="text-sm font-bold text-[#3A3222]">Thank you — your feedback was received.</p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase tracking-wider rounded-lg"
                >
                  Close
                </button>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#3A3222]">Send Feedback</h3>
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close"
                    className="text-xs font-bold text-[#B0A588] hover:text-[#3A3222] bg-transparent border-none outline-none"
                  >
                    ✕
                  </button>
                </div>
                <div>
                  <label htmlFor="feedback-category" className="block text-xs font-bold uppercase tracking-widest text-[#8A7A56] mb-2">
                    Category
                  </label>
                  <select
                    id="feedback-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="feedback-message" className="block text-xs font-bold uppercase tracking-widest text-[#8A7A56] mb-2">
                    Your feedback
                  </label>
                  <textarea
                    id="feedback-message"
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="What's on your mind?"
                    className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium"
                  />
                </div>
                {submitError && (
                  <p role="alert" className="text-xs text-red-600">
                    {submitError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={!message.trim() || isSubmitting}
                  className="w-full px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase tracking-wider rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending…' : 'Send Feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
