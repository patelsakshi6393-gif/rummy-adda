import { Card, Rank, Suit } from './types';

export const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const RANK_ORDER: Record<Rank, number> = {
  'A': 1, // In pure sequence can also be 14 (Q-K-A or A-2-3)
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'JOKER': 0,
};

export const TOSS_RANK_VALUE: Record<Rank, number> = {
  'A': 14,
  'K': 13,
  'Q': 12,
  'J': 11,
  '10': 10,
  '9': 9,
  '8': 8,
  '7': 7,
  '6': 6,
  '5': 5,
  '4': 4,
  '3': 3,
  '2': 2,
  'JOKER': 0,
};

export function getCardPoint(card: Card, wildJokerRank?: Rank): number {
  if (card.isPrintedJoker || card.rank === 'JOKER') return 0;
  if (wildJokerRank && card.rank === wildJokerRank) return 0;

  switch (card.rank) {
    case 'A':
    case 'K':
    case 'Q':
    case 'J':
    case '10':
      return 10;
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '7':
    case '8':
    case '9':
      return parseInt(card.rank, 10);
    default:
      return 0;
  }
}

export function isJokerCard(card: Card, wildJokerRank?: Rank): boolean {
  if (card.isPrintedJoker || card.rank === 'JOKER') return true;
  if (wildJokerRank && card.rank === wildJokerRank) return true;
  return false;
}

/**
 * Creates 2 standard 52-card decks + 4 printed jokers = 108 cards total
 */
export function create108Deck(): Card[] {
  const deck: Card[] = [];
  // 2 sets of standard 52 cards
  for (let d = 1; d <= 2; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          id: `${suit}_${rank}_d${d}`,
          suit,
          rank,
          isPrintedJoker: false,
        });
      }
    }
  }

  // 4 Printed Jokers
  for (let j = 1; j <= 4; j++) {
    deck.push({
      id: `printed_joker_${j}`,
      suit: 'joker',
      rank: 'JOKER',
      isPrintedJoker: true,
    });
  }

  return deck;
}

/**
 * Fisher-Yates shuffle
 */
export function shuffleDeck(cards: Card[]): Card[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Check if a group of cards is a Pure Sequence (consecutive same suit, length >= 3, no joker substitute)
 */
export function isPureSequence(cards: Card[], wildJokerRank?: Rank): boolean {
  if (cards.length < 3) return false;
  // None of the cards can be a printed joker
  if (cards.some(c => c.isPrintedJoker || c.rank === 'JOKER')) return false;

  const firstSuit = cards[0].suit;
  if (firstSuit === 'joker') return false;
  if (!cards.every(c => c.suit === firstSuit)) return false;

  // Wild jokers can only be used as their natural self in a pure sequence
  const ranks = cards.map(c => RANK_ORDER[c.rank]);
  // Check standard ascending order e.g. 2,3,4 or 10,11,12,13
  const sorted = [...ranks].sort((a, b) => a - b);

  // Check normal consecutive
  let consecutive = true;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] !== sorted[i] + 1) {
      consecutive = false;
      break;
    }
  }
  if (consecutive) return true;

  // Check Ace high: Q, K, A (12, 13, 14) or 10, J, Q, K, A
  if (sorted.includes(1)) {
    const aceHighSorted = ranks.map(r => (r === 1 ? 14 : r)).sort((a, b) => a - b);
    let aceConsecutive = true;
    for (let i = 0; i < aceHighSorted.length - 1; i++) {
      if (aceHighSorted[i + 1] !== aceHighSorted[i] + 1) {
        aceConsecutive = false;
        break;
      }
    }
    if (aceConsecutive) return true;
  }

  return false;
}

/**
 * Check if a group is an Impure Sequence (consecutive same suit with jokers)
 */
export function isImpureSequence(cards: Card[], wildJokerRank?: Rank): boolean {
  if (cards.length < 3) return false;

  const naturalCards = cards.filter(c => !isJokerCard(c, wildJokerRank));
  const jokerCount = cards.length - naturalCards.length;

  // If all or almost all are jokers
  if (naturalCards.length === 0) return false;

  const targetSuit = naturalCards[0].suit;
  if (targetSuit === 'joker') return false;
  if (!naturalCards.every(c => c.suit === targetSuit)) return false;

  // Check unique ranks among natural cards
  const naturalRanks = naturalCards.map(c => RANK_ORDER[c.rank]);
  const uniqueRanks = new Set(naturalRanks);
  if (uniqueRanks.size !== naturalRanks.length) return false;

  const checkConsecutiveWithJokers = (vals: number[]) => {
    const sorted = [...vals].sort((a, b) => a - b);
    let neededJokers = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const diff = sorted[i + 1] - sorted[i];
      if (diff <= 0) return false;
      neededJokers += diff - 1;
    }
    return neededJokers <= jokerCount;
  };

  // Try normal Ace=1
  if (checkConsecutiveWithJokers(naturalRanks)) return true;

  // Try Ace=14
  if (naturalRanks.includes(1)) {
    const aceHigh = naturalRanks.map(r => (r === 1 ? 14 : r));
    if (checkConsecutiveWithJokers(aceHigh)) return true;
  }

  return false;
}

/**
 * Check if a group is a valid Set:
 * - 3 to 6 cards of same rank (different suits for natural cards; jokers allowed to complete/extend).
 * - Joker acts as wildcard master card filling missing suits or forming 4, 5, 6-card sets.
 * - "Joker ke through 4, 5, 6 cards ke set bhi banane ka option hona chahiye."
 * - "Agar teen cards ka set joker ki help se complete hota hai, to use valid set maana jaana chahiye."
 */
export function isValidSet(cards: Card[], wildJokerRank?: Rank): boolean {
  if (cards.length < 3 || cards.length > 6) return false;

  const naturalCards = cards.filter(c => !isJokerCard(c, wildJokerRank));
  if (naturalCards.length === 0) return true; // All wild jokers count as valid master set

  // In Indian Rummy, maximum 4 natural suits (♠, ♥, ♦, ♣)
  if (naturalCards.length > 4) return false;

  const targetRank = naturalCards[0].rank;
  if (!naturalCards.every(c => c.rank === targetRank)) return false;

  // Suits of natural cards must be unique (no duplicate suits among natural cards)
  const suits = naturalCards.map(c => c.suit);
  const uniqueSuits = new Set(suits);
  return uniqueSuits.size === suits.length;
}

export const SUIT_SYMBOLS: Record<Suit | 'joker', string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  joker: '🃏',
};

export interface GroupMeldStatus {
  isValid: boolean;
  type: 'pure_seq' | 'impure_seq' | 'set' | 'invalid';
  title: string;
  badgeText: string;
  detailText: string;
  hasJoker: boolean;
  jokerReplacements: string[];
  points: number; // 20 points per valid set / meld
  cardCount: number;
}

/**
 * Automatically inspects a card group in real-time:
 * 1. Determines if it's a valid Pure Sequence, Impure Sequence (with Joker), or Set (with Joker).
 * 2. Identifies which missing card(s) the Joker is replacing.
 * 3. Supports 3, 4, 5, and 6-card sets with Jokers.
 * 4. Awards 20 points per valid set/meld.
 */
export function getGroupMeldStatus(cards: Card[], wildJokerRank?: Rank): GroupMeldStatus {
  if (!cards || cards.length === 0) {
    return {
      isValid: false,
      type: 'invalid',
      title: 'EMPTY',
      badgeText: 'Empty',
      detailText: 'No cards in group',
      hasJoker: false,
      jokerReplacements: [],
      points: 0,
      cardCount: 0,
    };
  }

  const hasJoker = cards.some(c => isJokerCard(c, wildJokerRank));
  const cardCount = cards.length;

  // 1. Pure Sequence (no wild joker acting as substitute)
  if (isPureSequence(cards, wildJokerRank)) {
    return {
      isValid: true,
      type: 'pure_seq',
      title: 'PURE SEQUENCE',
      badgeText: `✓ PURE SEQ (${cardCount}) +20 Pts`,
      detailText: `Valid ${cardCount}-card Pure Sequence without jokers`,
      hasJoker: false,
      jokerReplacements: [],
      points: 20,
      cardCount,
    };
  }

  // 2. Impure Sequence (with Joker replacing missing cards)
  if (isImpureSequence(cards, wildJokerRank)) {
    const naturalCards = cards.filter(c => !isJokerCard(c, wildJokerRank));
    const suit = naturalCards[0]?.suit || 'spades';
    const suitSym = SUIT_SYMBOLS[suit] || '';

    // Find missing rank(s) that jokers are replacing
    const jokerReplacements: string[] = [];
    const ranks = naturalCards.map(c => RANK_ORDER[c.rank]).sort((a, b) => a - b);
    
    // Check if ace high (e.g. Q, K, A)
    let sortedRanks = [...ranks];
    if (ranks.includes(1) && ranks.some(r => r >= 10)) {
      sortedRanks = ranks.map(r => (r === 1 ? 14 : r)).sort((a, b) => a - b);
    }

    for (let i = 0; i < sortedRanks.length - 1; i++) {
      for (let missing = sortedRanks[i] + 1; missing < sortedRanks[i + 1]; missing++) {
        const rankStr = missing === 14 || missing === 1 ? 'A' : missing === 11 ? 'J' : missing === 12 ? 'Q' : missing === 13 ? 'K' : String(missing);
        jokerReplacements.push(`${rankStr}${suitSym}`);
      }
    }

    let detail = `Joker replaces missing ${jokerReplacements.join(', ')}`;
    if (jokerReplacements.length === 0) {
      detail = `Joker extends ${cardCount}-card sequence in ${suit}`;
    }

    return {
      isValid: true,
      type: 'impure_seq',
      title: 'JOKER SEQUENCE',
      badgeText: `⭐ JOKER SEQ (${cardCount}) +20 Pts`,
      detailText: detail,
      hasJoker: true,
      jokerReplacements,
      points: 20,
      cardCount,
    };
  }

  // 3. Set (3, 4, 5, or 6 cards of same rank with Jokers allowed)
  if (isValidSet(cards, wildJokerRank)) {
    const naturalCards = cards.filter(c => !isJokerCard(c, wildJokerRank));
    const jokerReplacements: string[] = [];

    if (naturalCards.length === 0) {
      return {
        isValid: true,
        type: 'set',
        title: 'JOKER SET',
        badgeText: `⭐ MASTER JOKER SET (${cardCount}) +20 Pts`,
        detailText: `All-Wild Jokers Master Set (${cardCount} Cards)`,
        hasJoker: true,
        jokerReplacements: ['Master Wildcards'],
        points: 20,
        cardCount,
      };
    }

    const targetRank = naturalCards[0].rank;
    const existingSuits = new Set(naturalCards.map(c => c.suit));
    const allSuits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
    const missingSuits = allSuits.filter(s => !existingSuits.has(s));

    for (const ms of missingSuits) {
      jokerReplacements.push(`${targetRank}${SUIT_SYMBOLS[ms]}`);
    }

    if (hasJoker) {
      let detail = '';
      if (cardCount <= 4 && jokerReplacements.length > 0) {
        detail = `Joker acts as missing ${jokerReplacements.slice(0, 2).join('/')} in Set of ${targetRank}s`;
      } else {
        detail = `Joker completes ${cardCount}-card Master Set of ${targetRank}s`;
      }

      return {
        isValid: true,
        type: 'set',
        title: 'JOKER SET',
        badgeText: `⭐ JOKER SET (${cardCount}) +20 Pts`,
        detailText: detail,
        hasJoker: true,
        jokerReplacements,
        points: 20,
        cardCount,
      };
    }

    // Natural Set without Jokers
    return {
      isValid: true,
      type: 'set',
      title: 'VALID SET',
      badgeText: `✓ VALID SET (${cardCount}) +20 Pts`,
      detailText: `Valid natural ${cardCount}-card Set of ${targetRank}s`,
      hasJoker: false,
      jokerReplacements: [],
      points: 20,
      cardCount,
    };
  }

  // 4. Invalid group
  const needCards = cardCount < 3 ? `Need at least 3 cards (current: ${cardCount})` : 'Does not form a valid sequence or set';

  return {
    isValid: false,
    type: 'invalid',
    title: 'INVALID GROUP',
    badgeText: `Group (${cardCount})`,
    detailText: needCards,
    hasJoker,
    jokerReplacements: [],
    points: 0,
    cardCount,
  };
}

export interface HandValidationResult {
  isValid: boolean;
  message: string;
  pureSequenceCount: number;
  totalSequenceCount: number;
  groups: {
    cards: Card[];
    type: 'pure' | 'impure' | 'set' | 'invalid';
  }[];
  penaltyScore: number;
}

/**
 * Validates a 13-card declaration split into groups
 */
export function validateDeclaration(
  cardGroups: Card[][],
  wildJokerRank?: Rank
): HandValidationResult {
  const totalCards = cardGroups.reduce((acc, g) => acc + g.length, 0);

  if (totalCards !== 13) {
    return {
      isValid: false,
      message: `A declaration must contain exactly 13 cards (current: ${totalCards}).`,
      pureSequenceCount: 0,
      totalSequenceCount: 0,
      groups: cardGroups.map(g => ({ cards: g, type: 'invalid' })),
      penaltyScore: 80,
    };
  }

  let pureSequenceCount = 0;
  let totalSequenceCount = 0;

  const classifiedGroups = cardGroups.map(group => {
    if (isPureSequence(group, wildJokerRank)) {
      pureSequenceCount++;
      totalSequenceCount++;
      return { cards: group, type: 'pure' as const };
    }
    if (isImpureSequence(group, wildJokerRank)) {
      totalSequenceCount++;
      return { cards: group, type: 'impure' as const };
    }
    if (isValidSet(group, wildJokerRank)) {
      return { cards: group, type: 'set' as const };
    }
    return { cards: group, type: 'invalid' as const };
  });

  const hasInvalidGroup = classifiedGroups.some(g => g.type === 'invalid');

  if (pureSequenceCount < 1) {
    return {
      isValid: false,
      message: 'Invalid declaration: At least one Pure Sequence is required.',
      pureSequenceCount,
      totalSequenceCount,
      groups: classifiedGroups,
      penaltyScore: 80,
    };
  }

  if (totalSequenceCount < 2) {
    return {
      isValid: false,
      message: 'Invalid declaration: At least two sequences are required.',
      pureSequenceCount,
      totalSequenceCount,
      groups: classifiedGroups,
      penaltyScore: 80,
    };
  }

  if (hasInvalidGroup) {
    return {
      isValid: false,
      message: 'Invalid declaration: One or more card groups are neither a valid sequence nor set.',
      pureSequenceCount,
      totalSequenceCount,
      groups: classifiedGroups,
      penaltyScore: 80,
    };
  }

  return {
    isValid: true,
    message: 'Valid Show! Congratulations, all 13 cards form valid melds.',
    pureSequenceCount,
    totalSequenceCount,
    groups: classifiedGroups,
    penaltyScore: 0,
  };
}

/**
 * Calculates loser points based on unmatched cards (max 80 points)
 */
export function calculateLossPoints(cards: Card[], wildJokerRank?: Rank): number {
  let score = 0;
  for (const card of cards) {
    score += getCardPoint(card, wildJokerRank);
  }
  return Math.min(80, score);
}

/**
 * Smart automatic card grouper / meld finder for 13-Card Indian Rummy hands
 */
export function findBestMelds(cards: Card[], wildJokerRank?: Rank): Card[][] {
  if (!cards || cards.length === 0) return [];
  if (cards.length <= 4) return [cards];

  const available = [...cards];
  const melds: Card[][] = [];

  // 1. Separate jokers and natural cards
  const jokers: Card[] = [];
  const naturals: Card[] = [];
  for (const c of available) {
    if (isJokerCard(c, wildJokerRank)) {
      jokers.push(c);
    } else {
      naturals.push(c);
    }
  }

  // 2. Find Pure Sequences first among naturals grouped by suit
  const suits = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
  for (const suit of suits) {
    const suitCards = naturals.filter(c => c.suit === suit);
    if (suitCards.length < 3) continue;

    const rankMap = new Map<number, Card>();
    for (const c of suitCards) {
      const rVal = c.rank === 'A' ? 1 : c.rank === 'J' ? 11 : c.rank === 'Q' ? 12 : c.rank === 'K' ? 13 : parseInt(c.rank, 10);
      if (!rankMap.has(rVal)) rankMap.set(rVal, c);
    }

    const uniqueRanks = Array.from(rankMap.keys()).sort((a, b) => a - b);
    let currentRun: number[] = [];
    for (let i = 0; i < uniqueRanks.length; i++) {
      if (currentRun.length === 0 || uniqueRanks[i] === currentRun[currentRun.length - 1] + 1) {
        currentRun.push(uniqueRanks[i]);
      } else {
        if (currentRun.length >= 3) break;
        currentRun = [uniqueRanks[i]];
      }
    }

    // Check Ace high run: Q(12), K(13), A(1) or J(11), Q(12), K(13), A(1)
    if (currentRun.length < 3 && rankMap.has(1) && rankMap.has(12) && rankMap.has(13)) {
      const aceRun = [rankMap.get(12)!, rankMap.get(13)!, rankMap.get(1)!];
      if (rankMap.has(11)) aceRun.unshift(rankMap.get(11)!);
      if (rankMap.has(10)) aceRun.unshift(rankMap.get(10)!);
      melds.push(aceRun);
      for (const card of aceRun) {
        const idx = naturals.findIndex(c => c.id === card.id);
        if (idx !== -1) naturals.splice(idx, 1);
      }
      continue;
    }

    if (currentRun.length >= 3) {
      const seqCards = currentRun.map(r => rankMap.get(r)!);
      melds.push(seqCards);
      for (const card of seqCards) {
        const idx = naturals.findIndex(c => c.id === card.id);
        if (idx !== -1) naturals.splice(idx, 1);
      }
    }
  }

  // 3. Find Sets among remaining naturals
  const rankGroups = new Map<string, Card[]>();
  for (const c of naturals) {
    const list = rankGroups.get(c.rank) || [];
    list.push(c);
    rankGroups.set(c.rank, list);
  }

  rankGroups.forEach((cardsWithRank) => {
    const uniqueSuitCards: Card[] = [];
    const seenSuits = new Set<string>();
    for (const c of cardsWithRank) {
      if (!seenSuits.has(c.suit)) {
        seenSuits.add(c.suit);
        uniqueSuitCards.push(c);
      }
    }
    if (uniqueSuitCards.length >= 3) {
      melds.push(uniqueSuitCards);
      for (const card of uniqueSuitCards) {
        const idx = naturals.findIndex(c => c.id === card.id);
        if (idx !== -1) naturals.splice(idx, 1);
      }
    }
  });

  // 4. Use Jokers to complete incomplete sequences with missing cards (e.g. 4♠ [Joker] 6♠ or 4♠ 5♠ [Joker])
  if (jokers.length > 0) {
    for (const suit of suits) {
      if (jokers.length === 0) break;
      const suitCards = naturals.filter(c => c.suit === suit);
      if (suitCards.length < 2) continue;

      for (let i = 0; i < suitCards.length - 1; i++) {
        if (jokers.length === 0) break;
        const c1 = suitCards[i];
        const c2 = suitCards[i + 1];
        const r1 = RANK_ORDER[c1.rank];
        const r2 = RANK_ORDER[c2.rank];
        const diff = Math.abs(r2 - r1);

        // Gap of 1 missing card (e.g. 4 and 6, diff=2) or consecutive pair (e.g. 4 and 5, diff=1)
        if (diff === 1 || diff === 2 || (r1 === 1 && (r2 === 12 || r2 === 13))) {
          const jk = jokers.pop()!;
          const newMeld = [c1, jk, c2].sort((a, b) => {
            const valA = isJokerCard(a, wildJokerRank) ? 99 : RANK_ORDER[a.rank];
            const valB = isJokerCard(b, wildJokerRank) ? 99 : RANK_ORDER[b.rank];
            return valA - valB;
          });
          melds.push(newMeld);

          const idx1 = naturals.findIndex(c => c.id === c1.id);
          if (idx1 !== -1) naturals.splice(idx1, 1);
          const idx2 = naturals.findIndex(c => c.id === c2.id);
          if (idx2 !== -1) naturals.splice(idx2, 1);
          break;
        }
      }
    }
  }

  // 5. Use Jokers to complete 3-card Sets from 2 natural cards of same rank
  if (jokers.length > 0) {
    const remainingRankGroups = new Map<string, Card[]>();
    for (const c of naturals) {
      const list = remainingRankGroups.get(c.rank) || [];
      list.push(c);
      remainingRankGroups.set(c.rank, list);
    }

    remainingRankGroups.forEach((cardsWithRank) => {
      if (jokers.length === 0) return;
      const uniqueSuitCards: Card[] = [];
      const seenSuits = new Set<string>();
      for (const c of cardsWithRank) {
        if (!seenSuits.has(c.suit)) {
          seenSuits.add(c.suit);
          uniqueSuitCards.push(c);
        }
      }
      if (uniqueSuitCards.length === 2 && jokers.length > 0) {
        const jk = jokers.pop()!;
        const setMeld = [...uniqueSuitCards, jk];
        melds.push(setMeld);
        for (const card of uniqueSuitCards) {
          const idx = naturals.findIndex(c => c.id === card.id);
          if (idx !== -1) naturals.splice(idx, 1);
        }
      }
    });
  }

  // 6. Attach any remaining jokers to existing 3, 4, or 5-card melds (up to 6 cards)
  while (jokers.length > 0 && melds.length > 0) {
    const targetMeld = melds.find(m => m.length >= 3 && m.length < 6);
    if (targetMeld) {
      targetMeld.push(jokers.pop()!);
    } else {
      break;
    }
  }

  // 5. Any leftover cards
  const leftovers = [...naturals, ...jokers];
  if (leftovers.length > 0) {
    if (melds.length === 0) {
      const chunks: Card[][] = [];
      for (let i = 0; i < leftovers.length; i += 4) {
        chunks.push(leftovers.slice(i, i + 4));
      }
      return chunks;
    }
    // Put remaining into separate group or chunk
    if (leftovers.length <= 4) {
      melds.push(leftovers);
    } else {
      melds.push(leftovers.slice(0, 3));
      melds.push(leftovers.slice(3));
    }
  }

  return melds;
}

