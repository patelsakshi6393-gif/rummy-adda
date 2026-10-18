'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Search,
  RefreshCw,
  AlertCircle,
  Coins,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  runTransaction,
  updateDoc,
  getDoc,
  getDocs,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DepositRequest, WithdrawalRequest, UserWallet, WalletTransaction } from '@/lib/types';

export default function AdminPanelPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'deposits' | 'wallet-adjust'>('withdrawals');

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Quick player lookup state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedWallet, setSearchedWallet] = useState<{ uid: string; playerId: string; wallet: UserWallet } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('100');
  const isAdmin =
    user?.email === 'supportalkabrain@gmail.com' ||
    user?.email === '9118431155@rummyadda.app' ||
    user?.email === '9118431155@phone.rummyadda.in' ||
    profile?.phone === '9118431155' ||
    profile?.role === 'admin';

  // Real-time listener for withdrawals
  useEffect(() => {
    if (!isAdmin) return;
    const qW = query(collection(db, 'withdrawals'));
    const unsubW = onSnapshot(
      qW,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as WithdrawalRequest);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWithdrawals(list);
        setLoadingData(false);
      },
      (err) => {
        console.error('Withdrawals error:', err);
        setLoadingData(false);
      }
    );

    const qD = query(collection(db, 'deposits'));
    const unsubD = onSnapshot(
      qD,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as DepositRequest);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDeposits(list);
      },
      (err) => {
        console.error('Deposits error:', err);
      }
    );

    return () => {
      unsubW();
      unsubD();
    };
  }, [isAdmin]);

  // Handler: Approve Withdrawal (Mark as paid)
  const handleApproveWithdrawal = async (w: WithdrawalRequest) => {
    setActionLoading(w.withdrawalId);
    setFeedbackMsg(null);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'withdrawals', w.withdrawalId), {
        status: 'paid',
        processedAt: now,
      });

      const fee = w.platformFee ?? 0;
      const net = w.netPayableAmount ?? w.amount;
      setFeedbackMsg({
        text: `Withdrawal ${w.withdrawalId} marked as PAID. Dene Wala Balance: ₹${net.toLocaleString('en-IN')} (Gross: ₹${w.amount}, Fee: ₹${fee}).`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error(err);
      setFeedbackMsg({ text: 'Failed to approve withdrawal.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handler: Reject Withdrawal and Refund to user's winnings balance
  const handleRejectWithdrawal = async (w: WithdrawalRequest) => {
    setActionLoading(w.withdrawalId);
    setFeedbackMsg(null);
    try {
      const now = new Date().toISOString();
      const walletRef = doc(db, 'wallets', w.uid);
      const withdrawalRef = doc(db, 'withdrawals', w.withdrawalId);
      const txRef = doc(collection(db, 'transactions'));
      const txId = txRef.id;

      await runTransaction(db, async (tx) => {
        const wSnap = await tx.get(walletRef);
        if (!wSnap.exists()) {
          throw new Error('Player wallet not found.');
        }
        const wData = wSnap.data() as UserWallet;
        const newWinBalance = (wData.winBalance || 0) + w.amount;

        // Refund balance to player
        tx.update(walletRef, {
          winBalance: newWinBalance,
          updatedAt: now,
        });

        // Mark withdrawal rejected
        tx.update(withdrawalRef, {
          status: 'rejected',
          processedAt: now,
        });

        // Record refund ledger entry
        const refundTx: WalletTransaction = {
          id: txId,
          uid: w.uid,
          type: 'refund',
          amount: w.amount,
          currency: 'INR',
          status: 'completed',
          description: `Withdrawal rejected - ₹${w.amount} refunded to winnings balance`,
          referenceId: w.withdrawalId,
          createdAt: now,
        };
        tx.set(txRef, refundTx);
      });

      setFeedbackMsg({
        text: `Withdrawal ${w.withdrawalId} rejected. ₹${w.amount} successfully refunded to player's wallet balance!`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to reject and refund withdrawal.';
      setFeedbackMsg({ text: msg, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handler: Approve Deposit & Add Cash to player wallet
  const handleApproveDeposit = async (d: DepositRequest) => {
    setActionLoading(d.depositId);
    setFeedbackMsg(null);
    try {
      const now = new Date().toISOString();
      const walletRef = doc(db, 'wallets', d.uid);
      const depositRef = doc(db, 'deposits', d.depositId);
      const txRef = doc(collection(db, 'transactions'));
      const txId = txRef.id;

      await runTransaction(db, async (tx) => {
        const wSnap = await tx.get(walletRef);
        if (!wSnap.exists()) {
          throw new Error('Player wallet not found.');
        }
        const wData = wSnap.data() as UserWallet;
        const newDepositBalance = (wData.depositBalance || 0) + d.requestedAmount;

        // Update deposit balance
        tx.update(walletRef, {
          depositBalance: newDepositBalance,
          updatedAt: now,
        });

        // Update deposit status
        tx.update(depositRef, {
          status: 'approved',
          reviewedAt: now,
          reviewedBy: user?.email || 'admin',
        });

        // Record deposit transaction
        const depTx: WalletTransaction = {
          id: txId,
          uid: d.uid,
          type: 'deposit',
          amount: d.requestedAmount,
          currency: 'INR',
          status: 'completed',
          description: `Deposit approved by Admin (+₹${d.requestedAmount.toLocaleString('en-IN')})`,
          referenceId: d.depositId,
          createdAt: now,
        };
        tx.set(txRef, depTx);
      });

      setFeedbackMsg({
        text: `Deposit ${d.depositId} approved! ₹${d.requestedAmount} credited to Player (${d.playerId}) wallet automatically!`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to approve deposit.';
      setFeedbackMsg({ text: msg, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handler: Reject Deposit
  const handleRejectDeposit = async (d: DepositRequest) => {
    setActionLoading(d.depositId);
    setFeedbackMsg(null);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'deposits', d.depositId), {
        status: 'rejected',
        reviewedAt: now,
        reviewedBy: user?.email || 'admin',
      });

      setFeedbackMsg({
        text: `Deposit ${d.depositId} marked as rejected.`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error(err);
      setFeedbackMsg({ text: 'Failed to reject deposit.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // Lookup player wallet
  const handleSearchPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchedWallet(null);
    setFeedbackMsg(null);

    try {
      const term = searchQuery.trim();
      let foundUid = '';
      let foundPlayerId = '';

      // Check if it's already a UID
      const directWalletSnap = await getDoc(doc(db, 'wallets', term));
      if (directWalletSnap.exists()) {
        foundUid = term;
        foundPlayerId = term;
        const userSnap = await getDoc(doc(db, 'users', term));
        if (userSnap.exists()) {
          foundPlayerId = userSnap.data().playerId || term;
        }
        setSearchedWallet({
          uid: foundUid,
          playerId: foundPlayerId,
          wallet: directWalletSnap.data() as UserWallet,
        });
        return;
      }

      // Check by playerId in users
      const uQ = query(collection(db, 'users'), where('playerId', '==', term));
      const uSnap = await getDocs(uQ);
      if (!uSnap.empty) {
        const uDoc = uSnap.docs[0];
        foundUid = uDoc.id;
        foundPlayerId = uDoc.data().playerId || term;
        const wSnap = await getDoc(doc(db, 'wallets', foundUid));
        if (wSnap.exists()) {
          setSearchedWallet({
            uid: foundUid,
            playerId: foundPlayerId,
            wallet: wSnap.data() as UserWallet,
          });
          return;
        }
      }

      setFeedbackMsg({ text: `Player or Wallet with ID "${term}" not found.`, type: 'error' });
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ text: 'Search failed.', type: 'error' });
    } finally {
      setSearchLoading(false);
    }
  };

  // Direct wallet adjustment
  const handleAdjustWallet = async () => {
    if (!searchedWallet) return;
    const num = parseInt(adjustAmount, 10);
    if (isNaN(num) || num <= 0) return;

    setActionLoading('adjusting');
    try {
      const now = new Date().toISOString();
      const walletRef = doc(db, 'wallets', searchedWallet.uid);
      const txRef = doc(collection(db, 'transactions'));
      const txId = txRef.id;

      await runTransaction(db, async (tx) => {
        const wSnap = await tx.get(walletRef);
        if (!wSnap.exists()) throw new Error('Wallet not found');
        const wData = wSnap.data() as UserWallet;

        const updateData: Partial<UserWallet> = {
          updatedAt: now,
        };

        if (adjustType === 'deposit') {
          updateData.depositBalance = (wData.depositBalance || 0) + num;
        } else {
          updateData.winBalance = (wData.winBalance || 0) + num;
        }

        tx.update(walletRef, updateData);

        const newTx: WalletTransaction = {
          id: txId,
          uid: searchedWallet.uid,
          type: 'adjustment',
          amount: num,
          currency: 'INR',
          status: 'completed',
          description: `Admin manual balance adjustment (+₹${num} ${adjustType.toUpperCase()})`,
          createdAt: now,
        };
        tx.set(txRef, newTx);
      });

      // Refresh searched wallet
      const updatedSnap = await getDoc(walletRef);
      if (updatedSnap.exists()) {
        setSearchedWallet({
          ...searchedWallet,
          wallet: updatedSnap.data() as UserWallet,
        });
      }

      setFeedbackMsg({
        text: `Successfully added ₹${num} to player's ${adjustType} balance!`,
        type: 'success',
      });
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ text: 'Adjustment failed.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
          <Navbar />
          <main className="flex-1 max-w-lg mx-auto w-full px-4 py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white">Admin Access Restricted</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              This panel is restricted exclusively to authorized administrators (Admin ID: 9118431155).
            </p>
            <div className="pt-4">
              <Link
                href="/lobby"
                className="inline-flex items-center gap-2 py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all"
              >
                Return to Lobby
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Authority Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Financial & Wallet Management</h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Logged in as <strong className="text-amber-400">{user?.email}</strong>. Review deposits, manage cashouts, and control user balances.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin-panel"
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20"
              >
                WhatsApp Operations Desk
              </Link>
              <Link
                href="/wallet"
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200"
              >
                Go to Wallet
              </Link>
            </div>
          </div>

          {/* Feedback message banner */}
          {feedbackMsg && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-lg ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {feedbackMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
              <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>
          )}

          {/* Tab Selector */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'withdrawals'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdrawals ({withdrawals.filter((w) => w.status === 'pending').length} Pending)</span>
            </button>

            <button
              onClick={() => setActiveTab('deposits')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'deposits'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Deposits ({deposits.filter((d) => d.status === 'pending').length} Pending)</span>
            </button>

            <button
              onClick={() => setActiveTab('wallet-adjust')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'wallet-adjust'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Direct Wallet Tool</span>
            </button>
          </div>

          {/* TAB 1: WITHDRAWALS */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Total withdrawal requests recorded: <strong className="text-white">{withdrawals.length}</strong>
                </p>
                <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  Note: Balance is minus-ed automatically from player wallet when requested. Rejecting refunds it.
                </span>
              </div>

              {withdrawals.length === 0 ? (
                <div className="bg-[#12131e] border border-white/10 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  No withdrawal requests found.
                </div>
              ) : (
                <div className="bg-[#12131e] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#171827] text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                        <tr>
                          <th className="py-3 px-4">Player / User</th>
                          <th className="py-3 px-4">Amount & Dene Wala Balance (0% Fee)</th>
                          <th className="py-3 px-4">Method & Destination</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {withdrawals.map((w) => {
                          const fee = w.platformFee ?? 0;
                          const net = w.netPayableAmount ?? w.amount;

                          return (
                            <tr key={w.withdrawalId} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-bold text-white block">{w.playerName || w.playerId}</span>
                                <span className="text-[10px] font-mono text-slate-500">{w.uid.slice(0, 10)}...</span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Dene Wala:</span>
                                    <span className="text-base font-black text-emerald-400 font-mono">
                                      ₹{net.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    Gross: ₹{w.amount.toLocaleString('en-IN')} | Fee: ₹{fee.toLocaleString('en-IN')}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="capitalize font-bold text-white block">{w.method}</span>
                                <span className="text-[11px] text-slate-300 font-mono block select-all">
                                  {w.rawDestination || w.maskedDestination}
                                </span>
                              </td>
                            <td className="py-3 px-4">
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
                            </td>
                            <td className="py-3 px-4 text-[11px] text-slate-400">
                              {new Date(w.createdAt).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {w.status === 'pending' ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleApproveWithdrawal(w)}
                                    disabled={actionLoading === w.withdrawalId}
                                    className="py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-colors disabled:opacity-50"
                                  >
                                    {actionLoading === w.withdrawalId ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3 h-3" />
                                    )}
                                    <span>Mark Paid</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectWithdrawal(w)}
                                    disabled={actionLoading === w.withdrawalId}
                                    className="py-1.5 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-[11px] flex items-center gap-1 transition-colors disabled:opacity-50"
                                  >
                                    {actionLoading === w.withdrawalId ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <XCircle className="w-3 h-3" />
                                    )}
                                    <span>Reject & Refund</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">Completed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DEPOSITS */}
          {activeTab === 'deposits' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Total deposit requests: <strong className="text-white">{deposits.length}</strong>
                </p>
                <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  Approving deposit credits amount into player wallet automatically!
                </span>
              </div>

              {deposits.length === 0 ? (
                <div className="bg-[#12131e] border border-white/10 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  No deposit requests found.
                </div>
              ) : (
                <div className="bg-[#12131e] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#171827] text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                        <tr>
                          <th className="py-3 px-4">Player / User</th>
                          <th className="py-3 px-4">Requested Amount</th>
                          <th className="py-3 px-4">Reference ID</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {deposits.map((d) => (
                          <tr key={d.depositId} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-bold text-white block">{d.playerId}</span>
                              <span className="text-[10px] font-mono text-slate-500">{d.uid.slice(0, 10)}...</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-base font-black text-amber-400">₹{d.requestedAmount.toLocaleString('en-IN')}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-[11px] text-slate-300">{d.depositId}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  d.status === 'approved'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : d.status === 'rejected'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                                }`}
                              >
                                {d.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[11px] text-slate-400">
                              {new Date(d.createdAt).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {d.status === 'pending' ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleApproveDeposit(d)}
                                    disabled={actionLoading === d.depositId}
                                    className="py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-colors disabled:opacity-50"
                                  >
                                    {actionLoading === d.depositId ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3 h-3" />
                                    )}
                                    <span>Approve & Credit Wallet</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectDeposit(d)}
                                    disabled={actionLoading === d.depositId}
                                    className="py-1.5 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-[11px] flex items-center gap-1 transition-colors disabled:opacity-50"
                                  >
                                    {actionLoading === d.depositId ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <XCircle className="w-3 h-3" />
                                    )}
                                    <span>Reject</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">Resolved</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DIRECT WALLET ADJUST TOOL */}
          {activeTab === 'wallet-adjust' && (
            <div className="space-y-6">
              {/* Search Player Pod */}
              <form onSubmit={handleSearchPlayer} className="bg-[#12131e] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-amber-400" />
                  <span>Lookup Player Wallet</span>
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter Player ID (e.g. RA-XXXXXX) or Firebase UID"
                    className="flex-1 px-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 disabled:opacity-50"
                  >
                    {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>Lookup</span>
                  </button>
                </div>
              </form>

              {/* Searched Wallet Card */}
              {searchedWallet && (
                <div className="bg-[#12131e] border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Player Identified</span>
                      <h3 className="text-lg font-black text-white">{searchedWallet.playerId}</h3>
                      <p className="text-[10px] font-mono text-slate-500">{searchedWallet.uid}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-[#090a12] p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Deposit Bal</span>
                        <span className="text-base font-black text-amber-400">₹{(searchedWallet.wallet.depositBalance || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="bg-[#090a12] p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Win Bal</span>
                        <span className="text-base font-black text-emerald-400">₹{(searchedWallet.wallet.winBalance || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="bg-[#090a12] p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-purple-400 block">Bonus Bal</span>
                        <span className="text-base font-black text-purple-300">₹{(searchedWallet.wallet.bonusBalance || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="bg-[#090a12] p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Total Playable</span>
                        <span className="text-base font-black text-amber-300">₹{((searchedWallet.wallet.depositBalance || 0) + (searchedWallet.wallet.winBalance || 0) + (searchedWallet.wallet.bonusBalance || 0)).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Add Balance Control */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Credit Player Balance
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Balance Type</label>
                        <select
                          value={adjustType}
                          onChange={(e) => setAdjustType(e.target.value as 'deposit' | 'win')}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#090a12] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                        >
                          <option value="deposit">Deposit Balance (Playable)</option>
                          <option value="win">Win Balance (Withdrawable)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Amount (₹)</label>
                        <input
                          type="number"
                          value={adjustAmount}
                          onChange={(e) => setAdjustAmount(e.target.value)}
                          min="1"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#090a12] border border-white/10 text-white text-xs font-mono font-bold focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleAdjustWallet}
                          disabled={actionLoading === 'adjusting'}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                        >
                          {actionLoading === 'adjusting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                          <span>Credit Player ₹{adjustAmount}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
