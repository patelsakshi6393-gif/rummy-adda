'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HeartHandshake, ArrowLeft, ShieldAlert, Check, Clock } from 'lucide-react';

export default function SafePlaySettingsPage() {
  const [dailyLimit, setDailyLimit] = useState('5000');
  const [coolingOff, setCoolingOff] = useState('none');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
            <h1 className="text-2xl sm:text-3xl font-black text-white">Safe Play & Responsible Gaming</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              RummyAdda advocates responsible skill gaming. Set deposit caps and cooling-off intervals.
            </p>
          </div>

          <div className="bg-[#12131e] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl text-xs">
            <div>
              <label className="block text-slate-300 uppercase font-bold mb-2">Daily Deposit Limit (₹)</label>
              <select
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
              >
                <option value="1000">₹1,000 / day</option>
                <option value="5000">₹5,000 / day</option>
                <option value="10000">₹10,000 / day</option>
                <option value="25000">₹25,000 / day</option>
                <option value="unlimited">No Daily Limit</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 uppercase font-bold mb-2">Cooling-Off Period (Temporary Self-Exclusion)</label>
              <select
                value={coolingOff}
                onChange={(e) => setCoolingOff(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
              >
                <option value="none">No Exclusion (Active)</option>
                <option value="24h">24 Hours Cooling-Off</option>
                <option value="7d">7 Days Break</option>
                <option value="30d">30 Days Self-Exclusion</option>
              </select>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Player Protection Commitment</span>
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Skill games should remain entertaining and disciplined. Never play with funds reserved for vital essentials. Strict 18+ enforcement applies to all accounts.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {saved && <span className="text-emerald-400 font-bold text-xs flex items-center gap-1"><Check className="w-4 h-4" /> Preferences applied</span>}
              <button
                onClick={handleSave}
                className="ml-auto py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-xs shadow-md"
              >
                Update Safe Play Rules
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
