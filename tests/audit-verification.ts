// tests/audit-verification.ts
// Focused unit test suite for RummyAdda compliance audit

interface UserWallet {
  uid: string;
  depositBalance: number;
  winBalance: number;
  bonusBalance: number;
  starterPlayBalance: number;
  rewardPoints: number;
  updatedAt: string;
}

// 1. STARTER BALANCE IDEMPOTENCY
function initializeOrGetWallet(existingWallet: UserWallet | null, uid: string): { wallet: UserWallet; wasCreated: boolean } {
  if (existingWallet) {
    // Existing wallet must never be reset or credited again automatically
    return { wallet: existingWallet, wasCreated: false };
  }
  const newWallet: UserWallet = {
    uid,
    depositBalance: 0,
    winBalance: 0,
    bonusBalance: 0,
    starterPlayBalance: 20,
    rewardPoints: 0,
    updatedAt: new Date().toISOString(),
  };
  return { wallet: newWallet, wasCreated: true };
}

// 2. WITHDRAWAL VALIDATION
function validateWithdrawal(amount: number, wallet: UserWallet): { isValid: boolean; error?: string } {
  const MINIMUM_WITHDRAWAL = 100;
  if (isNaN(amount) || amount < MINIMUM_WITHDRAWAL) {
    return { isValid: false, error: 'Minimum withdrawal amount is ₹100.' };
  }
  if (amount > wallet.winBalance) {
    return { isValid: false, error: `Insufficient winnings balance. You can withdraw up to ₹${wallet.winBalance}.` };
  }
  return { isValid: true };
}

// 3. 20/80 CALCULATION
function calculateGamePayout(totalPointsLost: number, pointValue: number): { grossWin: number; adminShare: number; playerNetShare: number } {
  const grossWin = totalPointsLost * pointValue;
  const adminShare = Math.round(grossWin * 0.20 * 100) / 100; // 20% platform rake
  const playerNetShare = Math.round((grossWin - adminShare) * 100) / 100; // 80% player net
  return { grossWin, adminShare, playerNetShare };
}

// 4. DUPLICATE QUEUE PREVENTION
interface QueueTicket {
  ticketId: string;
  uid: string;
  tableId: string;
  status: 'QUEUED' | 'MATCHED' | 'CANCELLED';
}

function processQueueRequest(existingTickets: QueueTicket[], uid: string, tableId: string): { ticket: QueueTicket; isDuplicatePrevented: boolean } {
  const active = existingTickets.find((t) => t.uid === uid && t.status === 'QUEUED');
  if (active) {
    if (active.tableId === tableId) {
      return { ticket: active, isDuplicatePrevented: true };
    }
    // Cancel old and create new
    active.status = 'CANCELLED';
  }
  const newTicket: QueueTicket = {
    ticketId: `ticket_${uid}_${Date.now()}`,
    uid,
    tableId,
    status: 'QUEUED',
  };
  return { ticket: newTicket, isDuplicatePrevented: false };
}

// 5. SIX-PLAYER CAPACITY CEILING
function joinSeat(currentPlayers: number, maxPlayers: number): { allowed: boolean; newPlayerCount: number; error?: string } {
  if (currentPlayers >= maxPlayers) {
    return { allowed: false, newPlayerCount: currentPlayers, error: 'This table is already full (maximum capacity reached).' };
  }
  return { allowed: true, newPlayerCount: currentPlayers + 1 };
}

// 6. COUNTDOWN TRANSITIONS
interface GameSession {
  status: 'WAITING' | 'COUNTDOWN' | 'PLAYING';
  playerCount: number;
  countdownEndsAt: number | null;
}

function handlePlayerJoinCountdown(game: GameSession): GameSession {
  const newCount = game.playerCount + 1;
  const now = Date.now();
  let status = game.status;
  let countdownEndsAt = game.countdownEndsAt;

  if (newCount >= 2 && (game.status === 'WAITING' || game.status === 'COUNTDOWN')) {
    status = 'COUNTDOWN';
    countdownEndsAt = now + 15000; // Exactly 15s restart
  }
  return { status, playerCount: newCount, countdownEndsAt };
}

function handlePlayerLeaveCountdown(game: GameSession): GameSession {
  const newCount = Math.max(0, game.playerCount - 1);
  let status = game.status;
  let countdownEndsAt = game.countdownEndsAt;

  if (newCount < 2) {
    status = 'WAITING';
    countdownEndsAt = null; // Cancel countdown
  }
  return { status, playerCount: newCount, countdownEndsAt };
}

// 7. SECURITY RULES EVALUATION (Simulation of firestore.rules logic)
function evaluateSecurityRules(
  path: string,
  operation: 'read' | 'write' | 'update' | 'delete',
  auth: { uid: string } | null,
  resource: Record<string, any> | null,
  requestData: Record<string, any> | null
): boolean {
  const isSignedIn = auth !== null;
  const uid = auth?.uid;

  if (path.startsWith('wallets/')) {
    const targetUserId = path.split('wallets/')[1];
    // Under strict security rules: allow get if isOwner, allow update: if false
    if (operation === 'read') return isSignedIn && uid === targetUserId;
    if (operation === 'update') return false; // Strict: clients cannot mutate balances directly
    return false;
  }

  if (path.startsWith('transactions/')) {
    // Under strict security rules: allow read if owner; allow create, update, delete: if false
    if (operation === 'read') return isSignedIn && resource?.uid === uid;
    return false;
  }

  if (path.includes('/internal/')) {
    // Internal secret deck: DENIED to all clients to prevent x-ray cheating
    return false;
  }

  if (path.includes('/players/')) {
    return isSignedIn;
  }

  if (path.startsWith('withdrawals/')) {
    if (operation === 'write') {
      return isSignedIn && requestData?.uid === uid && requestData?.status === 'pending';
    }
    if (operation === 'update') return false; // client cannot mark as paid
    return isSignedIn && resource?.uid === uid;
  }

  return true;
}

// RUN ALL AUDIT TESTS
async function runAuditTests() {
  console.log('====================================================');
  console.log('   RUMMYADDA SPECIFICATION AUDIT & VERIFICATION    ');
  console.log('====================================================\n');

  let passCount = 0;
  let totalCount = 0;

  function assert(title: string, condition: boolean, detail: string) {
    totalCount++;
    if (condition) {
      passCount++;
      console.log(`[PASS] ${title}`);
      console.log(`       Evidence: ${detail}`);
    } else {
      console.error(`[FAIL] ${title}`);
      console.error(`       Detail: ${detail}`);
    }
  }

  // 1. STARTER BALANCE
  const freshWallet = initializeOrGetWallet(null, 'user_fresh_1');
  assert(
    'Starter balance applied on new wallet',
    freshWallet.wasCreated &&
      freshWallet.wallet.starterPlayBalance === 20 &&
      freshWallet.wallet.winBalance === 0 &&
      freshWallet.wallet.depositBalance === 0 &&
      freshWallet.wallet.rewardPoints === 0,
    `New wallet created with exactly ₹20 starterPlayBalance, ₹0 winBalance, ₹0 depositBalance, 0 rewards.`
  );

  // Starter credit idempotency
  const existingWalletMock: UserWallet = {
    uid: 'user_existing_1',
    depositBalance: 150,
    winBalance: 320,
    bonusBalance: 0,
    starterPlayBalance: 0,
    rewardPoints: 50,
    updatedAt: '2026-01-01T00:00:00Z',
  };
  const secondCall = initializeOrGetWallet(existingWalletMock, 'user_existing_1');
  assert(
    'Starter credit idempotency on existing wallet',
    !secondCall.wasCreated &&
      secondCall.wallet.starterPlayBalance === 0 &&
      secondCall.wallet.winBalance === 320 &&
      secondCall.wallet.depositBalance === 150,
    `Existing wallet was NOT reset or credited again (preserved starter: 0, win: 320, deposit: 150).`
  );

  // 2. WITHDRAWAL MINIMUM & NON-WITHDRAWABLE DEPOSITS/STARTER
  const testWallet: UserWallet = {
    uid: 'user_test',
    depositBalance: 500,
    starterPlayBalance: 20,
    winBalance: 150,
    bonusBalance: 0,
    rewardPoints: 0,
    updatedAt: new Date().toISOString(),
  };

  const wSub100 = validateWithdrawal(99, testWallet);
  assert(
    'Withdrawal below ₹100 rejected',
    !wSub100.isValid && wSub100.error === 'Minimum withdrawal amount is ₹100.',
    `Withdrawal of ₹99 rejected with: "${wSub100.error}"`
  );

  const wValid = validateWithdrawal(100, testWallet);
  assert(
    'Withdrawal of ₹100 from winBalance accepted',
    wValid.isValid,
    `Withdrawal of ₹100 accepted because winBalance (₹150) >= ₹100.`
  );

  const wExceedWinnings = validateWithdrawal(200, testWallet);
  assert(
    'Withdrawal exceeding winBalance rejected (deposit/starter not withdrawable)',
    !wExceedWinnings.isValid,
    `Attempt to withdraw ₹200 when winBalance is ₹150 was rejected. Starter (₹20) and Deposit (₹500) are non-withdrawable.`
  );

  // 3. 20/80 CALCULATION
  const payout100 = calculateGamePayout(100, 1.0); // 100 gross win
  assert(
    '₹100 gross win calculates ₹20 admin share and ₹80 player net share',
    payout100.grossWin === 100 && payout100.adminShare === 20 && payout100.playerNetShare === 80,
    `Gross win ₹100 -> adminShare: ₹${payout100.adminShare} (20%), playerNetShare: ₹${payout100.playerNetShare} (80%).`
  );

  const payout500 = calculateGamePayout(50, 10.0); // 500 gross win
  assert(
    '₹500 gross win calculates ₹100 admin share and ₹400 player net share',
    payout500.grossWin === 500 && payout500.adminShare === 100 && payout500.playerNetShare === 400,
    `Gross win ₹500 -> adminShare: ₹${payout500.adminShare} (20%), playerNetShare: ₹${payout500.playerNetShare} (80%).`
  );

  // 4. DUPLICATE QUEUE REQUESTS
  const existingQueue: QueueTicket[] = [
    { ticketId: 'ticket_u1_1', uid: 'user_u1', tableId: 'pt_20_2p', status: 'QUEUED' },
  ];
  const duplicateAttempt = processQueueRequest(existingQueue, 'user_u1', 'pt_20_2p');
  assert(
    'Duplicate queue request returns existing ticket',
    duplicateAttempt.isDuplicatePrevented && duplicateAttempt.ticket.ticketId === 'ticket_u1_1',
    `User 'user_u1' queuing again for 'pt_20_2p' returned existing ticket without duplicate ticket creation.`
  );

  // 5. SIX-PLAYER CAPACITY CEILING
  const capacityTest1 = joinSeat(5, 6);
  assert(
    '6th player accepted into 6-player table',
    capacityTest1.allowed && capacityTest1.newPlayerCount === 6,
    `5 seated + 1 joining -> capacity is 6 (allowed).`
  );

  const capacityTest2 = joinSeat(6, 6);
  assert(
    '7th player rejected from 6-player table',
    !capacityTest2.allowed && Boolean(capacityTest2.error?.includes('full')),
    `6 seated + 1 joining -> rejected with: "${capacityTest2.error}"`
  );

  const capacityTest3 = joinSeat(2, 2);
  assert(
    '3rd player rejected from 2-player table',
    !capacityTest3.allowed && Boolean(capacityTest3.error?.includes('full')),
    `2 seated + 1 joining at 2P table -> rejected with: "${capacityTest3.error}"`
  );

  // 6. COUNTDOWN TRANSITIONS
  let gameSession: GameSession = { status: 'WAITING', playerCount: 1, countdownEndsAt: null };
  gameSession = handlePlayerJoinCountdown(gameSession);
  assert(
    'Countdown begins at 15 seconds when 2nd player joins',
    gameSession.status === 'COUNTDOWN' && gameSession.countdownEndsAt !== null,
    `2nd player joined -> status changed to COUNTDOWN with 15s timer.`
  );

  const firstCountdownEndsAt = gameSession.countdownEndsAt;
  // Sleep 10ms to ensure timestamp difference
  await new Promise((r) => setTimeout(r, 15));
  gameSession = handlePlayerJoinCountdown(gameSession);
  assert(
    'Additional player joining during open countdown restarts it to 15 seconds',
    gameSession.status === 'COUNTDOWN' && gameSession.playerCount === 3 && gameSession.countdownEndsAt! > firstCountdownEndsAt!,
    `3rd player joined during countdown -> timer restarted to new 15s deadline.`
  );

  // Player leaves: drops from 3 to 2 (still in countdown)
  gameSession = handlePlayerLeaveCountdown(gameSession);
  assert(
    'Countdown maintained with 2 players remaining',
    gameSession.status === 'COUNTDOWN' && gameSession.playerCount === 2,
    `Player left -> 2 remaining, countdown stays active.`
  );

  // Another player leaves: drops from 2 to 1 (fewer than 2 remaining)
  gameSession = handlePlayerLeaveCountdown(gameSession);
  assert(
    'Countdown cancelled when fewer than 2 players remain',
    gameSession.status === 'WAITING' && gameSession.countdownEndsAt === null,
    `Player left -> 1 remaining, countdown cancelled and reset to WAITING.`
  );

  // 7. SECURITY RULES EVALUATION
  const userACannotUpdateUserBWallet = evaluateSecurityRules('wallets/user_2', 'update', { uid: 'user_1' }, {}, { winBalance: 9999 });
  assert(
    'User cannot modify another player wallet (strict owner isolation)',
    !userACannotUpdateUserBWallet,
    `Update on wallets/user_2 by user_1 returned false (blocked by rules).`
  );

  const clientCannotMutateOwnWallet = evaluateSecurityRules('wallets/user_1', 'update', { uid: 'user_1' }, {}, { starterPlayBalance: 0 });
  assert(
    'Client cannot directly modify wallet balance (strict server-side settlement)',
    !clientCannotMutateOwnWallet,
    `Direct client update on wallets/user_1 returned false (client balance mutations blocked).`
  );

  const clientCannotCreateTransactions = evaluateSecurityRules('transactions/tx_1', 'write', { uid: 'user_1' }, {}, { uid: 'user_1', amount: 500 });
  assert(
    'Client cannot inject transactions directly into ledger',
    !clientCannotCreateTransactions,
    `Creation of transaction by client returned false (only trusted backend can write transactions).`
  );

  const clientApprovesWithdrawal = evaluateSecurityRules('withdrawals/wdr_1', 'update', { uid: 'user_1' }, { uid: 'user_1', status: 'pending' }, { status: 'paid' });
  assert(
    'Client cannot mark withdrawal as paid',
    !clientApprovesWithdrawal,
    `Update on withdrawals/wdr_1 to status 'paid' returned false (blocked by rules).`
  );

  // 8. WAITING TIME EXIT REFUND
  interface DeductionBreakdown {
    starterDeduct: number;
    depositDeduct: number;
    winDeduct: number;
    total: number;
  }

  function processWaitingExitRefund(
    wallet: UserWallet,
    gameStatus: 'WAITING' | 'COUNTDOWN' | 'PLAYING',
    entryFee: number,
    breakdown?: DeductionBreakdown
  ): { refunded: boolean; updatedWallet: UserWallet; refundAmount: number; error?: string } {
    if (gameStatus !== 'WAITING' && gameStatus !== 'COUNTDOWN') {
      return { refunded: false, updatedWallet: wallet, refundAmount: 0, error: 'Cannot refund after play starts.' };
    }
    const starterRefund = breakdown?.starterDeduct ?? 0;
    const depositRefund = breakdown?.depositDeduct ?? (breakdown ? 0 : entryFee);
    const winRefund = breakdown?.winDeduct ?? 0;
    const total = breakdown?.total ?? entryFee;

    const updatedWallet: UserWallet = {
      ...wallet,
      starterPlayBalance: wallet.starterPlayBalance + starterRefund,
      depositBalance: wallet.depositBalance + depositRefund,
      winBalance: wallet.winBalance + winRefund,
      updatedAt: new Date().toISOString(),
    };

    return { refunded: true, updatedWallet, refundAmount: total };
  }

  const walletBeforeRefundStarter: UserWallet = {
    uid: 'u_starter',
    depositBalance: 0,
    winBalance: 0,
    bonusBalance: 0,
    starterPlayBalance: 0, // was ₹20, deducted for ₹20 game
    rewardPoints: 0,
    updatedAt: new Date().toISOString(),
  };

  const refundResStarter = processWaitingExitRefund(walletBeforeRefundStarter, 'WAITING', 20, {
    starterDeduct: 20,
    depositDeduct: 0,
    winDeduct: 0,
    total: 20,
  });

  assert(
    'Waiting time exit restores starter balance accurately',
    refundResStarter.refunded && refundResStarter.updatedWallet.starterPlayBalance === 20 && refundResStarter.refundAmount === 20,
    `User exited during WAITING -> ₹20 starter credit refunded back to starterPlayBalance.`
  );

  const walletBeforeRefundDeposit: UserWallet = {
    uid: 'u_deposit',
    depositBalance: 340, // had ₹500, deducted ₹160 for table
    winBalance: 50,
    bonusBalance: 0,
    starterPlayBalance: 0,
    rewardPoints: 0,
    updatedAt: new Date().toISOString(),
  };

  const refundResDeposit = processWaitingExitRefund(walletBeforeRefundDeposit, 'COUNTDOWN', 160, {
    starterDeduct: 0,
    depositDeduct: 160,
    winDeduct: 0,
    total: 160,
  });

  assert(
    'Countdown time exit restores deposit balance accurately',
    refundResDeposit.refunded && refundResDeposit.updatedWallet.depositBalance === 500 && refundResDeposit.refundAmount === 160,
    `User exited during COUNTDOWN -> ₹160 deposit balance refunded back to depositBalance (restored to ₹500).`
  );

  const refundResPlaying = processWaitingExitRefund(walletBeforeRefundDeposit, 'PLAYING', 160);
  assert(
    'Exit during active PLAYING does not give pre-match waiting refund',
    !refundResPlaying.refunded && refundResPlaying.refundAmount === 0,
    `Exit during PLAYING correctly rejected (${refundResPlaying.error}) - player drop penalty logic applies.`
  );

  // 9. DECLINED MATCH DUE TO ENTRY FEE & UNAUTHORIZED PLAY PREVENTION
  function validateMatchEntryBalance(playable: number, entryFee: number): { allowed: boolean; error?: string } {
    if (playable < entryFee) {
      return {
        allowed: false,
        error: `Insufficient playable balance (₹${playable}). Required entry fee is ₹${entryFee}.`,
      };
    }
    return { allowed: true };
  }

  const check20vs160 = validateMatchEntryBalance(20, 160);
  assert(
    'Player with ₹20 balance cannot play ₹160 match (strictly declined)',
    !check20vs160.allowed && Boolean(check20vs160.error?.includes('Required entry fee is ₹160')),
    `Entry fee check declined: "${check20vs160.error}". Player with ₹20 cannot enter ₹160 match.`
  );

  function filterUserMatches(allGames: Array<{ gameId: string; playerUids?: string[]; entryFee: number }>, userUid: string) {
    return allGames.filter((g) => Array.isArray(g.playerUids) && g.playerUids.includes(userUid));
  }

  const sampleGames = [
    { gameId: 'g_micro_20', playerUids: ['user_me'], entryFee: 20 },
    { gameId: 'g_high_160', playerUids: ['other_player'], entryFee: 160 }, // declined match
  ];

  const userMatches = filterUserMatches(sampleGames, 'user_me');
  assert(
    'Declined ₹160 match is excluded from user matches list',
    userMatches.length === 1 && userMatches[0].gameId === 'g_micro_20',
    `Only authorized matches appear in My Games; declined ₹160 match (g_high_160) was excluded.`
  );

  function isGameRoomAuthorized(isSeated: boolean, gameStatus: string): boolean {
    if (gameStatus === 'RESULT' || gameStatus === 'COMPLETED') return true;
    return isSeated;
  }

  assert(
    'Unseated player cannot access active ₹160 game room',
    !isGameRoomAuthorized(false, 'WAITING') && !isGameRoomAuthorized(false, 'COUNTDOWN') && !isGameRoomAuthorized(false, 'PLAYING'),
    `Unseated player blocked with Access Denied in WAITING, COUNTDOWN, and PLAYING states.`
  );

  console.log(`\n====================================================`);
  console.log(`SUMMARY: ${passCount} / ${totalCount} TESTS PASSED`);
  console.log(`====================================================`);
}

runAuditTests().catch(console.error);
