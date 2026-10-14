'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Gift, ArrowLeft, Award, Sparkles, CheckCircle2 } from 'lucide-react';

export default function RewardsPage() {
  const { wallet } = useAuth();
  const rewardPoints = wallet?.rewardPoints || 0;

  const tiers = [
    { name: 'Bronze Club', minPts: 0, perk: 'Daily freeroll ticket access' },
    { name: 'Silver Royale', minPts: 100, perk: '2% extra bonus chips on deposits' },
    { name: 'Gold Masters', minPts: 500, perk: 'Priority WhatsApp support desk' },
    { name: 'Platinum Salon', minPts: 2000, perk: 'Exclusive weekend high-stakes tables' },
    { name: 'Diamond Crown', minPts: 5000, perk: 'Dedicated VIP host & maximum cashout buffers' },
  ];

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
            <h1 className="text-2xl sm:text-3xl font-black text-white">Royale Rewards & Loyalty</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Earn reward points on every game played and climb the royal tier status ladder.
            </p>
          </div>

          {/* Current Points Pod */}
          <div className="bg-gradient-to-br from-[#181222] to-[#0f0b15] border border-purple-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                <Gift className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Your Available Reward Points</span>
                <p className="text-3xl font-black text-purple-300 mt-0.5">{rewardPoints} Points</p>
                <p className="text-xs text-slate-400">Current Club Tier: Silver Royale</p>
              </div>
            </div>

            <div className="text-center sm:text-right">
              <button
                disabled
                className="py-2.5 px-5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-xs cursor-not-allowed opacity-80"
              >
                Redeem for Bonus Chips (100 pts = ₹100)
              </button>
            </div>
          </div>

          {/* Tier Hierarchy */}
          <div className="bg-[#12131e] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <h3 className="text-base font-bold text-white border-b border-white/5 pb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Royale Status Tiers</span>
            </h3>

            <div className="space-y-3">
              {tiers.map((t, idx) => (
                <div
                  key={t.name}
                  className="p-4 rounded-xl bg-[#090a12] border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-white">{t.name}</h4>
                      <p className="text-[11px] text-slate-400">{t.perk}</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-slate-300">{t.minPts}+ Pts</span>
                </div>
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
