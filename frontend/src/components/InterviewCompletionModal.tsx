import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Modal displayed when an interview finishes.
 * Provides three actions for the candidate:
 *   • View Summary – navigate to the results page.
 *   • Retake Interview – reset interview state and go back to the start.
 *   • Logout – clear auth token and redirect to the login page.
 */
export default function InterviewCompletionModal({
  onClose,
  onRetake,
}: {
  onClose: () => void;
  onRetake: () => void;
}) {
  const navigate = useNavigate();

  const handleViewSummary = () => {
    navigate('/results');
    onClose();
  };

  const handleRetake = () => {
    // Caller should reset any interview-specific state.
    onRetake();
    navigate('/interview');
    onClose();
  };

  const handleLogout = () => {
    // Clear stored auth information.
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    // Redirect to login page.
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
      <div className="w-full max-w-md p-6 bg-white/30 backdrop-blur-lg rounded-xl shadow-xl border border-white/20">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">Interview Completed 🎉</h2>
        <p className="text-center text-gray-700 mb-6">
          Your interview is finished. Choose what you’d like to do next.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleViewSummary}
            className="w-full py-2 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md hover:opacity-90 transition"
          >
            View Summary
          </button>
          <button
            onClick={handleRetake}
            className="w-full py-2 px-4 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-md hover:opacity-90 transition"
          >
            Retake Interview
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-md hover:opacity-90 transition"
          >
            Logout
          </button>
        </div>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
