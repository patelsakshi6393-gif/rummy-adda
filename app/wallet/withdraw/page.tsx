'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  ArrowLeft,
  Building,
  QrCode,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  Percent,
  MessageCircle,
  Copy,
  ExternalLink,
  Coins,
} from 'lucide-react';
import { doc, setDoc, updateDoc, collection, query, where, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { WithdrawalRequest, UserWallet, WalletTransaction } from '@/lib/types';
import { getShortPlayerId, getUserMobile } from '@/lib/utils';

const OFFICIAL_WHATSAPP_NUMBER = '917466990584';

export default function WithdrawPage() {
  const router = useRouter();
  const { user, profile, wallet } = useAuth();

  const [method, setMethod] = useState<'upi' | 'bank'>('upi');
  const [amount, setAmount] = useState<string>('100');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  const winBalance = wallet?.winBalance || 0;
  const depositBalance = wallet?.depositBalance || 0;
  const bonusBalance = wallet?.bonusBalance || 0;

  useEffect(() => {
    if (profile) {
      const detected = getUserMobile(profile.phone, profile.email);
      if (detected) setMobileNumber(detected);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'withdrawals'), where('uid', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as WithdrawalRequest);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWithdrawals(list);
      },
      (err) => {
        console.warn('Withdrawals listener:', err);
      }
    );
    return () => unsub();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!user || !profile || !wallet) return;

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount < 100) {
      setErrorMsg('Minimum withdrawal amount is ₹100.');
      return;
    }
    if (numAmount > winBalance) {
      setErrorMsg(`Insufficient winnings balance. You can withdraw up to ₹${winBalance.toLocaleString('en-IN')}.`);
      return;
    }

    const feePercent = 0;
    const platformFee = 0;
    const netPayable = numAmount;

    let maskedDest = '';
    let rawDest = '';
    if (method === 'upi') {
      if (!upiId.includes('@')) {
        setErrorMsg('Please enter a valid UPI ID (e.g., player@okhdfcbank).');
        return;
      }
      maskedDest = `${upiId.slice(0, 3)}***@${upiId.split('@')[1]}`;
      rawDest = upiId.trim();
    } else {
      if (!accountNumber || !ifsc || !accountHolder) {
        setErrorMsg('Please fill in all bank account details.');
        return;
      }
      maskedDest = `A/C ending in ...${accountNumber.slice(-4)} (${ifsc.toUpperCase()})`;
      rawDest = `${accountHolder.trim()} | A/C: ${accountNumber.trim()} | IFSC: ${ifsc.trim().toUpperCase()}`;
    }

    const cleanMobile = mobileNumber.replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) {
      setErrorMsg('कृपया अपना 10-अंकों का वैध मोबाइल नंबर दर्ज करें (Please enter a valid 10-digit mobile number).');
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('rummy_user_mobile', cleanMobile);
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const walletRef = doc(db, 'wallets', user.uid);
      const withdrawalRef = doc(collection(db, 'withdrawals'));
      const withdrawalId = withdrawalRef.id;
      const transactionRef = doc(collection(db, 'transactions'));
      const txId = transactionRef.id;

      await runTransaction(db, async (tx) => {
        const wSnap = await tx.get(walletRef);
        if (!wSnap.exists()) {
          throw new Error('Wallet not found. Please refresh.');
        }
        const wData = wSnap.data() as UserWallet;
        const currentWinBal = wData.winBalance || 0;
        if (currentWinBal < numAmount) {
          throw new Error(`Insufficient winnings balance. You currently have ₹${currentWinBal.toLocaleString('en-IN')}.`);
        }

        const newWinBalance = Math.max(0, currentWinBal - numAmount);

        const newRequest: WithdrawalRequest = {
          withdrawalId,
          uid: user.uid,
          playerId: profile.playerId,
          playerName: profile.displayName || 'Player',
          amount: numAmount,
          feePercent,
          platformFee,
          netPayableAmount: netPayable,
          method,
          maskedDestination: maskedDest,
          rawDestination: rawDest,
          status: 'pending',
          createdAt: now,
        };

        const walletTx: WalletTransaction = {
          id: txId,
          uid: user.uid,
          type: 'withdrawal',
          amount: numAmount,
          currency: 'INR',
          status: 'pending',
          description: `Withdrawal of ₹${numAmount} (0% Fee, Net: ₹${netPayable}) to ${method.toUpperCase()} (${maskedDest})`,
          referenceId: withdrawalId,
          createdAt: now,
        };

        // 1. Queue withdrawal request
        tx.set(withdrawalRef, newRequest);

        // 2. Atomically minus the gross balance from wallet
        tx.update(walletRef, {
          winBalance: newWinBalance,
          updatedAt: now,
        });

        // 3. Log ledger transaction
        tx.set(transactionRef, walletTx);
      });

      // Navigate to confirmation page with prefilled WhatsApp message & receipt
      router.push(
        `/wallet/withdraw/confirmation?withdrawalId=${encodeURIComponent(withdrawalId)}&amount=${numAmount}&fee=${platformFee}&net=${netPayable}&method=${method}&dest=${encodeURIComponent(method === 'upi' ? rawDest : maskedDest)}&mobile=${encodeURIComponent(cleanMobile)}&acct=${encodeURIComponent(accountNumber)}&ifsc=${encodeURIComponent(ifsc)}&holder=${encodeURIComponent(accountHolder)}`
      );
    } catch (err: unknown) {
      console.error('Withdrawal error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to submit withdrawal request.';
      setErrorMsg(msg);
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Link href="/wallet" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Wallet</span>
          </Link>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Withdraw Winnings</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Cash out your game winnings directly to your verified UPI handle or Bank Account.
            </p>
          </div>

          {/* Prototype Safety Notice */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <strong>Prototype Notice:</strong> In this development prototype, withdrawal requests are logged as <strong>PENDING</strong> for demonstration without live bank settlement.
            </p>
          </div>

          {/* Withdrawable Balance Pod & Breakdown */}
          <div className="bg-[#12131e] border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Withdrawable Winnings Balance</span>
                <p className="text-3xl font-black text-emerald-400 mt-0.5">
                  ₹{winBalance.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-slate-400">100% genuine net winnings from completed matches</p>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-400 block">Min Cashout</span>
                <span className="text-amber-400 font-black text-sm">₹100</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/5 text-xs">
              <div className="bg-[#090a12] p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Non-Withdrawable Bonus Balance:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">Playable Only</span>
                </div>
                <p className="text-sm font-bold text-purple-300">₹{bonusBalance.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Permanently non-withdrawable starter credits used for table entries.</p>
              </div>

              <div className="bg-[#090a12] p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Deposited Cash Balance:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">Playable Only</span>
                </div>
                <p className="text-sm font-bold text-slate-200">₹{depositBalance.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Playable in match tables; play to convert into withdrawable winnings.</p>
              </div>
            </div>
          </div>

          {winBalance < 100 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold">Minimum Winnings of ₹100 Required for Withdrawal</p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Your current winnings balance is ₹{winBalance}. Winnings above ₹100 can be withdrawn directly. Winnings below ₹100 cannot be withdrawn yet, but can be used immediately to play any match to increase your balance to ₹100+.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Withdrawal Form */}
          <form onSubmit={handleSubmit} className="bg-[#12131e] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Player details (Short 4-digit ID + Name) */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#0a0b12] border border-white/5 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Player Name & ID</span>
                <p className="font-mono text-sm font-black text-amber-400">
                  {profile?.displayName || 'Player'} (#{getShortPlayerId(profile?.playerId)})
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-bold">WhatsApp Payout Desk</span>
                <p className="text-xs font-bold text-emerald-400">Verified Support</p>
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
                Payout confirmation message will be pre-filled with this mobile number.
              </p>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Choose Payout Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod('upi')}
                  className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
                    method === 'upi'
                      ? 'bg-amber-500/10 border-amber-400 text-white shadow-lg shadow-amber-500/10'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-amber-400" />
                  <div className="text-left">
                    <p className="text-xs font-bold">UPI Transfer</p>
                    <p className="text-[10px] text-slate-400">GPay, PhonePe, Paytm, BHIM</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('bank')}
                  className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
                    method === 'bank'
                      ? 'bg-amber-500/10 border-amber-400 text-white shadow-lg shadow-amber-500/10'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Building className="w-5 h-5 text-amber-400" />
                  <div className="text-left">
                    <p className="text-xs font-bold">Bank Transfer</p>
                    <p className="text-[10px] text-slate-400">IMPS / NEFT directly to Bank</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Withdrawal Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-amber-400">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="100"
                  max={winBalance}
                  required
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white font-mono text-lg font-bold focus:outline-none focus:border-amber-400 transition-all"
                />
              </div>
            </div>

            {/* Destination Form Fields */}
            {method === 'upi' ? (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  UPI ID (VPA)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. username@upi or player@okhdfcbank"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400 transition-all"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="As registered in your bank"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400 transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Account Number"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white text-sm uppercase focus:outline-none focus:border-amber-400 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Live 0% Withdrawal Fee & Dene Wala Balance Calculation */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#090a12] border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  Cashout Settlement Breakdown (0% Withdrawal Fee)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  0% Fee (Free Cashout)
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Requested Cashout Amount:</span>
                  <span className="font-mono font-bold text-white">₹{(parseInt(amount, 10) || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Withdrawal Platform Fee (0%):</span>
                  <span className="font-mono font-bold text-emerald-400">₹0 (Free)</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="font-black text-emerald-400 text-sm block">Dene Wala Balance (Aapko Milne Wali Rashi):</span>
                    <span className="text-[10px] text-slate-400">100% full payout transferred to your {method === 'upi' ? 'UPI' : 'Bank'} with zero withdrawal deduction</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                    ₹{(parseInt(amount, 10) || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                💡 <strong>Important:</strong> विड्रॉल के समय ₹0 कटता है (0% Fee)। 14% प्लेटफॉर्म फीस केवल मैच जीतते समय ऑटोमेटिक कटती है, इसलिए आपका पूरा विथड्रॉल अमाउंट (₹{(parseInt(amount, 10) || 0).toLocaleString('en-IN')}) आपके खाते में भेजा जाएगा।
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || winBalance < 100 || (parseInt(amount, 10) || 0) > winBalance || (parseInt(amount, 10) || 0) < 100}
              className="w-full py-4 px-6 rounded-xl font-black text-slate-950 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting Cashout Request...</span>
                </>
              ) : (
                <span>SUBMIT CASHOUT REQUEST</span>
              )}
            </button>
          </form>

          {/* Past Withdrawals */}
          {withdrawals.length > 0 && (
            <div className="bg-[#12131e] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white border-b border-white/5 pb-3 flex items-center justify-between">
                <span>Your Withdrawal Requests</span>
                <span className="text-xs text-slate-400 font-normal">0% Fee applied at cashout</span>
              </h3>
              <div className="divide-y divide-white/5 text-xs">
                {withdrawals.map((w) => {
                  const fee = w.platformFee ?? 0;
                  const net = w.netPayableAmount ?? w.amount;
                  const shortId = getShortPlayerId(w.playerId);
                  const waMsg = `*RUMMY ADDA - WITHDRAWAL STATUS*\nPlayer: ${profile?.displayName || 'Player'} (#${shortId})\nWithdraw: ₹${w.amount} | Net: ₹${net}\nDestination: ${w.maskedDestination}\n\nHello, कृपया मेरे विड्रॉल स्टेटस की जानकारी दें।`;
                  const waUrl = `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;

                  return (
                    <div key={w.withdrawalId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white capitalize">{w.method} Payout</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              w.status === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : w.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {w.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{w.maskedDestination}</p>
                        <p className="text-[10px] text-slate-500">{new Date(w.createdAt).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 block">Dene Wala Balance:</span>
                          <p className="text-base font-black text-emerald-400 font-mono">
                            ₹{net.toLocaleString('en-IN')}
                          </p>
                          <span className="text-[10px] text-slate-500 block">
                            Gross: ₹{w.amount} | Fee: ₹{fee}
                          </span>
                        </div>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] flex items-center gap-1.5 transition-all"
                          title="Open WhatsApp with Prefilled Request"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
