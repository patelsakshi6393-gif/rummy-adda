'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ShieldCheck, ArrowLeft, CheckCircle2, User, Coins, Lock, Key } from 'lucide-react';

export default function AccountOverviewPage() {
  const { profile, wallet } = useAuth();

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
            <h1 className="text-2xl sm:text-3xl font-black text-white">Account Overview</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Verification state, balance breakdown, and security status.
            </p>
          </div>

          <div className="bg-[#12131e] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl text-xs">
            {/* Identity & Status */}
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Authentication Authority</p>
                <h3 className="text-base font-bold text-white mt-0.5">Firebase Secure Auth</h3>
                <p className="text-slate-400 mt-1 font-mono">UID: {profile?.uid}</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 text-[10px] uppercase">
                  Active & Verified
                </span>
              </div>
            </div>

            {/* Wallet Summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Wallet Balances</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-[#0a0b12] border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Deposited Cash</span>
                  <p className="text-base font-black text-white mt-1">₹{(wallet?.depositBalance || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#0a0b12] border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">Winnings Balance</span>
                  <p className="text-base font-black text-emerald-400 mt-1">₹{(wallet?.winBalance || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#0a0b12] border border-purple-500/20">
                  <span className="text-[10px] text-purple-300 uppercase font-semibold">Bonus Balance</span>
                  <p className="text-base font-black text-purple-300 mt-1">₹{(wallet?.bonusBalance || 0).toLocaleString('en-IN')}</p>
                  <span className="text-[9px] text-slate-500 block">Game Credits Only</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0a0b12] border border-amber-500/20">
                  <span className="text-[10px] text-amber-300 uppercase font-semibold">Total Playable Balance</span>
                  <p className="text-base font-black text-amber-400 mt-1">₹{((wallet?.depositBalance || 0) + (wallet?.winBalance || 0) + (wallet?.bonusBalance || 0)).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            {/* Verification Checklist */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Security & Integrity Standards</span>
              </h4>
              <div className="space-y-2 text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Unique Display Player ID ({profile?.playerId}) issued</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Server-authoritative game engine protected</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Cloud Firestore security rules enforced</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
