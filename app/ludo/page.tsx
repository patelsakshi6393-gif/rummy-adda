'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export default function LudoPage() {
  return (
    <div className="min-h-screen bg-[#120306] text-white flex flex-col">
      {/* Top Bar with Back to RummyAdda Lobby */}
      <div className="bg-gradient-to-r from-[#200105] to-[#45050e] border-b border-amber-500/30 px-4 py-2 flex items-center justify-between z-10">
        <Link
          href="/lobby"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Rummy Lobby</span>
        </Link>
        <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
          🎲 REAL CASH LUDO (STARTING ₹1)
        </span>
        <a
          href="/games/ludo/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white"
        >
          <span>Full Screen</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Embedded Ludo Game Frame */}
      <div className="flex-1 w-full h-[calc(100vh-45px)]">
        <iframe
          src="/games/ludo/index.html"
          className="w-full h-full border-0"
          title="Ludo Game"
          allow="autoplay"
        />
      </div>
    </div>
  );
}
