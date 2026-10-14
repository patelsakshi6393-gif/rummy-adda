'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Trophy, Calendar, Users, ArrowLeft, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TournamentData } from '@/lib/types';

export default function TournamentDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user, profile } = useAuth();

  const [tour, setTour] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    async function fetchTour() {
      if (!id) return;
      const snap = await getDoc(doc(db, 'tournaments', id));
      if (snap.exists()) {
        setTour(snap.data() as TournamentData);
      }
      if (user) {
        const regSnap = await getDoc(doc(db, 'tournamentRegistrations', `reg_${id}_${user.uid}`));
        if (regSnap.exists()) {
          setRegistered(true);
        }
      }
      setLoading(false);
    }
    fetchTour();
  }, [id, user]);

  const handleRegister = async () => {
    if (!user || !profile || !tour) return;
    setRegistering(true);
    try {
      const regId = `reg_${tour.id}_${user.uid}`;
      await setDoc(doc(db, 'tournamentRegistrations', regId), {
        regId,
        tournamentId: tour.id,
        uid: user.uid,
        playerId: profile.playerId,
        displayName: profile.displayName,
        registeredAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'tournaments', tour.id), {
        registeredCount: (tour.registeredCount || 0) + 1,
      });
      setRegistered(true);
      setTour({ ...tour, registeredCount: (tour.registeredCount || 0) + 1 });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Link href="/tournaments" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Tournaments</span>
          </Link>

          {loading ? (
            <p className="text-center py-12 text-xs text-slate-400">Loading tournament...</p>
          ) : !tour ? (
            <p className="text-center py-12 text-xs text-slate-400">Tournament not found.</p>
          ) : (
            <div className="bg-[#12131e] border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">
                      {tour.type}
                    </span>
                    <span className="text-xs text-slate-400">• Guaranteed Payouts</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white">{tour.title}</h1>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Prize Pool</span>
                  <p className="text-2xl sm:text-3xl font-black text-amber-300">
                    ₹{tour.prizePool.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Tournament Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#0a0b12] p-4 rounded-2xl border border-white/5 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold">Entry Fee</span>
                  <p className="text-base font-bold text-white mt-0.5">
                    {tour.entryFee === 0 ? 'FREE' : `₹${tour.entryFee}`}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold">Start Time</span>
                  <p className="text-base font-bold text-amber-400 mt-0.5">{tour.startTime}</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold">Registered</span>
                  <p className="text-base font-bold text-white mt-0.5">
                    {tour.registeredCount} / {tour.maxParticipants}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold">Format</span>
                  <p className="text-base font-bold text-white mt-0.5">13-Card Rummy</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-bold text-white mb-2">Overview</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{tour.description}</p>
              </div>

              {/* Rules List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white">Championship Rules & Blind Structure</h3>
                <div className="space-y-2">
                  {tour.rules?.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-white/10">
                {registered ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>You are registered for this tournament! Be seated 5 minutes prior to start.</span>
                  </div>
                ) : (
                  <button
                    onClick={handleRegister}
                    disabled={registering || (tour.registeredCount >= tour.maxParticipants)}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-sm uppercase tracking-wider shadow-xl transition-all disabled:opacity-50"
                  >
                    {registering ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Confirming Registration...</span>
                      </span>
                    ) : (
                      <span>REGISTER NOW (ENTRY: {tour.entryFee === 0 ? 'FREE' : `₹${tour.entryFee}`})</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
