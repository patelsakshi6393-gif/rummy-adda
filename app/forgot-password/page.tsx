'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Phone, MessageCircle, ArrowLeft, ShieldCheck } from 'lucide-react';

const WHATSAPP_NUMBER = '919277182389';

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState('');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
    setPhone(val);
  };

  const whatsappMessage = encodeURIComponent(
    `Hello RummyAdda Support, I need to reset my password. My registered Mobile Number is ${
      phone || '[Enter your number]'
    }.`
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-[#11121d] border border-amber-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2">
              <Phone className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Reset Account Password</h1>
            <p className="text-xs text-slate-400">
              Enter your registered 10-digit mobile number to request instant password verification via the official 24/7 support desk.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Registered Mobile Number
              </label>
              <div className="relative flex">
                <div className="flex items-center justify-center px-3.5 rounded-l-xl bg-[#0b0c15] border border-r-0 border-white/10 text-xs font-bold text-amber-400">
                  +91
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="9876543210"
                  className="flex-1 px-4 py-3 rounded-r-xl bg-[#090a12] border border-white/10 text-white placeholder-slate-600 text-sm font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all tracking-wider"
                />
              </div>
            </div>

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95 text-xs uppercase"
            >
              <MessageCircle className="w-4 h-4" />
              <span>RESET VIA WHATSAPP SUPPORT DESK</span>
            </a>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Our support team will verify your account ownership and assist in resetting your credentials securely.
            </span>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
