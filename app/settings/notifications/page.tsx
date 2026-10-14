'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Bell, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function NotificationsSettingsPage() {
  const { user } = useAuth();
  const [gameAlerts, setGameAlerts] = useState(true);
  const [accountAlerts, setAccountAlerts] = useState(true);
  const [tournamentAlerts, setTournamentAlerts] = useState(true);
  const [promotionAlerts, setPromotionAlerts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const currentUid = user.uid;
    async function loadPrefs() {
      const snap = await getDoc(doc(db, 'notificationPreferences', currentUid));
      if (snap.exists()) {
        const d = snap.data();
        if (d.gameAlerts !== undefined) setGameAlerts(d.gameAlerts);
        if (d.accountAlerts !== undefined) setAccountAlerts(d.accountAlerts);
        if (d.tournamentAlerts !== undefined) setTournamentAlerts(d.tournamentAlerts);
        if (d.promotionAlerts !== undefined) setPromotionAlerts(d.promotionAlerts);
      }
    }
    loadPrefs();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const currentUid = user.uid;
    setSaving(true);
    try {
      await setDoc(doc(db, 'notificationPreferences', currentUid), {
        uid: currentUid,
        gameAlerts,
        accountAlerts,
        tournamentAlerts,
        promotionAlerts,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-2xl sm:text-3xl font-black text-white">Notification Preferences</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure which alerts you receive regarding your matches and tournaments.
            </p>
          </div>

          <div className="bg-[#12131e] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl text-xs">
            <div className="space-y-4 divide-y divide-white/5">
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h4 className="text-sm font-bold text-white">Live Game & Turn Alerts</h4>
                  <p className="text-slate-400 text-[11px]">Prompt alerts when it is your turn or when game countdown begins</p>
                </div>
                <input
                  type="checkbox"
                  checked={gameAlerts}
                  onChange={() => setGameAlerts(!gameAlerts)}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Account & Wallet Alerts</h4>
                  <p className="text-slate-400 text-[11px]">Status updates on deposit requests and withdrawal processing</p>
                </div>
                <input
                  type="checkbox"
                  checked={accountAlerts}
                  onChange={() => setAccountAlerts(!accountAlerts)}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Tournament Schedules & Kickoffs</h4>
                  <p className="text-slate-400 text-[11px]">Notifications 10 minutes prior to registered freerolls and championships</p>
                </div>
                <input
                  type="checkbox"
                  checked={tournamentAlerts}
                  onChange={() => setTournamentAlerts(!tournamentAlerts)}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Promotions & Loyalty Rewards</h4>
                  <p className="text-slate-400 text-[11px]">Special holiday bonuses, tier upgrades, and referral perks</p>
                </div>
                <input
                  type="checkbox"
                  checked={promotionAlerts}
                  onChange={() => setPromotionAlerts(!promotionAlerts)}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              {saved && <span className="text-emerald-400 font-bold text-xs flex items-center gap-1"><Check className="w-4 h-4" /> Preferences saved</span>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="ml-auto py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-xs shadow-md disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
