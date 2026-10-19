'use client';

import React, { useState, useEffect } from 'react';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscribeModal({ isOpen, onClose }: SubscribeModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset status on re-open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    // Basic client-side email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrorMessage('Please enter a valid email address (e.g., student@university.edu).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'corner_modal' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to subscribe.');
      }

      setSuccessMessage(
        data.message || 'You are subscribed! Tomorrow’s edition will arrive at 8:00 AM IST.'
      );
      setEmail('');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Subscription failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-surface border-2 border-border-strong shadow-2xl p-6 sm:p-8 z-10">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close subscription dialog"
          className="absolute top-4 right-4 p-1 text-text-muted hover:text-text-primary text-xl font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          ✕
        </button>

        {/* Vintage Broadsheet Header Header */}
        <div className="text-center border-b border-border-strong pb-3 mb-4">
          <span className="inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest bg-red-600 text-white font-bold mb-1">
            Free Daily Delivery
          </span>
          <h2 id="modal-headline" className="font-serif font-black text-2xl sm:text-3xl text-text-primary uppercase tracking-tight">
            Subscribe to the Gazette
          </h2>
          <p className="text-xs font-serif italic text-text-secondary mt-1">
            The Daily AI & Computing Edition • Direct to Your Inbox at 08:00 AM IST
          </p>
        </div>

        {/* Value Proposition */}
        <p className="text-xs sm:text-sm font-sans text-text-secondary leading-relaxed mb-6">
          Receive our curated, zero-hype technical briefing every morning. Includes newly released open-weight models, peer-reviewed arXiv research, developer tools, and practical student takeaways. Free forever.
        </p>

        {/* Success Alert */}
        {successMessage ? (
          <div className="p-4 bg-green-500/10 border border-green-600/30 text-green-700 dark:text-green-400 text-xs sm:text-sm font-sans mb-4">
            <div className="flex items-center space-x-2 font-bold mb-1">
              <span>✓</span>
              <span>Subscription Confirmed!</span>
            </div>
            <p className="text-xs leading-relaxed">{successMessage}</p>
            <button
              onClick={onClose}
              className="mt-4 w-full py-2 bg-text-primary text-background text-xs font-semibold uppercase tracking-wider hover:bg-text-secondary transition-colors"
            >
              Done & Return to Reading
            </button>
          </div>
        ) : (
          /* Subscription Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-mono"
              >
                ⚠️ {errorMessage}
              </div>
            )}

            <div>
              <label htmlFor="modal-email-input" className="block text-xs font-mono font-bold uppercase tracking-wider text-text-primary mb-1">
                Your Email Address:
              </label>
              <input
                id="modal-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu or your.email@gmail.com"
                disabled={loading}
                autoFocus
                className="w-full px-3 py-2.5 bg-background border border-border-strong text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-serif font-bold text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Adding to GitHub Delivery...</span>
              ) : (
                <>
                  <span>✉</span>
                  <span>Subscribe for Daily 8:00 AM Delivery</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[10px] font-mono text-text-muted pt-2 border-t border-border">
              <span>Automated GitHub Actions delivery</span>
              <span>No spam • Unsubscribe anytime</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
