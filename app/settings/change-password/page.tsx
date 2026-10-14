'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { KeyRound, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { updatePassword } from 'firebase/auth';

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!user) return;
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(user, newPassword);
      setSuccessMsg('Your password has been securely updated in Firebase Auth!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      if (errStr.includes('requires-recent-login')) {
        setErrorMsg('For security, please log out and log in again before changing your password.');
      } else {
        setErrorMsg('Failed to update password. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Settings</span>
          </Link>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Change Password</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Update your account password securely via Firebase Authentication.
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-[#12131e] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl text-xs">
            <div>
              <label className="block text-slate-300 uppercase font-bold mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 uppercase font-bold mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50 mt-4"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>SAVE NEW PASSWORD</span>
              )}
            </button>
          </form>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
