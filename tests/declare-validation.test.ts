// tests/declare-validation.test.ts
// Verification of Indian Rummy Declaration logic, 0-score winning hand detection,
// 14th card finish discard detection, and validation requirements.

import {
  validateDeclaration,
  calculateLiveHandScore,
  findBestMelds,
  isPureSequence,
  isImpureSequence,
  isValidSet,
} from '../lib/rummy-engine';
import { Card, Rank, Suit } from '../lib/types';

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
console.log('   DECLARE & 0-SCORE HAND VERIFICATION SUITE       ');
console.log('====================================================\n');

// 1. Full 13-card winning hand declaration
// Sequence 1 (Pure): 4♠, 5♠, 6♠
// Sequence 2 (Impure with Joker): 7♥, 8♥, K♠ (wild joker rank K)
// Set 1: 9♦, 9♣, 9♠
// Sequence 3 (Pure): 10♣, J♣, Q♣, K♣
const pureSeq1: Card[] = [
  makeCard('spades', '4'),
  makeCard('spades', '5'),
  makeCard('spades', '6'),
];
const impureSeq1: Card[] = [
  makeCard('hearts', '7'),
  makeCard('hearts', '8'),
  makeCard('spades', 'K'), // wild joker K
];
const set1: Card[] = [
  makeCard('diamonds', '9'),
  makeCard('clubs', '9'),
  makeCard('spades', '9'),
];
const pureSeq2: Card[] = [
  makeCard('clubs', '10'),
  makeCard('clubs', 'J'),
  makeCard('clubs', 'Q'),
  makeCard('clubs', 'K'),
];

const valid13HandGroups = [pureSeq1, impureSeq1, set1, pureSeq2];
const valid13Flat = valid13HandGroups.flat();

// Test 1: Exactly 13 cards validate successfully
const valResult = validateDeclaration(valid13HandGroups, 'K');
assert(
  valResult.isValid && valResult.penaltyScore === 0 && valResult.pureSequenceCount >= 1 && valResult.totalSequenceCount >= 2,
  '13-card valid hand declaration succeeds with 0 penalty and isValid=true',
  `Valid: ${valResult.isValid}, Penalty: ${valResult.penaltyScore}, Pure: ${valResult.pureSequenceCount}, Total Seq: ${valResult.totalSequenceCount}`
);

// Test 2: calculateLiveHandScore gives score 0 and isWinningHand=true
const scoreEval = calculateLiveHandScore(valid13HandGroups, 'K');
assert(
  scoreEval.score === 0 && scoreEval.isWinningHand === true,
  '0-score hand correctly identified as isWinningHand=true for declare',
  `Score: ${scoreEval.score}, isWinningHand: ${scoreEval.isWinningHand}`
);

// Test 3: Auto-sort (findBestMelds) on the 13 cards recovers valid melds
const sortedMelds = findBestMelds(valid13Flat, 'K');
const sortedEval = calculateLiveHandScore(sortedMelds, 'K');
assert(
  sortedEval.score === 0,
  'findBestMelds on valid hand maintains 0-score status',
  `Score: ${sortedEval.score}, Groups: ${sortedMelds.length}`
);

// Test 4: 14 cards (drawn card extra) - smart finish card selection
// Suppose player draws an extra unmatched card (e.g., 2♦)
const extraCard = makeCard('diamonds', '2');
const cards14 = [...valid13Flat, extraCard];

let finishIdx = -1;
for (let i = cards14.length - 1; i >= 0; i--) {
  const remaining = cards14.filter((_, idx) => idx !== i);
  const best = findBestMelds(remaining, 'K');
  const check = validateDeclaration(best, 'K');
  if (check.isValid) {
    finishIdx = i;
    break;
  }
}
assert(
  finishIdx === 13,
  'Smart finish card detection correctly identifies extra 14th card as finish card',
  `Selected finish index: ${finishIdx} (Card: ${cards14[finishIdx].rank} of ${cards14[finishIdx].suit})`
);

// Test 5: Incomplete declaration (without pure sequence) must fail with 80 penalty
const set2_4cards: Card[] = [
  makeCard('diamonds', '8'),
  makeCard('clubs', '8'),
  makeCard('spades', '8'),
  makeCard('hearts', '8'),
];
const impureOnlyHand = [
  [makeCard('spades', '4'), makeCard('spades', 'K'), makeCard('spades', '6')], // Impure with Joker K
  [makeCard('hearts', '7'), makeCard('hearts', 'K'), makeCard('hearts', '9')], // Impure with Joker K
  set1,
  set2_4cards,
];
const impureVal = validateDeclaration(impureOnlyHand, 'K');
assert(
  !impureVal.isValid && impureVal.penaltyScore === 80 && impureVal.pureSequenceCount === 0,
  'Hand lacking Pure Sequence is strictly rejected with 80 penalty points',
  `Valid: ${impureVal.isValid}, Penalty: ${impureVal.penaltyScore}, Message: "${impureVal.message}"`
);

// Test 6: Declaration with wrong card count (< 13 or > 13) is rejected
const twelveCardHand = [pureSeq1, impureSeq1, set1, pureSeq2.slice(0, 3)];
const twelveVal = validateDeclaration(twelveCardHand, 'K');
assert(
  !twelveVal.isValid && twelveVal.message.includes('13 cards'),
  'Hand with 12 cards is rejected from declare',
  `Valid: ${twelveVal.isValid}, Message: "${twelveVal.message}"`
);

// Test 7: 14-card drawn hand evaluated by calculateLiveHandScore returns score 0 and isWinningHand=true
const hand14Melds = findBestMelds(cards14, 'K');
const score14 = calculateLiveHandScore(hand14Melds, 'K');
assert(
  score14.score === 0 && score14.isWinningHand === true,
  '14-card drawn hand with valid 13-meld base scores exactly 0 points and isWinningHand=true',
  `Score: ${score14.score}, isWinningHand: ${score14.isWinningHand}`
);

// Test 8: 14-card hand in user groups (with 14th card attached to a group) returns score 0
const userGroupsWith14 = [
  pureSeq1,
  impureSeq1,
  set1,
  [...pureSeq2, extraCard], // extra 14th card in group
];
const score14UserGroups = calculateLiveHandScore(userGroupsWith14, 'K');
assert(
  score14UserGroups.score === 0 && score14UserGroups.isWinningHand === true,
  '14-card hand with extra card attached to user group correctly evaluates to 0 score',
  `Score: ${score14UserGroups.score}, isWinningHand: ${score14UserGroups.isWinningHand}`
);

// Test 9: 14-card hand lacking pure sequence does NOT get 0 score
const nonWinning14 = [...impureOnlyHand.flat().slice(0, 13), extraCard];
const nonWinningMelds = findBestMelds(nonWinning14, 'K');
const score14NonWinning = calculateLiveHandScore(nonWinningMelds, 'K');
assert(
  score14NonWinning.score > 0 && score14NonWinning.isWinningHand === false,
  '14-card hand lacking pure sequence is NOT marked winning and penalty > 0',
  `Score: ${score14NonWinning.score}, isWinningHand: ${score14NonWinning.isWinningHand}`
);

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} / ${passCount + failCount} TESTS PASSED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
}
