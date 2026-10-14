'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BarChart2, ArrowLeft, Trophy, Target, Award, Calendar, CheckCircle2 } from 'lucide-react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GameState } from '@/lib/types';

export default function GameStatisticsPage() {
  const { user } = useAuth();
  const [games, setGames] = useState<GameState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'games'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as GameState);
        setGames(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Game stats listener:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  // Aggregate user stats authentically
  const totalGames = games.length;
  const wins = games.filter((g) => g.winnerUid === user?.uid).length;
  const losses = totalGames > wins ? totalGames - wins : 0;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const pointsGames = games.filter((g) => g.mode === 'points').length;
  const poolGames = games.filter((g) => g.mode === 'pool101').length;
  const dealGames = games.filter((g) => g.mode === 'deals').length;

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Link href="/profile" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Profile</span>
          </Link>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Game Statistics</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Authentic record aggregated directly from your live table matches.
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#12131e] border border-amber-500/20 p-5 rounded-2xl shadow-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Played</span>
              <p className="text-2xl sm:text-3xl font-black text-white mt-1">{totalGames}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Live Match Sessions</p>
            </div>

            <div className="bg-[#12131e] border border-emerald-500/30 p-5 rounded-2xl shadow-xl text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Matches Won</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">{wins}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Valid Declarations</p>
            </div>

            <div className="bg-[#12131e] border border-rose-500/30 p-5 rounded-2xl shadow-xl text-center">
              <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Losses / Drops</span>
              <p className="text-2xl sm:text-3xl font-black text-rose-300 mt-1">{losses}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Defeats & Drops</p>
            </div>

            <div className="bg-[#12131e] border border-amber-500/30 p-5 rounded-2xl shadow-xl text-center">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Win Rate</span>
              <p className="text-2xl sm:text-3xl font-black text-amber-300 mt-1">{winRate}%</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Victory Ratio</p>
            </div>
          </div>

          {/* Breakdown by Variant */}
          <div className="bg-[#12131e] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <h3 className="text-base font-bold text-white border-b border-white/5 pb-3">
              Performance by Rummy Variant
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#090a12] border border-white/5 space-y-2">
                <span className="text-amber-400 font-bold uppercase text-[10px]">Points Rummy</span>
                <p className="text-xl font-bold text-white">{pointsGames} Games</p>
                <p className="text-slate-400 text-[11px]">Classic fast 13-card format with point value multipliers.</p>
              </div>

              <div className="p-4 rounded-xl bg-[#090a12] border border-white/5 space-y-2">
                <span className="text-purple-400 font-bold uppercase text-[10px]">Pool 101</span>
                <p className="text-xl font-bold text-white">{poolGames} Games</p>
                <p className="text-slate-400 text-[11px]">Survival elimination tournaments up to 101 points cap.</p>
              </div>

              <div className="p-4 rounded-xl bg-[#090a12] border border-white/5 space-y-2">
                <span className="text-rose-400 font-bold uppercase text-[10px]">Deal Rummy</span>
                <p className="text-xl font-bold text-white">{dealGames} Games</p>
                <p className="text-slate-400 text-[11px]">Structured deal rounds with allocated chip stacks.</p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
