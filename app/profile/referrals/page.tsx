'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Share2, ArrowLeft, Copy, Check, MessageCircle, Users, Gift } from 'lucide-react';

export default function ReferralsPage() {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralCode = profile?.playerId ? profile.playerId.replace('RA-', 'REF') : 'REFROYAL';
  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : `https://rummyadda.app/signup?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsAppUrl = `https://wa.me/?text=${encodeURIComponent(
    `Join me on RummyAdda - India's authentic real-time Indian Rummy platform! Use my referral code ${referralCode} for welcome bonuses: ${referralLink}`
  )}`;

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
            <h1 className="text-2xl sm:text-3xl font-black text-white">Refer & Earn</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Invite friends to the RummyAdda salon using your personal referral code.
            </p>
          </div>

          {/* Referral Card */}
          <div className="bg-gradient-to-br from-[#19111c] to-[#0e0a12] border border-rose-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Your Personal Referral Code</span>
                <p className="text-3xl font-black text-amber-400 font-mono mt-1">{referralCode}</p>
                <p className="text-xs text-slate-400 mt-1">Share this code with your contacts upon signup.</p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleCopy}
                  className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-2 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                  <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
                </button>

                <a
                  href={shareWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-transform hover:scale-105"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* How it works */}
            <div className="space-y-3 text-xs">
              <h3 className="font-bold text-white text-sm">How Referral Works</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[#090a12] border border-white/5 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center text-[10px]">1</span>
                  <p className="font-bold text-white">Share Your Link</p>
                  <p className="text-slate-400 text-[11px]">Send your referral invite to friends via WhatsApp or social channels.</p>
                </div>

                <div className="p-4 rounded-xl bg-[#090a12] border border-white/5 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px]">2</span>
                  <p className="font-bold text-white">Friend Registers</p>
                  <p className="text-slate-400 text-[11px]">They create an account and receive their unique RummyAdda Player ID.</p>
                </div>

                <div className="p-4 rounded-xl bg-[#090a12] border border-white/5 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">3</span>
                  <p className="font-bold text-white">Both Earn Rewards</p>
                  <p className="text-slate-400 text-[11px]">Earn reward points and bonus credits on their cash table games.</p>
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
