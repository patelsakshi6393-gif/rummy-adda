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
  Phone,
  MessageSquare,
  Wallet,
  Check,
  X,
  CreditCard,
  Building,
  QrCode,
  DollarSign,
  FileText,
  BadgeCheck,
  Send,
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
  setDoc,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  DepositRequest,
  WithdrawalRequest,
  UserWallet,
  UserProfile,
  WalletTransaction,
  getPlayableBalance,
} from '@/lib/types';
import { sanitizePhone } from '@/lib/auth-context';

export default function AdminWhatsAppOperationsPanel() {
  const { user, profile } = useAuth();

  // Admin access check
  const isAdmin =
    user?.email === 'supportalkabrain@gmail.com' ||
    user?.email === '9118431155@rummyadda.app' ||
    user?.email === '9118431155@phone.rummyadda.in' ||
    profile?.phone === '9118431155' ||
    profile?.role === 'admin';

  // Admin login fallback state if not signed in as admin
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');

  // Search input state - STRICT: Admin must enter mobile number!
  const [searchMobile, setSearchMobile] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Selected / Loaded User State
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [targetWallet, setTargetWallet] = useState<UserWallet | null>(null);

  // User's specific history
  const [userDeposits, setUserDeposits] = useState<DepositRequest[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [userTransactions, setUserTransactions] = useState<WalletTransaction[]>([]);
  const [historyTab, setHistoryTab] = useState<'deposits' | 'withdrawals' | 'transactions'>('deposits');

  // Action status / Loading
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Manual Deposit Modal State (for WhatsApp screenshot payments)
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [manualDepositAmount, setManualDepositAmount] = useState('500');
  const [manualDepositUtr, setManualDepositUtr] = useState('');
  const [manualDepositNote, setManualDepositNote] = useState('WhatsApp Payment Received');

  // Manual Withdrawal Modal State (for WhatsApp cashout requests)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [manualWithdrawAmount, setManualWithdrawAmount] = useState('100');
  const [manualWithdrawMethod, setManualWithdrawMethod] = useState<'upi' | 'bank'>('upi');
  const [manualWithdrawDest, setManualWithdrawDest] = useState('');
  const [manualWithdrawUtr, setManualWithdrawUtr] = useState('');
  const [manualWithdrawNote, setManualWithdrawNote] = useState('WhatsApp Withdrawal Paid');

  // Denial Reason Modal
  const [denialModal, setDenialModal] = useState<{
    type: 'deposit' | 'withdrawal';
    item: DepositRequest | WithdrawalRequest;
  } | null>(null);
  const [denialReason, setDenialReason] = useState('Invalid payment screenshot / UTR not found in bank');

  // Listen to real-time wallet updates for the selected user
  useEffect(() => {
    if (!targetUser?.uid) {
      setTargetWallet(null);
      return;
    }

    const unsubWallet = onSnapshot(
      doc(db, 'wallets', targetUser.uid),
      (snap) => {
        if (snap.exists()) {
          setTargetWallet(snap.data() as UserWallet);
        }
      },
      (err) => console.error('Wallet sync error:', err)
    );

    // Listen to user's deposit requests
    const qDep = query(
      collection(db, 'deposits'),
      where('uid', '==', targetUser.uid)
    );
    const unsubDep = onSnapshot(
      qDep,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as DepositRequest);
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setUserDeposits(list);
      },
      (err) => console.error('User deposits sync error:', err)
    );

    // Listen to user's withdrawal requests
    const qWd = query(
      collection(db, 'withdrawals'),
      where('uid', '==', targetUser.uid)
    );
    const unsubWd = onSnapshot(
      qWd,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as WithdrawalRequest);
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setUserWithdrawals(list);
      },
      (err) => console.error('User withdrawals sync error:', err)
    );

    // Listen to user's ledger transactions
    const qTx = query(
      collection(db, 'transactions'),
      where('uid', '==', targetUser.uid)
    );
    const unsubTx = onSnapshot(
      qTx,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as WalletTransaction);
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setUserTransactions(list);
      },
      (err) => console.error('User tx sync error:', err)
    );

    return () => {
      unsubWallet();
      unsubDep();
      unsubWd();
      unsubTx();
    };
  }, [targetUser?.uid]);

  // Handle Admin direct login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginLoading(true);
    setAdminLoginError('');

    const rawId = adminId.trim();
    const rawPass = adminPassword.trim();
    if (!rawId || !rawPass) {
      setAdminLoginError('कृपया Admin ID और Password दोनों दर्ज करें।');
      setAdminLoginLoading(false);
      return;
    }

    const clean = sanitizePhone(rawId);
    const isMasterAdmin =
      (clean === '9118431155' || rawId.toLowerCase() === '9118431155@rummyadda.app') &&
      rawPass === 'Imran91184';

    // Candidate emails
    const candidates: string[] = [];
    if (rawId.includes('@')) {
      candidates.push(rawId.toLowerCase());
    } else if (clean.length >= 10) {
      candidates.push(`${clean}@rummyadda.app`);
      candidates.push(`${clean}@phone.rummyadda.in`);
    } else {
      candidates.push(rawId);
    }

    try {
      let loggedIn = false;
      let lastErr: unknown = null;

      for (const emailCand of candidates) {
        try {
          await signInWithEmailAndPassword(auth, emailCand, rawPass);
          loggedIn = true;
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!loggedIn && isMasterAdmin) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, '9118431155@rummyadda.app', 'Imran91184');
          await setDoc(
            doc(db, 'users', cred.user.uid),
            {
              uid: cred.user.uid,
              phone: '9118431155',
              email: '9118431155@rummyadda.app',
              displayName: 'Admin (Imran)',
              role: 'admin',
              accountStatus: 'active',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          loggedIn = true;
        } catch (createErr: unknown) {
          console.warn('Auto provision notice:', createErr);
          try {
            await signInWithEmailAndPassword(auth, '9118431155@rummyadda.app', 'Imran91184');
            loggedIn = true;
          } catch (retryErr) {
            lastErr = retryErr;
          }
        }
      }

      if (!loggedIn) {
        throw lastErr || new Error('Invalid Admin ID or Password. Please check your credentials.');
      }
    } catch (err: unknown) {
      console.error(err);
      let msg = 'लॉगिन विफल रहा। कृपया Admin ID और Password की जांच करें।';
      if (err instanceof Error) {
        if (err.message.includes('invalid-credential') || err.message.includes('wrong-password')) {
          msg = 'गलत Admin ID या Password (Invalid credentials).';
        } else if (err.message.includes('user-not-found')) {
          msg = 'एडमिन अकाउंट नहीं मिला (Admin not found).';
        } else {
          msg = err.message;
        }
      }
      setAdminLoginError(msg);
    } finally {
      setAdminLoginLoading(false);
    }
  };

  // Search User by Mobile Number ONLY (Strict - no quick select)
  const handleSearchByMobile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchError('');
    setActionFeedback(null);

    const rawInput = searchMobile.trim();
    if (!rawInput) {
      setSearchError('कृपया यूजर का 10-अंकों का मोबाइल नंबर दर्ज करें (Please enter mobile number).');
      return;
    }

    const clean = sanitizePhone(rawInput);
    if (clean.length < 10) {
      setSearchError('कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें (Valid 10-digit number required).');
      return;
    }

    setIsSearching(true);
    setTargetUser(null);
    setTargetWallet(null);

    try {
      let foundUserDoc: UserProfile | null = null;

      // 1. Check users with sanitized phone
      const q1 = query(collection(db, 'users'), where('phone', '==', clean));
      const s1 = await getDocs(q1);
      if (!s1.empty) {
        foundUserDoc = s1.docs[0].data() as UserProfile;
      }

      // 2. Check users with email matching clean@phone.rummyadda.in
      if (!foundUserDoc) {
        const authEmail = `${clean}@phone.rummyadda.in`;
        const q2 = query(collection(db, 'users'), where('email', '==', authEmail));
        const s2 = await getDocs(q2);
        if (!s2.empty) {
          foundUserDoc = s2.docs[0].data() as UserProfile;
        }
      }

      // 3. Check with 91 prefix in phone
      if (!foundUserDoc) {
        const q3 = query(collection(db, 'users'), where('phone', '==', `91${clean}`));
        const s3 = await getDocs(q3);
        if (!s3.empty) {
          foundUserDoc = s3.docs[0].data() as UserProfile;
        }
      }

      // 4. Fallback: Check if search query was an explicit Player ID (e.g. RA-XXXXXX)
      if (!foundUserDoc && rawInput.toUpperCase().startsWith('RA-')) {
        const q4 = query(collection(db, 'users'), where('playerId', '==', rawInput.toUpperCase()));
        const s4 = await getDocs(q4);
        if (!s4.empty) {
          foundUserDoc = s4.docs[0].data() as UserProfile;
        }
      }

      if (!foundUserDoc) {
        setSearchError(
          `मोबाइल नंबर "${clean}" से कोई यूजर नहीं मिला। सुनिश्चित करें कि यूजर रजिस्टर्ड है।`
        );
        return;
      }

      setTargetUser(foundUserDoc);

      // Fetch wallet directly
      const wSnap = await getDoc(doc(db, 'wallets', foundUserDoc.uid));
      if (wSnap.exists()) {
        setTargetWallet(wSnap.data() as UserWallet);
      } else {
        // Create initial wallet if missing
        const initialWallet: UserWallet = {
          uid: foundUserDoc.uid,
          depositBalance: 0,
          winBalance: 0,
          bonusBalance: 20,
          rewardPoints: 0,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'wallets', foundUserDoc.uid), initialWallet);
        setTargetWallet(initialWallet);
      }

      setActionFeedback({
        text: `यूजर ${foundUserDoc.displayName || 'Player'} (${foundUserDoc.playerId}) की प्रोफाइल सफलतापूर्वक लोड हो गई!`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error('Search error:', err);
      const msg = err instanceof Error ? err.message : 'यूजर सर्च करने में समस्या आई।';
      setSearchError(msg);
    } finally {
      setIsSearching(false);
    }
  };

  // Reset to search another user
  const handleResetSearch = () => {
    setSearchMobile('');
    setTargetUser(null);
    setTargetWallet(null);
    setUserDeposits([]);
    setUserWithdrawals([]);
    setUserTransactions([]);
    setSearchError('');
    setActionFeedback(null);
  };

  // ========================
  // DEPOSIT APPROVE & DENY
  // ========================
  const handleApproveDeposit = async (dep: DepositRequest) => {
    if (!targetUser) return;
    setActionLoadingId(dep.depositId);
    setActionFeedback(null);

    try {
      const now = new Date().toISOString();
      const walletRef = doc(db, 'wallets', dep.uid);
      const depositRef = doc(db, 'deposits', dep.depositId);
      const txRef = doc(collection(db, 'transactions'));
      const txId = txRef.id;

      await runTransaction(db, async (tx) => {
        const wSnap = await tx.get(walletRef);
        if (!wSnap.exists()) throw new Error('Player wallet not found');
        const wData = wSnap.data() as UserWallet;

        const newDepositBal = (wData.depositBalance || 0) + dep.requestedAmount;

        tx.update(walletRef, {
          depositBalance: newDepositBal,
          updatedAt: now,
        });

        tx.update(depositRef, {
          status: 'approved',
          reviewedAt: now,
          reviewedBy: user?.email || 'admin',
          adminNote: 'Approved via WhatsApp Operations Panel',
        });

        const newTx: WalletTransaction = {
          id: txId,
          uid: dep.uid,
          type: 'deposit',
          amount: dep.requestedAmount,
          currency: 'INR',
          status: 'completed',
          description: `WhatsApp Deposit Approved (+₹${dep.requestedAmount.toLocaleString('en-IN')})`,
          referenceId: dep.depositId,
          createdAt: now,
        };
        tx.set(txRef, newTx);
      });

      setActionFeedback({
        text: `डिपॉजिट स्वीकृत (Approved)! ₹${dep.requestedAmount.toLocaleString('en-IN')} यूजर के खाते में सफलतापूर्वक जुड़ गए।`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'डिपॉजिट अप्रूव करने में त्रुटि आई।';
      setActionFeedback({ text: msg, type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDenyDepositConfirm = async () => {
    if (!denialModal || denialModal.type !== 'deposit') return;
    const dep = denialModal.item as DepositRequest;
    setActionLoadingId(dep.depositId);
    setDenialModal(null);
    setActionFeedback(null);

    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'deposits', dep.depositId), {
        status: 'rejected',
        reviewedAt: now,
        reviewedBy: user?.email || 'admin',
        adminNote: denialReason || 'Payment rejected by admin',
      });

      setActionFeedback({
        text: `डिपॉजिट ${dep.depositId} अस्वीकृत (Denied) कर दिया गया।`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error(err);
      setActionFeedback({ text: 'डिपॉजिट अस्वीकृत करने में विफल।', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // ========================
  // WITHDRAWAL APPROVE & DENY
  // ========================
  const handleApproveWithdrawal = async (wd: WithdrawalRequest) => {
    if (!targetUser) return;
    setActionLoadingId(wd.withdrawalId);
    setActionFeedback(null);

    try {
      const now = new Date().toISOString();
      const wdRef = doc(db, 'withdrawals', wd.withdrawalId);

      await updateDoc(wdRef, {
        status: 'paid',
        processedAt: now,
      });

      // Update linked transaction if exists
      const qTx = query(
        collection(db, 'transactions'),
        where('referenceId', '==', wd.withdrawalId)
      );
      const txSnaps = await getDocs(qTx);
      for (const tDoc of txSnaps.docs) {
        await updateDoc(doc(db, 'transactions', tDoc.id), {
          status: 'completed',
        });
      }

      setActionFeedback({
        text: `विड्रॉल सफल (Paid)! ₹${(wd.netPayableAmount ?? wd.amount).toLocaleString('en-IN')} का भुगतान मार्क कर दिया गया।`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error(err);
      setActionFeedback({ text: 'विड्रॉल अप्रूव करने में त्रुटि आई।', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDenyWithdrawalConfirm = async () => {
    if (!denialModal || denialModal.type !== 'withdrawal') return;
    const wd = denialModal.item as WithdrawalRequest;
    setActionLoadingId(wd.withdrawalId);
    setDenialModal(null);
    setActionFeedback(null);

    try {
      const now = new Date().toISOString();
      const walletRef = doc(db, 'wallets', wd.uid);
      const wdRef = doc(db, 'withdrawals', wd.withdrawalId);
      const txRef = doc(collection(db, 'transactions'));
      const txId = txRef.id;

      await runTransaction(db, async (tx) => {
        const wSnap = await tx.get(walletRef);
        if (!wSnap.exists()) throw new Error('Player wallet not found');
        const wData = wSnap.data() as UserWallet;

        // Refund the amount back to user's winBalance
        const newWinBalance = (wData.winBalance || 0) + wd.amount;

        tx.update(walletRef, {
          winBalance: newWinBalance,
          updatedAt: now,
        });

        tx.update(wdRef, {
          status: 'rejected',
          processedAt: now,
          adminNote: denialReason || 'Withdrawal denied and refunded by admin',
        });

        // Record refund ledger entry
        const refundTx: WalletTransaction = {
          id: txId,
          uid: wd.uid,
          type: 'refund',
          amount: wd.amount,
          currency: 'INR',
          status: 'completed',
          description: `Withdrawal Denied: ₹${wd.amount} refunded back to winnings (${denialReason || 'Rejected by Admin'})`,
          referenceId: wd.withdrawalId,
          createdAt: now,
        };
        tx.set(txRef, refundTx);
      });

      setActionFeedback({
        text: `विड्रॉल अस्वीकृत (Denied) किया गया और ₹${wd.amount.toLocaleString('en-IN')} यूजर के विंग्स बैलेंस में वापस रिफंड कर दिए गए!`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'विड्रॉल अस्वीकृत व रिफंड करने में त्रुटि।';
      setActionFeedback({ text: msg, type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // ============================================
  // DIRECT MANUAL WHATSAPP DEPOSIT (Add Cash)
  // ============================================
  const handleExecuteManualDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    const numAmount = parseInt(manualDepositAmount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setActionFeedback({ text: 'कृपया वैध राशि दर्ज करें।', type: 'error' });
      return;
    }

    setActionLoadingId('manual-deposit');
    try {
      const now = new Date().toISOString();
      const depositId = `dep_manual_${Date.now()}`;
      const walletRef = doc(db, 'wallets', targetUser.uid);
      const depositRef = doc(db, 'deposits', depositId);
      const txRef = doc(collection(db, 'transactions'));
      const txId = txRef.id;

      await runTransaction(db, async (tx) => {
        const wSnap = await tx.get(walletRef);
        if (!wSnap.exists()) throw new Error('Player wallet not found');
        const wData = wSnap.data() as UserWallet;

        const newDepositBal = (wData.depositBalance || 0) + numAmount;

        tx.update(walletRef, {
          depositBalance: newDepositBal,
          updatedAt: now,
        });

        const newDeposit: DepositRequest = {
          depositId,
          uid: targetUser.uid,
          playerId: targetUser.playerId,
          requestedAmount: numAmount,
          status: 'approved',
          createdAt: now,
          reviewedAt: now,
          reviewedBy: user?.email || 'admin',
          adminNote: `${manualDepositNote} | Ref: ${manualDepositUtr || 'N/A'}`,
        };
        tx.set(depositRef, newDeposit);

        const newTx: WalletTransaction = {
          id: txId,
          uid: targetUser.uid,
          type: 'deposit',
          amount: numAmount,
          currency: 'INR',
          status: 'completed',
          description: `Direct WhatsApp Deposit credited by Admin (+₹${numAmount.toLocaleString('en-IN')}) [Ref: ${manualDepositUtr || 'N/A'}]`,
          referenceId: depositId,
          createdAt: now,
        };
        tx.set(txRef, newTx);
      });

      setShowDepositModal(false);
      setManualDepositUtr('');
      setActionFeedback({
        text: `सफलतापूर्वक ₹${numAmount.toLocaleString('en-IN')} यूजर (${targetUser.displayName}) के डिपॉजिट बैलेंस में जोड़ दिए गए!`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'डिपॉजिट करने में त्रुटि आई।';
      setActionFeedback({ text: msg, type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // ============================================
  // DIRECT MANUAL WHATSAPP WITHDRAWAL (Cashout)
  // ============================================
  const handleExecuteManualWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !targetWallet) return;

    const numAmount = parseInt(manualWithdrawAmount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setActionFeedback({ text: 'कृपया वैध राशि दर्ज करें।', type: 'error' });
      return;
    }

    const currentWinBal = targetWallet.winBalance || 0;
    if (numAmount > currentWinBal) {
      setActionFeedback({
        text: `यूजर के पास पर्याप्त विंग्स बैलेंस नहीं है (वर्तमान बैलेंस: ₹${currentWinBal.toLocaleString('en-IN')})।`,
        type: 'error',
      });
      return;
    }

    if (!manualWithdrawDest.trim()) {
      setActionFeedback({ text: 'कृपया भुगतान का UPI ID या बैंक विवरण दर्ज करें।', type: 'error' });
      return;
    }

    setActionLoadingId('manual-withdrawal');
    try {
      const now = new Date().toISOString();
      const wdId = `wd_manual_${Date.now()}`;
      const walletRef = doc(db, 'wallets', targetUser.uid);
      const wdRef = doc(db, 'withdrawals', wdId);
      const txRef = doc(collection(db, 'transactions'));
      const txId = txRef.id;

      await runTransaction(db, async (tx) => {
        const wSnap = await tx.get(walletRef);
        if (!wSnap.exists()) throw new Error('Player wallet not found');
        const wData = wSnap.data() as UserWallet;

        const liveWinBal = wData.winBalance || 0;
        if (numAmount > liveWinBal) {
          throw new Error(`अपर्याप्त बैलेंस। केवल ₹${liveWinBal} उपलब्ध है।`);
        }

        const newWinBal = liveWinBal - numAmount;
        tx.update(walletRef, {
          winBalance: newWinBal,
          updatedAt: now,
        });

        const newWd: WithdrawalRequest = {
          withdrawalId: wdId,
          uid: targetUser.uid,
          playerId: targetUser.playerId,
          playerName: targetUser.displayName || 'Player',
          amount: numAmount,
          feePercent: 0,
          platformFee: 0,
          netPayableAmount: numAmount,
          method: manualWithdrawMethod,
          maskedDestination: manualWithdrawDest.trim(),
          rawDestination: manualWithdrawDest.trim(),
          status: 'paid',
          createdAt: now,
          processedAt: now,
        };
        tx.set(wdRef, newWd);

        const newTx: WalletTransaction = {
          id: txId,
          uid: targetUser.uid,
          type: 'withdrawal',
          amount: numAmount,
          currency: 'INR',
          status: 'completed',
          description: `Direct WhatsApp Withdrawal paid to ${manualWithdrawDest.trim()} [UTR: ${manualWithdrawUtr || 'Paid'}]`,
          referenceId: wdId,
          createdAt: now,
        };
        tx.set(txRef, newTx);
      });

      setShowWithdrawModal(false);
      setManualWithdrawDest('');
      setManualWithdrawUtr('');
      setActionFeedback({
        text: `सफलतापूर्वक ₹${numAmount.toLocaleString('en-IN')} यूजर के खाते से विड्रॉल करके पेड मार्क कर दिया गया!`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'विड्रॉल प्रोसेस करने में समस्या आई।';
      setActionFeedback({ text: msg, type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // If not signed in as admin, show direct Admin Login box
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto w-full px-4 py-16 flex flex-col justify-center">
          <div className="bg-[#12131e] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-white">Admin Operations Portal</h1>
              <p className="text-xs text-slate-400">
                WhatsApp Deposit & Withdrawal Management Login
              </p>
            </div>

            {adminLoginError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adminLoginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Admin ID / Mobile Number
                </label>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  required
                  placeholder="9118431155"
                  className="w-full px-4 py-3 bg-[#0a0b12] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  placeholder="Enter admin password"
                  className="w-full px-4 py-3 bg-[#0a0b12] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={adminLoginLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {adminLoginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Login to Admin Panel</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center border-t border-white/5">
              <Link href="/lobby" className="text-xs text-slate-400 hover:text-white transition-colors">
                ← Return to Lobby
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Calculate playable balance
  const totalPlayable = targetWallet
    ? (targetWallet.depositBalance || 0) +
      (targetWallet.winBalance || 0) +
      (targetWallet.bonusBalance || 0)
    : 0;

  const pendingDeposits = userDeposits.filter((d) => d.status === 'pending');
  const pendingWithdrawals = userWithdrawals.filter((w) => w.status === 'pending');

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Operations & Accounts Panel</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Admin WhatsApp Deposit & Withdrawal Desk
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                यूजर का मोबाइल नंबर दर्ज करें और उसका प्रोफाइल, डिपॉजिट व विड्रॉल हिस्ट्री देखकर अप्रूव/रिजेक्ट करें।
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/admin"
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>General Admin</span>
              </Link>
              <Link
                href="/wallet"
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300"
              >
                Go to Wallet
              </Link>
            </div>
          </div>

          {/* Feedback Banner */}
          {actionFeedback && (
            <div
              className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 shadow-xl transition-all ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {actionFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                )}
                <span>{actionFeedback.text}</span>
              </div>
              <button
                onClick={() => setActionFeedback(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STRICT SEARCH SECTION: Enter Mobile Number ONLY */}
          {/* ======================================================== */}
          <div className="bg-[#12131e] border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold uppercase tracking-wider mb-2">
                <Phone className="w-4 h-4" />
                <span>उपयोगकर्ता खोजें (Search User by Mobile Number)</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                यूजर का 10-अंकों का मोबाइल नंबर दर्ज करें
              </h2>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                WhatsApp पर पेमेंट का स्क्रीनशॉट या विड्रॉल का मैसेज भेजने वाले खिलाड़ी का 10-डिजिट मोबाइल नंबर डालें।
                त्वरित यूजर सेलेक्ट का कोई विकल्प नहीं है, जिससे गलती से गलत खाते में ट्रांजैक्शन न हो।
              </p>

              <form onSubmit={handleSearchByMobile} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                    +91
                  </div>
                  <input
                    type="tel"
                    value={searchMobile}
                    onChange={(e) => setSearchMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    placeholder="9876543210 (10 Digits)"
                    className="w-full pl-14 pr-4 py-3.5 bg-[#080910] border border-white/10 rounded-2xl text-base font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                    maxLength={10}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-sm rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>प्रोफाइल खोज रहे हैं...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>प्रोफाइल खोलें (Open Profile)</span>
                    </>
                  )}
                </button>

                {targetUser && (
                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="px-4 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs rounded-2xl transition-all"
                  >
                    नया नंबर
                  </button>
                )}
              </form>

              {searchError && (
                <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* USER PROFILE & LIVE WALLET (Rendered after mobile search) */}
          {/* ======================================================== */}
          {targetUser && (
            <div className="space-y-6">
              {/* User Identity & Direct Action Header */}
              <div className="bg-[#12131e] border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Avatar & Details */}
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-amber-500/20">
                      {targetUser.displayName?.charAt(0).toUpperCase() || 'P'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-black text-white">
                          {targetUser.displayName || 'Player'}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ID: {targetUser.playerId}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {targetUser.accountStatus || 'ACTIVE'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 font-mono text-white">
                          <Phone className="w-3.5 h-3.5 text-amber-400" />
                          +91 {targetUser.phone || sanitizePhone(targetUser.email || '')}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span>UID: {targetUser.uid.slice(0, 8)}...</span>
                        <span className="text-slate-500">•</span>
                        <span>
                          Joined: {new Date(targetUser.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Quick Connect & Action Buttons */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {targetUser.phone && (
                      <a
                        href={`https://wa.me/91${sanitizePhone(targetUser.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center gap-2 transition-all"
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        <span>Chat on WhatsApp</span>
                      </a>
                    )}

                    <button
                      onClick={() => setShowDepositModal(true)}
                      className="py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>+ WhatsApp डिपॉजिट करें</span>
                    </button>

                    <button
                      onClick={() => setShowWithdrawModal(true)}
                      className="py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>- WhatsApp विड्रॉल करें</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Wallet Balances Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Playable */}
                <div className="bg-gradient-to-br from-[#171827] via-[#1a1528] to-[#12131f] border border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-1">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-400">
                    Total Playable Balance
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-white">
                    ₹{totalPlayable.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Deposit + Winnings + Bonus
                  </p>
                </div>

                {/* Deposit Balance */}
                <div className="bg-[#12131e] border border-blue-500/30 rounded-2xl p-5 shadow-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-400">
                      डिपॉजिट बैलेंस (Deposited)
                    </span>
                    <button
                      onClick={() => setShowDepositModal(true)}
                      className="text-[10px] font-bold text-blue-400 hover:underline"
                    >
                      + Add
                    </button>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-white">
                    ₹{(targetWallet?.depositBalance || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    100% खेल में इस्तेमाल योग्य
                  </p>
                </div>

                {/* Winnings Balance (Withdrawable) */}
                <div className="bg-[#12131e] border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400">
                      विंग्स बैलेंस (Withdrawable)
                    </span>
                    <button
                      onClick={() => setShowWithdrawModal(true)}
                      className="text-[10px] font-bold text-emerald-400 hover:underline"
                    >
                      - Withdraw
                    </button>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-300">
                    ₹{(targetWallet?.winBalance || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    विड्रॉल देने योग्य राशि
                  </p>
                </div>

                {/* Bonus Balance */}
                <div className="bg-[#12131e] border border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-1">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-purple-400">
                    बोनस बैलेंस (Bonus)
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-white">
                    ₹{(targetWallet?.bonusBalance || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Non-withdrawable गेम क्रेडिट्स
                  </p>
                </div>
              </div>

              {/* Pending Action Alerts Banner if any */}
              {(pendingDeposits.length > 0 || pendingWithdrawals.length > 0) && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                    <p className="text-xs sm:text-sm font-bold text-amber-300">
                      इस यूजर की {pendingDeposits.length} पेंडिंग डिपॉजिट और {pendingWithdrawals.length} पेंडिंग विड्रॉल रिक्वेस्ट लंबित हैं!
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingDeposits.length > 0 && (
                      <button
                        onClick={() => setHistoryTab('deposits')}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold hover:bg-amber-500/30"
                      >
                        डिपॉजिट देखें ({pendingDeposits.length})
                      </button>
                    )}
                    {pendingWithdrawals.length > 0 && (
                      <button
                        onClick={() => setHistoryTab('withdrawals')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30"
                      >
                        विड्रॉल देखें ({pendingWithdrawals.length})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* USER HISTORY TABS: Deposits, Withdrawals, Ledger */}
              {/* ======================================================== */}
              <div className="bg-[#12131e] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                {/* Tabs bar */}
                <div className="flex items-center gap-2 border-b border-white/10 pb-4 flex-wrap">
                  <button
                    onClick={() => setHistoryTab('deposits')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      historyTab === 'deposits'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>डिपॉजिट हिस्ट्री & रिक्वेस्ट ({userDeposits.length})</span>
                    {pendingDeposits.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-extrabold">
                        {pendingDeposits.length} New
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setHistoryTab('withdrawals')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      historyTab === 'withdrawals'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>विड्रॉल हिस्ट्री & रिक्वेस्ट ({userWithdrawals.length})</span>
                    {pendingWithdrawals.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-extrabold">
                        {pendingWithdrawals.length} New
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setHistoryTab('transactions')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      historyTab === 'transactions'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>ऑल ट्रांजैक्शन लेज़र ({userTransactions.length})</span>
                  </button>
                </div>

                {/* TAB 1: DEPOSITS TAB */}
                {historyTab === 'deposits' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-200">
                        डिपॉजिट अनुरोध व संपूर्ण हिस्ट्री
                      </h3>
                      <button
                        onClick={() => setShowDepositModal(true)}
                        className="py-1.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-lg flex items-center gap-1.5"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>+ नया डिपॉजिट जोड़ें</span>
                      </button>
                    </div>

                    {userDeposits.length === 0 ? (
                      <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5 space-y-2">
                        <ArrowDownLeft className="w-8 h-8 text-slate-500 mx-auto" />
                        <p className="text-xs text-slate-400">
                          इस यूजर का अभी तक कोई डिपॉजिट रिकॉर्ड नहीं है।
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userDeposits.map((dep) => {
                          const isPending = dep.status === 'pending';
                          const isApproved = dep.status === 'approved';
                          const isRejected = dep.status === 'rejected';

                          return (
                            <div
                              key={dep.depositId}
                              className={`p-4 rounded-2xl border transition-all ${
                                isPending
                                  ? 'bg-amber-500/10 border-amber-500/40'
                                  : 'bg-white/5 border-white/10'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-black text-white">
                                      +₹{dep.requestedAmount.toLocaleString('en-IN')}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                        isApproved
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                          : isRejected
                                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                      }`}
                                    >
                                      {dep.status.toUpperCase()}
                                    </span>
                                  </div>

                                  <p className="text-xs text-slate-400">
                                    Ref: <span className="font-mono text-slate-300">{dep.depositId}</span>
                                    {' • '}
                                    {new Date(dep.createdAt).toLocaleString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>

                                  {dep.adminNote && (
                                    <p className="text-[11px] text-slate-400 italic">
                                      Note: {dep.adminNote}
                                    </p>
                                  )}
                                </div>

                                {/* Actions for pending deposit */}
                                {isPending ? (
                                  <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button
                                      onClick={() => handleApproveDeposit(dep)}
                                      disabled={actionLoadingId === dep.depositId}
                                      className="flex-1 sm:flex-none py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                                    >
                                      {actionLoadingId === dep.depositId ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5" />
                                      )}
                                      <span>स्वीकार करें (Approve)</span>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setDenialModal({
                                          type: 'deposit',
                                          item: dep,
                                        })
                                      }
                                      disabled={actionLoadingId === dep.depositId}
                                      className="flex-1 sm:flex-none py-2 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>अस्वीकार (Deny)</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-right text-xs text-slate-400">
                                    {dep.reviewedAt && (
                                      <span>
                                        Reviewed:{' '}
                                        {new Date(dep.reviewedAt).toLocaleDateString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                        })}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: WITHDRAWALS TAB */}
                {historyTab === 'withdrawals' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-200">
                        विड्रॉल अनुरोध व संपूर्ण भुगतान हिस्ट्री
                      </h3>
                      <button
                        onClick={() => setShowWithdrawModal(true)}
                        className="py-1.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1.5"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>- नया विड्रॉल करें</span>
                      </button>
                    </div>

                    {userWithdrawals.length === 0 ? (
                      <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5 space-y-2">
                        <ArrowUpRight className="w-8 h-8 text-slate-500 mx-auto" />
                        <p className="text-xs text-slate-400">
                          इस यूजर का अभी तक कोई विड्रॉल रिकॉर्ड नहीं है।
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userWithdrawals.map((wd) => {
                          const isPending = wd.status === 'pending';
                          const isPaid = wd.status === 'paid';
                          const isRejected = wd.status === 'rejected';

                          return (
                            <div
                              key={wd.withdrawalId}
                              className={`p-4 rounded-2xl border transition-all ${
                                isPending
                                  ? 'bg-amber-500/10 border-amber-500/40'
                                  : 'bg-white/5 border-white/10'
                              }`}
                            >
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-lg font-black text-white">
                                      ₹{(wd.netPayableAmount ?? wd.amount).toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      (Gross: ₹{wd.amount})
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                        isPaid
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                          : isRejected
                                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                      }`}
                                    >
                                      {wd.status.toUpperCase()}
                                    </span>
                                  </div>

                                  {/* Payout Destination Details */}
                                  <div className="flex items-center gap-2 text-xs text-slate-300 font-mono bg-black/20 p-2 rounded-xl border border-white/5">
                                    {wd.method === 'upi' ? (
                                      <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                                    ) : (
                                      <Building className="w-4 h-4 text-blue-400 shrink-0" />
                                    )}
                                    <span className="font-bold text-amber-300 uppercase">
                                      [{wd.method}]:
                                    </span>
                                    <span className="truncate">
                                      {wd.rawDestination || wd.maskedDestination}
                                    </span>
                                  </div>

                                  <p className="text-xs text-slate-400">
                                    Ref: <span className="font-mono text-slate-300">{wd.withdrawalId}</span>
                                    {' • '}
                                    Requested: {new Date(wd.createdAt).toLocaleString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>

                                  {wd.adminNote && (
                                    <p className="text-[11px] text-slate-400 italic">
                                      Note: {wd.adminNote}
                                    </p>
                                  )}
                                </div>

                                {/* Actions for pending withdrawal */}
                                {isPending ? (
                                  <div className="flex items-center gap-2 w-full lg:w-auto">
                                    <button
                                      onClick={() => handleApproveWithdrawal(wd)}
                                      disabled={actionLoadingId === wd.withdrawalId}
                                      className="flex-1 lg:flex-none py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                                    >
                                      {actionLoadingId === wd.withdrawalId ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5" />
                                      )}
                                      <span>स्वीकार करें (Mark Paid)</span>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setDenialModal({
                                          type: 'withdrawal',
                                          item: wd,
                                        })
                                      }
                                      disabled={actionLoadingId === wd.withdrawalId}
                                      className="flex-1 lg:flex-none py-2 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>अस्वीकार & रिफंड (Deny)</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-right text-xs text-slate-400">
                                    {wd.processedAt && (
                                      <span>
                                        Processed:{' '}
                                        {new Date(wd.processedAt).toLocaleDateString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                        })}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: ALL TRANSACTIONS LEDGER */}
                {historyTab === 'transactions' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-200">
                      यूजर का सम्पूर्ण वित्तीय लेज़र (Transactions Ledger)
                    </h3>

                    {userTransactions.length === 0 ? (
                      <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5 space-y-2">
                        <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                        <p className="text-xs text-slate-400">कोई ट्रांजैक्शन नहीं मिला।</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {userTransactions.map((tx) => {
                          const isCredit = ['deposit', 'game_win', 'bonus', 'reward', 'refund'].includes(tx.type);
                          return (
                            <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-white">
                                  {tx.description || tx.type}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {new Date(tx.createdAt).toLocaleString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                  {' • '}
                                  ID: {tx.id.slice(0, 8)}...
                                </p>
                              </div>

                              <div className="text-right">
                                <span
                                  className={`text-sm font-black ${
                                    isCredit ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {isCredit ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                                </span>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">
                                  {tx.status}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODAL 1: DIRECT WHATSAPP DEPOSIT MODAL */}
          {/* ======================================================== */}
          {showDepositModal && targetUser && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#12131e] border border-blue-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2 text-blue-400">
                    <ArrowDownLeft className="w-5 h-5" />
                    <h3 className="text-base font-black text-white">
                      WhatsApp डायरेक्ट डिपॉजिट (Add Cash)
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowDepositModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                  खिलाड़ी: <strong>{targetUser.displayName}</strong> ({targetUser.playerId}) • मो: +91 {targetUser.phone}
                </div>

                <form onSubmit={handleExecuteManualDeposit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      डिपॉजिट राशि (Amount in ₹)
                    </label>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {[100, 200, 500, 1000, 2000, 5000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setManualDepositAmount(val.toString())}
                          className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                            manualDepositAmount === val.toString()
                              ? 'bg-blue-600 text-white border-blue-400'
                              : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          ₹{val}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={manualDepositAmount}
                      onChange={(e) => setManualDepositAmount(e.target.value)}
                      required
                      min={10}
                      placeholder="Enter amount"
                      className="w-full px-4 py-3 bg-[#0a0b12] border border-white/10 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      UTR / GooglePay / PhonePe Reference No. (वैकल्पिक)
                    </label>
                    <input
                      type="text"
                      value={manualDepositUtr}
                      onChange={(e) => setManualDepositUtr(e.target.value)}
                      placeholder="e.g. 408219204820"
                      className="w-full px-4 py-2.5 bg-[#0a0b12] border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Admin Note / रिमार्क
                    </label>
                    <input
                      type="text"
                      value={manualDepositNote}
                      onChange={(e) => setManualDepositNote(e.target.value)}
                      placeholder="WhatsApp Screenshot Verified"
                      className="w-full px-4 py-2.5 bg-[#0a0b12] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDepositModal(false)}
                      className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl"
                    >
                      रद्द करें
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoadingId === 'manual-deposit'}
                      className="py-2.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
                    >
                      {actionLoadingId === 'manual-deposit' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>डिपॉजिट क्रेडिट करें (+₹{manualDepositAmount || 0})</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODAL 2: DIRECT WHATSAPP WITHDRAWAL MODAL */}
          {/* ======================================================== */}
          {showWithdrawModal && targetUser && targetWallet && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#12131e] border border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <ArrowUpRight className="w-5 h-5" />
                    <h3 className="text-base font-black text-white">
                      WhatsApp डायरेक्ट विड्रॉल (Cashout)
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowWithdrawModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                  <span>खिलाड़ी: <strong>{targetUser.displayName}</strong></span>
                  <span className="font-bold">
                    उपलब्ध विंग्स: ₹{(targetWallet.winBalance || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <form onSubmit={handleExecuteManualWithdrawal} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      विड्रॉल राशि (Amount in ₹)
                    </label>
                    <input
                      type="number"
                      value={manualWithdrawAmount}
                      onChange={(e) => setManualWithdrawAmount(e.target.value)}
                      required
                      min={10}
                      max={targetWallet.winBalance || 0}
                      placeholder="Enter withdrawal amount"
                      className="w-full px-4 py-3 bg-[#0a0b12] border border-white/10 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      भुगतान का तरीका (Payment Method)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setManualWithdrawMethod('upi')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                          manualWithdrawMethod === 'upi'
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-white/5 text-slate-300 border-white/10'
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                        <span>UPI ID / VPA</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setManualWithdrawMethod('bank')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                          manualWithdrawMethod === 'bank'
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-white/5 text-slate-300 border-white/10'
                        }`}
                      >
                        <Building className="w-4 h-4" />
                        <span>Bank A/C Transfer</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {manualWithdrawMethod === 'upi' ? 'यूजर की UPI ID' : 'यूजर का Bank A/C & IFSC विवरण'}
                    </label>
                    <input
                      type="text"
                      value={manualWithdrawDest}
                      onChange={(e) => setManualWithdrawDest(e.target.value)}
                      required
                      placeholder={manualWithdrawMethod === 'upi' ? 'e.g. mobile@paytm' : 'A/C: 1234567890 | IFSC: SBIN0001234'}
                      className="w-full px-4 py-2.5 bg-[#0a0b12] border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Admin Payment UTR / Ref (आपने जो भेजा)
                    </label>
                    <input
                      type="text"
                      value={manualWithdrawUtr}
                      onChange={(e) => setManualWithdrawUtr(e.target.value)}
                      placeholder="e.g. UPI Ref 492019482910"
                      className="w-full px-4 py-2.5 bg-[#0a0b12] border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowWithdrawModal(false)}
                      className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl"
                    >
                      रद्द करें
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoadingId === 'manual-withdrawal'}
                      className="py-2.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
                    >
                      {actionLoadingId === 'manual-withdrawal' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>विड्रॉल पूरा करें (-₹{manualWithdrawAmount || 0})</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODAL 3: DENIAL / REJECTION REASON CONFIRMATION */}
          {/* ======================================================== */}
          {denialModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#12131e] border border-rose-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 text-rose-400">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {denialModal.type === 'deposit'
                        ? 'डिपॉजिट अस्वीकार करें (Deny Deposit)'
                        : 'विड्रॉल अस्वीकार व रिफंड करें (Deny Withdrawal)'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {denialModal.type === 'withdrawal'
                        ? 'अस्वीकार करने पर राशि यूजर के विंग्स बैलेंस में तुरंत रिफंड हो जाएगी।'
                        : 'अस्वीकार करने पर यह डिपॉजिट रिजेक्ट मार्क हो जाएगा।'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    अस्वीकार करने का कारण (Reason for Denial)
                  </label>
                  <textarea
                    value={denialReason}
                    onChange={(e) => setDenialReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-[#0a0b12] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-rose-400"
                    placeholder="Enter reason..."
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDenialModal(null)}
                    className="py-2 px-4 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl"
                  >
                    कैंसिल
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (denialModal.type === 'deposit') {
                        handleDenyDepositConfirm();
                      } else {
                        handleDenyWithdrawalConfirm();
                      }
                    }}
                    className="py-2 px-5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-600/30 cursor-pointer"
                  >
                    पुष्टि करें (Confirm Deny)
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
