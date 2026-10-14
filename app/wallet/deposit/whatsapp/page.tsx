'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MessageCircle, ExternalLink, Copy, Loader2 } from 'lucide-react';

const OFFICIAL_WHATSAPP_NUMBER = '917466990584';

function WhatsAppRedirectContent() {
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState(false);

  const depositId = searchParams.get('depositId') || 'dep_pending';
  const amountStr = searchParams.get('amount');
  const amountNumber = amountStr ? parseInt(amountStr, 10) : 0;
  const formattedAmount = amountNumber > 0 ? amountNumber.toLocaleString('en-IN') : '...';
  const playerId = profile?.playerId || 'PLAYER_ID';
  const userDisplayName = profile?.displayName || 'Rummy Player';
  const userUid = user?.uid || '';

  const messageText = 
`*RUMMY ADDA - DEPOSIT REQUEST*
--------------------------------
• *Deposit Amount:* ₹${formattedAmount}
• *Player ID:* ${playerId}
• *User UID:* ${userUid}
• *Player Name:* ${userDisplayName}
• *Deposit Ref ID:* ${depositId}
--------------------------------
Hello Support Team, I want to add cash/deposit ₹${formattedAmount} to my RummyAdda wallet. Please send the payment QR / UPI details to complete this deposit.`;

  const waUrl = `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(messageText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="flex-1 max-w-xl mx-auto w-full px-4 py-12 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-black">
        <MessageCircle className="w-8 h-8" />
      </div>
      
      <div>
        <h1 className="text-2xl font-black text-white">Deposit Details Ready</h1>
        <p className="text-xs text-slate-400 mt-1">
          Your prefilled WhatsApp request includes your Player ID, User ID, and Deposit Amount.
        </p>
      </div>

      {/* Prefilled Summary Card */}
      <div className="bg-[#12131e] border border-white/10 rounded-2xl p-5 text-left space-y-3 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <span className="text-xs text-slate-400 font-bold">Prefilled Message Preview</span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[11px] flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
        </div>

        <div className="bg-[#090a12] p-4 rounded-xl border border-white/5 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
          {messageText}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
          <div className="bg-white/5 p-3 rounded-lg">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Amount</span>
            <span className="font-bold text-amber-400 text-sm">₹{formattedAmount}</span>
          </div>
          <div className="bg-white/5 p-3 rounded-lg">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Player ID</span>
            <span className="font-bold text-white text-sm">{playerId}</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Direct Action Button */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto py-3.5 px-7 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-105"
        >
          <MessageCircle className="w-4 h-4 fill-current" />
          <span>Send on WhatsApp Support Desk</span>
          <ExternalLink className="w-3.5 h-3.5 ml-1" />
        </a>
        <Link
          href="/wallet/deposit/pending"
          className="w-full sm:w-auto py-3.5 px-6 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl"
        >
          View Pending Status
        </Link>
      </div>

      <p className="text-[11px] text-slate-500">
        Support desk will verify your deposit and provide UPI / QR code on WhatsApp.
      </p>
    </main>
  );
}

export default function DepositWhatsAppRedirectPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        }>
          <WhatsAppRedirectContent />
        </Suspense>
        <Footer />
      </div>
    </AuthGuard>
  );
}
