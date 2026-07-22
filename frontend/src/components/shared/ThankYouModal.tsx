import React from 'react';

interface ThankYouModalProps {
  /**
   * Callback fired when the user dismisses the modal.
   */
  onClose: () => void;
}

/**
 * A premium thank‑you modal displayed after a candidate finishes the interview.
 *
 * The modal uses a glassmorphic backdrop with a subtle confetti animation to
 * create a celebratory feel. It is fully responsive and works in both light and
 * dark mode.
 */
export default function ThankYouModal({ onClose }: ThankYouModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/20 dark:bg-black/30 backdrop-blur-sm">
      {/* Confetti animation – simple CSS keyframes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
            }}
          />
        ))}
      </div>
      <div className="relative rounded-3xl bg-white dark:bg-slate-900 shadow-xl p-8 max-w-sm w-full mx-4 text-center backdrop-filter backdrop-blur-xl bg-opacity-70 border border-white/10">
        <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Thank you for completing the interview!
        </h2>
        <p className="mb-6 text-slate-600 dark:text-slate-300">
          Your responses have been saved. HR will review them shortly.
        </p>
        <button
          onClick={onClose}
          className="rounded-xl bg-emerald-500 px-6 py-2 font-medium text-white hover:bg-emerald-600 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
