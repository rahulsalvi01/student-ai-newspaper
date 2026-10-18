'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  VALID_TOPICS,
  type ValidTopic,
  type UserPreferences,
  DEFAULT_PREFERENCES,
} from '../../lib/preferences/schema';

const TOPIC_LABELS: Record<ValidTopic, string> = {
  models_releases: 'New Models & Releases',
  developer_tools: 'AI Tools for Developers',
  open_source: 'Open Source & Build',
  research: 'Research Worth Knowing',
  industry_infrastructure: 'Industry & Infrastructure',
  student_action: 'Student Action & Career',
  general_ai: 'Context & Analysis',
};

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  // Load existing preferences on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/preferences');
        if (res.ok) {
          const json = await res.json();
          if (json.preferences) {
            setPreferences(json.preferences);
          }
        }
      } catch (err) {
        console.error('Failed to load preferences:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleTopic = (topic: ValidTopic) => {
    setPreferences((prev) => {
      const exists = prev.topics.includes(topic);
      const newTopics = exists
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic];
      return { ...prev, topics: newTopics };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setErrorMessages([]);

    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessages(json.issues || [json.error || 'Failed to update preferences']);
      } else {
        setPreferences(json.preferences);
        setSavedSuccess(true);
      }
    } catch {
      setErrorMessages(['Network error saving preferences. Please try again.']);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center font-mono text-xs text-text-secondary">
        Loading preferences...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header */}
      <div className="border-b-2 border-border-strong pb-4 mb-8">
        <div className="flex items-center justify-between text-xs font-mono text-text-muted mb-2">
          <Link href="/" className="hover:text-text-primary hover:underline">
            ← Back to Today&apos;s Edition
          </Link>
          <span>PREFERENCES & EDITORIAL CONFIGURATION</span>
        </div>
        <h1 className="font-serif font-black text-3xl sm:text-4xl uppercase tracking-tight text-text-primary">
          Editorial Preferences
        </h1>
        <p className="text-sm font-sans text-text-secondary mt-1">
          Customize your daily story budget, prioritize technical subjects, and configure timezone delivery.
        </p>
      </div>

      {/* Validation / Success Alerts */}
      {savedSuccess && (
        <div
          role="status"
          className="mb-6 p-3 bg-surface border-2 border-border-strong text-xs font-mono text-text-primary flex items-center justify-between"
        >
          <span>✓ Preferences saved and validated successfully.</span>
          <button
            type="button"
            onClick={() => setSavedSuccess(false)}
            className="text-text-muted hover:text-text-primary ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessages.length > 0 && (
        <div
          role="alert"
          className="mb-6 p-3 bg-surface-muted border-l-4 border-border-strong text-xs font-mono text-text-primary space-y-1"
        >
          <div className="font-bold uppercase tracking-wider">Validation Errors:</div>
          {errorMessages.map((msg, idx) => (
            <div key={idx}>• {msg}</div>
          ))}
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Topic Selection */}
        <section className="border border-border p-5 bg-surface space-y-4">
          <div>
            <h2 className="font-serif font-bold text-lg text-text-primary uppercase tracking-wider">
              1. Editorial Topics
            </h2>
            <p className="text-xs font-sans text-text-secondary mt-0.5">
              Select the technical categories you want prioritized in your daily issue.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {VALID_TOPICS.map((topic) => {
              const selected = preferences.topics.includes(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className={`p-3 text-left border text-xs transition-colors flex items-center justify-between ${
                    selected
                      ? 'border-border-strong bg-text-primary text-background font-semibold shadow-sm'
                      : 'border-border bg-surface-muted text-text-secondary hover:border-text-primary hover:text-text-primary'
                  }`}
                >
                  <span>{TOPIC_LABELS[topic]}</span>
                  <span className="font-mono text-[10px] ml-2">
                    {selected ? '✓ INCLUDED' : '+ ADD'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Story Budget & Timezone */}
        <section className="border border-border p-5 bg-surface space-y-5">
          <div>
            <h2 className="font-serif font-bold text-lg text-text-primary uppercase tracking-wider">
              2. Story Budget & Timezone
            </h2>
            <p className="text-xs font-sans text-text-secondary mt-0.5">
              Strictly enforced limits (5 to 100 stories).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="story-limit"
                className="block text-xs font-mono font-semibold text-text-primary uppercase mb-1"
              >
                Daily Story Limit (5 – 100):
              </label>
              <div className="flex items-center space-x-3">
                <input
                  id="story-limit"
                  type="number"
                  min={5}
                  max={100}
                  value={preferences.dailyStoryLimit}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      dailyStoryLimit: parseInt(e.target.value, 10) || 5,
                    }))
                  }
                  className="w-24 px-3 py-1.5 border border-border bg-background font-mono text-sm focus:outline-none focus:ring-1 focus:ring-text-primary"
                />
                <span className="text-xs font-mono text-text-muted">stories / day</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="timezone"
                className="block text-xs font-mono font-semibold text-text-primary uppercase mb-1"
              >
                Issue Timezone:
              </label>
              <select
                id="timezone"
                value={preferences.timezone}
                onChange={(e) =>
                  setPreferences((prev) => ({ ...prev, timezone: e.target.value }))
                }
                className="w-full px-3 py-1.5 border border-border bg-background font-mono text-xs focus:outline-none focus:ring-1 focus:ring-text-primary"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST • UTC+05:30)</option>
                <option value="UTC">UTC (Universal Time)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section 3: Notification Options */}
        <section className="border border-border p-5 bg-surface space-y-4">
          <div>
            <h2 className="font-serif font-bold text-lg text-text-primary uppercase tracking-wider">
              3. Delivery & Digest
            </h2>
            <p className="text-xs font-sans text-text-secondary mt-0.5">
              Delivery preferences for automated daily scheduled issues.
            </p>
          </div>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.emailEnabled}
              onChange={(e) =>
                setPreferences((prev) => ({ ...prev, emailEnabled: e.target.checked }))
              }
              className="w-4 h-4 border-border-strong text-text-primary focus:ring-1 focus:ring-text-primary"
            />
            <span className="text-xs font-mono text-text-primary">
              Enable Daily Link Delivery (Sends saved edition link via GitHub Actions scheduled workflow)
            </span>
          </label>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t-2 border-border-strong">
          <Link
            href="/"
            className="text-xs font-mono text-text-secondary hover:text-text-primary underline"
          >
            Cancel & Return Home
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-text-primary text-background font-semibold text-xs uppercase tracking-wider hover:bg-text-secondary disabled:opacity-50 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-text-primary"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
