'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Copy,
  ExternalLink,
  Percent,
  Clock,
  ShieldCheck,
  Building,
  QrCode,
  Loader2,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { WithdrawalRequest } from '@/lib/types';
import { getShortPlayerId, getUserMobile } from '@/lib/utils';

const OFFICIAL_WHATSAPP_NUMBER = '917466990584';

function WithdrawConfirmationContent() {
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [dbData, setDbData] = useState<WithdrawalRequest | null>(null);

  const paramWithdrawalId = searchParams.get('withdrawalId') || '';
  const paramAmount = searchParams.get('amount');
  const paramFee = searchParams.get('fee');
  const paramNet = searchParams.get('net');
  const paramMethod = searchParams.get('method') || 'upi';
  const paramDest = searchParams.get('dest') || '';
  const paramMobile = searchParams.get('mobile');
  const paramAcct = searchParams.get('acct');
  const paramIfsc = searchParams.get('ifsc');
  const paramHolder = searchParams.get('holder');

  // Optional Firestore fetch if opened directly with only withdrawalId
  useEffect(() => {
    if (!paramWithdrawalId) return;
    const loadWithdrawal = async () => {
      try {
        const snap = await getDoc(doc(db, 'withdrawals', paramWithdrawalId));
        if (snap.exists()) {
          setDbData(snap.data() as WithdrawalRequest);
        }
      } catch (e) {
        console.warn('Error loading withdrawal details:', e);
      }
    };
    loadWithdrawal();
  }, [paramWithdrawalId]);

  const withdrawalId = dbData?.withdrawalId || paramWithdrawalId || 'w_pending';
  const grossAmount = dbData?.amount ?? (paramAmount ? parseInt(paramAmount, 10) : 100);
  const feePercent = dbData?.feePercent ?? 20;
  const platformFee = dbData?.platformFee ?? (paramFee ? parseInt(paramFee, 10) : Math.round(grossAmount * 0.20));
  const netPayable = dbData?.netPayableAmount ?? (paramNet ? parseInt(paramNet, 10) : Math.max(0, grossAmount - platformFee));
  const method = dbData?.method || paramMethod;
  const destination = dbData?.rawDestination || dbData?.maskedDestination || paramDest || 'Registered Account';

  const shortId = getShortPlayerId(profile?.playerId || dbData?.playerId);
  const userDisplayName = profile?.displayName || dbData?.playerName || 'Player';
  const detectedMobile = getUserMobile(profile?.phone, profile?.email);
  const mobileNumber = paramMobile || detectedMobile || 'Not Provided';

  const formattedGross = grossAmount.toLocaleString('en-IN');
  const formattedFee = platformFee.toLocaleString('en-IN');
  const formattedNet = netPayable.toLocaleString('en-IN');

  const bankDetailsText = paramAcct
    ? `A/C: ${paramAcct} | IFSC: ${paramIfsc || ''} | Name: ${paramHolder || userDisplayName}`
    : destination;

  // Short, clean WhatsApp message pre-filled with player ID (short), name, mobile, amounts, and destination
  const prefilledMessage = method === 'upi'
    ? `*RUMMY ADDA - WITHDRAWAL*
Player: ${userDisplayName} (#${shortId})
Mobile: ${mobileNumber}
Withdraw Amount: ₹${formattedGross}
Platform Fee (${feePercent}%): -₹${formattedFee}
Net Payable: ₹${formattedNet}
UPI ID: ${destination}

Hello, मुझे ₹${formattedNet} विड्रॉल करना है। कृपया पेमेंट ट्रांसफर करें।`
    : `*RUMMY ADDA - WITHDRAWAL*
Player: ${userDisplayName} (#${shortId})
Mobile: ${mobileNumber}
Withdraw Amount: ₹${formattedGross}
Platform Fee (${feePercent}%): -₹${formattedFee}
Net Payable: ₹${formattedNet}
Bank Details: ${bankDetailsText}

Hello, मुझे ₹${formattedNet} विड्रॉल करना है। कृपया पेमेंट ट्रांसफर करें।`;

  const waUrl = `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(prefilledMessage)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(prefilledMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10 text-center space-y-6">
      {/* Top Banner Icon */}
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-black shadow-lg shadow-emerald-500/10">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
          Cashout Request Registered
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
          Withdrawal Request Queued
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-lg mx-auto">
          Aapka cashout request create ho gaya hai. 20% platform fee deduct hone ke baad aapka dene wala balance niche calculate kiya gaya hai.
        </p>
      </div>

      {/* Hero Dene Wala Balance Card */}
      <div className="bg-[#12131e] border-2 border-emerald-500/40 rounded-3xl p-6 shadow-2xl text-left space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Dene Wala Balance (Aapko Milne Wali Rashi)
            </span>
            <p className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono mt-0.5">
              ₹{formattedNet}
            </p>
          </div>
          <div className="text-right">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 font-black text-[11px] uppercase tracking-wide border border-amber-500/30">
              Status: PENDING
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">Ref: #{withdrawalId.slice(-8)}</span>
          </div>
        </div>

        {/* 20% Commission Breakdown Table */}
        <div className="bg-[#090a12] p-4 rounded-2xl border border-white/5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>Requested Withdrawal Amount:</span>
            <span className="font-mono font-bold text-white">₹{formattedGross}</span>
          </div>

          <div className="flex items-center justify-between text-rose-300">
            <span className="flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-rose-400" />
              Platform Fee (20% Commission):
            </span>
            <span className="font-mono font-bold text-rose-400">-₹{formattedFee}</span>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between font-bold">
            <span className="text-emerald-400">Net Payable Balance (Dene Wala Balance):</span>
            <span className="text-emerald-400 font-mono text-base font-black">₹{formattedNet}</span>
          </div>
        </div>

        {/* Destination Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Payout Method</span>
            <span className="font-bold text-white capitalize flex items-center gap-1.5 mt-0.5">
              {method === 'upi' ? <QrCode className="w-3.5 h-3.5 text-amber-400" /> : <Building className="w-3.5 h-3.5 text-amber-400" />}
              {method === 'upi' ? 'UPI Transfer' : 'Bank Transfer'}
            </span>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Destination</span>
            <span className="font-bold text-slate-200 truncate block mt-0.5 font-mono text-[11px]">
              {destination}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
          💡 <strong>Policy Notice:</strong> Match jeetne par koi commission nahi kata gaya (100% win credit). Rules ke mutabiq 20% platform fee cashout ke dauran deduct hoti hai, aur ₹{formattedNet} aapke account mein transfer kiya jayega.
        </div>
      </div>

      {/* Prefilled WhatsApp Request Section */}
      <div className="bg-[#12131e] border border-white/10 rounded-3xl p-6 text-left space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">Prefilled Message Preview</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
              हिंदी: संक्षिप्त मेसेज
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[11px] flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
        </div>

        <div className="bg-[#090a12] p-4 rounded-xl border border-white/5 font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed select-all">
          {prefilledMessage}
        </div>

        {/* WhatsApp Direct Action Button */}
        <div className="pt-2 space-y-2">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>SEND WITHDRAWAL REQUEST ON WHATSAPP</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-xs text-amber-300 font-semibold">
              💡 सेंड दबाते ही यह मेसेज WhatsApp पर सीधा चला जाएगा।
            </p>
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-2">
            Official Support Desk WhatsApp (+91 7466990584) will verify and process your ₹{formattedNet} payout.
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          href="/wallet/withdraw/history"
          className="w-full sm:w-auto py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all"
        >
          View Withdrawal History
        </Link>
        <Link
          href="/wallet"
          className="w-full sm:w-auto py-3 px-6 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all"
        >
          Back to Wallet
        </Link>
      </div>
    </main>
  );
}

export default function WithdrawConfirmationPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        }>
          <WithdrawConfirmationContent />
        </Suspense>
        <Footer />
      </div>
    </AuthGuard>
  );
}
