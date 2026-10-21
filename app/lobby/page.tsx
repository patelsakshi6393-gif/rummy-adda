'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  ShieldCheck,
  ChevronRight,
  Coins,
  Sparkles,
  Users,
} from 'lucide-react';
import { GameMode, GameState } from '@/lib/types';
import { clearActiveGameSession } from '@/lib/game-service';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function LobbyPage() {
  const router = useRouter();
  const { user, profile, wallet } = useAuth();

  const depositBal = wallet?.depositBalance || 0;
  const winBal = wallet?.winBalance || 0;
  const bonusBal = wallet?.bonusBalance || 0;
  const totalPlayable = (depositBal || 0) + (winBal || 0) + (bonusBal || 0);

  // If user returns to lobby after dropping, ensure any lingering dropped session pointer is cleared
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      try {
        const storedGameId = localStorage.getItem('rummy_active_game_id') || localStorage.getItem('activeGameId');
        if (storedGameId) {
          getDoc(doc(db, 'games', storedGameId)).then((gSnap) => {
            if (gSnap.exists()) {
              const gData = gSnap.data() as GameState;
              const isDropped = Array.isArray(gData.droppedUids) && gData.droppedUids.includes(user.uid);
              const isFinished = gData.status === 'RESULT' || gData.status === 'COMPLETED';
              if (isDropped || isFinished) {
                clearActiveGameSession(user.uid, storedGameId);
              }
            } else {
              clearActiveGameSession(user.uid);
            }
          }).catch(() => {
            clearActiveGameSession(user.uid);
          });
        }
      } catch {
        // Safe fallback
      }
    }
  }, [user]);

  const handleSelectFormat = (format: GameMode) => {
    router.push(`/match/stakes?format=${format}`);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col justify-center space-y-8">
          {/* Header Title for Screen 1 */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider shadow">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>100% Real Players • Zero Bots Guaranteed</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              FIND GAME
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
              Select your preferred Indian Rummy format to proceed to stake selection.
            </p>
          </div>

          {/* ₹20 Welcome Bonus Highlight if present */}
          {bonusBal > 0 && (
            <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎁</span>
                <div>
                  <p className="text-xs sm:text-sm font-extrabold text-amber-300">
                    ₹20 Starter Bonus Available!
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Play Points Rummy Micro Stakes (₹20 entry) instantly with 100% real players. All match winnings go directly to your withdrawable balance.
                  </p>
                </div>
              </div>
              <Link
                href="/match/stakes?format=points"
                className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase tracking-wider transition-all"
              >
                Play ₹20 Now
              </Link>
            </div>
          )}

          {/* Quick Wallet Bar */}
          <div className="bg-[#10111b] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-semibold">
                  Total Playable Balance
                </span>
                <p className="text-lg font-black text-amber-300">
                  ₹{totalPlayable.toLocaleString('en-IN')}{' '}
                  <span className="text-xs text-slate-400 font-normal">
                    (Deposit: ₹{depositBal.toLocaleString('en-IN')} + Winnings: ₹{winBal.toLocaleString('en-IN')} + Bonus: ₹{bonusBal.toLocaleString('en-IN')})
                  </span>
                </p>
              </div>
            </div>

            <Link
              href="/wallet/deposit"
              className="py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-colors"
            >
              + Add Cash
            </Link>
          </div>

          {/* THE 3 EXCLUSIVE FORMAT OPTIONS */}
          <div className="space-y-4">
            {/* 1. POINTS RUMMY */}
            <div
              onClick={() => handleSelectFormat('points')}
              className="group cursor-pointer bg-gradient-to-r from-[#141525] via-[#10111c] to-[#16182a] hover:from-[#1b1d33] hover:to-[#22253f] border border-amber-500/30 hover:border-amber-400 rounded-3xl p-6 sm:p-7 shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-200 hover:scale-[1.01] flex items-center justify-between"
            >
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-rose-900 via-rose-700 to-amber-600 p-0.5 shadow-lg shadow-rose-900/30 shrink-0">
                  <div className="w-full h-full bg-[#140a0f] rounded-[14px] flex items-center justify-center text-3xl sm:text-4xl font-black text-amber-400">
                    ♠
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black text-[10px] uppercase tracking-wider border border-amber-500/30">
                      Fast Action
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-500" />
                      <span>2 to 6 Players</span>
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-300 transition-colors">
                    1. Points Rummy
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Fastest 1-hand game. Fixed point value (₹0.25 to ₹200/pt). Entry fees from ₹20 to ₹16,000.
                  </p>
                </div>
              </div>

              <div className="shrink-0 pl-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 group-hover:bg-amber-400 group-hover:text-black text-amber-400 flex items-center justify-center transition-all shadow">
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>

            {/* 2. POOL 101 RUMMY */}
            <div
              onClick={() => handleSelectFormat('pool101')}
              className="group cursor-pointer bg-gradient-to-r from-[#111922] via-[#0d141b] to-[#122129] hover:from-[#152330] hover:to-[#17303c] border border-blue-500/30 hover:border-blue-400 rounded-3xl p-6 sm:p-7 shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-200 hover:scale-[1.01] flex items-center justify-between"
            >
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-900 via-cyan-700 to-teal-500 p-0.5 shadow-lg shadow-blue-900/30 shrink-0">
                  <div className="w-full h-full bg-[#081216] rounded-[14px] flex items-center justify-center text-3xl sm:text-4xl font-black text-cyan-400">
                    🏊
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-black text-[10px] uppercase tracking-wider border border-cyan-500/30">
                      101 Points Knockout
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-500" />
                      <span>2 to 6 Players</span>
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-cyan-300 transition-colors">
                    2. Pool 101 Rummy
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Survive below 101 points and eliminate all opponents to claim the championship prize pool.
                  </p>
                </div>
              </div>

              <div className="shrink-0 pl-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/10 group-hover:bg-cyan-400 group-hover:text-black text-cyan-400 flex items-center justify-center transition-all shadow">
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>

            {/* 3. DEALS RUMMY */}
            <div
              onClick={() => handleSelectFormat('deals')}
              className="group cursor-pointer bg-gradient-to-r from-[#1d141e] via-[#150f16] to-[#251523] hover:from-[#2a1b2b] hover:to-[#381c35] border border-purple-500/30 hover:border-purple-400 rounded-3xl p-6 sm:p-7 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-200 hover:scale-[1.01] flex items-center justify-between"
            >
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-purple-900 via-fuchsia-700 to-pink-500 p-0.5 shadow-lg shadow-purple-900/30 shrink-0">
                  <div className="w-full h-full bg-[#140813] rounded-[14px] flex items-center justify-center text-3xl sm:text-4xl font-black text-fuchsia-400">
                    🤝
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-black text-[10px] uppercase tracking-wider border border-fuchsia-500/30">
                      Fixed Deals
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-500" />
                      <span>2 to 6 Players</span>
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-fuchsia-300 transition-colors">
                    3. Deals Rummy
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Play a fixed number of deals with equal chips. The player with the highest chip count wins.
                  </p>
                </div>
              </div>

              <div className="shrink-0 pl-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-fuchsia-500/10 group-hover:bg-fuchsia-400 group-hover:text-black text-fuchsia-400 flex items-center justify-center transition-all shadow">
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Badge */}
          <div className="pt-4 text-center">
            <div className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-white/5 to-amber-500/10 border border-amber-500/30 shadow-lg text-amber-300">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span className="font-extrabold text-xs sm:text-sm tracking-wide">
                RummyAdda — 100% Skill Game, Fair & Protected
              </span>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
