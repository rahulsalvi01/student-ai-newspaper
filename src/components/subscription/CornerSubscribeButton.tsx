'use client';

import React, { useState } from 'react';
import { SubscribeModal } from './SubscribeModal';

interface CornerSubscribeButtonProps {
  /** Optional custom position classes, default is fixed bottom-right */
  className?: string;
}

export function CornerSubscribeButton({ className }: CornerSubscribeButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Floating Corner Red Highlighted Button */}
      <aside
        aria-label="Daily Newsletter Subscription"
        className={
          className ||
          'fixed bottom-6 right-6 z-40 flex flex-col items-end group'
        }
      >
        {/* Subtle tooltip on hover */}
        <span className="hidden sm:inline-block mb-1.5 px-2 py-0.5 bg-text-primary text-background text-[10px] font-mono tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md">
          Daily Morning Briefing • 08:00 IST
        </span>

        <button
          onClick={() => setModalOpen(true)}
          aria-label="Subscribe to Daily Newspaper"
          className="relative inline-flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-serif font-bold text-xs uppercase tracking-wider shadow-2xl shadow-red-600/50 rounded-full border border-red-400 ring-4 ring-red-500/30 hover:ring-red-500/60 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-400"
        >
          {/* Pulsing indicator badge to highlight the button */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-80" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>

          <span className="text-sm">✉</span>
          <span className="font-sans font-extrabold tracking-wide">SUBSCRIBE</span>
        </button>
      </aside>

      {/* Subscription Dialog Modal */}
      <SubscribeModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

/**
 * Compact header-corner button variant for embedding directly into the Masthead
 */
export function HeaderSubscribeButton() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        aria-label="Subscribe to Daily AI Brief"
        className="relative inline-flex items-center space-x-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-sans font-bold text-[11px] uppercase tracking-wider rounded-sm shadow-md shadow-red-600/30 ring-2 ring-red-400/40 hover:ring-red-400 focus:outline-none transition-all"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
        </span>
        <span>SUBSCRIBE</span>
      </button>

      <SubscribeModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
