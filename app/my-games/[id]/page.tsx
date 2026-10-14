'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Trophy, ArrowLeft, Users, Calendar, Award } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GameState } from '@/lib/types';

export default function SingleGameHistoryPage() {
  const params = useParams();
  const id = params?.id as string;
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const snap = await getDoc(doc(db, 'games', id));
      if (snap.exists()) {
        setGame(snap.data() as GameState);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
          <Link href="/my-games" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Matches</span>
          </Link>
          {loading ? (
            <p className="text-center py-12 text-xs text-slate-400">Loading game record...</p>
          ) : !game ? (
            <p className="text-center py-12 text-xs text-slate-400">Match not found.</p>
          ) : (
            <div className="bg-[#12131e] border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400">Match Record</span>
                <h1 className="text-2xl font-black text-white mt-1">Game #{game.gameId.slice(-8)}</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mode: {game.mode.toUpperCase()} Rummy • Stake: ₹{game.entryFee}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#0a0b12] border border-white/5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Status</span>
                  <p className="font-bold text-white mt-0.5">{game.status}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Point Value</span>
                  <p className="font-bold text-amber-300 mt-0.5">₹{game.pointValue}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Created</span>
                  <p className="font-bold text-white mt-0.5">{new Date(game.createdAt).toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/game/${game.gameId}`}
                  className="inline-block py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase"
                >
                  Open Table Viewer
                </Link>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
