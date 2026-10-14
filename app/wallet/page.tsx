'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Coins,
  PlusCircle,
  ArrowUpRight,
  History,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowDownLeft,
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { WalletTransaction } from '@/lib/types';

export default function WalletPage() {
  const { user, profile, wallet } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      limit(5)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as WalletTransaction);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTransactions(list);
        setLoadingTxs(false);
      },
      (err) => {
        console.warn('Wallet transactions listener:', err);
        setLoadingTxs(false);
      }
    );
    return () => unsub();
  }, [user]);

  const depositBal = wallet?.depositBalance || 0;
  const winBal = wallet?.winBalance || 0;
  const bonusBal = wallet?.bonusBalance || 0;
  const totalPlayable = (depositBal || 0) + (winBal || 0) + (bonusBal || 0);

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Rummy Adda Wallet</h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Play any match using your deposit, winnings, and ₹20 welcome bonus. Withdraw anytime when winnings exceed ₹100.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/wallet/deposit"
                className="flex items-center gap-1.5 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-transform hover:scale-105"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ ADD CASH</span>
              </Link>
              <Link
                href="/wallet/withdraw"
                className={`flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-bold text-xs border transition-colors ${
                  winBal >= 100
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>WITHDRAW</span>
              </Link>
            </div>
          </div>

          {/* Rule banner: Play with deposit/winnings/bonus, withdraw if >= 100 */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">100% Transparent Wallet System</p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  • <strong>Deposited Cash</strong>: 100% playable in any match format.<br />
                  • <strong>Bonus Balance (₹20 on Signup)</strong>: Permanently non-withdrawable game credits. Used to enter tables when deposited cash is zero (e.g. ₹20 Micro Stakes tables). All winnings won from playing with this bonus go directly to your Winnings Balance!<br />
                  • <strong>Winnings Balance</strong>: 100% genuine net winnings from completed matches. Fully withdrawable to UPI/Bank once reaching the ₹100 threshold.
                </p>
              </div>
            </div>
          </div>

          {/* Total Playable Balance Spotlight */}
          <div className="bg-gradient-to-r from-[#171827] via-[#1a1528] to-[#12131f] border border-amber-500/30 rounded-2xl p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">Total Playable Balance</span>
              <p className="text-3xl sm:text-4xl font-black text-white">
                ₹{totalPlayable.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-400">
                Deposit Balance (₹{depositBal.toLocaleString('en-IN')}) + Winnings Balance (₹{winBal.toLocaleString('en-IN')}) + Bonus Balance (₹{bonusBal.toLocaleString('en-IN')})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/lobby"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-sm hover:scale-105 transition-transform shadow-lg shadow-amber-500/30"
              >
                FIND MATCH
              </Link>
            </div>
          </div>

          {/* Three Distinct Balances: Deposit, Winnings & Bonus */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Deposit Balance */}
            <div className="bg-[#12131e] border border-white/10 rounded-2xl p-6 relative shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-slate-300 tracking-wider">Deposited Balance</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">100% Playable</span>
              </div>
              <p className="text-3xl font-black text-white">
                ₹{depositBal.toLocaleString('en-IN')}
              </p>
              <p className="text-[12px] text-slate-400">
                Used first to join any table format (Points, Pool 101, or Deals Rummy).
              </p>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Instant WhatsApp Deposit</span>
                <Link href="/wallet/deposit" className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1">
                  + Add Funds →
                </Link>
              </div>
            </div>

            {/* Winnings Balance */}
            <div className="bg-gradient-to-br from-[#121a1b] to-[#0d1414] border border-emerald-500/30 rounded-2xl p-6 relative shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Winnings Balance</span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                  winBal >= 100
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {winBal >= 100 ? 'Withdrawable (≥ ₹100)' : 'Playable (< ₹100)'}
                </span>
              </div>
              <p className="text-3xl font-black text-emerald-400">
                ₹{winBal.toLocaleString('en-IN')}
              </p>
              <p className="text-[12px] text-slate-400">
                {winBal >= 100
                  ? 'This balance can be immediately withdrawn to your UPI or bank account.'
                  : 'Withdrawal requires minimum ₹100 winnings. You can use this amount to play and reach ₹100+.'}
              </p>
              <div className="pt-3 border-t border-emerald-500/10 flex items-center justify-between">
                {winBal >= 100 ? (
                  <Link href="/wallet/withdraw" className="text-xs text-emerald-300 hover:underline font-bold flex items-center gap-1">
                    Withdraw (₹{winBal.toLocaleString('en-IN')}) →
                  </Link>
                ) : (
                  <span className="text-[11px] text-slate-500">Withdrawal unlocks at ₹100+</span>
                )}
              </div>
            </div>

            {/* Bonus Balance (Non-withdrawable game credits) */}
            <div className="bg-gradient-to-br from-[#1a1420] to-[#130f18] border border-purple-500/30 rounded-2xl p-6 relative shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-purple-300 tracking-wider">Bonus Balance</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
                  Game Credits Only
                </span>
              </div>
              <p className="text-3xl font-black text-purple-300">
                ₹{bonusBal.toLocaleString('en-IN')}
              </p>
              <p className="text-[12px] text-slate-400">
                Non-withdrawable game credits. Used when deposited cash is zero (e.g. ₹20 Micro Stakes tables). All match winnings go to Winnings Balance and are withdrawable!
              </p>
              <div className="pt-3 border-t border-purple-500/10 flex items-center justify-between">
                <span className="text-[11px] text-purple-400/80 font-medium">Non-withdrawable</span>
                <Link href="/match/stakes?format=points" className="text-xs text-purple-300 hover:text-purple-200 font-bold flex items-center gap-1">
                  Play ₹20 Match →
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Ledger History */}
          <div className="bg-[#10111a] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Recent Ledger Transactions</h3>
              </div>
              <Link href="/wallet/transactions" className="text-xs text-amber-400 hover:underline font-bold">
                View All Ledger Entries →
              </Link>
            </div>

            {loadingTxs ? (
              <p className="text-xs text-slate-400 py-4 text-center">Loading transaction history...</p>
            ) : transactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <p>No transactions recorded yet.</p>
                <p className="mt-1">Play cash tables or add funds to see transaction entries.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {transactions.map((tx) => {
                  const isCredit = tx.type === 'game_win' || tx.type === 'deposit' || tx.type === 'reward';
                  return (
                    <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isCredit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-white capitalize">{tx.description || tx.type.replace('_', ' ')}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(tx.createdAt).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`font-black ${isCredit ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {isCredit ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                        </p>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
