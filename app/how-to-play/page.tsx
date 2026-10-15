'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PlayingCard } from '@/components/PlayingCard';
import { Card } from '@/lib/types';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';

export default function HowToPlayPage() {
  const [activeTab, setActiveTab] = useState<'basics' | 'pure' | 'impure' | 'sets' | 'turns' | 'points'>('basics');

  // Example cards
  const pureSeq: Card[] = [
    { id: 'p1', suit: 'spades', rank: '5' },
    { id: 'p2', suit: 'spades', rank: '6' },
    { id: 'p3', suit: 'spades', rank: '7' },
    { id: 'p4', suit: 'spades', rank: '8' },
  ];

  const impureSeq: Card[] = [
    { id: 'i1', suit: 'hearts', rank: '9' },
    { id: 'i2', suit: 'clubs', rank: 'K' }, // Joker
    { id: 'i3', suit: 'hearts', rank: 'J' },
    { id: 'i4', suit: 'hearts', rank: 'Q' },
  ];

  const setCards: Card[] = [
    { id: 's1', suit: 'diamonds', rank: '8' },
    { id: 's2', suit: 'clubs', rank: '8' },
    { id: 's3', suit: 'spades', rank: '8' },
  ];

  const invalidSet: Card[] = [
    { id: 'inv1', suit: 'diamonds', rank: '8' },
    { id: 'inv2', suit: 'diamonds', rank: '8' }, // Duplicate suit
    { id: 'inv3', suit: 'spades', rank: '8' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Hero Banner */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Official Guide • 13-Card Indian Rummy</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            How to Play Rummy & Win
          </h1>
          <p className="text-sm sm:text-base text-slate-300">
            Learn the exact rules of 13-card Indian Rummy, pure sequences, wild jokers, valid declarations, and tactical drop strategies.
          </p>
        </div>

        {/* Quick Start 3-Point Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#11121d] border border-amber-500/20 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
              1
            </div>
            <h3 className="text-base font-bold text-white">Pure Sequence is Mandatory</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You must form at least one Pure Sequence (3+ consecutive cards of the same suit without any joker). Without this, any declaration results in an 80-point penalty.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#11121d] border border-amber-500/20 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
              2
            </div>
            <h3 className="text-base font-bold text-white">Minimum 2 Sequences Needed</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              In addition to the Pure Sequence, you must have a 2nd sequence (which can be Pure or Impure using Wild/Printed Jokers). The remaining cards can be sets or sequences.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#11121d] border border-amber-500/20 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
              3
            </div>
            <h3 className="text-base font-bold text-white">First Declaration Wins Pot</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The first player to arrange all 13 cards into valid melds, discard 1 card into the Declare slot, and submit a valid show gets 0 points and wins the entire match pool!
            </p>
          </div>
        </div>

        {/* Detailed Tabs Card */}
        <div className="bg-[#0f111c] border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl">
          {/* Navigation Bar */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto text-xs font-bold scrollbar-none">
            <button
              onClick={() => setActiveTab('basics')}
              className={`px-4 py-2.5 rounded-xl transition-all shrink-0 ${
                activeTab === 'basics' ? 'bg-amber-500 text-black shadow-lg font-black' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              1. Objective & Setup
            </button>
            <button
              onClick={() => setActiveTab('pure')}
              className={`px-4 py-2.5 rounded-xl transition-all shrink-0 ${
                activeTab === 'pure' ? 'bg-amber-500 text-black shadow-lg font-black' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              2. Pure Sequence
            </button>
            <button
              onClick={() => setActiveTab('impure')}
              className={`px-4 py-2.5 rounded-xl transition-all shrink-0 ${
                activeTab === 'impure' ? 'bg-amber-500 text-black shadow-lg font-black' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              3. Impure Sequence & Jokers
            </button>
            <button
              onClick={() => setActiveTab('sets')}
              className={`px-4 py-2.5 rounded-xl transition-all shrink-0 ${
                activeTab === 'sets' ? 'bg-amber-500 text-black shadow-lg font-black' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              4. Sets & Suits
            </button>
            <button
              onClick={() => setActiveTab('turns')}
              className={`px-4 py-2.5 rounded-xl transition-all shrink-0 ${
                activeTab === 'turns' ? 'bg-amber-500 text-black shadow-lg font-black' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              5. Turn Gameplay & Drops
            </button>
            <button
              onClick={() => setActiveTab('points')}
              className={`px-4 py-2.5 rounded-xl transition-all shrink-0 ${
                activeTab === 'points' ? 'bg-amber-500 text-black shadow-lg font-black' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              6. Points & Scoring
            </button>
          </div>

          {/* TAB 1 */}
          {activeTab === 'basics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">How Indian Rummy is Setup</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Indian Rummy is played with 2 standard decks of 52 cards each plus 2 printed Jokers (total 108 cards).
                Each player at the table is dealt 13 cards. One random card is selected face-up as the Wild Joker,
                and one card is opened to start the Discard (Open) Pile.
              </p>

              <div className="p-5 rounded-2xl bg-[#141525] border border-amber-500/20 space-y-3">
                <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
                  Winning Combination Checklist:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-black/40 rounded-xl flex items-center gap-2.5 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Pure Sequence (3 or 4 cards, no joker)</span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl flex items-center gap-2.5 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Second Sequence (Pure or with Joker)</span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl flex items-center gap-2.5 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Set or Sequence 3 (3 or 4 cards)</span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl flex items-center gap-2.5 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Set or Sequence 4 (3 or 4 cards)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 */}
          {activeTab === 'pure' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">Pure Sequence (प्योर सीक्वेंस)</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                A Pure Sequence consists of 3 or more consecutive cards of the same suit made without any joker substitution.
                If you declare without at least one pure sequence, you lose 80 points immediately.
              </p>

              <div className="p-6 rounded-2xl bg-[#141525] border border-emerald-500/30 space-y-4">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Example: 5♠ - 6♠ - 7♠ - 8♠
                </span>
                <div className="flex items-center gap-3">
                  {pureSeq.map((c) => (
                    <PlayingCard key={c.id} card={c} size="md" disabled />
                  ))}
                </div>
                <p className="text-xs text-slate-300">
                  All 4 cards belong to Spades (♠) and form a sequential numerical order.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3 */}
          {activeTab === 'impure' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">Impure Sequence & Jokers</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                An Impure Sequence is 3 or more consecutive cards of the same suit where a Wild Joker or Printed Joker substitutes a missing card.
              </p>

              <div className="p-6 rounded-2xl bg-[#141525] border border-blue-500/30 space-y-4">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
                  Example: 9♥ - [Wild Joker K♣] - J♥ - Q♥
                </span>
                <div className="flex items-center gap-3">
                  {impureSeq.map((c, idx) => (
                    <div key={c.id} className="relative">
                      {idx === 1 && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-400 text-black font-black text-[9px] px-1 py-0.5 rounded shadow">
                          WILD JOKER
                        </span>
                      )}
                      <PlayingCard key={c.id} card={c} wildJokerRank={idx === 1 ? 'K' : undefined} size="md" disabled />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-300">
                  The King of Clubs is the designated Wild Joker for the hand and substitutes 10 of Hearts.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4 */}
          {activeTab === 'sets' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">Sets & The Duplicate Suit Rule</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                A Set consists of 3 or 4 cards of the same rank from different suits.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#141525] border border-emerald-500/30 space-y-3">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Valid Set (8♦ - 8♣ - 8♠)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {setCards.map((c) => (
                      <PlayingCard key={c.id} card={c} size="sm" disabled />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">All 3 cards have distinct suits.</p>
                </div>

                <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Invalid Set (Two 8♦ Diamonds!)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {invalidSet.map((c) => (
                      <PlayingCard key={c.id} card={c} size="sm" disabled />
                    ))}
                  </div>
                  <p className="text-xs text-rose-300">Duplicate suit inside a set is invalid in Indian Rummy.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5 */}
          {activeTab === 'turns' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">Turn Gameplay & The Drop Option</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                On each turn, you have 45 seconds to make your move.
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-[#141525] rounded-xl flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">1</span>
                  <p><strong className="text-white">Draw:</strong> Pick 1 card from either the Closed Deck or Open Discard Pile.</p>
                </div>
                <div className="p-4 bg-[#141525] rounded-xl flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">2</span>
                  <p><strong className="text-white">Sort:</strong> Click the SORT button to automatically align cards by suits and ranks.</p>
                </div>
                <div className="p-4 bg-[#141525] rounded-xl flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">3</span>
                  <p><strong className="text-white">Discard:</strong> Select 1 card and click DISCARD (or DECLARE if all melds are valid).</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <h4 className="text-sm font-bold text-amber-300">Drop Penalties</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">First Drop</span>
                    <strong className="text-white text-base">20 Points</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Middle Drop</span>
                    <strong className="text-white text-base">40 Points</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6 */}
          {activeTab === 'points' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">Points, Penalty & Real Money Winnings Explained</h2>
              
              {/* Question 1: Money Return */}
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                  Real Money Return (पैसे की वापसी)
                </span>
                <h3 className="text-lg font-bold text-white">
                  क्या गेम जीतने पर लगाया हुआ पैसा वापस मिलता है?
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  <strong>हाँ, 100%!</strong> जब आप मैच जीतते हैं (0 पॉइंट्स पर Valid Declare करते हैं), तो आपका लगाया हुआ पैसा (Entry Fee) भी वापस मिलता है और साथ में विरोधी (Opponents) के अनमैच्ड पत्तों के पेनल्टी पॉइंट्स की विनिंग राशि में से 14% प्लेटफॉर्म फीस ऑटोमेटिक कटकर नेट विनिंग सीधे आपके <strong>Winning Cash Wallet</strong> में क्रेडिट होती है।
                  <br />
                  <span className="text-amber-300 font-semibold mt-1 block">
                    💡 14% प्लेटफॉर्म फीस केवल मैच जीतते समय ऑटोमेटिक कटती है। विथड्रॉल (Withdrawal) के समय 0% फीस लगती है (विथड्रॉल पूरी तरह मुफ़्त है)!
                  </span>
                </p>
              </div>

              {/* Question 2: Why Points show at start */}
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                  The Points Rule (पॉइंट्स का नियम)
                </span>
                <h3 className="text-lg font-bold text-white">
                  बिना खेले पॉइंट्स क्यों दिखते हैं? क्या यह इनाम है?
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  <strong>नहीं! रम्मी में पॉइंट्स &apos;इनाम&apos; नहीं बल्कि &apos;पेनल्टी (नुकसान)&apos; होते हैं!</strong>
                  <br />
                  रम्मी का सबसे मुख्य नियम है: <strong>0 पॉइंट्स वाला खिलाड़ी ही विनर बनता है!</strong>
                  <br />
                  जब मैच शुरू होता है और 13 पत्ते बांटे जाते हैं, तो बिना सीक्वेंस बने उन पत्तों का कुल पेनल्टी स्कोर (अधिकतम 80 पॉइंट्स) गिना जाता है। जैसे-जैसे आप पत्ते मिलाकर Pure Sequence (जैसे 4♠-5♠-6♠) और सेट बनाते हैं, आपके पॉइंट्स घटते जाते हैं और 0 हो जाते हैं!
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="p-4 rounded-xl bg-[#141525] border border-white/5">
                  <span className="text-slate-400 block">Face Cards (A, K, Q, J)</span>
                  <strong className="text-amber-400 text-lg block mt-1">10 Points Each</strong>
                </div>
                <div className="p-4 rounded-xl bg-[#141525] border border-white/5">
                  <span className="text-slate-400 block">Number Cards (2 to 10)</span>
                  <strong className="text-white text-lg block mt-1">Face Value (2 - 10)</strong>
                </div>
                <div className="p-4 rounded-xl bg-[#141525] border border-white/5">
                  <span className="text-slate-400 block">Jokers (Wild & Printed)</span>
                  <strong className="text-emerald-400 text-lg block mt-1">0 Points</strong>
                </div>
                <div className="p-4 rounded-xl bg-[#141525] border border-white/5">
                  <span className="text-slate-400 block">Winning Score</span>
                  <strong className="text-emerald-400 text-lg block mt-1">0 Points (Winner)</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Ready to test your Rummy skills?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Join genuine 2 to 6 real-player tables with certified RNG fairness.
            </p>
          </div>

          <Link
            href="/"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-sm shadow-xl shadow-amber-500/30 transition-transform hover:scale-105 flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>PLAY RUMMY NOW</span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
