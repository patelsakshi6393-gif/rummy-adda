'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { getReferralLink, getCodeFromPlayerId } from '@/lib/referral-service';
import { Share2, ArrowLeft, Copy, Check, MessageCircle, Users, Gift, Coins, Sparkles } from 'lucide-react';

export default function ReferralsPage() {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralCode = profile?.playerId ? getCodeFromPlayerId(profile.playerId) : 'REFROYAL';
  const referralLink = getReferralLink(referralCode);

  const totalReferrals = profile?.totalReferrals || 0;
  const referralEarnings = profile?.referralEarnings || 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsAppUrl = `https://wa.me/?text=${encodeURIComponent(
    `Join me on RummyAdda - India's authentic real-time Indian Rummy platform!\n\n🎁 Register using my referral code *${referralCode}* to get *20 + 20 = 40 FREE CHIPS* instantly!\n\n100% Real Players & Instant Cash Games:\n👉 ${referralLink}`
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Earn 50 Chips Per Friend</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Refer & Earn</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Give your friends 20 + 20 = 40 Free Chips, and earn 50 Chips for every friend who registers!
            </p>
          </div>

          {/* Referral Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#11121d] border border-white/10 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Total Friends Joined</span>
              </span>
              <p className="text-3xl font-black text-white font-mono">{totalReferrals}</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#11121d] border border-white/10 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Total Referral Chips Earned</span>
              </span>
              <p className="text-3xl font-black text-amber-300 font-mono">+{referralEarnings}</p>
            </div>
          </div>

          {/* Referral Card */}
          <div className="bg-gradient-to-br from-[#19111c] to-[#0e0a12] border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Your Personal Referral Code</span>
                <p className="text-3xl sm:text-4xl font-black text-amber-400 font-mono tracking-widest mt-1 select-all">{referralCode}</p>
                <p className="text-xs text-slate-400 mt-1">Share this code with your contacts upon signup.</p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={handleCopy}
                  className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                  <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
                </button>

                <a
                  href={shareWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-transform hover:scale-105 cursor-pointer"
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
                <div className="p-4 rounded-xl bg-[#090a12] border border-white/5 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">1</span>
                  <p className="font-bold text-white text-sm">Share Your Code</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Send your referral link or code {referralCode} to friends via WhatsApp or social media.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#090a12] border border-white/5 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">2</span>
                  <p className="font-bold text-white text-sm">Friend Gets 20 + 20 Chips</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    When your friend signs up with your code, they immediately get <strong>20 Deposit + 20 Bonus Chips</strong>!
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#090a12] border border-white/5 space-y-1.5">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-xs">3</span>
                  <p className="font-bold text-white text-sm">You Get 50 Chips</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    You instantly receive <strong>50 Free Chips</strong> credited to your account for each successful referral!
                  </p>
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
