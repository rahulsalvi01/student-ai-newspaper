'use client';

import React, { useState } from 'react';

export function SubscribeSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your email address.');
      return;
    }

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
        body: JSON.stringify({ email: trimmed, source: 'inline_section' }),
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
    <section
      id="subscribe"
      aria-label="Newspaper Subscription Section"
      className="my-12 p-6 sm:p-8 bg-surface border-2 border-border-strong text-text-primary"
    >
      <div className="max-w-2xl mx-auto text-center">
        {/* Section Header */}
        <div className="mb-2">
          <span className="inline-block px-2.5 py-0.5 bg-red-600 text-white text-[11px] font-mono uppercase tracking-widest font-bold mb-2">
            Automated Delivery
          </span>
          <h2 className="font-serif font-black text-2xl sm:text-3xl uppercase tracking-tight text-text-primary">
            Get the Daily Gazette in Your Inbox
          </h2>
          <div className="w-16 h-0.5 bg-border-strong mx-auto my-3" />
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm font-sans text-text-secondary leading-relaxed mb-6">
          Never miss an open-source model release, major AI preprint, or critical developer tool. Enter your email to automatically receive tomorrow morning&apos;s briefing at <strong>08:00 AM Asia/Kolkata</strong> via GitHub Actions.
        </p>

        {/* Success Alert */}
        {successMessage ? (
          <div className="p-4 bg-green-500/10 border border-green-600/30 text-green-700 dark:text-green-400 text-xs sm:text-sm font-sans text-center">
            <p className="font-bold text-sm mb-1">✓ You&apos;re Subscribed!</p>
            <p className="text-xs leading-relaxed">{successMessage}</p>
          </div>
        ) : (
          /* Subscription Form */
          <form onSubmit={handleSubmit} className="space-y-3">
            {errorMessage && (
              <div
                role="alert"
                className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-mono text-left"
              >
                ⚠️ {errorMessage}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu or your.email@gmail.com"
                disabled={loading}
                aria-label="Email Address for Daily Subscription"
                className="flex-1 px-4 py-2.5 bg-background border border-border-strong text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-serif font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? 'Subscribing...' : 'Subscribe Now'}
              </button>
            </div>

            <p className="text-[10px] font-mono text-text-muted mt-2 text-center">
              100% free • Powered by automated GitHub Actions cron • Unsubscribe anytime
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
