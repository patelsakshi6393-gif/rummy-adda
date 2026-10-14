'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  User as UserIcon,
  ShieldCheck,
  Calendar,
  Mail,
  Phone,
  Edit2,
  Copy,
  Check,
  ChevronRight,
  BarChart2,
  Gift,
  Share2,
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPlayerId = () => {
    if (!profile?.playerId) return;
    navigator.clipboard.writeText(profile.playerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        updatedAt: new Date().toISOString(),
      });
      await refreshProfile();
      setEditing(false);
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

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white">Player Profile</h1>

          {/* Profile Card */}
          <div className="bg-[#12131e] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-600 via-amber-600 to-yellow-400 p-0.5 shadow-xl shadow-rose-950/40 shrink-0">
                  <div className="w-full h-full bg-[#150a10] rounded-[14px] flex items-center justify-center text-3xl font-black text-amber-300">
                    {profile?.displayName?.charAt(0).toUpperCase() || 'P'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-xl font-bold text-white">{profile?.displayName || 'Player'}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Verified
                    </span>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-0.5">
                    <span className="font-mono text-sm font-bold text-amber-400">
                      Player ID: {profile?.playerId}
                    </span>
                    <button
                      onClick={handleCopyPlayerId}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Copy Player ID"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">Role: Player • Royale Club Member</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setDisplayName(profile?.displayName || '');
                  setEditing(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-2 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit Profile</span>
              </button>
            </div>

            {/* Profile Info Attributes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/5 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#090a12] border border-white/5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Registered Mobile</span>
                  <p className="font-semibold text-slate-200 truncate">
                    {profile?.phone ? `+91 ${profile.phone}` : (profile?.email || 'N/A')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#090a12] border border-white/5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Account Status</span>
                  <p className="font-semibold text-emerald-300">Verified Player</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#090a12] border border-white/5">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Member Since</span>
                  <p className="font-semibold text-slate-200">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN') : 'Recent'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Sub-Route Navigation Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/profile/account"
              className="p-5 rounded-2xl bg-[#12131e] border border-white/10 hover:border-amber-400/50 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300">Account Overview</h4>
                  <p className="text-xs text-slate-400">Security & verification state</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
            </Link>

            <Link
              href="/profile/game-statistics"
              className="p-5 rounded-2xl bg-[#12131e] border border-white/10 hover:border-amber-400/50 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <BarChart2 className="w-5 h-5 text-blue-400" />
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300">Game Statistics</h4>
                  <p className="text-xs text-slate-400">Wins, losses, and win rate</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
            </Link>

            <Link
              href="/profile/rewards"
              className="p-5 rounded-2xl bg-[#12131e] border border-white/10 hover:border-amber-400/50 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-purple-400" />
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300">Royale Rewards</h4>
                  <p className="text-xs text-slate-400">Loyalty tiers & earned points</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
            </Link>

            <Link
              href="/profile/referrals"
              className="p-5 rounded-2xl bg-[#12131e] border border-white/10 hover:border-amber-400/50 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <Share2 className="w-5 h-5 text-rose-400" />
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300">Refer & Earn</h4>
                  <p className="text-xs text-slate-400">Invite friends and earn rewards</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
            </Link>
          </div>

          {/* Edit Profile Modal */}
          {editing && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#12131e] border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">Edit Profile</h3>
                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 uppercase font-semibold mb-1">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-[#090a12] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold shadow-md hover:from-amber-300 hover:to-amber-400 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
