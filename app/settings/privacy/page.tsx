'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { EyeOff, ArrowLeft, Check, Lock } from 'lucide-react';

export default function PrivacySettingsPage() {
  const [showStats, setShowStats] = useState(true);
  const [allowSearch, setAllowSearch] = useState(true);
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
            <h1 className="text-2xl sm:text-3xl font-black text-white">Privacy Preferences</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Control your public profile visibility and table history exposure.
            </p>
          </div>

          <div className="bg-[#12131e] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl text-xs">
            <div className="space-y-4 divide-y divide-white/5">
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h4 className="text-sm font-bold text-white">Public Game Statistics</h4>
                  <p className="text-slate-400 text-[11px]">Allow table opponents to view your win rate and tournament achievements</p>
                </div>
                <input
                  type="checkbox"
                  checked={showStats}
                  onChange={() => setShowStats(!showStats)}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Player Search Visibility</h4>
                  <p className="text-slate-400 text-[11px]">Allow friends to locate your profile using your unique Player ID</p>
                </div>
                <input
                  type="checkbox"
                  checked={allowSearch}
                  onChange={() => setAllowSearch(!allowSearch)}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              {saved && <span className="text-emerald-400 font-bold text-xs flex items-center gap-1"><Check className="w-4 h-4" /> Privacy updated</span>}
              <button
                onClick={handleSave}
                className="ml-auto py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-xs shadow-md"
              >
                Save Settings
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
