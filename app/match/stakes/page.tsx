'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  ArrowLeft,
  Users,
  Coins,
  ChevronRight,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { GameMode } from '@/lib/types';
import { STAKE_OPTIONS, StakeOption } from '@/lib/game-service';

function StakeSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wallet } = useAuth();

  const formatParam = (searchParams.get('format') || 'points') as GameMode;
  const currentFormat: GameMode = ['points', 'pool101', 'deals'].includes(formatParam)
    ? formatParam
    : 'points';

  const depositBal = wallet?.depositBalance || 0;
  const winBal = wallet?.winBalance || 0;
  const bonusBal = wallet?.bonusBalance || 0;
  const totalPlayable = (depositBal || 0) + (winBal || 0) + (bonusBal || 0);

  const stakesList: StakeOption[] = STAKE_OPTIONS[currentFormat] || STAKE_OPTIONS.points;

  const formatTitles: Record<GameMode, { title: string; desc: string; icon: string }> = {
    points: {
      title: 'Points Rummy',
      desc: '13-Card Fast Action Rummy with point-based settlements.',
      icon: '♠',
    },
    pool101: {
      title: 'Pool 101 Rummy',
      desc: '101 points limit knockout pool match. Last standing player wins.',
      icon: '🏊',
    },
    deals: {
      title: 'Deals Rummy',
      desc: 'Fixed deals match with equal chips allocated to each player.',
      icon: '🤝',
    },
  };

  const currentInfo = formatTitles[currentFormat];

  const handleSelectStake = (stake: StakeOption) => {
    router.push(
      `/match/find?format=${currentFormat}&entryFee=${stake.entryFee}&pointValue=${stake.pointValue}`
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back navigation to Screen 1 */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors bg-white/5 py-2 px-3.5 rounded-xl border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Change Game Format</span>
          </Link>

          {/* Playable Balance Badge */}
          <div className="flex items-center gap-3 bg-[#11121d] border border-amber-500/20 py-1.5 px-4 rounded-xl shadow">
            <Coins className="w-4 h-4 text-amber-400" />
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Playable Balance</span>
              <span className="text-sm font-black text-amber-300">
                ₹{totalPlayable.toLocaleString('en-IN')}
              </span>
            </div>
            {totalPlayable < 20 && (
              <Link
                href="/wallet/deposit"
                className="ml-1 p-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                title="Add Cash"
              >
                <PlusCircle className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Selected Format Banner */}
        <div className="bg-gradient-to-r from-[#171827] via-[#1a1420] to-[#131422] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Screen 2 : Choose Stake & Point Value</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white flex items-center gap-3">
                <span className="text-amber-400">{currentInfo.icon}</span>
                <span>{currentInfo.title}</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Select your entry fee (from ₹20 up to ₹16,000) and compete on a 2 to 6 real players table.
              </p>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-center shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Table Capacity
              </span>
              <p className="text-lg font-black text-white flex items-center justify-center gap-1.5 mt-0.5">
                <Users className="w-4 h-4 text-amber-400" />
                <span>2 to 6 Players</span>
              </p>
              <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">100% Real Players</p>
            </div>
          </div>
        </div>

        {/* Stakes List Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-lg font-extrabold text-white">Select Entry Fee & Stake</h2>
            <p className="text-xs text-slate-400">
              Choose an entry tier to proceed to Find Match
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {stakesList.length} Stake Tiers Available
          </span>
        </div>

        {/* Stakes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stakesList.map((stake) => {
            const hasSufficient = totalPlayable >= stake.entryFee;
            return (
              <div
                key={stake.entryFee}
                onClick={() => handleSelectStake(stake)}
                className={`group cursor-pointer rounded-2xl p-5 border transition-all duration-200 relative flex flex-col justify-between ${
                  hasSufficient
                    ? 'bg-[#10111c] hover:bg-[#151726] border-white/10 hover:border-amber-400/60 hover:scale-[1.02] shadow-lg shadow-black/40'
                    : 'bg-[#0f101a]/80 border-white/5 opacity-85 hover:border-amber-500/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black">
                      ₹{stake.entryFee.toLocaleString('en-IN')} Entry Fee
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 font-medium">
                      {currentFormat === 'points'
                        ? `₹${stake.pointValue}/pt`
                        : currentFormat === 'pool101'
                        ? '101 Pool'
                        : 'Deals Rule'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    {stake.name}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>2 to 6 Real Players Table</span>
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                  {hasSufficient ? (
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <span>Select & Proceed</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                      <span>Deposit Required (₹{stake.entryFee})</span>
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    15s Countdown
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Balance Top-up Notice if low */}
        {totalPlayable < 160 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Want to play higher stakes?</p>
                <p className="text-[11px] text-slate-300">
                  Deposit ₹500, ₹1,000 or more via WhatsApp support to jump straight into high roller tables.
                </p>
              </div>
            </div>
            <Link
              href="/wallet/deposit"
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-xs shrink-0 hover:scale-105 transition-transform"
            >
              + Add Cash
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function StakesPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#07070a] flex items-center justify-center text-amber-400">
            Loading stakes...
          </div>
        }
      >
        <StakeSelectionContent />
      </Suspense>
    </AuthGuard>
  );
}
