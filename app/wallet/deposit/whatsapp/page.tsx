'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MessageCircle, ExternalLink, Copy, Loader2 } from 'lucide-react';
import { getShortPlayerId, getUserMobile } from '@/lib/utils';

const OFFICIAL_WHATSAPP_NUMBER = '919118431155';

function WhatsAppRedirectContent() {
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState(false);

  const depositId = searchParams.get('depositId') || 'dep_pending';
  const amountStr = searchParams.get('amount');
  const amountNumber = amountStr ? parseInt(amountStr, 10) : 0;
  const formattedAmount = amountNumber > 0 ? amountNumber.toLocaleString('en-IN') : '...';
  
  const shortId = getShortPlayerId(profile?.playerId);
  const userDisplayName = profile?.displayName || 'Player';
  const paramMobile = searchParams.get('mobile');
  const detectedMobile = getUserMobile(profile?.phone, profile?.email);
  const mobileNumber = paramMobile || detectedMobile || 'Not Provided';

  const messageText = 
`*RUMMY ADDA - DEPOSIT*
Player: ${userDisplayName} (#${shortId})
Mobile: ${mobileNumber}
Deposit Amount: ₹${formattedAmount}

Hello, मुझे ₹${formattedAmount} डिपॉजिट करना है। कृपया QR Code / UPI Details भेजें।`;

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
        <h1 className="text-2xl font-black text-white">Deposit Request Ready</h1>
        <p className="text-xs text-slate-400 mt-1">
          Your concise WhatsApp message is prepared with your Player ID and selected amount.
        </p>
      </div>

      {/* Prefilled Summary Card */}
      <div className="bg-[#12131e] border border-white/10 rounded-2xl p-5 text-left space-y-3 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">Prefilled Message Preview</span>
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
          {messageText}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
          <div className="bg-white/5 p-3 rounded-lg">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Player</span>
            <span className="font-bold text-white text-xs truncate block">{userDisplayName} (#{shortId})</span>
          </div>
          <div className="bg-white/5 p-3 rounded-lg">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Mobile</span>
            <span className="font-bold text-amber-300 text-xs truncate block">{mobileNumber}</span>
          </div>
          <div className="bg-white/5 p-3 rounded-lg">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Amount</span>
            <span className="font-bold text-emerald-400 text-sm">₹{formattedAmount}</span>
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
          <span>Send on WhatsApp (+91 9118431155)</span>
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
        Support desk (+91 9118431155) will verify your deposit and provide UPI / QR code on WhatsApp.
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
