'use client';

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  RotateCcw,
  Play,
  HelpCircle,
  Coins,
  ArrowDownCircle,
} from 'lucide-react';
import { PlayingCard } from './PlayingCard';
import { Card } from '@/lib/types';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'basics' | 'pure' | 'impure' | 'sets' | 'turns' | 'practice' | 'winnings';
}

export function HowToPlayModal({ isOpen, onClose, defaultTab = 'basics' }: HowToPlayModalProps) {
  const [activeTab, setActiveTab] = useState<'basics' | 'pure' | 'impure' | 'sets' | 'turns' | 'practice' | 'winnings'>(defaultTab);

  if (!isOpen) return null;

  // Example cards for Pure Sequence
  const pureSeqCards: Card[] = [
    { id: 'p1', suit: 'spades', rank: '5' },
    { id: 'p2', suit: 'spades', rank: '6' },
    { id: 'p3', suit: 'spades', rank: '7' },
    { id: 'p4', suit: 'spades', rank: '8' },
  ];

  // Example cards for Impure Sequence with Wild Joker
  const impureSeqCards: Card[] = [
    { id: 'i1', suit: 'hearts', rank: '9' },
    { id: 'i2', suit: 'clubs', rank: 'K' }, // Wild Joker substituting 10♥
    { id: 'i3', suit: 'hearts', rank: 'J' },
    { id: 'i4', suit: 'hearts', rank: 'Q' },
  ];

  // Example cards for Valid Set
  const setCards: Card[] = [
    { id: 's1', suit: 'diamonds', rank: '8' },
    { id: 's2', suit: 'clubs', rank: '8' },
    { id: 's3', suit: 'spades', rank: '8' },
  ];

  // Example cards for Invalid Set (two same suits)
  const invalidSetCards: Card[] = [
    { id: 'inv1', suit: 'diamonds', rank: '8' },
    { id: 'inv2', suit: 'diamonds', rank: '8' }, // Duplicate suit error!
    { id: 'inv3', suit: 'spades', rank: '8' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#10121d] border border-amber-500/30 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#171928] via-[#1a1527] to-[#121321] border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  How to Play Indian Rummy (13 Cards)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold uppercase border border-amber-500/30">
                  Beginner Guide
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Master 13-Card Indian Rummy rules, pure sequences, and winning declarations.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-6 pt-3 pb-2 border-b border-white/5 overflow-x-auto bg-[#0a0b12] text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab('basics')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              activeTab === 'basics'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            1. The Objective
          </button>

          <button
            onClick={() => setActiveTab('pure')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              activeTab === 'pure'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            2. Pure Sequence (Mandatory!)
          </button>

          <button
            onClick={() => setActiveTab('impure')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              activeTab === 'impure'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            3. Impure Sequence & Jokers
          </button>

          <button
            onClick={() => setActiveTab('sets')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              activeTab === 'sets'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            4. Sets
          </button>

          <button
            onClick={() => setActiveTab('turns')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              activeTab === 'turns'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            5. Turn Gameplay & Drops
          </button>

          <button
            onClick={() => setActiveTab('practice')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              activeTab === 'practice'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
            }`}
          >
            6. Interactive Hand Check
          </button>

          <button
            onClick={() => setActiveTab('winnings')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'winnings'
                ? 'bg-amber-400 text-black font-black shadow-md'
                : 'text-amber-300 hover:text-amber-200 hover:bg-amber-500/15'
            }`}
          >
            <span>💰 7. Winnings & Points Rules</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200 text-sm">
          {/* TAB 1: BASICS */}
          {activeTab === 'basics' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 rounded-2xl p-5 space-y-2">
                <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">
                  The Golden Rule of 13-Card Rummy
                </span>
                <h3 className="text-lg font-black text-white">
                  Arrange all 13 cards into valid Sequences and Sets!
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Each player is dealt 13 cards from two standard decks of 54 cards (including 2 printed jokers).
                  To make a valid Declaration (0 Penalty Points) and win the match, you must have:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#141624] border border-amber-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>1. At Least 1 Pure Sequence (Mandatory)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    A sequence of 3 or more consecutive cards of the same suit made <strong>without any jokers</strong> (e.g. 5♠ - 6♠ - 7♠). Without this, your declaration is automatically invalid and incurs 80 penalty points!
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#141624] border border-amber-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>2. A Second Sequence (Pure or Impure)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    You must have a minimum of 2 sequences in total. The second sequence can include Wild Jokers or Printed Jokers (e.g. 9♥ - [Joker] - J♥ - Q♥).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#141624] border border-amber-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>3. Remaining Cards in Sets or Sequences</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Once the two required sequences are met, your remaining cards can be arranged into Sets (same rank, different suits like 8♦ - 8♣ - 8♠) or additional sequences.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#141624] border border-amber-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>4. Final Discard to Declare</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    When all 13 cards are arranged into valid melds, discard your 14th card into the Declare slot and click <strong>&quot;DECLARE / SHOW&quot;</strong> to claim victory.
                  </p>
                </div>
              </div>

              {/* Standard Winning Meld Formula */}
              <div className="p-4 rounded-2xl bg-[#0b0c14] border border-white/10 text-center space-y-2">
                <span className="text-xs uppercase font-mono text-slate-400">Winning Meld Combinations</span>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-black text-amber-300">
                  <span className="px-3 py-1 bg-amber-500/20 rounded-xl border border-amber-500/40">Pure Seq (3-4 cards)</span>
                  <span>+</span>
                  <span className="px-3 py-1 bg-amber-500/20 rounded-xl border border-amber-500/40">Second Seq (3-4 cards)</span>
                  <span>+</span>
                  <span className="px-3 py-1 bg-amber-500/20 rounded-xl border border-amber-500/40">Set / Seq (3-4 cards)</span>
                  <span>+</span>
                  <span className="px-3 py-1 bg-amber-500/20 rounded-xl border border-amber-500/40">Set / Seq (3-4 cards)</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setActiveTab('pure')}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-2 transition-transform hover:scale-105"
                >
                  <span>Next: Understand Pure Sequence</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PURE SEQUENCE */}
          {activeTab === 'pure' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase">
                  Rule #1 : Absolute Requirement
                </div>
                <h3 className="text-xl font-black text-white">
                  What is a Pure Sequence (प्योर सीक्वेंस)?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  A Pure Sequence consists of <strong>3 or more consecutive cards of the exact same suit</strong>, formed <strong>without using any Wild Jokers or Printed Jokers</strong>.
                </p>
              </div>

              {/* Visual Card Example */}
              <div className="p-6 rounded-3xl bg-[#141525] border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Valid Pure Sequence Example (Spades 5, 6, 7, 8)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">0 Penalty Points</span>
                </div>

                <div className="flex items-center gap-3 py-2">
                  {pureSeqCards.map((card) => (
                    <PlayingCard key={card.id} card={card} size="md" disabled />
                  ))}
                </div>

                <p className="text-xs text-slate-300">
                  Notice that all 4 cards are of the <strong>Spades (♠)</strong> suit in continuous numerical order (5-6-7-8). No joker is used.
                </p>
              </div>

              {/* Crucial Tips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#13141f] border border-white/10 space-y-1.5">
                  <h4 className="text-sm font-bold text-amber-300">Ace Flexibility</h4>
                  <p className="text-xs text-slate-400">
                    The Ace can form a sequence as low card (<strong>A♠ - 2♠ - 3♠</strong>) or as high card (<strong>Q♠ - K♠ - A♠</strong>). However, round-the-corner sequences like K♠ - A♠ - 2♠ are NOT allowed in Indian Rummy.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#13141f] border border-white/10 space-y-1.5">
                  <h4 className="text-sm font-bold text-rose-300">Can a Joker be in a Pure Sequence?</h4>
                  <p className="text-xs text-slate-400">
                    Only if the Wild Joker is used strictly in its original rank and suit (e.g. if K♣ is wild joker, K♣ can be used as the natural King in Q♣ - K♣ - A♣). Otherwise, any substitution makes it impure!
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setActiveTab('basics')}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold"
                >
                  ← Back to Basics
                </button>
                <button
                  onClick={() => setActiveTab('impure')}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-2 transition-transform hover:scale-105"
                >
                  <span>Next: Impure Sequences & Jokers</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: IMPURE SEQUENCE */}
          {activeTab === 'impure' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase">
                  Using Wild Jokers & Printed Jokers
                </div>
                <h3 className="text-xl font-black text-white">
                  What is an Impure Sequence (इम्प्योर सीक्वेंस)?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  An Impure Sequence consists of 3 or more consecutive cards of the same suit where <strong>one or more cards are substituted by a Wild Joker or Printed Joker</strong>.
                </p>
              </div>

              {/* Visual Card Example */}
              <div className="p-6 rounded-3xl bg-[#141525] border border-blue-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span>Valid Impure Sequence Example (King is Wild Joker replacing 10♥)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Valid 2nd Sequence</span>
                </div>

                <div className="flex items-center gap-3 py-2">
                  {impureSeqCards.map((card, idx) => (
                    <div key={card.id} className="relative">
                      {idx === 1 && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-400 text-black font-black text-[9px] px-1.5 py-0.5 rounded shadow">
                          WILD JOKER
                        </span>
                      )}
                      <PlayingCard
                        card={card}
                        wildJokerRank={idx === 1 ? 'K' : undefined}
                        size="md"
                        disabled
                      />
                    </div>
                  ))}
                </div>

                <p className="text-xs text-slate-300">
                  Here, the King of Clubs (♣) is the round&apos;s designated <strong>Wild Joker</strong>, which seamlessly substitutes the missing 10 of Hearts (10♥) to complete the sequence: 9♥ - [10♥] - J♥ - Q♥.
                </p>
              </div>

              {/* Joker Rules */}
              <div className="p-4 rounded-2xl bg-[#0f111c] border border-white/10 space-y-2">
                <h4 className="text-sm font-bold text-amber-300">How Jokers Work in Rummy Adda:</h4>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li><strong>Wild Joker:</strong> At the start of each match, 1 card is randomly chosen from the closed deck (e.g. 7). All 4 cards of rank 7 across all suits become Wild Jokers for that match!</li>
                  <li><strong>Printed Jokers:</strong> The 2 printed Joker cards in the deck also act as universal substitutes for any card.</li>
                  <li><strong>Points:</strong> Jokers carry <strong>0 points</strong> in end-of-round penalty calculations.</li>
                </ul>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setActiveTab('pure')}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold"
                >
                  ← Back to Pure Sequence
                </button>
                <button
                  onClick={() => setActiveTab('sets')}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-2 transition-transform hover:scale-105"
                >
                  <span>Next: Understanding Sets</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SETS */}
          {activeTab === 'sets' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase">
                  Melding Same-Rank Cards
                </div>
                <h3 className="text-xl font-black text-white">
                  What is a Set (सेट)?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  A Set consists of <strong>3 or 4 cards of the EXACT SAME rank, but from DIFFERENT suits</strong>.
                  For example, three 8s from Diamonds, Clubs, and Spades.
                </p>
              </div>

              {/* Valid Set Example */}
              <div className="p-6 rounded-3xl bg-[#141525] border border-purple-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>VALID SET: 8♦ - 8♣ - 8♠ (Different Suits)</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">Valid Meld</span>
                </div>

                <div className="flex items-center gap-3 py-2">
                  {setCards.map((card) => (
                    <PlayingCard key={card.id} card={card} size="md" disabled />
                  ))}
                </div>
              </div>

              {/* Invalid Set Pitfall Warning */}
              <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>INVALID SET: 8♦ - 8♦ - 8♠ (Duplicate Diamond Suit!)</span>
                  </span>
                  <span className="text-[10px] text-rose-400 font-bold">Invalid - 80 Pts Penalty</span>
                </div>

                <div className="flex items-center gap-3 py-2">
                  {invalidSetCards.map((card) => (
                    <PlayingCard key={card.id} card={card} size="md" disabled />
                  ))}
                </div>

                <p className="text-xs text-rose-300 leading-relaxed">
                  <strong>Warning:</strong> In Indian Rummy with two decks, you might hold two 8 of Diamonds (8♦). You CANNOT put both in the same set! A set must have unique suits (one spade, one heart, one diamond, one club).
                </p>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setActiveTab('impure')}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold"
                >
                  ← Back to Impure Sequence
                </button>
                <button
                  onClick={() => setActiveTab('turns')}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-2 transition-transform hover:scale-105"
                >
                  <span>Next: Turn Gameplay & Drops</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: TURNS & DROPS */}
          {activeTab === 'turns' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">
                  Step-by-Step Gameplay on Every Turn
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  During your 45-second turn timer, follow these 3 simple steps:
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#141522] border border-amber-500/20">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-black text-lg flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Draw a Card</h4>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      Click the <strong>Closed Deck</strong> to draw an unseen card, OR click the top card of the <strong>Open Discard Pile</strong> if it helps complete one of your sequences.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#141522] border border-amber-500/20">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-black text-lg flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Sort or Group Cards</h4>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      Click the <strong>&quot;SORT&quot;</strong> button anytime to automatically sort all cards by suits and numerical rank. You can also select cards and click <strong>&quot;GROUP&quot;</strong> to organize them into meld columns.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#141522] border border-amber-500/20">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-black text-lg flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Discard or Declare</h4>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      Click 1 unwanted card from your hand and hit <strong>&quot;DISCARD&quot;</strong>.
                      If your entire hand is arranged into valid melds, click <strong>&quot;DECLARE / SHOW&quot;</strong> to finish the round and win!
                    </p>
                  </div>
                </div>
              </div>

              {/* The Drop Strategy */}
              <div className="p-5 rounded-2xl bg-[#1a1215] border border-rose-500/30 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-black text-sm uppercase">
                  <span>When to use the &quot;DROP&quot; Button</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  If your initial cards are poor with no sequences or jokers, you can cut your losses by dropping:
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block font-semibold">First Drop (पहला ड्रॉप)</span>
                    <span className="text-amber-400 font-bold text-sm">20 Penalty Points</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Dropped before drawing any card on your first turn.</p>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block font-semibold">Middle Drop (मध्य ड्रॉप)</span>
                    <span className="text-rose-400 font-bold text-sm">40 Penalty Points</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Dropped during later rounds without declaring.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setActiveTab('sets')}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold"
                >
                  ← Back to Sets
                </button>
                <button
                  onClick={() => setActiveTab('practice')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-2 transition-transform hover:scale-105"
                >
                  <span>Next: Interactive Meld Check</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: INTERACTIVE PRACTICE EVALUATOR */}
          {activeTab === 'practice' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase">
                  Interactive Simulator
                </div>
                <h3 className="text-xl font-black text-white">
                  Sample Winning 13-Card Hand
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Inspect this real winning 13-card Indian Rummy hand below. Notice how all 4 groups fulfill the tournament declaration requirements:
                </p>
              </div>

              <div className="space-y-4">
                {/* Group 1: Pure Sequence */}
                <div className="p-4 rounded-2xl bg-[#111320] border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white">Group 1 : Pure Sequence (Mandatory)</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px]">
                      Pure Sequence ✓ (0 pts)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlayingCard card={{ id: 'd1', suit: 'diamonds', rank: '10' }} size="sm" disabled />
                    <PlayingCard card={{ id: 'd2', suit: 'diamonds', rank: 'J' }} size="sm" disabled />
                    <PlayingCard card={{ id: 'd3', suit: 'diamonds', rank: 'Q' }} size="sm" disabled />
                    <PlayingCard card={{ id: 'd4', suit: 'diamonds', rank: 'K' }} size="sm" disabled />
                  </div>
                </div>

                {/* Group 2: Impure Sequence with Wild Joker */}
                <div className="p-4 rounded-2xl bg-[#111320] border border-blue-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white">Group 2 : Second Sequence with Wild Joker (7♠)</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px]">
                      Impure Sequence ✓ (0 pts)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlayingCard card={{ id: 'h1', suit: 'hearts', rank: '4' }} size="sm" disabled />
                    <PlayingCard card={{ id: 'h2', suit: 'hearts', rank: '5' }} size="sm" disabled />
                    <div className="relative">
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-amber-400 text-black px-1 rounded font-black">JOKER</span>
                      <PlayingCard card={{ id: 'j1', suit: 'spades', rank: '7' }} wildJokerRank="7" size="sm" disabled />
                    </div>
                  </div>
                </div>

                {/* Group 3: Valid Set */}
                <div className="p-4 rounded-2xl bg-[#111320] border border-purple-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white">Group 3 : Valid Set (Three Aces)</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px]">
                      Valid Set ✓ (0 pts)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlayingCard card={{ id: 'a1', suit: 'spades', rank: 'A' }} size="sm" disabled />
                    <PlayingCard card={{ id: 'a2', suit: 'hearts', rank: 'A' }} size="sm" disabled />
                    <PlayingCard card={{ id: 'a3', suit: 'clubs', rank: 'A' }} size="sm" disabled />
                  </div>
                </div>

                {/* Group 4: Valid Set */}
                <div className="p-4 rounded-2xl bg-[#111320] border border-purple-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white">Group 4 : Valid Set (Three 6s)</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px]">
                      Valid Set ✓ (0 pts)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlayingCard card={{ id: 'six1', suit: 'diamonds', rank: '6' }} size="sm" disabled />
                    <PlayingCard card={{ id: 'six2', suit: 'hearts', rank: '6' }} size="sm" disabled />
                    <PlayingCard card={{ id: 'six3', suit: 'clubs', rank: '6' }} size="sm" disabled />
                  </div>
                </div>
              </div>

              {/* Total Evaluation Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border border-emerald-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    🏆
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-300">TOTAL SCORE: 0 PENALTY POINTS</h4>
                    <p className="text-xs text-slate-300">All 13 cards are validly melded! Winner takes the match prize pool.</p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-black font-black text-xs hover:scale-105 transition-transform"
                >
                  I Understand! Let&apos;s Play
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: WINNINGS, MONEY RETURN & POINTS EXPLAINED */}
          {activeTab === 'winnings' && (
            <div className="space-y-6">
              {/* Question 1: Money Return on Winning */}
              <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-3xl p-5 sm:p-6 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-500/40">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Real Money & Payouts (पैसे की वापसी)</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Q1. क्या जीतने पर मेरा लगाया हुआ पैसा वापस मिलेगा?
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  <strong>हाँ, 100%!</strong> जब आप मैच जीतते हैं (0 पॉइंट्स पर Valid Show करते हैं), तो आपका लगाया हुआ पैसा (Entry Fee) भी वापस मिलता है और साथ में विरोधी (Opponents) के अनमैच्ड पत्तों के पेनल्टी पॉइंट्स की पूरी 100% विनिंग राशि भी मिलती है। मैच टेबल पर कोई कमीशन नहीं कटता।
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-1">
                    <span className="text-slate-400 block font-bold">1. Entry Stake Returned</span>
                    <span className="text-emerald-400 font-black text-sm block">100% वापस</span>
                    <p className="text-[11px] text-slate-400">आपकी लगाई हुई एंट्री फीस पूरी तरह से सुरक्षित रहती है।</p>
                  </div>
                  <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-1">
                    <span className="text-slate-400 block font-bold">2. 100% Table Win Credit</span>
                    <span className="text-amber-400 font-black text-sm block">0% Table Cut</span>
                    <p className="text-[11px] text-slate-400">हारने वाले के पेनल्टी पॉइंट्स की पूरी कीमत (बिना किसी टेबल कट के) आपके वॉलेट में जुड़ती है।</p>
                  </div>
                  <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-1">
                    <span className="text-slate-400 block font-bold">3. 20% Fee at Withdrawal</span>
                    <span className="text-teal-400 font-black text-sm block">Dene Wala Balance</span>
                    <p className="text-[11px] text-slate-400">20% कमीशन केवल विथड्रॉ करते वक्त लगता है और प्रीफिल्ड मैसेज में आपका Dene Wala Balance लिखा होता है।</p>
                  </div>
                </div>
              </div>

              {/* Question 2: Why Points show without playing */}
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 rounded-3xl p-5 sm:p-6 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-500/40">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>The Points Mystery Solved (पॉइंट्स का नियम)</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Q2. बिना गेम खेले मुझे पॉइंट्स क्यों मिल रहे हैं? क्या यह इनाम है?
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  <strong className="text-amber-300">नहीं! रम्मी में पॉइंट्स कोई इनाम नहीं, बल्कि &apos;पेनल्टी (नुकसान)&apos; होते हैं!</strong>
                  <br />
                  रम्मी का सबसे मुख्य नियम है: <strong>0 पॉइंट्स वाला खिलाड़ी ही मैच का विनर बनता है!</strong>
                </p>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-1">
                    <p className="font-bold text-white">शुरुआत में 70-80 पॉइंट्स क्यों दिखते हैं?</p>
                    <p className="text-slate-400 leading-relaxed">
                      जब गेम शुरू होता है और 13 पत्ते आपको मिलते हैं, तो क्योंकि अभी आपने कोई शुद्ध सीक्वेंस (Pure Sequence) नहीं बनाया है, आपके सारे पत्तों का पेनल्टी स्कोर (अधिकतम 80 पॉइंट्स) गिना जाता है।
                      A, K, Q, J, 10 के 10-10 पॉइंट्स होते हैं, इसलिए बिना खेले ही पेनल्टी पॉइंट्स दिखने लगते हैं।
                    </p>
                  </div>

                  <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-1">
                    <p className="font-bold text-emerald-400">आपका लक्ष्य (Target): पॉइंट्स को 0 बनाना!</p>
                    <p className="text-slate-400 leading-relaxed">
                      जैसे-जैसे आप पत्ते मिलाकर Pure Sequence (जैसे 4♠-5♠-6♠) और सेट्स बनाते हैं, आपके पेनल्टी पॉइंट्स कम होते जाते हैं। जब सारे 13 पत्ते सही जम जाते हैं, तो आपके पेनल्टी पॉइंट्स <strong>0</strong> हो जाते हैं और आप शो (Declare) करके जीत जाते हैं!
                    </p>
                  </div>
                </div>
              </div>

              {/* Question 3: How to Play for Complete Beginners */}
              <div className="bg-[#131524] border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>🎯 पहली बार खेल रहे हैं? बस ये 4 स्टेप्स याद रखें:</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-2xl bg-[#0c0d16] border border-white/5 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-400">
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-[10px]">1</span>
                      <span>SORT बटन दबाएं</span>
                    </div>
                    <p className="text-slate-400">गेम शुरू होते ही SORT दबाएं ताकि एक ही रंग और क्रम के पत्ते अपने आप साथ में सज जाएं।</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0c0d16] border border-white/5 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-400">
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-[10px]">2</span>
                      <span>Draw (1 पत्ता उठाएं)</span>
                    </div>
                    <p className="text-slate-400">अपनी बारी आने पर बंद गड्डी (Closed Deck) या खुली गड्डी (Open Deck) से 1 पत्ता उठाएं। अब आपके पास 14 पत्ते हो जाएंगे।</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0c0d16] border border-white/5 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-400">
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-[10px]">3</span>
                      <span>Discard (1 बेकार पत्ता फेंकें)</span>
                    </div>
                    <p className="text-slate-400">जो पत्ता आपकी सीक्वेंस में काम नहीं आ रहा, उस पर क्लिक करके DISCARD बटन दबाएं।</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0c0d16] border border-white/5 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-emerald-400">
                      <span className="w-5 h-5 rounded-full bg-emerald-400 text-black flex items-center justify-center font-black text-[10px]">4</span>
                      <span>Declare (0 पॉइंट्स पर शो करें)</span>
                    </div>
                    <p className="text-slate-400">जब 1 Pure Sequence + 1 Second Sequence + सेट्स बन जाएं, 14वां पत्ता चुनकर DECLARE दबाएं और जीत जाएं!</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setActiveTab('basics')}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold"
                >
                  ← Back to The Objective
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-xs shadow-lg shadow-amber-500/20"
                >
                  समझ गया, अब खेलें! (Start Playing)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="bg-[#0b0c14] border-t border-white/10 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>RNG Certified Fair Play • 100% Real Players</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
