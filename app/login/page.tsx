'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Lock,
  Phone,
  Loader2,
  AlertCircle,
  ArrowRight,
  UserPlus,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, signInWithPhone, signUpWithPhone, loading: authLoading } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [redirectingToSignup, setRedirectingToSignup] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
    setPhone(val);
    if (redirectingToSignup) {
      setRedirectingToSignup(false);
      setErrorMsg('');
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    }
  };

  const handleGoToSignupNow = () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    const cleanPhone = phone.trim().replace(/[^\d]/g, '');
    router.push(cleanPhone ? `/signup?phone=${encodeURIComponent(cleanPhone)}` : '/signup');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setRedirectingToSignup(false);
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);

    const cleanPhone = phone.trim().replace(/[^\d]/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      // First attempt standard sign in
      await signInWithPhone(cleanPhone, password);
      router.push('/');
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);

      // If user is not found or credential invalid:
      // Try to auto-create account for new mobile number with ₹20 welcome bonus!
      if (
        errStr.includes('user-not-found') ||
        errStr.includes('invalid-credential') ||
        errStr.includes('wrong-password')
      ) {
        if (password.length >= 6) {
          try {
            await signUpWithPhone(cleanPhone, password);
            setSuccessMsg('🎉 New Account Created! ₹20 Welcome Bonus Credited. Entering Game...');
            setTimeout(() => {
              router.push('/');
            }, 800);
            return;
          } catch (signUpErr: unknown) {
            const signUpErrStr = signUpErr instanceof Error ? signUpErr.message : String(signUpErr);
            if (signUpErrStr.includes('email-already-in-use') || signUpErrStr.includes('already-in-use')) {
              setErrorMsg('Incorrect password for this registered mobile number. Please enter the correct password.');
              return;
            }
          }
        }

        // Shift to signup if password too short or needs explicit registration
        setRedirectingToSignup(true);
        setCountdown(2);
        setErrorMsg('New mobile number detected! Shifting to Create Account to claim your ₹20 Welcome Bonus...');

        let remaining = 2;
        const intervalId = setInterval(() => {
          remaining -= 1;
          setCountdown(remaining);
          if (remaining <= 0) {
            clearInterval(intervalId);
            router.push(`/signup?phone=${encodeURIComponent(cleanPhone)}`);
          }
        }, 1000);
        redirectTimerRef.current = intervalId as unknown as NodeJS.Timeout;
      } else if (errStr.includes('user-disabled')) {
        setErrorMsg('This player account has been disabled. Contact support.');
      } else if (errStr.includes('network-request-failed')) {
        setErrorMsg('Network error. Please check your internet connection.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to sign in. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-md w-full bg-[#11121d] border border-amber-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10">
          {/* Top Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-black/40 border border-white/10 rounded-2xl mb-8">
            <button
              type="button"
              className="py-2.5 px-3 rounded-xl bg-amber-500 text-black font-extrabold text-xs uppercase tracking-wider shadow"
            >
              Sign In
            </button>
            <Link
              href={phone ? `/signup?phone=${encodeURIComponent(phone)}` : '/signup'}
              className="py-2.5 px-3 rounded-xl text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider text-center transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Create Account</span>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full font-black">
                ₹20
              </span>
            </Link>
          </div>

          {/* Logo header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#150a0f] rounded-[14px] flex items-center justify-center">
                <span className="text-2xl font-black text-amber-400">♠</span>
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-wide">
              Sign In to <span className="text-amber-400">RummyAdda</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Enter your mobile number and password to join live tables
            </p>
          </div>

          {/* Automatic Shift Notice to Create Account */}
          {redirectingToSignup && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border-2 border-amber-400 shadow-xl space-y-3 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center shrink-0 font-black">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-extrabold text-white text-xs">
                    यह यूजर अभी मौजूद नहीं है / Account Not Found
                  </p>
                  <p className="text-[11px] text-amber-200 mt-0.5 leading-snug">
                    +91 {phone} पर कोई अकाउंट नहीं मिला। आपको <strong>Create Account</strong> वाले पेज पर ऑटोमैटिक शिफ्ट किया जा रहा है ({countdown}s)...
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleGoToSignupNow}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>अभी साइन अप करें (Claim ₹20 Bonus)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
                    setRedirectingToSignup(false);
                  }}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Success / Auto-Created Message */}
          {successMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs flex items-center gap-3 shadow-lg">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 animate-spin" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Standard Error Message if not auto-shifting */}
          {errorMsg && !redirectingToSignup && (
            <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Mobile Number
              </label>
              <div className="relative flex">
                <div className="flex items-center justify-center px-3.5 rounded-l-xl bg-[#0b0c15] border border-r-0 border-white/10 text-xs font-bold text-amber-400">
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
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
                  required
                  autoFocus
                  className="flex-1 px-4 py-3 rounded-r-xl bg-[#090a12] border border-white/10 text-white placeholder-slate-600 text-sm font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all tracking-wider"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || redirectingToSignup}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 mt-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>SIGN IN TO PLAY</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer link */}
          <div className="mt-8 text-center text-xs text-slate-400">
            Don&apos;t have an account?{' '}
            <Link
              href={phone ? `/signup?phone=${encodeURIComponent(phone)}` : '/signup'}
              className="text-amber-400 font-bold hover:underline"
            >
              Create Account (Claim ₹20 Bonus)
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
