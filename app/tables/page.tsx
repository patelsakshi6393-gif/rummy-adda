'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Coins, Play, ShieldAlert, Loader2, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { GameMode } from '@/lib/types';
import { STAKE_OPTIONS, StakeOption, findMatch } from '@/lib/game-service';

export default function TablesPage() {
  const router = useRouter();
  const { profile, wallet } = useAuth();
  const [filterMode, setFilterMode] = useState<string>('all');
  const [matchingStake, setMatchingStake] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const depositBal = wallet?.depositBalance || 0;
  const winBal = wallet?.winBalance || 0;
  const bonusBal = wallet?.bonusBalance || 0;
  const totalPlayable = (depositBal || 0) + (winBal || 0) + (bonusBal || 0);

  // Flatten approved stake tiers
  const allTiers: { mode: GameMode; modeTitle: string; option: StakeOption }[] = [
    ...STAKE_OPTIONS.points.map((opt) => ({ mode: 'points' as GameMode, modeTitle: 'पॉइंट्स रमी', option: opt })),
    ...STAKE_OPTIONS.pool101.map((opt) => ({ mode: 'pool101' as GameMode, modeTitle: 'पूल 101 रमी', option: opt })),
    ...STAKE_OPTIONS.deals.map((opt) => ({ mode: 'deals' as GameMode, modeTitle: 'डील्स रमी', option: opt })),
  ];

  const filteredTiers = allTiers.filter((item) => {
    if (filterMode !== 'all' && item.mode !== filterMode) return false;
    return true;
  });

  const handleSelectStake = (mode: GameMode, opt: StakeOption) => {
    router.push(`/match/find?format=${mode}&entryFee=${opt.entryFee}&pointValue=${opt.pointValue}`);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <Link href="/lobby" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline mb-2">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Match Lobby</span>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Stake Tiers & Preferences</h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Choose your game format and stake level. Find Match links you with genuine players with synchronized 15s countdown.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-[#12131d] border border-amber-500/20 px-4 py-2 rounded-xl">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400">Playable Chips:</span>
              <span className="text-sm font-black text-amber-300">₹{totalPlayable.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white font-bold uppercase text-[10px]">
                Dismiss
              </button>
            </div>
          )}

          {/* Format Filter Bar (No player count buttons) */}
          <div className="flex items-center gap-2 bg-[#11121d] border border-white/10 p-2 rounded-2xl overflow-x-auto">
            <span className="text-xs text-slate-400 font-semibold px-3">Format:</span>
            {(['all', 'points', 'pool101', 'deals'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
                  filterMode === m ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {m === 'all' ? 'All Formats' : m === 'points' ? '♠ Points' : m === 'pool101' ? '♥ Pool 101' : '♦ Deals'}
              </button>
            ))}
          </div>

          {/* Honest Empty State Check */}
          {filteredTiers.length === 0 ? (
            <div className="text-center py-16 bg-[#11121d] border border-white/10 rounded-3xl p-8 space-y-3">
              <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">Ready to find your next match?</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Choose your game format and stake, then select Find Match to enter the live queue.
              </p>
              <Link
                href="/lobby"
                className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
              >
                Go to Lobby
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTiers.map(({ mode, modeTitle, option }) => {
                const isMatching = matchingStake === option.entryFee;
                const canAfford = totalPlayable >= option.entryFee;

                return (
                  <div
                    key={`${mode}_${option.entryFee}`}
                    className={`bg-[#12131e] border rounded-2xl p-5 relative flex flex-col justify-between shadow-xl transition-all ${
                      canAfford
                        ? 'border-amber-500/20 hover:border-amber-400/50 hover:-translate-y-1'
                        : 'border-white/5 opacity-70'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">
                          {modeTitle}
                        </span>
                        {option.badge ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                            {option.badge}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-slate-400 text-[10px] font-medium">
                            Standard
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-white mb-2">{option.name}</h4>

                      {/* Stake Specs */}
                      <div className="grid grid-cols-2 gap-3 bg-[#0a0b12] rounded-xl p-3 mb-4 border border-white/5">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            Point Value
                          </span>
                          <p className="text-sm font-extrabold text-amber-300">
                            ₹{option.pointValue} / pt
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            Entry Stake
                          </span>
                          <p className="text-sm font-black text-white">
                            ₹{option.entryFee.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-4">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Server Authoritative • 15s Countdown</span>
                      </div>
                    </div>

                    {/* Find Match Action */}
                    <button
                      type="button"
                      onClick={() => handleSelectStake(mode, option)}
                      className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 active:scale-95'
                          : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>फाइंड मैच (₹{option.entryFee} स्टेक चुनें)</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
