'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, History, Filter } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { WalletTransaction } from '@/lib/types';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'transactions'), where('uid', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as WalletTransaction);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTransactions(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Transactions listener:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const filtered = transactions.filter((t) => {
    if (filterType === 'all') return true;
    if (filterType === 'deposit' && t.type === 'deposit') return true;
    if (filterType === 'withdrawal' && t.type === 'withdrawal') return true;
    if (filterType === 'game_win' && t.type === 'game_win') return true;
    if (filterType === 'game_loss' && t.type === 'game_loss') return true;
    if (filterType === 'game_entry' && t.type === 'game_entry') return true;
    return false;
  });

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Link href="/wallet" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Wallet</span>
          </Link>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Transaction Ledger</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Complete historical record of your wallet deposits, game winnings, table stakes, and cashouts.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'All Entries' },
              { id: 'game_win', label: 'Game Wins' },
              { id: 'game_loss', label: 'Game Losses' },
              { id: 'deposit', label: 'Deposits' },
              { id: 'withdrawal', label: 'Withdrawals' },
              { id: 'game_entry', label: 'Table Entries' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                  filterType === f.id
                    ? 'bg-amber-500 text-black shadow'
                    : 'bg-[#12131e] text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Ledger Table */}
          <div className="bg-[#12131e] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            {loading ? (
              <p className="text-xs text-slate-400 p-8 text-center">Loading ledger...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center p-12 text-xs text-slate-500">
                <History className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p>No transactions found for this filter.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map((tx) => {
                  const isCredit = tx.type === 'game_win' || tx.type === 'deposit' || tx.type === 'reward';
                  return (
                    <div key={tx.id} className="p-4 sm:p-5 flex items-center justify-between text-xs hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isCredit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm capitalize">
                            {tx.description || tx.type.replace('_', ' ')}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>{new Date(tx.createdAt).toLocaleString('en-IN')}</span>
                            {tx.referenceId && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-slate-500">Ref: {tx.referenceId}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`text-base font-black ${isCredit ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {isCredit ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                        </p>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                            tx.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : tx.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
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
