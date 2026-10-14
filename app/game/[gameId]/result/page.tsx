'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Trophy, ArrowLeft } from 'lucide-react';

export default function GameResultDirectPage() {
  const params = useParams();
  const gameId = params?.gameId as string;

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />
        <main className="flex-1 max-w-xl mx-auto w-full px-4 py-16 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white">Match #{gameId?.slice(-6)} Result</h1>
          <p className="text-xs text-slate-400">
            View the live table for full scorecard breakdowns and payouts.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href={`/game/${gameId}`} className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow">
              Open Table
            </Link>
            <Link href="/lobby" className="py-2.5 px-5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl">
              Back to Lobby
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
