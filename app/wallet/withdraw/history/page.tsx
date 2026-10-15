'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ArrowLeft, Clock, Building, QrCode, MessageCircle, ExternalLink, Percent } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { WithdrawalRequest } from '@/lib/types';

const OFFICIAL_WHATSAPP_NUMBER = '919277182389';

export default function WithdrawalHistoryPage() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'withdrawals'), where('uid', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as WithdrawalRequest);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWithdrawals(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Withdrawals history listener:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Link href="/wallet" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Wallet</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-black text-white">Withdrawal History</h1>
              <p className="text-xs text-slate-400 mt-0.5">0% Withdrawal Fee (100% full payout transferred)</p>
            </div>
            <Link
              href="/wallet/withdraw"
              className="py-2 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs self-start sm:self-auto"
            >
              New Withdrawal
            </Link>
          </div>
          <div className="bg-[#12131e] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
            {loading ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading history...</p>
            ) : withdrawals.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No withdrawal requests found.</p>
            ) : (
              <div className="divide-y divide-white/5 text-xs">
                {withdrawals.map((w) => {
                  const fee = w.platformFee ?? 0;
                  const net = w.netPayableAmount ?? w.amount;
                  const waMsg = `*RUMMY ADDA - WITHDRAWAL STATUS ENQUIRY*\n• *Player ID:* ${w.playerId}\n• *Withdrawal Ref:* ${w.withdrawalId}\n• *Gross Amount:* ₹${w.amount}\n• *Platform Fee:* ₹${fee}\n• *Dene Wala Balance (Net Payable):* ₹${net}\n• *Destination:* ${w.maskedDestination}\n\nHello Support Team, please verify my withdrawal of ₹${net} (Dene Wala Balance).`;
                  const waUrl = `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;

                  return (
                    <div key={w.withdrawalId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white capitalize">{w.method} Payout</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              w.status === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : w.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                            }`}
                          >
                            {w.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{w.maskedDestination}</p>
                        <p className="text-[10px] text-slate-500">{new Date(w.createdAt).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 block font-bold">Dene Wala Balance:</span>
                          <p className="text-base font-black text-emerald-400 font-mono">
                            ₹{net.toLocaleString('en-IN')}
                          </p>
                          <span className="text-[10px] text-slate-500 block font-mono">
                            Gross: ₹{w.amount} | Fee: ₹{fee}
                          </span>
                        </div>
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] flex items-center gap-1.5 transition-all"
                          title="Open WhatsApp Support Desk"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
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
