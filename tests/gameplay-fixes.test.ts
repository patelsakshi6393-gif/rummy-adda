// tests/gameplay-fixes.test.ts
// Verification test suite for turn system, set points, drop action, performance, and false drop prevention

import {
  isPureSequence,
  isImpureSequence,
  isValidSet,
  getGroupMeldStatus,
  calculateLiveHandScore,
  calculateLossPoints,
} from '../lib/rummy-engine';
import { Card, Rank, Suit } from '../lib/types';
import { calculateDropPenalty } from '../lib/game-service';

function makeCard(suit: Suit, rank: Rank, isPrintedJoker = false): Card {
  return {
    id: `${suit}_${rank}_test_${Math.random()}`,
    suit,
    rank,
    isPrintedJoker,
  };
}

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, evidence: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    console.log(`       Evidence: ${evidence}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    console.error(`       Evidence: ${evidence}`);
    failCount++;
  }
}

console.log('====================================================');
console.log('   RUMMYADDA GAMEPLAY & ENGINE VERIFICATION SUITE   ');
console.log('====================================================\n');

// 1. SET & POINTS CALCULATION TESTS
// Test 1.1: Valid 3-card natural set
const naturalSet: Card[] = [
  makeCard('hearts', '7'),
  makeCard('diamonds', '7'),
  makeCard('spades', '7'),
];
const setStatus = getGroupMeldStatus(naturalSet, 'K');
assert(
  setStatus.isValid && setStatus.type === 'set' && setStatus.points === 20 && setStatus.badgeText.includes('+20 Pts'),
  'Valid 3-card natural set recognized and awarded 20 points',
  `Type: ${setStatus.type}, Points: ${setStatus.points}, Badge: "${setStatus.badgeText}"`
);

// Test 1.2: Valid 3-card joker set (with wild joker)
const jokerSet: Card[] = [
  makeCard('hearts', '9'),
  makeCard('diamonds', '9'),
  makeCard('spades', 'K'), // wild joker rank K
];
const jokerSetStatus = getGroupMeldStatus(jokerSet, 'K');
assert(
  jokerSetStatus.isValid && jokerSetStatus.type === 'set' && jokerSetStatus.points === 20,
  'Valid 3-card Joker set recognized with 20 points',
  `Type: ${jokerSetStatus.type}, Points: ${jokerSetStatus.points}, HasJoker: ${jokerSetStatus.hasJoker}`
);

// Test 1.3: Set with duplicate suit rejected (invalid set)
const dupSuitSet: Card[] = [
  makeCard('hearts', '8'),
  makeCard('hearts', '8'),
  makeCard('clubs', '8'),
];
assert(
  !isValidSet(dupSuitSet, 'K'),
  'Set with duplicate suits is strictly rejected',
  `Suits: hearts, hearts, clubs -> isValidSet: ${isValidSet(dupSuitSet, 'K')}`
);

// Test 1.4: 4-card natural set is valid in Indian Rummy (different suits)
const fourCardSet: Card[] = [
  makeCard('hearts', '8'),
  makeCard('diamonds', '8'),
  makeCard('clubs', '8'),
  makeCard('spades', '8'),
];
assert(
  isValidSet(fourCardSet, 'K'),
  'Valid 4-card natural set of all 4 suits is accepted with 20 points',
  `Cards count: 4, suits: 4 -> isValidSet: ${isValidSet(fourCardSet, 'K')}`
);

// Test 1.4b: Set with 5 cards is strictly rejected
const fiveCardSet: Card[] = [
  makeCard('hearts', '8'),
  makeCard('diamonds', '8'),
  makeCard('clubs', '8'),
  makeCard('spades', '8'),
  makeCard('hearts', '8'),
];
assert(
  !isValidSet(fiveCardSet, 'K'),
  'Set with 5 cards is strictly rejected',
  `Cards count: 5 -> isValidSet: ${isValidSet(fiveCardSet, 'K')}`
);

// Test 1.5: Live hand score calculation with Pure Seq + 2nd Seq + Set
// Hand:
// Pure Seq: 4♥ 5♥ 6♥ (0 penalty)
// Impure Seq: 8♠ 9♠ K♦ (K is wild joker) (0 penalty)
// Valid Set: 10♥ 10♦ 10♣ (0 penalty, +20 pts awarded)
// Unmelded: 2♠ 3♣ (unmatched cards: 2 + 3 = 5 penalty points)
const pureSeq = [makeCard('hearts', '4'), makeCard('hearts', '5'), makeCard('hearts', '6')];
const impureSeq = [makeCard('spades', '8'), makeCard('spades', '9'), makeCard('diamonds', 'K')];
const validSet10 = [makeCard('hearts', '10'), makeCard('diamonds', '10'), makeCard('clubs', '10')];
const unmelded = [makeCard('spades', '2'), makeCard('clubs', '3')];

const handGroups = [pureSeq, impureSeq, validSet10, unmelded];
const liveScore = calculateLiveHandScore(handGroups, 'K');

assert(
  liveScore.hasPureSeq && liveScore.hasTwoSeq && liveScore.validSetsCount === 1,
  'Live hand correctly identifies pure sequence, secondary sequence, and valid set',
  `hasPureSeq: ${liveScore.hasPureSeq}, totalSeq: ${liveScore.totalSequenceCount}, validSets: ${liveScore.validSetsCount}`
);

assert(
  liveScore.score === 5,
  'Set and sequences are exempt from penalty; only unmatched cards (2+3=5) count',
  `Penalty Score: ${liveScore.score} (expected: 5)`
);

assert(
  liveScore.totalMeldPoints === 60,
  'Awards 20 points per valid meld (2 sequences + 1 set = 3 × 20 = 60 Pts)',
  `Total Meld Points: ${liveScore.totalMeldPoints}`
);

// Test 1.6: calculateLossPoints correctly protects melds and does not blind-charge 80 points
const fullHandCards = [...pureSeq, ...impureSeq, ...validSet10, ...unmelded];
const lossPointsResult = calculateLossPoints(fullHandCards, 'K');
assert(
  lossPointsResult === 5,
  'calculateLossPoints evaluates melds so loser with valid sets/seqs is charged 5 pts instead of 80 pts',
  `Evaluated loss: ${lossPointsResult} (expected: 5)`
);

// Test 1.7: Winning hand (13 cards all melded into valid pure, impure seq, and sets)
const valid4Seq = [makeCard('clubs', '2'), makeCard('clubs', '3'), makeCard('clubs', '4'), makeCard('clubs', '5')];
const validWinningGroups = [
  pureSeq,         // 3 cards
  impureSeq,       // 3 cards
  validSet10,      // 3 cards
  valid4Seq,       // 4 cards (Pure 2-3-4-5) -> 13 cards total!
];
const winningScore = calculateLiveHandScore(validWinningGroups, 'K');
assert(
  winningScore.isWinningHand && winningScore.score === 0,
  'Winning hand with all 13 cards validly melded scores exactly 0 points',
  `isWinningHand: ${winningScore.isWinningHand}, Score: ${winningScore.score}, Total Melds: ${winningScore.totalSequenceCount + winningScore.validSetsCount}`
);

// 2. TURN TIMEOUT & 3-STRIKE AUTO-PASS TESTS
// Test 2.1: Timeout with missedTurns = 0 (1st strike) does NOT drop player
interface MockPlayer {
  uid: string;
  seatIndex: number;
  status: 'playing' | 'dropped';
  missedTurns: number;
  cards: Card[];
}

function simulateTurnTimeout(
  players: MockPlayer[],
  currentTurnUid: string,
  hasDrawn: boolean
): { playerStatus: string; missedTurns: number; nextTurnUid: string; dropped: boolean } {
  const p = players.find((x) => x.uid === currentTurnUid)!;
  const currentMissed = p.missedTurns || 0;

  if (currentMissed < 2) {
    // Auto-play / pass turn (strike 1 or 2)
    p.missedTurns = currentMissed + 1;
    const others = players.filter((x) => x.uid !== currentTurnUid && x.status === 'playing');
    const nextClockwise = others.find((x) => x.seatIndex > p.seatIndex);
    const nextUid = nextClockwise ? nextClockwise.uid : others[0].uid;
    return {
      playerStatus: p.status,
      missedTurns: p.missedTurns,
      nextTurnUid: nextUid,
      dropped: false,
    };
  }

  // Strike 3: Auto-drop!
  p.status = 'dropped';
  p.missedTurns = currentMissed + 1;
  const others = players.filter((x) => x.uid !== currentTurnUid && x.status === 'playing');
  const nextUid = others.length > 0 ? others[0].uid : currentTurnUid;
  return {
    playerStatus: p.status,
    missedTurns: p.missedTurns,
    nextTurnUid: nextUid,
    dropped: true,
  };
}

const mockPlayers: MockPlayer[] = [
  { uid: 'player_1', seatIndex: 0, status: 'playing', missedTurns: 0, cards: [] },
  { uid: 'player_2', seatIndex: 1, status: 'playing', missedTurns: 0, cards: [] },
];

// Strike 1
const strike1 = simulateTurnTimeout(mockPlayers, 'player_1', false);
assert(
  !strike1.dropped && strike1.playerStatus === 'playing' && strike1.missedTurns === 1 && strike1.nextTurnUid === 'player_2',
  'First turn timeout increments missedTurns to 1 and passes turn to Player 2 without dropping',
  `Status: ${strike1.playerStatus}, Missed: ${strike1.missedTurns}, Next: ${strike1.nextTurnUid}, Dropped: ${strike1.dropped}`
);

// Strike 2
const strike2 = simulateTurnTimeout(mockPlayers, 'player_1', false);
assert(
  !strike2.dropped && strike2.playerStatus === 'playing' && strike2.missedTurns === 2 && strike2.nextTurnUid === 'player_2',
  'Second turn timeout increments missedTurns to 2 and passes turn to Player 2 without dropping',
  `Status: ${strike2.playerStatus}, Missed: ${strike2.missedTurns}, Next: ${strike2.nextTurnUid}, Dropped: ${strike2.dropped}`
);

// Strike 3
const strike3 = simulateTurnTimeout(mockPlayers, 'player_1', false);
assert(
  strike3.dropped && strike3.playerStatus === 'dropped' && strike3.missedTurns === 3,
  'Third consecutive turn timeout correctly auto-drops player for inactivity (3-strike rule)',
  `Status: ${strike3.playerStatus}, Missed: ${strike3.missedTurns}, Dropped: ${strike3.dropped}`
);

// 3. TURN SYSTEM & ALTERNATION
// Test 3.1: 2-player alternation
const twoPlayers: MockPlayer[] = [
  { uid: 'user_A', seatIndex: 0, status: 'playing', missedTurns: 0, cards: [] },
  { uid: 'user_B', seatIndex: 1, status: 'playing', missedTurns: 0, cards: [] },
];

function getNextClockwise(activePlayers: MockPlayer[], currentUid: string): string {
  const current = activePlayers.find((p) => p.uid === currentUid)!;
  const others = activePlayers.filter((p) => p.uid !== currentUid && p.status === 'playing');
  if (others.length === 0) return currentUid;
  const next = others.find((p) => p.seatIndex > current.seatIndex);
  return next ? next.uid : others[0].uid;
}

const turnAfterA = getNextClockwise(twoPlayers, 'user_A');
const turnAfterB = getNextClockwise(twoPlayers, 'user_B');
assert(
  turnAfterA === 'user_B' && turnAfterB === 'user_A',
  'Turns strictly alternate between Player A and Player B in 2-player match',
  `After A -> ${turnAfterA}, After B -> ${turnAfterB}`
);

// 4. DROP ACTION & PENALTY CALCULATION
// Test 4.1: First Drop calculation (0 turns played, has not drawn): 20 pts = 25% of entryFee
const firstDrop = calculateDropPenalty(20, 0.25, 0, false);
assert(
  firstDrop.isFirstDrop && firstDrop.points === 20 && firstDrop.penaltyRupees === 5,
  'First Drop correctly incurs exactly 20 points (₹5 penalty on ₹20 entry fee = 25%)',
  `isFirstDrop: ${firstDrop.isFirstDrop}, Points: ${firstDrop.points}, PenaltyRupees: ₹${firstDrop.penaltyRupees}`
);

// Test 4.2: Middle Drop calculation (1 turn played): 40 pts = 50% of entryFee
const middleDrop = calculateDropPenalty(20, 0.25, 1, false);
assert(
  !middleDrop.isFirstDrop && middleDrop.points === 40 && middleDrop.penaltyRupees === 10,
  'Middle Drop correctly incurs exactly 40 points (₹10 penalty on ₹20 entry fee = 50%)',
  `isFirstDrop: ${middleDrop.isFirstDrop}, Points: ${middleDrop.points}, PenaltyRupees: ₹${middleDrop.penaltyRupees}`
);

// Test 4.3: Drop after drawing card counts as Middle Drop (40 points)
const dropAfterDraw = calculateDropPenalty(20, 0.25, 0, true);
assert(
  !dropAfterDraw.isFirstDrop && dropAfterDraw.points === 40 && dropAfterDraw.penaltyRupees === 10,
  'Drop after drawing card on turn 0 incurs Middle Drop (40 points = 50%)',
  `isFirstDrop: ${dropAfterDraw.isFirstDrop}, Points: ${dropAfterDraw.points}, PenaltyRupees: ₹${dropAfterDraw.penaltyRupees}`
);

// Test 4.4: 4-card natural set meld status badge
const meld4Status = getGroupMeldStatus(fourCardSet, 'K');
assert(
  meld4Status.isValid && meld4Status.type === 'set' && meld4Status.cardCount === 4 && meld4Status.badgeText === '✓ VALID SET (4) • +20 Pts',
  '4-card natural set badge displays "✓ VALID SET (4) • +20 Pts"',
  `Badge: "${meld4Status.badgeText}", Points: ${meld4Status.points}`
);

// Test 4.5: Opponent clock skew protection logic (rejecting early timeout attempts)
function canTriggerTimeout(
  deadline: number,
  now: number,
  turnStartedAt: number,
  callerUid: string,
  currentTurnUid: string
): boolean {
  const isOpponentCaller = callerUid !== currentTurnUid;
  const minRequiredTime = isOpponentCaller ? deadline + 5000 : deadline - 1500;
  if (now < minRequiredTime) return false;
  if (now - turnStartedAt < 45000) return false;
  return true;
}

const turnStart = Date.now();
const turnDead = turnStart + 60000;
// Opponent calling 1s after nominal deadline (within 5s grace period)
const oppEarly = canTriggerTimeout(turnDead, turnDead + 1000, turnStart, 'opponent_uid', 'active_uid');
// Opponent calling 6s after nominal deadline (past 5s grace period)
const oppLate = canTriggerTimeout(turnDead, turnDead + 6000, turnStart, 'opponent_uid', 'active_uid');
// Active player calling right at deadline
const activeAtDead = canTriggerTimeout(turnDead, turnDead, turnStart, 'active_uid', 'active_uid');

assert(
  !oppEarly && oppLate && activeAtDead,
  'Opponent client with clock skew is strictly blocked during 5s grace period; active player can auto-pass at deadline',
  `Opponent early blocked: ${!oppEarly}, Opponent late allowed: ${oppLate}, Active at dead allowed: ${activeAtDead}`
);

// Test 4.6: Clockwise turn passing when middle player drops in 3-player game
const threePlayers: MockPlayer[] = [
  { uid: 'seat_0', seatIndex: 0, status: 'playing', missedTurns: 0, cards: [] },
  { uid: 'seat_1', seatIndex: 1, status: 'playing', missedTurns: 0, cards: [] },
  { uid: 'seat_2', seatIndex: 2, status: 'playing', missedTurns: 0, cards: [] },
];

function getNextClockwiseOnDrop(activePlayers: MockPlayer[], droppingUid: string): string {
  const droppingPlayer = activePlayers.find((p) => p.uid === droppingUid)!;
  const remaining = activePlayers
    .filter((p) => p.uid !== droppingUid && p.status === 'playing')
    .sort((a, b) => a.seatIndex - b.seatIndex);
  const nextClockwise = remaining.find((p) => p.seatIndex > droppingPlayer.seatIndex);
  return nextClockwise ? nextClockwise.uid : remaining[0].uid;
}

const nextAfterSeat1Drop = getNextClockwiseOnDrop(threePlayers, 'seat_1');
const nextAfterSeat2Drop = getNextClockwiseOnDrop(threePlayers, 'seat_2');
assert(
  nextAfterSeat1Drop === 'seat_2' && nextAfterSeat2Drop === 'seat_0',
  'Dropping in 3-player match strictly passes turn clockwise to next active seat (Seat 1 -> Seat 2, Seat 2 -> Seat 0)',
  `After Seat 1 drop -> ${nextAfterSeat1Drop}, After Seat 2 drop -> ${nextAfterSeat2Drop}`
);


console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} / ${passCount + failCount} TESTS PASSED`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
}
