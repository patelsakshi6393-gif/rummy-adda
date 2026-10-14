'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  ShieldCheck,
  ChevronRight,
  Coins,
  Sparkles,
  Users,
  Lock,
  PlusCircle,
  BookOpen,
  Download,
  Smartphone,
} from 'lucide-react';
import { GameMode, getPlayableBalance } from '@/lib/types';
import { HowToPlayModal } from '@/components/HowToPlayModal';
import { SplashScreen } from '@/components/SplashScreen';

export default function HomePage() {
  const router = useRouter();
  const { user, wallet } = useAuth();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Check if splash was already passed in this browser session
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('splash') === 'true') {
      setShowSplash(true);
      return;
    }
    const hasPassed = sessionStorage.getItem('rummyadda_splash_passed');
    if (hasPassed === 'true') {
      setShowSplash(false);
    }
  }, []);

  const handlePlayNow = () => {
    sessionStorage.setItem('rummyadda_splash_passed', 'true');
    setShowSplash(false);
  };

  const depositBal = wallet?.depositBalance || 0;
  const winBal = wallet?.winBalance || 0;
  const bonusBal = wallet?.bonusBalance || 0;
  const totalPlayable = getPlayableBalance(wallet);

  const handleSelectFormat = (format: GameMode) => {
    router.push(`/match/stakes?format=${format}`);
  };

  if (showSplash) {
    return <SplashScreen onPlayNow={handlePlayNow} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
      <Navbar />

        {/* Interactive How to Play Guide Modal */}
        <HowToPlayModal
          isOpen={showHowToPlay}
          onClose={() => setShowHowToPlay(false)}
        />

      {/* Screen 1: Central Find Game / Format Selection */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-14 flex flex-col justify-center space-y-8">
        {/* Header Indicator */}
        <div className="text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider shadow">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Screen 1 : Game Format Selection</span>
            </div>

            <button
              onClick={() => setShowHowToPlay(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-bold transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>New to Rummy? Learn Rules & How to Play</span>
            </button>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            FIND GAME
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Choose your format below to select entry stakes and join real-player tables.
          </p>
        </div>

        {/* Free ₹20 Welcome Bonus Notification if present */}
        {bonusBal > 0 && (
          <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div>
                <p className="text-xs sm:text-sm font-extrabold text-amber-300">
                  ₹20 Welcome Bonus Credited!
                </p>
                <p className="text-[11px] text-slate-300">
                  Non-withdrawable game credits ready to play! Join any ₹20 Micro Stakes table now—all match winnings go directly to your withdrawable balance.
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

        {/* Official Android App Download Banner */}
        <div className="bg-gradient-to-r from-[#0c1226] via-[#101833] to-[#0c1226] border border-cyan-500/30 hover:border-amber-400/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Smartphone className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>Play Anywhere with RummyAdda Android App</span>
                <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/30">Free APK</span>
              </p>
              <p className="text-[11px] text-slate-300">
                Fast performance, instant tables, and ultra-smooth gameplay on your Android device.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSplash(true)}
            className="w-full sm:w-auto shrink-0 px-4 py-2 rounded-xl bg-[#f5ad18] hover:bg-[#ffba26] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Download APK Screen</span>
          </button>
        </div>

        {/* Playable Balance Bar */}
        <div className="bg-[#10111b] border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">
                Total Playable Balance
              </span>
              <p className="text-xl sm:text-2xl font-black text-amber-300">
                ₹{totalPlayable.toLocaleString('en-IN')}{' '}
                <span className="text-xs sm:text-sm text-slate-400 font-normal">
                  (Deposit: ₹{depositBal.toLocaleString('en-IN')} + Winnings: ₹{winBal.toLocaleString('en-IN')} + Bonus: ₹{bonusBal.toLocaleString('en-IN')})
                </span>
              </p>
            </div>
          </div>

          <Link
            href="/wallet/deposit"
            className="py-2.5 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-transform hover:scale-105"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Cash</span>
          </Link>
        </div>

        {/* Exactly 3 Format Options */}
        <div className="space-y-4">
          {/* 1. POINTS RUMMY */}
          <div
            onClick={() => handleSelectFormat('points')}
            className="group cursor-pointer bg-gradient-to-r from-[#141525] via-[#10111c] to-[#16182a] hover:from-[#1c1d33] hover:to-[#22253f] border border-amber-500/30 hover:border-amber-400 rounded-3xl p-6 sm:p-7 shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-200 hover:scale-[1.01] flex items-center justify-between"
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
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>2 to 6 Real Players</span>
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
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>2 to 6 Real Players</span>
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

          {/* 3. POOL 400 RUMMY */}
          <div
            onClick={() => handleSelectFormat('pool400')}
            className="group cursor-pointer bg-gradient-to-r from-[#17150a] via-[#110f06] to-[#1e1908] hover:from-[#24200e] hover:to-[#2e260e] border border-amber-500/40 hover:border-amber-300 rounded-3xl p-6 sm:p-7 shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-200 hover:scale-[1.01] flex items-center justify-between"
          >
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-900 via-amber-600 to-yellow-400 p-0.5 shadow-lg shadow-amber-900/30 shrink-0">
                <div className="w-full h-full bg-[#120f05] rounded-[14px] flex items-center justify-center text-3xl sm:text-4xl font-black text-amber-300">
                  🏆
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black text-[10px] uppercase tracking-wider border border-amber-500/30">
                    400 Points Knockout
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                    400 पूल रमी
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>2 to 6 Real Players</span>
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-300 transition-colors">
                  3. Pool 400 Rummy
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Survive below 400 points in extended championship rounds. Lowest penalty points claims the massive pool!
                </p>
              </div>
            </div>

            <div className="shrink-0 pl-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 group-hover:bg-amber-400 group-hover:text-black text-amber-400 flex items-center justify-center transition-all shadow">
                <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* 4. DEALS RUMMY */}
          <div
            onClick={() => handleSelectFormat('deals')}
            className="group cursor-pointer bg-gradient-to-r from-[#1b1219] via-[#140e13] to-[#20111a] hover:from-[#291723] hover:to-[#311b2b] border border-rose-500/30 hover:border-rose-400 rounded-3xl p-6 sm:p-7 shadow-xl hover:shadow-2xl hover:shadow-rose-500/10 transition-all duration-200 hover:scale-[1.01] flex items-center justify-between"
          >
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-rose-900 via-pink-700 to-amber-600 p-0.5 shadow-lg shadow-rose-900/30 shrink-0">
                <div className="w-full h-full bg-[#14080e] rounded-[14px] flex items-center justify-center text-3xl sm:text-4xl font-black text-rose-400">
                  🤝
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-black text-[10px] uppercase tracking-wider border border-rose-500/30">
                    Structured Deals
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>2 to 6 Real Players</span>
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-rose-300 transition-colors">
                  4. Deals Rummy
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Fixed rounds with equal chips distributed at table start. Winner takes all chips at conclusion.
                </p>
              </div>
            </div>

            <div className="shrink-0 pl-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/10 group-hover:bg-rose-400 group-hover:text-black text-rose-400 flex items-center justify-center transition-all shadow">
                <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated Trust Footer Badge */}
        <div className="bg-[#0e0f18] border border-amber-500/25 rounded-2xl p-4 sm:p-5 text-center shadow-lg">
          <div className="flex items-center justify-center gap-2 text-amber-400 font-black text-sm uppercase tracking-wider">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>RUMMY ADDA — 100% Skill Game & Fair & Protected</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero Bots Policy • Authentic 13-Card Indian Rummy • Instant WhatsApp Settlements
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
