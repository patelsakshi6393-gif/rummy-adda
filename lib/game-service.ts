'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  runTransaction,
  query,
  where,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  Card,
  GameMode,
  GameState,
  GamePlayerState,
  TableConfig,
  UserProfile,
  UserWallet,
  Rank,
  MatchmakingTicket,
} from './types';
import {
  create108Deck,
  shuffleDeck,
  TOSS_RANK_VALUE,
  validateDeclaration,
  calculateLossPoints,
} from './rummy-engine';
import { handleFirestoreError, OperationType } from './firebase-error';

export const INITIAL_TABLES: Omit<TableConfig, 'currentPlayers' | 'status'>[] = [
  { tableId: 'pt_20_2p', name: 'Points Rummy - Micro Stake', gameMode: 'points', pointValue: 0.25, entryFee: 20, minPlayers: 2, maxPlayers: 2 },
  { tableId: 'pt_160_2p', name: 'Points Rummy - Bronze Table', gameMode: 'points', pointValue: 2, entryFee: 160, minPlayers: 2, maxPlayers: 2 },
  { tableId: 'pt_800_2p', name: 'Points Rummy - Silver Table', gameMode: 'points', pointValue: 10, entryFee: 800, minPlayers: 2, maxPlayers: 2 },
  { tableId: 'pt_3200_6p', name: 'Points Rummy - Gold Royale (6P)', gameMode: 'points', pointValue: 40, entryFee: 3200, minPlayers: 2, maxPlayers: 6 },
  { tableId: 'pt_6000_6p', name: 'Points Rummy - Platinum Table (6P)', gameMode: 'points', pointValue: 75, entryFee: 6000, minPlayers: 2, maxPlayers: 6 },
  { tableId: 'pt_10000_6p', name: 'Points Rummy - Diamond Salon (6P)', gameMode: 'points', pointValue: 125, entryFee: 10000, minPlayers: 2, maxPlayers: 6 },
  { tableId: 'pt_16000_6p', name: 'Points Rummy - High Roller Crown (6P)', gameMode: 'points', pointValue: 200, entryFee: 16000, minPlayers: 2, maxPlayers: 6 },
  { tableId: 'pool_160_6p', name: 'Pool 101 - Bronze Royale', gameMode: 'pool101', pointValue: 2, entryFee: 160, minPlayers: 2, maxPlayers: 6 },
  { tableId: 'pool_800_6p', name: 'Pool 101 - Silver Arena', gameMode: 'pool101', pointValue: 10, entryFee: 800, minPlayers: 2, maxPlayers: 6 },
  { tableId: 'pool_3200_6p', name: 'Pool 101 - Masters Championship', gameMode: 'pool101', pointValue: 40, entryFee: 3200, minPlayers: 2, maxPlayers: 6 },
];

export interface StakeOption {
  entryFee: number;
  pointValue: number;
  name: string;
  badge?: string;
}

export const STAKE_OPTIONS: Record<GameMode, StakeOption[]> = {
  points: [
    { entryFee: 20, pointValue: 0.25, name: 'Micro Stakes (₹0.25/pt)' },
    { entryFee: 160, pointValue: 2, name: 'Bronze Stake (₹2/pt)' },
    { entryFee: 800, pointValue: 10, name: 'Silver Stake (₹10/pt)' },
    { entryFee: 3200, pointValue: 40, name: 'Gold Royale (₹40/pt)' },
    { entryFee: 6000, pointValue: 75, name: 'Platinum Stake (₹75/pt)' },
    { entryFee: 10000, pointValue: 125, name: 'Diamond Salon (₹125/pt)' },
    { entryFee: 16000, pointValue: 200, name: 'High Roller Crown (₹200/pt)' },
  ],
  pool101: [
    { entryFee: 20, pointValue: 0.25, name: 'Pool 101 - Micro (₹20)' },
    { entryFee: 160, pointValue: 2, name: 'Pool 101 - Bronze (₹160)' },
    { entryFee: 800, pointValue: 10, name: 'Pool 101 - Silver (₹800)' },
    { entryFee: 3200, pointValue: 40, name: 'Pool 101 - Gold (₹3,200)' },
    { entryFee: 6000, pointValue: 75, name: 'Pool 101 - Platinum (₹6,000)' },
    { entryFee: 10000, pointValue: 125, name: 'Pool 101 - Diamond (₹10,000)' },
    { entryFee: 16000, pointValue: 200, name: 'Pool 101 - High Roller (₹16,000)' },
  ],
  deals: [
    { entryFee: 20, pointValue: 0.25, name: 'Deals Rummy - Micro (₹20)' },
    { entryFee: 160, pointValue: 2, name: 'Deals Rummy - Bronze (₹160)' },
    { entryFee: 800, pointValue: 10, name: 'Deals Rummy - Silver (₹800)' },
    { entryFee: 3200, pointValue: 40, name: 'Deals Rummy - Gold (₹3,200)' },
    { entryFee: 6000, pointValue: 75, name: 'Deals Rummy - Platinum (₹6,000)' },
    { entryFee: 10000, pointValue: 125, name: 'Deals Rummy - Diamond (₹10,000)' },
    { entryFee: 16000, pointValue: 200, name: 'Deals Rummy - High Roller (₹16,000)' },
  ],
};

/**
 * Matchmaking: Find an existing open table for this format & stake or create a real waiting queue.
 * Zero bots policy: Matches only genuine authenticated players online.
 */
export async function findMatch(
  mode: GameMode,
  entryFee: number,
  pointValue: number,
  profile: UserProfile
): Promise<string> {
  const currentUid = auth.currentUser?.uid || profile.uid;
  const walletRef = doc(db, 'wallets', currentUid);
  let walletSnap = await getDoc(walletRef);
  
  if (!walletSnap.exists()) {
    const initialWallet: UserWallet = {
      uid: currentUid,
      depositBalance: 0,
      winBalance: 0,
      bonusBalance: 20, // ₹20 Welcome bonus
      rewardPoints: 0,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(walletRef, initialWallet);
    walletSnap = await getDoc(walletRef);
  }

  const wallet = walletSnap.data() as UserWallet;
  const playable = (wallet.depositBalance || 0) + (wallet.winBalance || 0) + (wallet.bonusBalance || 0);
  if (playable < entryFee) {
    throw new Error(`Insufficient playable balance (₹${playable}). Required entry fee is ₹${entryFee}. Please deposit via WhatsApp.`);
  }

  // Deduct from depositBalance first, then bonusBalance (used when deposit is zero/insufficient), then winBalance
  const depositDeduct = Math.min(wallet.depositBalance || 0, entryFee);
  const remainingAfterDeposit = entryFee - depositDeduct;
  const bonusDeduct = Math.min(wallet.bonusBalance || 0, remainingAfterDeposit);
  const winDeduct = remainingAfterDeposit - bonusDeduct;

  // Check if user is already seated in an ongoing active playing match
  const activeGamesSnap = await getDocs(
    query(
      collection(db, 'games'),
      where('status', 'in', ['PLAYING', 'TOSS', 'DEAL'])
    )
  );
  for (const gDoc of activeGamesSnap.docs) {
    const gData = gDoc.data() as GameState;
    if (Array.isArray(gData.playerUids) && gData.playerUids.includes(currentUid)) {
      return gDoc.id; // Reconnect user to their live playing match
    }
  }

  // Look for an existing open waiting or countdown match with available seats (< 6)
  // CRITICAL: Filter out any stale rooms older than 90 seconds so ghost players are never matched!
  const q = query(
    collection(db, 'games'),
    where('mode', '==', mode),
    where('entryFee', '==', entryFee),
    where('status', 'in', ['WAITING', 'COUNTDOWN'])
  );
  const openSnap = await getDocs(q);

  let targetGameId: string | null = null;
  let myExistingWaitingGameId: string | null = null;
  const now = Date.now();

  for (const gDoc of openSnap.docs) {
    const gData = gDoc.data() as GameState;
    const isAlreadySeated = Array.isArray(gData.playerUids)
      ? gData.playerUids.includes(currentUid)
      : false;

    // Check freshness: table must have activity within last 90 seconds
    const lastActiveTime = new Date(gData.updatedAt || gData.createdAt || 0).getTime();
    const isFresh = now - lastActiveTime < 90000;

    if (isAlreadySeated) {
      myExistingWaitingGameId = gDoc.id;
    } else if (isFresh && (gData.playerCount || 0) < 6) {
      targetGameId = gDoc.id;
      break;
    }
  }

  // If user already has an active fresh waiting room for this mode & stake, reconnect without double charge
  if (!targetGameId && myExistingWaitingGameId) {
    return myExistingWaitingGameId;
  }

  if (targetGameId) {
    const gameId = targetGameId;
    await runTransaction(db, async (tx) => {
      // 1. ALL READS FIRST
      const gRef = doc(db, 'games', gameId);
      const gSnap = await tx.get(gRef);
      if (!gSnap.exists()) throw new Error('Match session expired.');
      const gData = gSnap.data() as GameState;

      const pRef = doc(db, 'games', gameId, 'players', currentUid);
      const existingPSnap = await tx.get(pRef);
      if (existingPSnap.exists()) {
        return; // Already seated in this match
      }

      if ((gData.playerCount || 0) >= 6 || (gData.status !== 'WAITING' && gData.status !== 'COUNTDOWN')) {
        throw new Error('Table was just filled. Please try matching again.');
      }

      const wSnap = await tx.get(walletRef);
      const wData = wSnap.exists() ? (wSnap.data() as UserWallet) : null;

      // 2. ALL WRITES AFTER
      const newCount = (gData.playerCount || 1) + 1;
      const newPlayer: GamePlayerState = {
        uid: currentUid,
        playerId: profile.playerId,
        displayName: profile.displayName,
        photoURL: profile.photoURL || '',
        seatIndex: gData.playerCount || 1,
        status: 'waiting',
        cardCount: 0,
        score: 0,
        connected: true,
        entryPaid: entryFee,
        deductionBreakdown: {
          depositDeduct,
          bonusDeduct,
          winDeduct,
          total: entryFee,
        },
        joinedAt: new Date().toISOString(),
      };
      tx.set(pRef, newPlayer);

      const existingUids = Array.isArray(gData.playerUids) ? gData.playerUids : [];
      const updates: Record<string, unknown> = {
        playerCount: newCount,
        playerUids: Array.from(new Set([...existingUids, currentUid])),
        updatedAt: new Date().toISOString(),
      };

      // 15-second countdown starts once at least 2 real players are seated
      if (newCount >= 2) {
        const countdownEndsAt = new Date(Date.now() + 15000).toISOString();
        updates.status = 'COUNTDOWN';
        updates.phase = 'COUNTDOWN';
        updates.countdownEndsAt = countdownEndsAt;
      }
      tx.update(gRef, updates);

      // Deduct wallet in transaction
      if (wData) {
        tx.update(walletRef, {
          depositBalance: Math.max(0, (wData.depositBalance || 0) - depositDeduct),
          bonusBalance: Math.max(0, (wData.bonusBalance || 0) - bonusDeduct),
          winBalance: Math.max(0, (wData.winBalance || 0) - winDeduct),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    const txRef = doc(collection(db, 'transactions'));
    await setDoc(txRef, {
      id: txRef.id,
      uid: currentUid,
      type: 'game_entry',
      amount: -entryFee,
      status: 'completed',
      description: `Match entry for ${mode.toUpperCase()} (₹${entryFee})`,
      referenceId: gameId,
      createdAt: new Date().toISOString(),
    });

    return gameId;
  } else {
    // Create new match session with honest waiting state
    const gameId = `match_${mode}_${entryFee}_${Date.now()}`;
    const gameRef = doc(db, 'games', gameId);
    const newGame: GameState = {
      gameId,
      tableId: `table_${mode}_${entryFee}`,
      mode,
      pointValue,
      entryFee,
      playerCount: 1,
      playerUids: [currentUid],
      status: 'WAITING',
      phase: 'WAITING',
      openDeck: [],
      closedDeckCount: 108,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const playerRef = doc(db, 'games', gameId, 'players', currentUid);
    const newPlayer: GamePlayerState = {
      uid: currentUid,
      playerId: profile.playerId,
      displayName: profile.displayName,
      photoURL: profile.photoURL || '',
      seatIndex: 0,
      status: 'waiting',
      cardCount: 0,
      score: 0,
      connected: true,
      entryPaid: entryFee,
      deductionBreakdown: {
        depositDeduct,
        bonusDeduct,
        winDeduct,
        total: entryFee,
      },
      joinedAt: new Date().toISOString(),
    };

    await setDoc(gameRef, newGame);
    await setDoc(playerRef, newPlayer);

    // Deduct wallet
    await updateDoc(walletRef, {
      depositBalance: Math.max(0, (wallet.depositBalance || 0) - depositDeduct),
      bonusBalance: Math.max(0, (wallet.bonusBalance || 0) - bonusDeduct),
      winBalance: Math.max(0, (wallet.winBalance || 0) - winDeduct),
      updatedAt: new Date().toISOString(),
    });

    const txRef = doc(collection(db, 'transactions'));
    await setDoc(txRef, {
      id: txRef.id,
      uid: currentUid,
      type: 'game_entry',
      amount: -entryFee,
      status: 'completed',
      description: `Match entry for ${mode.toUpperCase()} (₹${entryFee})`,
      referenceId: gameId,
      createdAt: new Date().toISOString(),
    });

    return gameId;
  }
}

/**
 * Cancel waiting matchmaking queue and refund entry fee
 */
export async function leaveMatchQueue(
  gameId: string,
  playerUid: string
): Promise<{ refunded: boolean; refundAmount: number }> {
  const gameRef = doc(db, 'games', gameId);
  const playerRef = doc(db, 'games', gameId, 'players', playerUid);
  const walletRef = doc(db, 'wallets', playerUid);

  let refundAmount = 0;
  let depositRefund = 0;
  let bonusRefund = 0;
  let winRefund = 0;

  await runTransaction(db, async (tx) => {
    // 1. ALL READS FIRST
    const gSnap = await tx.get(gameRef);
    if (!gSnap.exists()) return;
    const gData = gSnap.data() as GameState;

    if (gData.status !== 'WAITING' && gData.status !== 'COUNTDOWN') {
      throw new Error('Cannot cancel once match play has started.');
    }

    const pSnap = await tx.get(playerRef);
    if (!pSnap.exists()) return;

    const wSnap = await tx.get(walletRef);
    const wData = wSnap.exists() ? (wSnap.data() as UserWallet) : null;

    const pData = pSnap.data() as GamePlayerState;
    const breakdown = pData.deductionBreakdown;

    if (breakdown) {
      depositRefund = breakdown.depositDeduct || 0;
      bonusRefund = breakdown.bonusDeduct || 0;
      winRefund = breakdown.winDeduct || 0;
      refundAmount = breakdown.total || (depositRefund + bonusRefund + winRefund);
    } else {
      refundAmount = pData.entryPaid || gData.entryFee || 0;
      depositRefund = refundAmount;
    }

    // 2. ALL WRITES AFTER
    tx.delete(playerRef);

    const remaining = Math.max(0, (gData.playerCount || 1) - 1);
    const updates: Record<string, unknown> = {
      playerCount: remaining,
      playerUids: (gData.playerUids || []).filter((id) => id !== playerUid),
      updatedAt: new Date().toISOString(),
    };

    if (remaining === 0) {
      updates.status = 'COMPLETED';
      updates.phase = 'COMPLETED';
    } else if (remaining < 2) {
      // If fewer than two eligible players remain, cancel the countdown!
      updates.status = 'WAITING';
      updates.phase = 'WAITING';
      updates.countdownEndsAt = null;
    }
    tx.update(gameRef, updates);

    if (refundAmount > 0 && wData) {
      tx.update(walletRef, {
        depositBalance: (wData.depositBalance || 0) + depositRefund,
        bonusBalance: (wData.bonusBalance || 0) + bonusRefund,
        winBalance: (wData.winBalance || 0) + winRefund,
        updatedAt: new Date().toISOString(),
      });
    }
  });

  if (refundAmount > 0) {
    const txRef = doc(collection(db, 'transactions'));
    await setDoc(txRef, {
      id: txRef.id,
      uid: playerUid,
      type: 'refund',
      amount: refundAmount,
      status: 'completed',
      description: `Waiting time exit refund (₹${refundAmount})`,
      referenceId: gameId,
      createdAt: new Date().toISOString(),
    });
  }

  return { refunded: refundAmount > 0, refundAmount };
}

/**
 * Send real-time heartbeat to prove player is active and online
 */
export async function sendPlayerHeartbeat(gameId: string, playerUid: string): Promise<void> {
  try {
    const pRef = doc(db, 'games', gameId, 'players', playerUid);
    const gRef = doc(db, 'games', gameId);
    const nowIso = new Date().toISOString();
    await updateDoc(pRef, { lastSeen: nowIso, connected: true });
    await updateDoc(gRef, { updatedAt: nowIso });
  } catch {
    // ignore silent network blip
  }
}

/**
 * Legacy table seeder (retained safely)
 */
export async function seedTablesIfEmpty(): Promise<void> {
  if (!auth.currentUser) return;
  try {
    for (const t of INITIAL_TABLES) {
      const tableRef = doc(db, 'gameTables', t.tableId);
      const snap = await getDoc(tableRef);
      if (!snap.exists()) {
        const tableData: TableConfig = {
          ...t,
          currentPlayers: 0,
          status: 'open',
          createdAt: new Date().toISOString(),
        };
        await setDoc(tableRef, tableData);
      }
    }
  } catch (err) {
    console.warn('Note on tables:', err);
  }
}

/**
 * Join or create a match for a table with 2-6 players & 15-second countdown
 */
export async function joinTable(tableId: string, profile: UserProfile): Promise<string> {
  const tableRef = doc(db, 'gameTables', tableId);
  const walletRef = doc(db, 'wallets', profile.uid);

  return await runTransaction(db, async (tx) => {
    // 1. ALL READS FIRST
    const tableSnap = await tx.get(tableRef);
    if (!tableSnap.exists()) {
      throw new Error('Table does not exist.');
    }

    const tableData = tableSnap.data() as TableConfig;
    let gameId = tableData.activeGameId;

    let gameDocRef = gameId ? doc(db, 'games', gameId) : null;
    let gameData: GameState | null = null;

    if (gameDocRef) {
      const gSnap = await tx.get(gameDocRef);
      if (gSnap.exists()) {
        gameData = gSnap.data() as GameState;
      }
    }

    const walletSnap = await tx.get(walletRef);
    if (!walletSnap.exists()) {
      throw new Error('Wallet not found. Please refresh.');
    }
    const wallet = walletSnap.data() as UserWallet;

    // Check if player has sufficient balance for this table's entry fee
    const playable = (wallet.depositBalance || 0) + (wallet.winBalance || 0) + (wallet.bonusBalance || 0);
    if (playable < tableData.entryFee) {
      throw new Error(`Insufficient playable balance (₹${playable}). Required entry fee is ₹${tableData.entryFee}.`);
    }

    let playerDocRef = gameId ? doc(db, 'games', gameId, 'players', profile.uid) : null;
    let existingPlayerSnap = playerDocRef ? await tx.get(playerDocRef) : null;

    // Calculate wallet deduction breakdown (deposit first, then bonus credits if deposit is zero/insufficient, then win balance)
    const depositDeduct = Math.min(wallet.depositBalance || 0, tableData.entryFee);
    const remainingAfterDeposit = tableData.entryFee - depositDeduct;
    const bonusDeduct = Math.min(wallet.bonusBalance || 0, remainingAfterDeposit);
    const winDeduct = remainingAfterDeposit - bonusDeduct;

    // 2. ALL WRITES AFTER
    // If no active game or previous game is finished, create a new game session
    if (!gameId || !gameData || gameData.status === 'COMPLETED' || gameData.status === 'RESULT') {
      gameId = `game_${tableId}_${Date.now()}`;
      gameDocRef = doc(db, 'games', gameId);

      gameData = {
        gameId,
        tableId,
        mode: tableData.gameMode,
        pointValue: tableData.pointValue,
        entryFee: tableData.entryFee,
        playerCount: 1,
        playerUids: [profile.uid],
        status: 'WAITING',
        phase: 'WAITING',
        openDeck: [],
        closedDeckCount: 108,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      tx.set(gameDocRef, gameData);

      // Create first player
      const pDocRef = doc(db, 'games', gameId, 'players', profile.uid);
      const newPlayer: GamePlayerState = {
        uid: profile.uid,
        playerId: profile.playerId,
        displayName: profile.displayName,
        photoURL: profile.photoURL || '',
        seatIndex: 0,
        status: 'waiting',
        cardCount: 0,
        score: 0,
        connected: true,
        entryPaid: tableData.entryFee,
        deductionBreakdown: {
          depositDeduct,
          bonusDeduct,
          winDeduct,
          total: tableData.entryFee,
        },
        joinedAt: new Date().toISOString(),
      };
      tx.set(pDocRef, newPlayer);

      tx.update(tableRef, {
        activeGameId: gameId,
        currentPlayers: 1,
        status: 'open',
      });

      // Deduct wallet
      tx.update(walletRef, {
        depositBalance: Math.max(0, (wallet.depositBalance || 0) - depositDeduct),
        bonusBalance: Math.max(0, (wallet.bonusBalance || 0) - bonusDeduct),
        winBalance: Math.max(0, (wallet.winBalance || 0) - winDeduct),
        updatedAt: new Date().toISOString(),
      });

      return gameId;
    }

    // Existing active game session: check if user is already seated
    if (existingPlayerSnap && existingPlayerSnap.exists()) {
      // Re-joining already seated game
      return gameId;
    }

    // Check maximum players
    if (tableData.currentPlayers >= tableData.maxPlayers) {
      throw new Error('This table is already full (maximum capacity reached).');
    }

    // Check if room is already locked and playing
    if (gameData.status === 'PLAYING' || gameData.status === 'TOSS' || gameData.status === 'DEAL') {
      throw new Error('This match has already commenced. Please join the next open table.');
    }

    const newPlayerCount = tableData.currentPlayers + 1;
    const seatIndex = tableData.currentPlayers;

    const pDocRef = doc(db, 'games', gameId, 'players', profile.uid);
    const newPlayer: GamePlayerState = {
      uid: profile.uid,
      playerId: profile.playerId,
      displayName: profile.displayName,
      photoURL: profile.photoURL || '',
      seatIndex,
      status: 'waiting',
      cardCount: 0,
      score: 0,
      connected: true,
      entryPaid: tableData.entryFee,
      deductionBreakdown: {
        depositDeduct,
        bonusDeduct,
        winDeduct,
        total: tableData.entryFee,
      },
      joinedAt: new Date().toISOString(),
    };
    tx.set(pDocRef, newPlayer);

    const updatePayload: Record<string, unknown> = {
      currentPlayers: newPlayerCount,
    };

    const existingUids = Array.isArray(gameData.playerUids) ? gameData.playerUids : [];
    const gameUpdatePayload: Record<string, unknown> = {
      playerCount: newPlayerCount,
      playerUids: Array.from(new Set([...existingUids, profile.uid])),
      updatedAt: new Date().toISOString(),
    };

    // Countdown must begin at exactly 15s on 2nd player and restart to 15s on each additional player joining during open countdown
    if (newPlayerCount >= 2 && (gameData.status === 'WAITING' || gameData.status === 'COUNTDOWN')) {
      const now = Date.now();
      const countdownEndsAt = new Date(now + 15000).toISOString();
      updatePayload.status = 'countdown';
      updatePayload.countdownStartedAt = new Date(now).toISOString();
      updatePayload.countdownEndsAt = countdownEndsAt;

      gameUpdatePayload.status = 'COUNTDOWN';
      gameUpdatePayload.phase = 'COUNTDOWN';
      gameUpdatePayload.countdownEndsAt = countdownEndsAt;
    }

    // If max players reached, lock room to prevent 7th player
    if (newPlayerCount >= tableData.maxPlayers) {
      updatePayload.status = 'playing';
    }

    tx.update(tableRef, updatePayload);
    tx.update(doc(db, 'games', gameId), gameUpdatePayload);

    // Deduct wallet
    tx.update(walletRef, {
      depositBalance: Math.max(0, (wallet.depositBalance || 0) - depositDeduct),
      bonusBalance: Math.max(0, (wallet.bonusBalance || 0) - bonusDeduct),
      winBalance: Math.max(0, (wallet.winBalance || 0) - winDeduct),
      updatedAt: new Date().toISOString(),
    });

    return gameId;
  });
}

/**
 * Enqueue player for matchmaking with duplicate-queue prevention & atomic table matching
 */
export async function enqueuePlayer(tableId: string, profile: UserProfile): Promise<MatchmakingTicket> {
  const tableRef = doc(db, 'gameTables', tableId);
  const tableSnap = await getDoc(tableRef);
  if (!tableSnap.exists()) {
    throw new Error('Table does not exist.');
  }
  const tableData = tableSnap.data() as TableConfig;

  // 1. Prevent duplicate queue tickets for this user
  const queueCol = collection(db, 'matchmakingQueue');
  const existingQueueQuery = query(
    queueCol,
    where('uid', '==', profile.uid),
    where('status', '==', 'QUEUED')
  );
  const existingQueueSnap = await getDocs(existingQueueQuery);

  if (!existingQueueSnap.empty) {
    const existingTicket = existingQueueSnap.docs[0].data() as MatchmakingTicket;
    if (existingTicket.tableId === tableId) {
      return existingTicket;
    } else {
      await updateDoc(doc(db, 'matchmakingQueue', existingTicket.ticketId), {
        status: 'CANCELLED',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 2. Create the ticket atomically
  const ticketId = `ticket_${profile.uid}_${Date.now()}`;
  const ticketRef = doc(db, 'matchmakingQueue', ticketId);
  const newTicket: MatchmakingTicket = {
    ticketId,
    uid: profile.uid,
    playerId: profile.playerId,
    displayName: profile.displayName,
    photoURL: profile.photoURL || '',
    tableId,
    gameMode: tableData.gameMode,
    entryFee: tableData.entryFee,
    pointValue: tableData.pointValue,
    maxPlayers: tableData.maxPlayers,
    status: 'QUEUED',
    gameId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(ticketRef, newTicket);

  // 3. Atomically match into room / table
  try {
    const gameId = await joinTable(tableId, profile);
    await updateDoc(ticketRef, {
      status: 'MATCHED',
      gameId,
      updatedAt: new Date().toISOString(),
    });
    newTicket.status = 'MATCHED';
    newTicket.gameId = gameId;
  } catch (err) {
    await updateDoc(ticketRef, {
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    });
    throw err;
  }

  return newTicket;
}

/**
 * Cancel queue ticket atomically
 */
export async function cancelMatchmakingQueue(ticketId: string, uid: string): Promise<void> {
  const ticketRef = doc(db, 'matchmakingQueue', ticketId);
  const snap = await getDoc(ticketRef);
  if (snap.exists() && snap.data().uid === uid) {
    await updateDoc(ticketRef, {
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Trusted atomic seat release & countdown cancellation when player leaves table
 */
export async function leaveTable(
  gameId: string,
  tableId: string,
  uid: string
): Promise<{ refunded: boolean; refundAmount: number }> {
  const gameRef = doc(db, 'games', gameId);
  const tableRef = doc(db, 'gameTables', tableId);
  const playerRef = doc(db, 'games', gameId, 'players', uid);
  const walletRef = doc(db, 'wallets', uid);

  let refundAmount = 0;
  let depositRefund = 0;
  let winRefund = 0;

  await runTransaction(db, async (tx) => {
    // 1. ALL READS FIRST
    const gameSnap = await tx.get(gameRef);
    const tableSnap = await tx.get(tableRef);
    const playerSnap = await tx.get(playerRef);
    const walletSnap = await tx.get(walletRef);

    if (!gameSnap.exists() || !playerSnap.exists()) {
      return;
    }

    const gameData = gameSnap.data() as GameState;
    const tableData = tableSnap.exists() ? (tableSnap.data() as TableConfig) : null;
    const playerData = playerSnap.data() as GamePlayerState;

    // If game has already commenced, player drop should be handled by dropGame
    if (gameData.status === 'PLAYING') {
      return;
    }

    // Determine refund breakdown if exiting in WAITING or COUNTDOWN
    const breakdown = playerData.deductionBreakdown;
    if (breakdown) {
      depositRefund = breakdown.depositDeduct || 0;
      winRefund = breakdown.winDeduct || 0;
      refundAmount = breakdown.total || (depositRefund + winRefund);
    } else {
      refundAmount = playerData.entryPaid || gameData.entryFee || 0;
      depositRefund = refundAmount;
    }

    // 2. ALL WRITES AFTER
    // WAITING or COUNTDOWN: Release seat atomically
    tx.delete(playerRef);

    const newGameCount = Math.max(0, (gameData.playerCount || 1) - 1);
    const newTableCount = tableData ? Math.max(0, (tableData.currentPlayers || 1) - 1) : 0;

    const gameUpdates: Record<string, unknown> = {
      playerCount: newGameCount,
      playerUids: (gameData.playerUids || []).filter((id) => id !== uid),
      updatedAt: new Date().toISOString(),
    };

    const tableUpdates: Record<string, unknown> = {
      currentPlayers: newTableCount,
    };

    // If active players drop below 2, CANCEL 15-second countdown!
    if (newGameCount < 2) {
      if (gameData.status === 'COUNTDOWN') {
        gameUpdates.status = 'WAITING';
        gameUpdates.phase = 'WAITING';
        gameUpdates.countdownEndsAt = null;
      }
      if (tableData && tableData.status === 'countdown') {
        tableUpdates.status = 'open';
        tableUpdates.countdownEndsAt = null;
        tableUpdates.countdownStartedAt = null;
      }
    }

    // If all players left, reset table
    if (newGameCount <= 0) {
      gameUpdates.status = 'COMPLETED';
      gameUpdates.phase = 'COMPLETED';
      if (tableData) {
        tableUpdates.status = 'open';
        tableUpdates.activeGameId = null;
        tableUpdates.currentPlayers = 0;
      }
    } else if (newTableCount < (tableData?.maxPlayers || 6)) {
      if (tableData?.status === 'playing' && gameData.status === 'WAITING') {
        tableUpdates.status = 'open';
      }
    }

    tx.update(gameRef, gameUpdates);
    if (tableSnap.exists()) {
      tx.update(tableRef, tableUpdates);
    }

    // Restore wallet balance on exit during waiting/countdown
    if (refundAmount > 0 && walletSnap.exists()) {
      const wData = walletSnap.data() as UserWallet;
      tx.update(walletRef, {
        depositBalance: (wData.depositBalance || 0) + depositRefund,
        winBalance: (wData.winBalance || 0) + winRefund,
        updatedAt: new Date().toISOString(),
      });
    }
  });

  if (refundAmount > 0) {
    const txRef = doc(collection(db, 'transactions'));
    await setDoc(txRef, {
      id: txRef.id,
      uid,
      type: 'refund',
      amount: refundAmount,
      status: 'completed',
      description: `Waiting time table exit refund (₹${refundAmount})`,
      referenceId: gameId,
      createdAt: new Date().toISOString(),
    });
  }

  return { refunded: refundAmount > 0, refundAmount };
}

/**
 * Starts match by running Toss -> Dealing 13 cards -> Setting Wild Joker & First Turn
 */
export async function startMatch(gameId: string): Promise<void> {
  const gameRef = doc(db, 'games', gameId);
  const playersRef = collection(db, 'games', gameId, 'players');

  const playersSnap = await getDocs(playersRef);
  const playersList = playersSnap.docs.map((d) => d.data() as GamePlayerState);

  if (playersList.length < 2) {
    return; // Need at least 2 players
  }

  await runTransaction(db, async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) return;
    const gameData = gameSnap.data() as GameState;

    if (gameData.status === 'PLAYING' || gameData.status === 'TOSS') {
      return; // Already started
    }

    // 1. Toss phase: Deal 1 card to each player to determine Dealer
    // Ranking: A > K > Q > J > 10 > ... > 2
    let deck = shuffleDeck(create108Deck());

    // Give each player a non-joker toss card
    let highestVal = -1;
    let dealerUid = playersList[0].uid;

    for (const player of playersList) {
      // Find a toss card that is not a joker
      let tossCard = deck.pop()!;
      while (tossCard.isPrintedJoker || tossCard.rank === 'JOKER') {
        tossCard = deck.pop()!;
      }
      const val = TOSS_RANK_VALUE[tossCard.rank] || 0;
      if (val > highestVal) {
        highestVal = val;
        dealerUid = player.uid;
      }
      const pRef = doc(db, 'games', gameId, 'players', player.uid);
      tx.update(pRef, { tossCard });
    }

    // 2. Select Wild Joker (random card from deck)
    let wildJokerCard = deck.pop()!;
    while (wildJokerCard.isPrintedJoker || wildJokerCard.rank === 'JOKER') {
      wildJokerCard = deck.pop()!;
    }
    const wildJokerRank = wildJokerCard.rank;

    // 3. Deal 13 cards to each seated player
    for (const player of playersList) {
      const hand: Card[] = [];
      for (let i = 0; i < 13; i++) {
        hand.push(deck.pop()!);
      }
      const pRef = doc(db, 'games', gameId, 'players', player.uid);
      tx.update(pRef, {
        cards: hand,
        cardCount: 13,
        status: 'playing',
        isDealer: player.uid === dealerUid,
      });
    }

    // 4. Open first card for discard pile
    let openCard = deck.pop()!;
    while (openCard.isPrintedJoker || openCard.rank === 'JOKER') {
      openCard = deck.pop()!;
    }

    // Find who starts: Player immediately to the left (clockwise) of dealer
    const dealerIndex = playersList.findIndex((p) => p.uid === dealerUid);
    const startingPlayerIndex = (dealerIndex + 1) % playersList.length;
    const startingPlayerUid = playersList[startingPlayerIndex].uid;

    const turnStartedAt = Date.now();
    // Rule #45: 60s base timer + 5s extension + 5s extension
    const turnDeadline = turnStartedAt + 60000;

    tx.update(gameRef, {
      status: 'PLAYING',
      phase: 'PLAYING',
      dealerUid,
      wildJoker: wildJokerCard,
      openDeck: [openCard],
      closedDeckCount: deck.length,
      turnUid: startingPlayerUid,
      turnStartedAt,
      turnDeadline,
      turnExtensionCount: 0,
      hasDrawn: false,
      updatedAt: new Date().toISOString(),
    });

    // Store remaining deck privately inside game's secret deck doc
    const secretDeckRef = doc(db, 'games', gameId, 'internal', 'deck');
    tx.set(secretDeckRef, { closedDeck: deck });
  });
}

/**
 * Draw a card: from either Open Deck or Closed Deck
 */
export async function drawCard(gameId: string, playerUid: string, source: 'open' | 'closed'): Promise<void> {
  const gameRef = doc(db, 'games', gameId);
  const playerRef = doc(db, 'games', gameId, 'players', playerUid);
  const secretDeckRef = doc(db, 'games', gameId, 'internal', 'deck');

  await runTransaction(db, async (tx) => {
    // 1. ALL READS FIRST
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) throw new Error('Game not found.');
    const gameData = gameSnap.data() as GameState;

    if (gameData.status !== 'PLAYING') throw new Error('Game is not active.');
    if (gameData.turnUid !== playerUid) throw new Error("It is not your turn to draw.");
    if (gameData.hasDrawn) throw new Error('You have already drawn a card for this turn.');

    const playerSnap = await tx.get(playerRef);
    if (!playerSnap.exists()) throw new Error('Player not found.');
    const playerData = playerSnap.data() as GamePlayerState;

    const deckSnap = source === 'closed' ? await tx.get(secretDeckRef) : null;

    // 2. ALL WRITES AFTER
    let drawnCard: Card | null = null;

    if (source === 'open') {
      if (!gameData.openDeck || gameData.openDeck.length === 0) throw new Error('Open discard pile is empty.');
      const newOpenDeck = [...gameData.openDeck];
      drawnCard = newOpenDeck.pop() || null;
      if (!drawnCard) throw new Error('Could not draw from discard pile.');

      tx.update(gameRef, {
        openDeck: newOpenDeck,
        hasDrawn: true,
        updatedAt: new Date().toISOString(),
      });
    } else {
      let closedDeck: Card[] = [];
      if (deckSnap && deckSnap.exists()) {
        const deckData = deckSnap.data() as { closedDeck: Card[] };
        closedDeck = [...(deckData.closedDeck || [])];
      }

      if (closedDeck.length === 0) {
        // Reshuffle open deck if available or generate fresh shuffled deck
        if (gameData.openDeck && gameData.openDeck.length > 1) {
          closedDeck = shuffleDeck([...gameData.openDeck.slice(0, -1)]);
        } else {
          closedDeck = shuffleDeck(create108Deck());
        }
      }

      drawnCard = closedDeck.pop() || null;
      if (!drawnCard) {
        // Fallback safety card
        drawnCard = shuffleDeck(create108Deck()).pop()!;
      }

      tx.set(secretDeckRef, { closedDeck }, { merge: true });
      tx.update(gameRef, {
        closedDeckCount: closedDeck.length,
        hasDrawn: true,
        updatedAt: new Date().toISOString(),
      });
    }

    const currentHand = playerData.cards || [];
    const updatedHand = [...currentHand, drawnCard];

    tx.update(playerRef, {
      cards: updatedHand,
      cardCount: updatedHand.length,
    });
  });
}

/**
 * Discard a card to end turn
 */
export async function discardCard(gameId: string, playerUid: string, cardToDiscard: Card): Promise<void> {
  const gameRef = doc(db, 'games', gameId);
  const playerRef = doc(db, 'games', gameId, 'players', playerUid);
  const playersRef = collection(db, 'games', gameId, 'players');

  const playersSnap = await getDocs(playersRef);
  const allPlayers = playersSnap.docs.map((d) => d.data() as GamePlayerState);

  await runTransaction(db, async (tx) => {
    // 1. ALL READS FIRST
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) throw new Error('Game not found.');
    const gameData = gameSnap.data() as GameState;

    if (gameData.status !== 'PLAYING') throw new Error('Game is not in playing state.');
    if (gameData.turnUid !== playerUid) throw new Error("It is not your turn to discard.");
    if (!gameData.hasDrawn) throw new Error('You must draw a card before discarding.');

    const playerSnap = await tx.get(playerRef);
    if (!playerSnap.exists()) throw new Error('Player not found.');
    const playerData = playerSnap.data() as GamePlayerState;

    const currentHand = playerData.cards || [];
    let cardIdx = currentHand.findIndex((c) => c.id === cardToDiscard.id);
    if (cardIdx === -1) {
      cardIdx = currentHand.findIndex((c) => c.suit === cardToDiscard.suit && c.rank === cardToDiscard.rank);
    }
    if (cardIdx === -1) cardIdx = currentHand.length - 1; // Graceful fallback

    const updatedHand = [...currentHand];
    const discardedCards = updatedHand.splice(cardIdx, 1);
    const discarded = discardedCards[0] || cardToDiscard;

    const activePlayers = allPlayers
      .filter((p) => p.status === 'playing' || p.status === 'waiting')
      .sort((a, b) => a.seatIndex - b.seatIndex);

    const currentIndex = activePlayers.findIndex((p) => p.uid === playerUid);
    const nextPlayerIndex = currentIndex >= 0 ? (currentIndex + 1) % activePlayers.length : 0;
    const nextPlayerUid = activePlayers.length > 0 ? activePlayers[nextPlayerIndex]?.uid || playerUid : playerUid;

    const now = Date.now();
    const nextDeadline = now + 60000; // 60s base turn timer

    const updatedOpenDeck = [...(gameData.openDeck || []), discarded];

    // 2. ALL WRITES AFTER
    tx.update(playerRef, {
      cards: updatedHand,
      cardCount: updatedHand.length,
    });

    tx.update(gameRef, {
      openDeck: updatedOpenDeck,
      turnUid: nextPlayerUid,
      turnStartedAt: now,
      turnDeadline: nextDeadline,
      turnExtensionCount: 0,
      hasDrawn: false,
      updatedAt: new Date().toISOString(),
    });
  });
}

/**
 * Start instant practice match against a bot AI opponent
 */
export async function startPracticeBotMatch(
  gameId: string,
  userUid: string,
  profile?: UserProfile | null
): Promise<void> {
  const gameRef = doc(db, 'games', gameId);
  const botUid = `bot_${Date.now()}`;
  const botPlayerRef = doc(db, 'games', gameId, 'players', botUid);
  const userPlayerRef = doc(db, 'games', gameId, 'players', userUid);

  const botNames = ['Karan_Pro', 'Rahul_Ace', 'Vikram_Rummy', 'Priya_Master', 'Aman_Champ'];
  const botName = botNames[Math.floor(Math.random() * botNames.length)];

  // Ensure user player doc exists
  const userPlayerSnap = await getDoc(userPlayerRef);
  if (!userPlayerSnap.exists()) {
    const newUserPlayer: GamePlayerState = {
      uid: userUid,
      playerId: profile?.playerId || 'PLAYER-1',
      displayName: profile?.displayName || 'Royal Player',
      photoURL: profile?.photoURL || '',
      seatIndex: 0,
      status: 'waiting',
      cardCount: 0,
      score: 0,
      connected: true,
      entryPaid: 0,
      joinedAt: new Date().toISOString(),
    };
    await setDoc(userPlayerRef, newUserPlayer);
  }

  const botPlayer: GamePlayerState = {
    uid: botUid,
    playerId: `BOT-${Math.floor(1000 + Math.random() * 9000)}`,
    displayName: `${botName} (AI)`,
    photoURL: '',
    seatIndex: 1,
    status: 'waiting',
    cardCount: 0,
    score: 0,
    connected: true,
    entryPaid: 0,
    isBot: true,
    joinedAt: new Date().toISOString(),
  };

  await setDoc(botPlayerRef, botPlayer);

  await updateDoc(gameRef, {
    playerCount: 2,
    playerUids: [userUid, botUid],
    status: 'COUNTDOWN',
    phase: 'COUNTDOWN',
    countdownEndsAt: new Date(Date.now() + 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Deal and commence cards
  setTimeout(async () => {
    try {
      await startMatch(gameId);
    } catch (e) {
      console.warn('Practice match start:', e);
    }
  }, 1200);
}

/**
 * Automated turn for Practice Bot
 */
export async function playBotTurn(gameId: string, botUid: string): Promise<void> {
  const gameRef = doc(db, 'games', gameId);
  const botRef = doc(db, 'games', gameId, 'players', botUid);

  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) return;
  const gameData = gameSnap.data() as GameState;

  if (gameData.status !== 'PLAYING' || gameData.turnUid !== botUid) return;

  const botSnap = await getDoc(botRef);
  if (!botSnap.exists()) return;
  const botData = botSnap.data() as GamePlayerState;

  // 1. Draw card if bot hasn't drawn
  if (!gameData.hasDrawn) {
    const drawSource = gameData.openDeck && gameData.openDeck.length > 0 && Math.random() < 0.25 ? 'open' : 'closed';
    try {
      await drawCard(gameId, botUid, drawSource);
    } catch {
      await drawCard(gameId, botUid, 'closed');
    }
  }

  // Brief thinking pause
  await new Promise((r) => setTimeout(r, 800));

  // 2. Fetch updated bot cards and discard
  const updatedBotSnap = await getDoc(botRef);
  if (!updatedBotSnap.exists()) return;
  const cards = updatedBotSnap.data().cards as Card[];
  if (!cards || cards.length === 0) return;

  const wildJokerRank = gameData.wildJoker?.rank;
  const nonJokers = cards.filter((c) => !c.isPrintedJoker && c.rank !== 'JOKER' && c.rank !== wildJokerRank);
  const cardToDiscard = nonJokers.length > 0 ? nonJokers[Math.floor(Math.random() * nonJokers.length)] : cards[0];

  try {
    await discardCard(gameId, botUid, cardToDiscard);
  } catch (e) {
    console.warn('Bot discard:', e);
  }
}

/**
 * Handle turn timeout with 60s -> 5s -> 5s -> Auto Drop
 */
export async function handleTurnTimeout(gameId: string, currentTurnUid: string): Promise<void> {
  const gameRef = doc(db, 'games', gameId);
  const playerRef = doc(db, 'games', gameId, 'players', currentTurnUid);
  const playersRef = collection(db, 'games', gameId, 'players');

  const pSnap = await getDocs(playersRef);
  const allPlayers = pSnap.docs.map((d) => d.data() as GamePlayerState);

  await runTransaction(db, async (tx) => {
    // 1. ALL READS FIRST
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) return;
    const game = gameSnap.data() as GameState;

    if (game.status !== 'PLAYING' || game.turnUid !== currentTurnUid) return;

    const extCount = game.turnExtensionCount || 0;
    const now = Date.now();

    // 2. ALL WRITES AFTER
    if (extCount < 2) {
      // Add 5 seconds extension
      tx.update(gameRef, {
        turnDeadline: now + 5000,
        turnExtensionCount: extCount + 1,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Auto-drop the player!
      tx.update(playerRef, {
        status: 'dropped',
        score: 40, // 40 points middle/auto-drop penalty
      });

      // Pass turn to next player
      const remainingActive = allPlayers
        .filter((p) => p.uid !== currentTurnUid && p.status === 'playing')
        .sort((a, b) => a.seatIndex - b.seatIndex);

      if (remainingActive.length <= 1) {
        // Last player remaining wins!
        const winner = remainingActive[0];
        if (winner) {
          tx.update(gameRef, {
            status: 'RESULT',
            phase: 'RESULT',
            winnerUid: winner.uid,
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        const nextUid = remainingActive[0].uid;
        tx.update(gameRef, {
          turnUid: nextUid,
          turnStartedAt: now,
          turnDeadline: now + 60000,
          turnExtensionCount: 0,
          hasDrawn: false,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  });
}

/**
 * Manual Player Drop (First drop = 20 pts, Middle drop = 40 pts)
 */
export async function dropGame(gameId: string, playerUid: string): Promise<void> {
  const gameRef = doc(db, 'games', gameId);
  const playerRef = doc(db, 'games', gameId, 'players', playerUid);
  const playersRef = collection(db, 'games', gameId, 'players');

  const pSnap = await getDocs(playersRef);
  const allPlayers = pSnap.docs.map((d) => d.data() as GamePlayerState);

  await runTransaction(db, async (tx) => {
    // 1. ALL READS FIRST
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists()) return;
    const game = gameSnap.data() as GameState;

    const playerSnap = await tx.get(playerRef);
    if (!playerSnap.exists()) return;

    // Penalty: First Drop = 20 pts, Middle Drop = 40 pts
    const penalty = game.openDeck.length <= 1 ? 20 : 40;

    // 2. ALL WRITES AFTER
    tx.update(playerRef, {
      status: 'dropped',
      score: penalty,
      dropPenalty: penalty,
    });

    const remainingActive = allPlayers
      .filter((p) => p.uid !== playerUid && p.status === 'playing')
      .sort((a, b) => a.seatIndex - b.seatIndex);

    if (remainingActive.length <= 1) {
      const winner = remainingActive[0];
      if (winner) {
        tx.update(gameRef, {
          status: 'RESULT',
          phase: 'RESULT',
          winnerUid: winner.uid,
          updatedAt: new Date().toISOString(),
        });
      }
    } else if (game.turnUid === playerUid) {
      const nextUid = remainingActive[0].uid;
      const now = Date.now();
      tx.update(gameRef, {
        turnUid: nextUid,
        turnStartedAt: now,
        turnDeadline: now + 60000,
        turnExtensionCount: 0,
        hasDrawn: false,
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

/**
 * Declare Hand with server validation
 */
export async function declareHand(
  gameId: string,
  playerUid: string,
  cardGroups: Card[][]
): Promise<{ isValid: boolean; message: string; penaltyScore: number }> {
  const gameRef = doc(db, 'games', gameId);
  const playerRef = doc(db, 'games', gameId, 'players', playerUid);
  const playersRef = collection(db, 'games', gameId, 'players');

  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) throw new Error('Game not found.');
  const game = gameSnap.data() as GameState;

  const wildJokerRank = game.wildJoker?.rank;
  const validation = validateDeclaration(cardGroups, wildJokerRank);

  if (validation.isValid) {
    // Valid Declaration! Declare winner and calculate scores
    const playersSnap = await getDocs(playersRef);
    const allPlayers = playersSnap.docs.map((d) => d.data() as GamePlayerState);

    const scores: Record<string, number> = {};
    const penalties: Record<string, string> = {};
    const payouts: Record<string, number> = {};

    let totalPointsLost = 0;

    for (const p of allPlayers) {
      if (p.uid === playerUid) {
        scores[p.uid] = 0;
        penalties[p.uid] = 'Winner';
      } else if (p.status === 'dropped') {
        const dropPts = p.score || 20;
        scores[p.uid] = dropPts;
        penalties[p.uid] = `Dropped (${dropPts} pts)`;
        totalPointsLost += dropPts;
      } else {
        const lossPts = calculateLossPoints(p.cards || [], wildJokerRank);
        scores[p.uid] = lossPts;
        penalties[p.uid] = `${lossPts} pts loss`;
        totalPointsLost += lossPts;
      }
    }

    // Gross winnings calculation
    const grossWin = totalPointsLost * game.pointValue;
    // No commission deducted at match table ("yha pr nhi katenge - withdrawal mai platform fee lagegi")
    const adminShare = 0;
    // Exactly 100% gross winnings credited to winner wallet
    const playerNetShare = grossWin;
    payouts[playerUid] = playerNetShare;

    await updateDoc(gameRef, {
      status: 'RESULT',
      phase: 'RESULT',
      winnerUid: playerUid,
      resultData: {
        winnerUid: playerUid,
        scores,
        penalties,
        grossWin,
        adminShare,
        playerNetShare,
        payouts,
        settlementStatus: 'pending_server_verification',
        completedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    await updateDoc(playerRef, {
      status: 'declared',
      score: 0,
    });

    // Credit winner's wallet winBalance directly
    if (playerNetShare > 0) {
      try {
        const winnerWalletRef = doc(db, 'wallets', playerUid);
        const wSnap = await getDoc(winnerWalletRef);
        if (wSnap.exists()) {
          const curWin = wSnap.data().winBalance || 0;
          await updateDoc(winnerWalletRef, {
            winBalance: curWin + playerNetShare,
            updatedAt: new Date().toISOString(),
          });
        }
        const winTxRef = doc(collection(db, 'transactions'));
        await setDoc(winTxRef, {
          id: winTxRef.id,
          uid: playerUid,
          type: 'game_win',
          amount: playerNetShare,
          status: 'completed',
          description: `Winnings for ${game.mode.toUpperCase()} match #${gameId.slice(-6)}`,
          referenceId: gameId,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error crediting winner wallet:', err);
      }
    }

    return validation;
  } else {
    // Requirement #50: Invalid Declaration Penalty: EXACTLY 80 POINTS
    await updateDoc(playerRef, {
      score: 80,
      dropPenalty: 80,
      status: 'dropped',
    });

    return validation;
  }
}
