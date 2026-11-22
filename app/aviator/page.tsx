'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export default function AviatorPage() {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-white flex flex-col">
      {/* Top Bar with Back to RummyAdda Lobby */}
      <div className="bg-[#101117] border-b border-white/10 px-4 py-2 flex items-center justify-between z-10">
        <Link
          href="/lobby"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Rummy Lobby</span>
        </Link>
        <span className="text-xs font-black text-rose-500 uppercase tracking-widest italic">
          AVIATOR • CRASH GAME (MIN ₹10)
        </span>
        <a
          href="/games/aviator/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
        >
          <span>Full Screen</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Embedded Aviator Game Frame */}
      <div className="flex-1 w-full h-[calc(100vh-45px)]">
        <iframe
          src="/games/aviator/index.html"
          className="w-full h-full border-0"
          title="Aviator Game"
          allow="autoplay"
        />
      </div>
    </div>
  );
}
