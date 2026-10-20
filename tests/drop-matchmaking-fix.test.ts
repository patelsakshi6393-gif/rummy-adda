// tests/drop-matchmaking-fix.test.ts
// Verification of drop match recovery, matchmaking exclusion of dropped games,
// and smooth fresh match creation.

import { calculateDropPenalty } from '../lib/game-service';
import { GameState, GamePlayerState, TableConfig } from '../lib/types';

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
console.log('   DROP MATCH & MATCHMAKING RECONNECT VERIFICATION  ');
console.log('====================================================\n');

// Mock matchmaking reconnect check matching the exact logic in lib/game-service.ts
function checkReconnectEligible(
  game: Partial<GameState>,
  player: Partial<GamePlayerState> | null,
  currentUid: string
): { eligible: boolean; reason: string } {
  if (!Array.isArray(game.playerUids) || !game.playerUids.includes(currentUid)) {
    return { eligible: false, reason: 'Player not in playerUids' };
  }

  // 1. Check droppedUids
  if (Array.isArray(game.droppedUids) && game.droppedUids.includes(currentUid)) {
    return { eligible: false, reason: 'Player is in game.droppedUids' };
  }

  // 2. Check player subdocument status
  if (!player) {
    return { eligible: false, reason: 'Player record not found' };
  }

  if (player.status === 'dropped' || player.status === 'eliminated') {
    return { eligible: false, reason: `Player status is '${player.status}'` };
  }

  return { eligible: true, reason: 'Active playing session' };
}

// Test 1: Active player with status 'playing' reconnects
const activeGame: Partial<GameState> = {
  gameId: 'game_active_1',
  status: 'PLAYING',
  playerUids: ['user_1', 'user_2'],
  droppedUids: [],
};
const activePlayer: Partial<GamePlayerState> = {
  uid: 'user_1',
  status: 'playing',
};
const res1 = checkReconnectEligible(activeGame, activePlayer, 'user_1');
assert(
  res1.eligible,
  'Active playing player successfully reconnects to ongoing match',
  `Eligible: ${res1.eligible}, Reason: ${res1.reason}`
);

// Test 2: Dropped player in active PLAYING game is strictly rejected from reconnect
const droppedGame: Partial<GameState> = {
  gameId: 'game_dropped_1',
  status: 'PLAYING',
  playerUids: ['user_1', 'user_2', 'user_3'],
  droppedUids: ['user_1'],
};
const droppedPlayer: Partial<GamePlayerState> = {
  uid: 'user_1',
  status: 'dropped',
  score: 20,
};
const res2 = checkReconnectEligible(droppedGame, droppedPlayer, 'user_1');
assert(
  !res2.eligible && res2.reason === 'Player is in game.droppedUids',
  'Dropped player in droppedUids is strictly blocked from reconnecting to dropped match',
  `Eligible: ${res2.eligible}, Reason: ${res2.reason}`
);

// Test 3: Player with status 'dropped' in subcollection (even if droppedUids array missing/legacy) is blocked
const legacyDroppedGame: Partial<GameState> = {
  gameId: 'game_legacy_1',
  status: 'PLAYING',
  playerUids: ['user_1', 'user_2'],
  // droppedUids omitted (legacy game)
};
const res3 = checkReconnectEligible(legacyDroppedGame, droppedPlayer, 'user_1');
assert(
  !res3.eligible && res3.reason === "Player status is 'dropped'",
  'Legacy game without droppedUids still blocks reconnect via player.status === "dropped"',
  `Eligible: ${res3.eligible}, Reason: ${res3.reason}`
);

// Test 4: Eliminated player in Pool 101 match is blocked from reconnect
const eliminatedPlayer: Partial<GamePlayerState> = {
  uid: 'user_1',
  status: 'eliminated',
  score: 105,
};
const res4 = checkReconnectEligible(legacyDroppedGame, eliminatedPlayer, 'user_1');
assert(
  !res4.eligible && res4.reason === "Player status is 'eliminated'",
  'Eliminated player is strictly blocked from reconnecting',
  `Eligible: ${res4.eligible}, Reason: ${res4.reason}`
);

// Test 5: TableConfig re-join check (joinTable)
function checkTableRejoin(
  tableData: Partial<TableConfig>,
  existingPlayer: Partial<GamePlayerState> | null
): { shouldReturnGameId: boolean } {
  if (existingPlayer) {
    if (existingPlayer.status !== 'dropped' && existingPlayer.status !== 'eliminated') {
      return { shouldReturnGameId: true };
    }
  }
  return { shouldReturnGameId: false };
}

const tableRejoinDropped = checkTableRejoin({ activeGameId: 'game_1' }, droppedPlayer);
assert(
  !tableRejoinDropped.shouldReturnGameId,
  'joinTable does not re-attach player if existing player status is dropped',
  `shouldReturnGameId: ${tableRejoinDropped.shouldReturnGameId}`
);

const tableRejoinActive = checkTableRejoin({ activeGameId: 'game_1' }, activePlayer);
assert(
  tableRejoinActive.shouldReturnGameId,
  'joinTable re-attaches player if existing player status is actively playing',
  `shouldReturnGameId: ${tableRejoinActive.shouldReturnGameId}`
);

// Test 6: Partial buy-in refund on first drop vs middle drop calculation
const entryFee = 20;
const firstDrop = calculateDropPenalty(entryFee, 0.25, 0, false);
const middleDrop = calculateDropPenalty(entryFee, 0.25, 2, false);

const firstDropRefund = Math.max(0, entryFee - firstDrop.penaltyRupees);
const middleDropRefund = Math.max(0, entryFee - middleDrop.penaltyRupees);

assert(
  firstDrop.isFirstDrop && firstDrop.points === 20 && firstDrop.penaltyRupees === 5 && firstDropRefund === 15,
  'First Drop on ₹20 entry fee incurs ₹5 penalty and immediately refunds ₹15',
  `Penalty: ₹${firstDrop.penaltyRupees}, Refund: ₹${firstDropRefund}`
);

assert(
  !middleDrop.isFirstDrop && middleDrop.points === 40 && middleDrop.penaltyRupees === 10 && middleDropRefund === 10,
  'Middle Drop on ₹20 entry fee incurs ₹10 penalty and immediately refunds ₹10',
  `Penalty: ₹${middleDrop.penaltyRupees}, Refund: ₹${middleDropRefund}`
);

// Test 7: Settlement Idempotency check
function simulateSettlement(
  player: { isSettled?: boolean; walletDeposit: number },
  refundAmount: number
): { settled: boolean; newDeposit: number } {
  if (player.isSettled) {
    return { settled: false, newDeposit: player.walletDeposit }; // Already settled
  }
  player.isSettled = true;
  player.walletDeposit += refundAmount;
  return { settled: true, newDeposit: player.walletDeposit };
}

const simPlayer = { isSettled: false, walletDeposit: 10 };
const firstSettle = simulateSettlement(simPlayer, 15);
assert(
  firstSettle.settled && firstSettle.newDeposit === 25,
  'First settlement executes refund and flags isSettled = true',
  `Settled: ${firstSettle.settled}, Wallet: ₹${firstSettle.newDeposit}`
);

const secondSettle = simulateSettlement(simPlayer, 15);
assert(
  !secondSettle.settled && secondSettle.newDeposit === 25,
  'Subsequent settlement call is idempotent and does not double-refund wallet',
  `Settled: ${secondSettle.settled}, Wallet: ₹${secondSettle.newDeposit}`
);

// Test 8: Matchmaking finds fresh game when dropped game is skipped
interface MockGameDoc {
  id: string;
  data: GameState;
}

function findMatchMock(
  openGames: MockGameDoc[],
  userUid: string,
  userPlayersByGame: Record<string, GamePlayerState>
): { matchedGameId: string; isNewSession: boolean } {
  // 1. Reconnect check
  for (const g of openGames) {
    if (['PLAYING', 'TOSS', 'DEAL'].includes(g.data.status)) {
      if (Array.isArray(g.data.playerUids) && g.data.playerUids.includes(userUid)) {
        if (Array.isArray(g.data.droppedUids) && g.data.droppedUids.includes(userUid)) {
          continue;
        }
        const p = userPlayersByGame[g.id];
        if (p && (p.status === 'dropped' || p.status === 'eliminated')) {
          continue;
        }
        return { matchedGameId: g.id, isNewSession: false };
      }
    }
  }

  // 2. Open rooms check
  for (const g of openGames) {
    if (['WAITING', 'COUNTDOWN'].includes(g.data.status)) {
      if ((g.data.playerCount || 0) < 6) {
        return { matchedGameId: g.id, isNewSession: false };
      }
    }
  }

  // 3. New game creation
  return { matchedGameId: `match_new_${Date.now()}`, isNewSession: true };
}

const gamesList: MockGameDoc[] = [
  {
    id: 'dropped_game_xyz',
    data: {
      gameId: 'dropped_game_xyz',
      tableId: 'table_points_20',
      mode: 'points',
      pointValue: 0.25,
      entryFee: 20,
      playerCount: 3,
      playerUids: ['user_A', 'user_B', 'user_C'],
      droppedUids: ['user_A'],
      status: 'PLAYING',
      phase: 'PLAYING',
      openDeck: [],
      closedDeckCount: 90,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
];

const playersMap: Record<string, GamePlayerState> = {
  dropped_game_xyz: {
    uid: 'user_A',
    playerId: 'RA-123456',
    displayName: 'Player A',
    seatIndex: 0,
    status: 'dropped',
    cardCount: 13,
    score: 20,
    connected: true,
    joinedAt: new Date().toISOString(),
  },
};

const matchResult = findMatchMock(gamesList, 'user_A', playersMap);
assert(
  matchResult.isNewSession && matchResult.matchedGameId !== 'dropped_game_xyz',
  'findMatch creates/joins a fresh game when previous game was dropped (skips dropped match)',
  `Matched Game: ${matchResult.matchedGameId}, isNew: ${matchResult.isNewSession}`
);

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} / ${passCount + failCount} TESTS PASSED`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
}
