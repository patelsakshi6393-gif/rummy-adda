'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Clock, CheckCircle2, XCircle, ArrowLeft, MessageCircle, AlertCircle } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DepositRequest } from '@/lib/types';

export default function PendingDepositsPage() {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'deposits'), where('uid', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as DepositRequest);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDeposits(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Deposits listener:', err);
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

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Deposit Requests</h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Track status of your WhatsApp support deposit requests.
              </p>
            </div>
            <Link
              href="/wallet/deposit"
              className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
            >
              + New Deposit Request
            </Link>
          </div>

          <div className="bg-[#12131e] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
            {loading ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading requests...</p>
            ) : deposits.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs space-y-3">
                <Clock className="w-8 h-8 mx-auto text-slate-600" />
                <p>No deposit requests found.</p>
                <Link href="/wallet/deposit" className="inline-block text-amber-400 font-bold hover:underline">
                  Initiate your first deposit request
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {deposits.map((dep) => {
                  const isPending = dep.status === 'pending';
                  const isApproved = dep.status === 'approved';
                  return (
                    <div key={dep.depositId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white">
                            Ref: {dep.depositId}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isPending
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : isApproved
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {dep.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Requested at: {new Date(dep.createdAt).toLocaleString('en-IN')}
                        </p>
                        {dep.adminNote && (
                          <p className="text-[11px] text-slate-300 mt-0.5 italic">Note: {dep.adminNote}</p>
                        )}
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-base font-black text-amber-300">
                          ₹{dep.requestedAmount.toLocaleString('en-IN')}
                        </span>
                        {isPending && (
                          <p className="text-[10px] text-slate-500">Awaiting external support review</p>
                        )}
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
