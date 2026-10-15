'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  MessageCircle,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DepositRequest } from '@/lib/types';
import { getShortPlayerId, getUserMobile } from '@/lib/utils';

const PRESET_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];
const OFFICIAL_WHATSAPP_NUMBER = '919277182389';

export default function DepositPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('1000');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (profile) {
      const detected = getUserMobile(profile.phone, profile.email);
      if (detected) setMobileNumber(detected);
    }
  }, [profile]);

  const handleSelectPreset = (val: number) => {
    setAmount(val);
    setCustomAmount(val.toString());
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(val);
    const parsed = parseInt(val, 10);
    setAmount(isNaN(parsed) ? 0 : parsed);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user || !profile) return;
    if (amount < 50) {
      setErrorMsg('Minimum deposit request is ₹50.');
      return;
    }
    if (amount > 100000) {
      setErrorMsg('Maximum deposit request per transaction is ₹1,00,000.');
      return;
    }

    const cleanMobile = mobileNumber.replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) {
      setErrorMsg('कृपया अपना 10-अंकों का वैध मोबाइल नंबर दर्ज करें (Please enter a valid 10-digit mobile number).');
      return;
    }

    // Persist mobile for seamless future transactions
    if (typeof window !== 'undefined') {
      localStorage.setItem('rummy_user_mobile', cleanMobile);
    }

    setSubmitting(true);
    try {
      const depositId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const newDeposit: DepositRequest = {
        depositId,
        uid: user.uid,
        playerId: profile.playerId,
        requestedAmount: amount,
        status: 'pending',
        whatsappOpenedAt: now,
        createdAt: now,
      };

      await setDoc(doc(db, 'deposits', depositId), newDeposit);

      // Clean short WhatsApp message as requested: Player ID (2-4 digits + name), Mobile, Pre-filled amount
      const shortId = getShortPlayerId(profile.playerId);
      const userDisplayName = profile.displayName || 'Player';
      const formattedAmount = amount.toLocaleString('en-IN');
      const messageText = 
`*RUMMY ADDA - DEPOSIT*
Player: ${userDisplayName} (#${shortId})
Mobile: ${cleanMobile}
Deposit Amount: ₹${formattedAmount}

Hello, मुझे ₹${formattedAmount} डिपॉजिट करना है। कृपया QR Code / UPI Details भेजें।`;

      const waUrl = `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(messageText)}`;

      // Open WhatsApp directly with full details in new tab / app
      if (typeof window !== 'undefined') {
        window.open(waUrl, '_blank');
      }

      // Navigate to handoff page with details
      router.push(`/wallet/deposit/whatsapp?depositId=${encodeURIComponent(depositId)}&amount=${amount}&mobile=${encodeURIComponent(cleanMobile)}`);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to create deposit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Link href="/wallet" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Wallet</span>
          </Link>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Add Cash / Deposit Request</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select your chip amount to prepare your verified WhatsApp support deposit request.
            </p>
          </div>

          {/* Prototype Safety Notice */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Important Flow & Prototype Notice</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Opening WhatsApp generates a verified <strong>PENDING</strong> request. Opening WhatsApp does <strong>NOT</strong> mean payment was charged, sent, or automatically credited. RummyAdda support verifies requests externally before manual adjustment.
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Deposit Form */}
          <form onSubmit={handleSubmit} className="bg-[#12131e] border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Player details (Short 4-digit ID + Name) */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#0a0b12] border border-white/5 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Player Name & ID</span>
                <p className="font-mono text-sm font-black text-amber-400">
                  {profile?.displayName || 'Player'} (#{getShortPlayerId(profile?.playerId)})
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-bold">WhatsApp Desk</span>
                <p className="text-xs font-bold text-emerald-400">Verified Support Desk</p>
              </div>
            </div>

            {/* Mobile Number Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Mobile Number
                </label>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                  हिंदी: आपका मोबाइल नंबर
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 font-mono">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="10-digit mobile number"
                  required
                  className="w-full pl-14 pr-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white font-mono text-base font-bold focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all placeholder:text-slate-600"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Deposit update confirmation will be sent to this WhatsApp mobile number.
              </p>
            </div>

            {/* Chip Presets */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Select Chip Amount
                </label>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                  हिंदी: राशि चुनें
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {PRESET_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSelectPreset(val)}
                    className={`py-3 px-2 rounded-xl text-center font-extrabold text-xs transition-all ${
                      amount === val
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/20 scale-105'
                        : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
                    }`}
                  >
                    ₹{val.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Or Enter Custom Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-amber-400">₹</span>
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomChange}
                  placeholder="Min ₹50"
                  required
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white font-mono text-lg font-bold focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                />
              </div>
            </div>

            {/* WhatsApp Handoff Action */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={submitting || amount < 50}
                className="w-full py-4 px-6 rounded-xl font-black text-slate-950 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Preparing Request...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5 fill-current" />
                    <span>SEND ON WHATSAPP (₹{amount.toLocaleString('en-IN')})</span>
                  </>
                )}
              </button>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <p className="text-xs text-amber-300 font-semibold">
                  💡 सेंड दबाते ही यह मेसेज WhatsApp पर सीधा चला जाएगा।
                </p>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-1">
                <Link href="/wallet/deposit/pending" className="hover:text-amber-400 underline">
                  View Your Pending Deposit Requests
                </Link>
              </div>
            </div>
          </form>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
