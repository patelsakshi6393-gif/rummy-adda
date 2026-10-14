'use client';

import React from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Shield, ArrowLeft, Key, Smartphone, Laptop, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function SecuritySettingsPage() {
  const { user } = useAuth();

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Settings</span>
          </Link>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Account Security</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Active sessions, credentials encryption, and multi-factor safety.
            </p>
          </div>

          <div className="bg-[#12131e] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h4 className="text-sm font-bold text-white">Account Password</h4>
                <p className="text-slate-400 text-[11px]">Managed securely via Firebase Authentication</p>
              </div>
              <Link
                href="/settings/change-password"
                className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-400 font-bold"
              >
                Change Password →
              </Link>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white">Current Active Session</h4>
              <div className="p-4 rounded-xl bg-[#090a12] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Laptop className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="font-bold text-white">Web Browser (Current Session)</p>
                    <p className="text-[10px] text-slate-400">Authenticated: {user?.email || 'Logged In'}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                  Online
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/5">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Fair Play Shield Standards</span>
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                RummyAdda employs rigorous server-side token verification, preventing account hijacking and card snooping. Real-time encryption protects every draw and discard command.
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
