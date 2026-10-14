'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Trophy, Calendar, Users, Award, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TournamentData } from '@/lib/types';

const SEED_TOURNAMENTS: TournamentData[] = [
  {
    id: 'tour_daily_freeroll',
    title: 'Daily Royale Freeroll',
    type: 'freeroll',
    prizePool: 10000,
    entryFee: 0,
    startTime: 'Today, 08:00 PM IST',
    status: 'registering',
    registeredCount: 0,
    maxParticipants: 100,
    description: 'Zero entry fee open freeroll for all registered players. Win from a guaranteed ₹10,000 prize pool!',
    rules: [
      'No entry fee required (100% Freeroll)',
      '13 Cards Points Rummy format with 3 Elimination Rounds',
      'Top 10 players win guaranteed cash prizes',
      'Late registration allowed up to 10 minutes from kickoff'
    ],
  },
  {
    id: 'tour_weekend_royale',
    title: 'Weekend Mega Royale',
    type: 'cash',
    prizePool: 100000,
    entryFee: 250,
    startTime: 'Saturday, 06:00 PM IST',
    status: 'upcoming',
    registeredCount: 0,
    maxParticipants: 200,
    description: 'The premier weekly championship. Battle through 4 stages to claim the ₹50,000 1st place bounty.',
    rules: [
      'Entry fee: ₹250 deducted from deposit or winnings',
      'Pool 101 Elimination Structure with re-entry allowed in Round 1',
      'Top 25 players receive payouts',
      'Final table features certified live skill gameplay'
    ],
  },
  {
    id: 'tour_highroller_masters',
    title: 'High Rollers Grand Masters',
    type: 'mega',
    prizePool: 500000,
    entryFee: 1500,
    startTime: 'Sunday, 09:00 PM IST',
    status: 'upcoming',
    registeredCount: 0,
    maxParticipants: 100,
    description: 'High-stakes clash for seasoned Indian Rummy veterans. Massive guaranteed payouts and royal trophy accolades.',
    rules: [
      'Entry fee: ₹1,500',
      'Deep stack 6-player tables with 90s turn buffers',
      'Champion takes home ₹2,50,000 + Diamond Royale status',
      'Certified fair play and strict anti-collusion surveillance'
    ],
  },
];

export default function TournamentsPage() {
  const { user, profile } = useAuth();
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'tournaments'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as TournamentData);
        setTournaments(list);
      },
      (err) => {
        console.warn('Tournaments listener:', err);
      }
    );
    return () => unsub();
  }, [user]);

  const handleRegister = async (t: TournamentData) => {
    if (!user || !profile) return;
    setRegisteringId(t.id);
    setRegSuccess(null);

    try {
      const regId = `reg_${t.id}_${user.uid}`;
      await setDoc(doc(db, 'tournamentRegistrations', regId), {
        regId,
        tournamentId: t.id,
        uid: user.uid,
        playerId: profile.playerId,
        displayName: profile.displayName,
        registeredAt: new Date().toISOString(),
      });

      const tourRef = doc(db, 'tournaments', t.id);
      await updateDoc(tourRef, {
        registeredCount: (t.registeredCount || 0) + 1,
      });

      setRegSuccess(`Successfully registered for ${t.title}!`);
    } catch (err) {
      console.error(err);
    } finally {
      setRegisteringId(null);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Championship Arena</span>
            <h1 className="text-3xl font-black text-white mt-1">RummyAdda Tournaments</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Join daily freerolls and high-prize mega tournaments with guaranteed payout pools.
            </p>
          </div>

          {regSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{regSuccess}</span>
            </div>
          )}

          {tournaments.length === 0 ? (
            <div className="bg-[#12131e] border border-white/10 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto text-3xl">
                🏆
              </div>
              <h3 className="text-lg font-bold text-white">No Active Tournaments Scheduled</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tournaments will be announced here as soon as scheduled. In the meantime, join live Points Rummy, Pool 101, or Deal Rummy matches!
              </p>
              <Link
                href="/lobby"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:from-amber-300 hover:to-amber-400 transition-all"
              >
                Go to Match Lobby
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tournaments.map((t) => {
                const isRegistering = registeringId === t.id;
                const isFree = t.entryFee === 0;

                return (
                  <div
                    key={t.id}
                    className="bg-[#12131e] border border-amber-500/30 hover:border-amber-400 rounded-2xl p-6 flex flex-col justify-between shadow-2xl relative transition-all hover:-translate-y-1"
                  >
                    <div>
                      {/* Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isFree
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {isFree ? '100% Freeroll' : 'Cash Tournament'}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-amber-400" />
                          <span>{t.registeredCount} / {t.maxParticipants}</span>
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white mb-2">{t.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                        {t.description}
                      </p>

                      {/* Prize & Entry Block */}
                      <div className="grid grid-cols-2 gap-3 bg-[#0a0b12] rounded-xl p-3 mb-4 border border-white/5">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Prize Pool</span>
                          <p className="text-base font-black text-amber-300">
                            ₹{t.prizePool.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Entry Fee</span>
                          <p className="text-base font-black text-white">
                            {isFree ? 'FREE' : `₹${t.entryFee}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t.startTime}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => handleRegister(t)}
                        disabled={isRegistering}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-md transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isRegistering ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Registering...</span>
                          </span>
                        ) : (
                          <span>REGISTER NOW</span>
                        )}
                      </button>

                      <Link
                        href={`/tournaments/${t.id}`}
                        className="block text-center py-2 text-xs text-amber-400/90 hover:text-white font-medium hover:underline"
                      >
                        View Tournament Rules & Structure →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
