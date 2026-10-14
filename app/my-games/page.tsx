'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { History, Trophy, Clock, ArrowRight, Play, CheckCircle2, XCircle } from 'lucide-react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GameState } from '@/lib/types';

export default function MyGamesPage() {
  const { user } = useAuth();
  const [games, setGames] = useState<GameState[]>([]);
  const [tab, setTab] = useState<'all' | 'active' | 'completed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'games'));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        const all = snap.docs.map((d) => d.data() as GameState);
        const verifiedMatches: GameState[] = [];

        for (const g of all) {
          if (Array.isArray(g.playerUids)) {
            if (g.playerUids.includes(user.uid)) {
              verifiedMatches.push(g);
            }
          } else {
            try {
              const pSnap = await getDoc(doc(db, 'games', g.gameId, 'players', user.uid));
              if (pSnap.exists()) {
                verifiedMatches.push(g);
              }
            } catch {
              // skip
            }
          }
        }

        verifiedMatches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setGames(verifiedMatches);
        setLoading(false);
      },
      (err) => {
        console.warn('Games listener:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const filtered = games.filter((g) => {
    if (tab === 'active') return g.status === 'PLAYING' || g.status === 'COUNTDOWN' || g.status === 'WAITING';
    if (tab === 'completed') return g.status === 'RESULT' || g.status === 'COMPLETED';
    return true;
  });

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">My Game Matches</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Authoritative history of your live table sessions, scores, and outcomes.
              </p>
            </div>

            <Link
              href="/lobby"
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-xs shadow-lg hover:from-amber-400 hover:to-amber-500 transition-transform hover:scale-105"
            >
              + Join New Match
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[#12131e] border border-white/10 w-fit">
            {[
              { id: 'all', label: 'All Matches' },
              { id: 'active', label: 'In Progress / Waiting' },
              { id: 'completed', label: 'Completed' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as 'all' | 'active' | 'completed')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  tab === t.id ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Games List */}
          <div className="space-y-4">
            {loading ? (
              <p className="text-xs text-slate-400 text-center py-8">Loading your matches...</p>
            ) : filtered.length === 0 ? (
              <div className="bg-[#12131e] border border-white/10 rounded-2xl p-12 text-center text-xs text-slate-500 space-y-3">
                <History className="w-8 h-8 mx-auto text-slate-600" />
                <p>No matches found in this category.</p>
                <Link href="/lobby" className="inline-block text-amber-400 font-bold hover:underline">
                  Visit the Lobby to Play Now
                </Link>
              </div>
            ) : (
              filtered.map((game) => {
                const isActive = game.status === 'PLAYING' || game.status === 'COUNTDOWN' || game.status === 'WAITING';
                const isWon = game.winnerUid === user?.uid;
                return (
                  <div
                    key={game.gameId}
                    className="bg-[#12131e] border border-amber-500/20 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xl"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          #{game.gameId.slice(-8)}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-xs font-bold uppercase text-slate-300">
                          {game.mode} RUMMY
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                          isActive
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                            : isWon
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isActive ? game.status : isWon ? 'You Won' : 'Completed'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                        <span>Stake: <strong className="text-white">₹{game.entryFee}</strong></span>
                        <span>•</span>
                        <span>Point Value: <strong className="text-white">₹{game.pointValue}/pt</strong></span>
                        <span>•</span>
                        <span>Started: {new Date(game.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isActive ? (
                        <Link
                          href={`/game/${game.gameId}`}
                          className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md hover:scale-105 transition-transform"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>RE-ENTER TABLE</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/game/${game.gameId}`}
                          className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold text-xs"
                        >
                          View Results
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
