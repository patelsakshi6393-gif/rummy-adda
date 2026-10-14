import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function FairPlayPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <div className="border-b border-white/10 pb-6">
          <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400">Integrity Standard</span>
          <h1 className="text-3xl font-black text-white mt-1">Fair Play Policy</h1>
          <p className="text-xs text-slate-400 mt-1">Transparent card dealing, anti-bot protocols & player protection</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>1. Authentic Random Shuffling (RNG)</span>
          </h2>
          <p>
            RummyAdda uses cryptographically verified pseudo-random card shuffling algorithms. Every hand is shuffled from a 108-card baseline (2 standard 52-card decks + 4 printed jokers) with zero human intervention or predictability.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white">2. Absolute Hand Secrecy</h2>
          <p>
            No client browser has access to opponent cards. Cards remain securely protected on the server runtime and in private player collections until an authentic, validated declaration is completed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white">3. Zero Bot Guarantee</h2>
          <p>
            RummyAdda operates on a strict zero-bot policy. Only authenticated players seated at tables participate in live matches. Games begin only when genuine players join and trigger the authoritative 15-second countdown.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white">4. Strict Anti-Collusion & Anti-Fraud</h2>
          <p>
            Automated monitoring flags irregular play patterns, deliberate chip dumping, and suspicious table interactions. Offending accounts are permanently banned and balances seized.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
