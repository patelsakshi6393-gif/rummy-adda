'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Lock,
  Phone,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Gift,
} from 'lucide-react';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryPhone = searchParams.get('phone');
  const queryRef = searchParams.get('ref') || searchParams.get('referral') || searchParams.get('code') || '';
  const { user, signUpWithPhone, loading: authLoading } = useAuth();

  const initialPhone = queryPhone ? queryPhone.replace(/[^\d]/g, '').slice(0, 10) : '';

  const [phone, setPhone] = useState(initialPhone);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(queryRef.trim().toUpperCase());
  const [validatingRef, setValidatingRef] = useState(false);
  const [refValidationMessage, setRefValidationMessage] = useState<string | null>(null);
  const [refIsValid, setRefIsValid] = useState<boolean | null>(null);
  const [agreed, setAgreed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [transferredNotice, setTransferredNotice] = useState(Boolean(initialPhone));

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
    setPhone(val);
  };

  const handleCheckReferralCode = async () => {
    if (!referralCode.trim()) {
      setRefValidationMessage('Please enter a referral code.');
      setRefIsValid(false);
      return;
    }
    setValidatingRef(true);
    setRefValidationMessage(null);
    try {
      const { validateReferralCode } = await import('@/lib/referral-service');
      const res = await validateReferralCode(referralCode.trim(), phone);
      setRefIsValid(res.isValid);
      setRefValidationMessage(res.message);
    } catch {
      setRefIsValid(false);
      setRefValidationMessage('Could not verify referral code.');
    } finally {
      setValidatingRef(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanPhone = phone.trim().replace(/[^\d]/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your password.');
      return;
    }
    if (!agreed) {
      setErrorMsg('You must confirm you are 18+ years of age and accept terms.');
      return;
    }

    const cleanRef = referralCode.trim().toUpperCase();
    if (cleanRef) {
      const { validateReferralCode } = await import('@/lib/referral-service');
      const check = await validateReferralCode(cleanRef, cleanPhone);
      if (!check.isValid) {
        setErrorMsg(`${check.message} (Leave blank if you don't have a referral code).`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await signUpWithPhone(cleanPhone, password, cleanRef);
      // User registered with referral code gets 20 + 20 chips, referrer gets 50 chips
      if (cleanRef) {
        setSuccessMsg('🎉 Registration Successful! 20 + 20 = 40 Free Chips Credited to your wallet! Entering Game...');
      } else {
        setSuccessMsg('🎉 Registration Successful! ₹20 Welcome Bonus Credited. Entering Game...');
      }
      setTimeout(() => {
        router.push('/');
      }, 900);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      if (errStr.includes('email-already-in-use') || errStr.includes('already-in-use')) {
        setErrorMsg('An account with this mobile number already exists. Please sign in.');
      } else if (errStr.includes('weak-password')) {
        setErrorMsg('Password is too weak. Please use letters and numbers.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to create account. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/15 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full bg-[#11121d] border border-amber-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10">
        {/* Top Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-black/40 border border-white/10 rounded-2xl mb-8">
          <Link
            href={phone ? `/login?phone=${encodeURIComponent(phone)}` : '/login'}
            className="py-2.5 px-3 rounded-xl text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider text-center transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Sign In</span>
          </Link>
          <button
            type="button"
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-xs uppercase tracking-wider shadow flex items-center justify-center gap-1.5"
          >
            <span>Create Account</span>
            <span className="text-[10px] bg-black/20 text-black px-1.5 py-0.5 rounded-full font-black">
              ₹20
            </span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-[#150a0f] rounded-[14px] flex items-center justify-center">
              <span className="text-2xl font-black text-amber-400">♠</span>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">
            Join <span className="text-amber-400">RummyAdda</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create your account with your mobile number to get your unique Player ID
          </p>
        </div>

        {/* Transferred from Login Banner */}
        {transferredNotice && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5 shadow-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-white text-xs">
                Mobile Number +91 {phone} Transferred!
              </p>
              <p className="text-[11px] text-emerald-200 mt-0.5 leading-snug">
                बस पासवर्ड दर्ज करें और अपना अकाउंट बनाएं। आपके वॉलेट में ₹20 वेलकम बोनस तुरंत क्रेडिट होगा!
              </p>
            </div>
          </div>
        )}

        {/* Referral / Welcome Bonus Banner */}
        {referralCode ? (
          <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20 border border-emerald-400/50 text-xs flex items-center gap-2.5 shadow-lg">
            <div className="w-8 h-8 rounded-xl bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
              <Gift className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="font-extrabold text-emerald-300 text-xs uppercase tracking-wider">
                Referral Bonus Active: 20 + 20 = 40 Chips!
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Code <strong className="text-white font-mono">{referralCode}</strong> applied. You get 20 Deposit Chips + 20 Bonus Chips!
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/40 text-xs flex items-center gap-2.5 shadow-lg">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Gift className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="font-extrabold text-amber-300 text-xs uppercase tracking-wider">
                ₹20 Welcome Bonus On Registration
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Have a friend&apos;s referral code? Enter it below to unlock <strong>20 + 20 = 40 Free Chips</strong>!
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs flex items-center gap-3 shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
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
                autoFocus={!queryPhone}
                className="flex-1 px-4 py-3 rounded-r-xl bg-[#090a12] border border-white/10 text-white placeholder-slate-600 text-sm font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all tracking-wider"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Create Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                autoFocus={!!queryPhone}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#090a12] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
              />
            </div>
          </div>

          {/* Referral Code Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                <span>Referral Code (Optional)</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-bold">Get 20 + 20 Chips</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={referralCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                  setReferralCode(val);
                  setRefValidationMessage(null);
                  setRefIsValid(null);
                }}
                placeholder="e.g. REFK9P2X4"
                maxLength={15}
                className={`w-full px-4 py-3 rounded-xl bg-[#090a12] border text-white placeholder-slate-600 text-sm font-mono tracking-wider uppercase focus:outline-none transition-all ${
                  refIsValid === true
                    ? 'border-emerald-500/80 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400'
                    : refIsValid === false
                    ? 'border-rose-500/80 focus:border-rose-400 focus:ring-1 focus:ring-rose-400'
                    : 'border-white/10 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                }`}
              />
              {referralCode && (
                <button
                  type="button"
                  onClick={handleCheckReferralCode}
                  disabled={validatingRef}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-[10px] font-bold border border-amber-400/40 transition-colors"
                >
                  {validatingRef ? 'Checking...' : 'Verify'}
                </button>
              )}
            </div>
            {refValidationMessage && (
              <p className={`text-[11px] mt-1 font-medium ${refIsValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                {refValidationMessage}
              </p>
            )}
          </div>

          {/* Terms checkbox */}
          <div className="pt-2 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 rounded bg-[#090a12] border-white/20 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="agreeTerms" className="text-xs text-slate-400 leading-snug cursor-pointer select-none">
              I confirm I am 18 years or older and accept the{' '}
              <Link href="/terms" className="text-amber-400 hover:underline">Terms of Service</Link>{' '}
              and{' '}
              <Link href="/fair-play" className="text-amber-400 hover:underline">Fair Play Policy</Link>.
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 mt-4 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account & Crediting Chips...</span>
              </>
            ) : (
              <>
                <span>{referralCode ? 'SIGN UP & GET 20 + 20 = 40 CHIPS' : 'SIGN UP & GET ₹20 BONUS'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Fair Play Shield */}
        <div className="mt-6 p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>100% Real Players • Zero Bots • Session Saved Automatically</span>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link
            href={phone ? `/login?phone=${encodeURIComponent(phone)}` : '/login'}
            className="text-amber-400 font-bold hover:underline"
          >
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
      <Navbar />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-amber-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading Registration...</span>
          </div>
        }
      >
        <SignupForm />
      </Suspense>
      <Footer />
    </div>
  );
}
