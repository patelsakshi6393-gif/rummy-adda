'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Sparkles, Gift, Trophy, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function PromotionsPage() {
  const { user } = useAuth();

  const promos = [
    {
      id: 'welcome_bonus_20',
      title: '₹20 Welcome Bonus (Non-Withdrawable)',
      desc: 'Every new account automatically receives ₹20 bonus credits. Strictly for entering live match tables (e.g. ₹20 Micro Stakes tables). All net match winnings are 100% withdrawable to UPI/Bank!',
      code: 'WELCOME20',
      badge: 'New Player Bonus',
      expiry: 'Permanent',
      link: '/match/stakes?format=points',
    },
    {
      id: 'fair_play_zero_bot',
      title: '100% Real Players & Zero Bots',
      desc: 'Play with genuine verified players in real-time Indian Rummy tables with instant 15s matchmaking.',
      code: 'FAIRPLAY',
      badge: 'Certified Fair Play',
      expiry: 'Permanent',
      link: '/lobby',
    },
    {
      id: 'whatsapp_support_desk',
      title: 'Official WhatsApp Top-Up Desk',
      desc: 'Seamless manual deposit processing via our verified WhatsApp desk with instant receipt review.',
      code: 'DESK247',
      badge: 'Deposit Desk',
      expiry: '24/7 Active',
      link: '/wallet/deposit',
    },
    {
      id: 'micro_stakes_play',
      title: 'Points Rummy Micro Stakes (₹20 Entry)',
      desc: 'Jump straight into real-time 13-card Points Rummy action starting from ₹20 entry fee at ₹0.25 per point.',
      code: 'MICRO20',
      badge: 'Instant Play',
      expiry: 'Ongoing',
      link: '/lobby',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">Exclusive Bonuses</span>
          <h1 className="text-3xl font-black text-white mt-1">RummyAdda Promotions</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Boost your gaming experience with authentic bonuses, freeroll tickets, and loyalty rewards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {promos.map((p) => (
            <div
              key={p.id}
              className="bg-[#12131e] border border-amber-500/30 rounded-2xl p-6 flex flex-col justify-between shadow-2xl relative"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                    {p.badge}
                  </span>
                  <span className="text-[10px] text-slate-400">{p.expiry}</span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{p.desc}</p>

                <div className="p-2.5 bg-[#0a0b12] rounded-xl border border-white/5 flex items-center justify-between text-xs mb-6">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Promo Code</span>
                  <span className="font-mono font-bold text-amber-400">{p.code}</span>
                </div>
              </div>

              <Link
                href={p.link}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-xs uppercase tracking-wider text-center shadow-md hover:from-amber-300 hover:to-amber-400 transition-all"
              >
                Claim Promotion
              </Link>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
