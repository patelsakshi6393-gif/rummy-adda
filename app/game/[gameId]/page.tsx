'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { PlayingCard } from '@/components/PlayingCard';
import { soundManager } from '@/lib/sound';
import {
  Card,
  GameState,
  GamePlayerState,
  TableConfig,
} from '@/lib/types';
import {
  startMatch,
  drawCard,
  discardCard,
  handleTurnTimeout,
  dropGame,
  declareHand,
  leaveMatchQueue,
  leaveTable,
  sendPlayerHeartbeat,
  startPracticeBotMatch,
  playBotTurn,
  calculateDropPenalty,
} from '@/lib/game-service';
import {
  isPureSequence,
  isImpureSequence,
  isValidSet,
  getGroupMeldStatus,
  GroupMeldStatus,
  calculateLossPoints,
  findBestMelds,
  validateDeclaration,
} from '@/lib/rummy-engine';
import {
  doc,
  collection,
  onSnapshot,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import confetti from 'canvas-confetti';
import {
  Loader2,
  Users,
  Clock,
  RotateCcw,
  RotateCw,
  Maximize2,
  Volume2,
  VolumeX,
  AlertCircle,
  Trophy,
  ArrowLeft,
  ShieldAlert,
  Sparkles,
  X,
  Copy,
  Check,
  Share2,
  BookOpen,
  HelpCircle,
  Smartphone,
  Bot,
} from 'lucide-react';
import { HowToPlayModal } from '@/components/HowToPlayModal';

export default function GameRoomPage() {
  const params = useParams();
  const gameId = params?.gameId as string;
  const router = useRouter();
  const { user, profile } = useAuth();

  const [game, setGame] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<GamePlayerState[]>([]);
  const [myPlayer, setMyPlayer] = useState<GamePlayerState | null>(null);
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const wildJokerRank = game?.wildJoker?.rank;
  // Multiple card selection & grouping for Sets
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const selectedCardId = selectedCardIds[0] || null;
  const setSelectedCardId = (id: string | null) => setSelectedCardIds(id ? [id] : []);
  const [handGroups, setHandGroups] = useState<Card[][]>([]);
  const [draggedCardInfo, setDraggedCardInfo] = useState<{
    cardId: string;
    fromGroupIdx: number;
    fromCardIdx: number;
  } | null>(null);
  const [dragOverGroupIdx, setDragOverGroupIdx] = useState<number | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const [touchDragCard, setTouchDragCard] = useState<{
    cardId: string;
    fromGroupIdx: number;
    fromCardIdx: number;
  } | null>(null);

  // Time remaining on active turn (seconds)
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(45);
  const [countdownLeft, setCountdownLeft] = useState<number>(15);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [showDropModal, setShowDropModal] = useState(false);
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [showHowToPlayModal, setShowHowToPlayModal] = useState(false);
  const [declareGroups, setDeclareGroups] = useState<Card[][]>([[], [], [], []]);
  const [declareFinishCard, setDeclareFinishCard] = useState<Card | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Reconnection & sync
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [leavingQueue, setLeavingQueue] = useState(false);

  // Reference to prevent firing turn timeout repeatedly
  const timeoutHandledRef = useRef(false);
  const isBotExecutingRef = useRef(false);

  // Device orientation state for mobile/tablet responsive layout
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window !== 'undefined') {
        setIsPortrait(window.innerHeight > window.innerWidth && window.innerWidth < 850);
      }
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Auto-rotate: Attempt automatic screen orientation locking when entering game
  useEffect(() => {
    const attemptAutoRotate = async () => {
      try {
        if (typeof window !== 'undefined' && 'screen' in window && window.screen.orientation) {
          const orientation = window.screen.orientation as any;
          if (typeof orientation.lock === 'function') {
            await orientation.lock('landscape');
          }
        }
      } catch {
        // Silently handled if browser policy requires user gesture
      }
    };
    attemptAutoRotate();
  }, []);

  const handleToggleAutoRotate = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (window.screen?.orientation && 'lock' in window.screen.orientation) {
        await (window.screen.orientation as any).lock('landscape');
      }
    } catch (e) {
      console.warn('Orientation lock attempt:', e);
    }
  };

  // Automated bot turn execution when playing practice match
  useEffect(() => {
    if (!game || game.status !== 'PLAYING' || !game.turnUid) return;
    const isBotTurn = game.turnUid.startsWith('bot_') || Boolean(players.find((p) => p.uid === game.turnUid)?.isBot);
    if (isBotTurn) {
      if (isBotExecutingRef.current) return;
      isBotExecutingRef.current = true;
      const timer = setTimeout(async () => {
        try {
          soundManager.playCardDraw();
          await playBotTurn(game.gameId, game.turnUid!);
          soundManager.playCardDiscard();
        } catch (e) {
          console.warn('Bot turn play error:', e);
        } finally {
          isBotExecutingRef.current = false;
        }
      }, 1000);
      return () => {
        clearTimeout(timer);
        isBotExecutingRef.current = false;
      };
    }
  }, [game?.turnUid, game?.status, game?.gameId, players]);

  // 1. Send player heartbeat every 10 seconds to keep room alive
  useEffect(() => {
    if (!gameId || !user) return;
    sendPlayerHeartbeat(gameId, user.uid);
    const interval = setInterval(() => {
      sendPlayerHeartbeat(gameId, user.uid);
    }, 10000);
    return () => clearInterval(interval);
  }, [gameId, user]);

  const handleCopyInvite = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleLeaveQueue = async () => {
    if (!user || !gameId) return;
    setLeavingQueue(true);
    try {
      await leaveMatchQueue(gameId, user.uid);
      router.push('/lobby');
    } catch (err) {
      console.error(err);
      setErrorToast('Could not leave queue. Please refresh.');
      setLeavingQueue(false);
    }
  };

  // 2. Real-time listener for Game doc
  useEffect(() => {
    if (!gameId) return;
    const gameRef = doc(db, 'games', gameId);
    const unsub = onSnapshot(
      gameRef,
      (snap) => {
        if (snap.exists()) {
          setGame(snap.data() as GameState);
          setIsReconnecting(false);
        }
      },
      () => {
        setIsReconnecting(true);
      }
    );
    return () => unsub();
  }, [gameId]);

  // 3. Real-time listener for Players subcollection
  useEffect(() => {
    if (!gameId || !user) return;
    const playersRef = collection(db, 'games', gameId, 'players');
    const unsub = onSnapshot(
      playersRef,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as GamePlayerState);
        list.sort((a, b) => a.seatIndex - b.seatIndex);
        setPlayers(list);

        const me = list.find((p) => p.uid === user.uid) || null;
        setMyPlayer(me);
        setPlayersLoaded(true);
      },
      (err) => {
        console.warn('Game players listener:', err);
        setPlayersLoaded(true);
      }
    );
    return () => unsub();
  }, [gameId, user]);

  // 4. 15-second countdown timer handler
  useEffect(() => {
    if (!game || !myPlayer) return;

    if (game.status === 'COUNTDOWN' && game.phase === 'COUNTDOWN') {
      const calculateTimeLeft = () => {
        if (game.countdownEndsAt) {
          const endsAt = new Date(game.countdownEndsAt).getTime();
          const now = Date.now();
          return Math.max(0, Math.ceil((endsAt - now) / 1000));
        }
        return 15;
      };

      const interval = setInterval(async () => {
        const diff = calculateTimeLeft();
        setCountdownLeft(diff);

        if (diff <= 0) {
          clearInterval(interval);
          try {
            await startMatch(game.gameId);
          } catch (err) {
            console.error('Error starting match after countdown:', err);
          }
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [game, myPlayer]);

  // 5. Turn timer clock (45s base turn timer)
  useEffect(() => {
    if (!game || game.status !== 'PLAYING' || !game.turnDeadline) return;

    timeoutHandledRef.current = false;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((game.turnDeadline! - now) / 1000));
      setTurnTimeLeft(diff);

      if (diff === 10) {
        soundManager.playCountdownTick();
      }

      if (diff <= 0 && !timeoutHandledRef.current) {
        timeoutHandledRef.current = true;
        clearInterval(interval);
        handleTurnTimeout(game.gameId, game.turnUid || '');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game]);

  // 6. Turn notification chime
  useEffect(() => {
    if (game?.status === 'PLAYING' && game.turnUid === user?.uid) {
      soundManager.playTurnNotification();
    }
  }, [game?.turnUid, game?.status, user?.uid]);

  // 7. Fanfare and confetti on match victory
  useEffect(() => {
    if (game?.status === 'RESULT' && game.resultData) {
      soundManager.playWinFanfare();
      if (game.winnerUid === user?.uid) {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 },
        });
      }
    }
  }, [game?.status, game?.resultData, game?.winnerUid, user?.uid]);

  // Synchronize player hand groups when myPlayer?.cards updates
  useEffect(() => {
    if (!myPlayer?.cards || myPlayer.cards.length === 0) {
      setHandGroups([]);
      return;
    }

    const currentCards = myPlayer.cards;
    const flatCurrent = handGroups.flat();
    const currentIds = new Set(currentCards.map((c) => c.id));
    const flatIds = new Set(flatCurrent.map((c) => c.id));

    const needsSync =
      currentCards.length !== flatCurrent.length ||
      currentCards.some((c) => !flatIds.has(c.id));

    if (needsSync) {
      if (handGroups.length === 0) {
        // "sab ek hi group mai honge set ban jane ke baad wo uss group se alag ho jayenge"
        // Initially keep all cards together in 1 single group
        setHandGroups([currentCards]);
      } else {
        const pruned = handGroups
          .map((grp) => grp.filter((c) => currentIds.has(c.id)))
          .filter((grp) => grp.length > 0);

        const prunedIds = new Set(pruned.flat().map((c) => c.id));
        const newDrawn = currentCards.filter((c) => !prunedIds.has(c.id));

        if (newDrawn.length > 0) {
          if (pruned.length > 0) {
            pruned[pruned.length - 1] = [...pruned[pruned.length - 1], ...newDrawn];
          } else {
            pruned.push(newDrawn);
          }
        }
        setHandGroups(pruned);
      }
    }
  }, [myPlayer?.cards, wildJokerRank]);

  // Last card click reference for double-tap discard
  const lastCardClickRef = useRef<{ id: string; time: number } | null>(null);

  // Toggle card selection on tap with double-tap instant discard support
  const toggleSelectCard = (cardId: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const handleCardClick = (cardId: string) => {
    const now = Date.now();
    if (
      isMyTurn &&
      hasDrawn &&
      lastCardClickRef.current &&
      lastCardClickRef.current.id === cardId &&
      now - lastCardClickRef.current.time < 450
    ) {
      handleDiscard(cardId);
      lastCardClickRef.current = null;
      return;
    }
    lastCardClickRef.current = { id: cardId, time: now };
    toggleSelectCard(cardId);
  };

  // Group selected cards into a Set / Group
  // "तीन कार्ड सेलेक्ट करेंगे, सेट का ऑप्शन मिल जाएगा, सेट कर लेंगे कार्ड। इससे हम सेट्स बना सकते हैं।"
  // "Joker ke through 4, 5, 6 cards ke set bhi banane ka option hona chahiye."
  const handleCreateSetFromSelection = () => {
    if (selectedCardIds.length === 0) return;

    const selectedCardsList: Card[] = [];
    const remainingGroups = handGroups
      .map((grp) =>
        grp.filter((c) => {
          if (selectedCardIds.includes(c.id)) {
            selectedCardsList.push(c);
            return false;
          }
          return true;
        })
      )
      .filter((grp) => grp.length > 0);

    if (selectedCardsList.length > 0) {
      const updated = [...remainingGroups, selectedCardsList];
      setHandGroups(updated);
      setSelectedCardIds([]);
      soundManager.playCardDraw();

      const meldStatus = getGroupMeldStatus(selectedCardsList, wildJokerRank);
      if (meldStatus.isValid) {
        if (meldStatus.type === 'set') {
          if (meldStatus.hasJoker) {
            setToastNotification(`🎉 Valid ${selectedCardsList.length}-Card Set Formed with Joker! (${meldStatus.detailText}) +20 Pts!`);
          } else {
            setToastNotification(`🎉 Valid ${selectedCardsList.length}-Card Natural Set Formed! +20 Points Earned!`);
          }
        } else if (meldStatus.type === 'impure_seq') {
          setToastNotification(`🎉 Valid Sequence Completed with Joker! (${meldStatus.detailText}) +20 Pts!`);
        } else if (meldStatus.type === 'pure_seq') {
          setToastNotification(`🎉 Valid ${selectedCardsList.length}-Card Pure Sequence Formed! +20 Points Earned!`);
        }
        setTimeout(() => setToastNotification(null), 3500);
      } else {
        setToastNotification(`Group of ${selectedCardsList.length} cards formed!`);
        setTimeout(() => setToastNotification(null), 2500);
      }

      if (myPlayer) {
        const pRef = doc(db, 'games', gameId, 'players', myPlayer.uid);
        updateDoc(pRef, { cards: updated.flat() });
      }
    }
  };

  // Dissolve/ungroup a group
  const handleUngroup = (groupIdx: number) => {
    if (handGroups.length <= 1) return;
    const targetGroup = handGroups[groupIdx];
    const otherGroups = handGroups.filter((_, idx) => idx !== groupIdx);
    if (otherGroups.length > 0) {
      otherGroups[0] = [...otherGroups[0], ...targetGroup];
    }
    setHandGroups(otherGroups);
    soundManager.playCardDraw();
    if (myPlayer) {
      const pRef = doc(db, 'games', gameId, 'players', myPlayer.uid);
      updateDoc(pRef, { cards: otherGroups.flat() });
    }
  };

  // Move card between groups or reorder within group
  // "कार्ड को उठाकर अपने आप दूसरी साइड प्लेस कर सकते हैं। दूसरे कार्ड को उठाकर दूसरी साइड प्लेस कर सकते हैं।"
  const moveCardBetweenGroups = (
    fromGroupIdx: number,
    fromCardIdx: number,
    toGroupIdx: number,
    toCardIdx?: number
  ) => {
    if (fromGroupIdx < 0 || fromGroupIdx >= handGroups.length) return;
    const sourceGroup = [...handGroups[fromGroupIdx]];
    const [cardToMove] = sourceGroup.splice(fromCardIdx, 1);
    if (!cardToMove) return;

    const newGroups = [...handGroups];

    if (toGroupIdx === -1) {
      // Create new group on the side
      newGroups[fromGroupIdx] = sourceGroup;
      newGroups.push([cardToMove]);
    } else if (toGroupIdx === fromGroupIdx) {
      // Reordering within the same group
      const targetIdx = typeof toCardIdx === 'number' ? toCardIdx : sourceGroup.length;
      sourceGroup.splice(targetIdx, 0, cardToMove);
      newGroups[fromGroupIdx] = sourceGroup;
    } else {
      // Move to another group
      newGroups[fromGroupIdx] = sourceGroup;
      const targetGroup = [...(newGroups[toGroupIdx] || [])];
      const targetIdx = typeof toCardIdx === 'number' ? toCardIdx : targetGroup.length;
      targetGroup.splice(targetIdx, 0, cardToMove);
      newGroups[toGroupIdx] = targetGroup;
    }

    const filtered = newGroups.filter((g) => g.length > 0);
    setHandGroups(filtered);
    soundManager.playCardDraw();

    if (myPlayer) {
      const pRef = doc(db, 'games', gameId, 'players', myPlayer.uid);
      updateDoc(pRef, { cards: filtered.flat() });
    }
  };

  // Move selected card to left side or right side
  const handleMoveSelectedCard = (direction: 'left' | 'right') => {
    if (selectedCardIds.length !== 1) return;
    const cardId = selectedCardIds[0];
    let foundGroupIdx = -1;
    let foundCardIdx = -1;

    for (let g = 0; g < handGroups.length; g++) {
      const cIdx = handGroups[g].findIndex((c) => c.id === cardId);
      if (cIdx !== -1) {
        foundGroupIdx = g;
        foundCardIdx = cIdx;
        break;
      }
    }

    if (foundGroupIdx === -1) return;

    if (direction === 'left') {
      if (foundCardIdx > 0) {
        moveCardBetweenGroups(foundGroupIdx, foundCardIdx, foundGroupIdx, foundCardIdx - 1);
      } else if (foundGroupIdx > 0) {
        moveCardBetweenGroups(foundGroupIdx, foundCardIdx, foundGroupIdx - 1);
      }
    } else {
      const curLen = handGroups[foundGroupIdx].length;
      if (foundCardIdx < curLen - 1) {
        moveCardBetweenGroups(foundGroupIdx, foundCardIdx, foundGroupIdx, foundCardIdx + 1);
      } else if (foundGroupIdx < handGroups.length - 1) {
        moveCardBetweenGroups(foundGroupIdx, foundCardIdx, foundGroupIdx + 1, 0);
      } else {
        moveCardBetweenGroups(foundGroupIdx, foundCardIdx, -1);
      }
    }
  };

  // Drag and Drop handlers
  const handleDragStartCard = (
    e: React.DragEvent,
    cardId: string,
    fromGroupIdx: number,
    fromCardIdx: number
  ) => {
    e.dataTransfer.setData('text/plain', cardId);
    setDraggedCardInfo({ cardId, fromGroupIdx, fromCardIdx });
  };

  const handleDragOverGroup = (e: React.DragEvent, groupIdx: number) => {
    e.preventDefault();
    setDragOverGroupIdx(groupIdx);
  };

  const handleDropOnGroup = (e: React.DragEvent, toGroupIdx: number) => {
    e.preventDefault();
    setDragOverGroupIdx(null);
    if (!draggedCardInfo) return;
    moveCardBetweenGroups(
      draggedCardInfo.fromGroupIdx,
      draggedCardInfo.fromCardIdx,
      toGroupIdx
    );
    setDraggedCardInfo(null);
  };

  // Touch drag and drop handlers for mobile devices
  const handleTouchStartCard = (
    cardId: string,
    fromGroupIdx: number,
    fromCardIdx: number
  ) => {
    setTouchDragCard({ cardId, fromGroupIdx, fromCardIdx });
  };

  const handleTouchEndCard = (e: React.TouchEvent) => {
    if (!touchDragCard) return;
    const touch = e.changedTouches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const discardTarget = elem?.closest('[data-drop-discard]');
    const dropTarget = elem?.closest('[data-drop-group]');

    if (discardTarget && isMyTurn && hasDrawn) {
      handleDiscard(touchDragCard.cardId);
    } else if (dropTarget) {
      const targetGroup = parseInt(dropTarget.getAttribute('data-drop-group') || '0', 10);
      moveCardBetweenGroups(
        touchDragCard.fromGroupIdx,
        touchDragCard.fromCardIdx,
        targetGroup
      );
    }
    setTouchDragCard(null);
  };

  // Open Declare Modal with grouped hand
  const handleOpenDeclare = () => {
    if (!game || !user || actionLoading) return;
    if (!isMyTurn) {
      setToastNotification('👉 Declare / Show ke liye aapki turn honi chahiye!');
      setTimeout(() => setToastNotification(null), 3000);
      return;
    }
    if (!myPlayer?.cards || myPlayer.cards.length === 0) return;
    const cards = handGroups.flat().length > 0 ? handGroups.flat() : [...myPlayer.cards];
    let finishCard: Card | null = null;
    let meldCards = cards;

    // In 13-card Indian Rummy, declaring requires exactly 13 cards.
    // If the player has drawn (14 cards in hand), 1 card is discarded to the finish slot.
    if (cards.length >= 14) {
      const selIdx = selectedCardIds.length > 0 ? cards.findIndex((c) => c.id === selectedCardIds[0]) : -1;
      const finishIdx = selIdx !== -1 ? selIdx : cards.length - 1;
      finishCard = cards[finishIdx];
      meldCards = cards.filter((_, idx) => idx !== finishIdx);
    }

    setDeclareFinishCard(finishCard);

    // Check if player's current groups form 13 cards
    const userGroupsWithoutFinish = handGroups
      .map((g) => (finishCard ? g.filter((c) => c.id !== finishCard.id) : g))
      .filter((g) => g.length > 0);
    const totalCount = userGroupsWithoutFinish.reduce((acc, g) => acc + g.length, 0);

    if (totalCount === 13 && userGroupsWithoutFinish.length >= 2) {
      setDeclareGroups(userGroupsWithoutFinish);
    } else {
      const bestMelds = findBestMelds(meldCards, wildJokerRank);
      setDeclareGroups(bestMelds);
    }
    setShowDeclareModal(true);
  };

  const isMyTurn = game?.status === 'PLAYING' && game.turnUid === user?.uid;
  // If player has drawn or hand has 14+ cards, hasDrawn is guaranteed true
  const hasDrawn = Boolean(game?.hasDrawn) || Boolean(myPlayer?.cards && myPlayer.cards.length >= 14);
  const currentHandPenalty = myPlayer?.cards ? calculateLossPoints(myPlayer.cards, wildJokerRank) : 0;

  const handleLeaveTable = async () => {
    if (!game || !user) {
      router.push('/lobby');
      return;
    }
    if (game.status === 'PLAYING') {
      setShowDropModal(true);
      return;
    }
    setActionLoading(true);
    try {
      await leaveTable(game.gameId, game.tableId, user.uid);
    } catch (err) {
      console.warn('Seat release notice:', err);
    } finally {
      setActionLoading(false);
      router.push('/lobby');
    }
  };

  // Actions
  const handleDraw = async (source: 'open' | 'closed') => {
    if (!game || !user || !isMyTurn || hasDrawn || actionLoading) return;
    setActionLoading(true);
    setErrorToast(null);
    try {
      soundManager.playCardDraw();
      await drawCard(game.gameId, user.uid, source);
    } catch (err: unknown) {
      setErrorToast(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscard = async (specificCardId?: string) => {
    if (!game || !user || actionLoading) return;

    if (!isMyTurn) {
      setToastNotification('👉 Opponent ki turn chal rahi hai, wait karein!');
      setTimeout(() => setToastNotification(null), 3000);
      return;
    }

    if (!hasDrawn) {
      setToastNotification('👉 Pehle Closed Deck ya Open Pile se card draw karein!');
      setTimeout(() => setToastNotification(null), 3000);
      return;
    }

    const allCards = handGroups.flat().length > 0 ? handGroups.flat() : (myPlayer?.cards || []);
    const targetId =
      specificCardId ||
      (selectedCardIds.length > 0 ? selectedCardIds[selectedCardIds.length - 1] : null);

    let cardObj = targetId ? allCards.find((c) => c.id === targetId) : null;
    if (!cardObj && allCards.length >= 14) {
      // If player has 14 cards and clicked Discard without explicit selection, use the last card
      cardObj = allCards[allCards.length - 1];
    }

    if (!cardObj) {
      setToastNotification('👉 Discard karne ke liye kisi card par tap karein!');
      setTimeout(() => setToastNotification(null), 3000);
      return;
    }

    setActionLoading(true);
    setErrorToast(null);
    const safetyTimer = setTimeout(() => setActionLoading(false), 4000);

    try {
      soundManager.playCardDiscard();
      await discardCard(game.gameId, user.uid, cardObj);
      setSelectedCardIds([]);
    } catch (err: unknown) {
      setErrorToast(err instanceof Error ? err.message : String(err));
    } finally {
      clearTimeout(safetyTimer);
      setActionLoading(false);
    }
  };

  const handleManualDrop = async () => {
    if (!game || !user || actionLoading) return;
    setActionLoading(true);
    setErrorToast(null);
    try {
      soundManager.playDropSound();
      await dropGame(game.gameId, user.uid);
      setShowDropModal(false);
    } catch (err: unknown) {
      setErrorToast(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAutoSortHand = () => {
    if (!myPlayer?.cards) return;
    const sortedMelds = findBestMelds(myPlayer.cards, wildJokerRank);
    const validMelds = sortedMelds.length > 0 ? sortedMelds : [myPlayer.cards];
    setHandGroups(validMelds);
    setSelectedCardIds([]);
    soundManager.playCardDraw();
    if (myPlayer) {
      const pRef = doc(db, 'games', gameId, 'players', myPlayer.uid);
      updateDoc(pRef, { cards: validMelds.flat() });
    }
  };

  const handleConfirmDeclare = async () => {
    if (!game || !user || actionLoading) return;
    setActionLoading(true);
    setErrorToast(null);

    try {
      const res = await declareHand(game.gameId, user.uid, declareGroups);
      if (!res.isValid) {
        setErrorToast(`Invalid Declaration: ${res.message}. 80 points penalty incurred.`);
      }
      setShowDeclareModal(false);
    } catch (err: unknown) {
      setErrorToast(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Up to 5 opponent slots for a 6-player table
  const opponents = players.filter((p) => p.uid !== user?.uid);
  const opponentSlots = [0, 1, 2, 3, 4]; // 5 potential opponent seats

  if (playersLoaded && !myPlayer && game && game.status !== 'RESULT' && game.status !== 'COMPLETED') {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#07070a] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-[#12131e] border border-rose-500/30 rounded-3xl p-8 space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-rose-400">Seat Not Found</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                You are not seated in this <strong className="text-white">{game.mode.toUpperCase()}</strong> match table.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/lobby"
                className="inline-block w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold text-xs uppercase shadow-lg hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer"
              >
                Return to Lobby
              </Link>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      {/* Main Game Table (Adaptive for Phone, Tablet, & Desktop) */}
      <div className="h-[100dvh] max-h-[100dvh] bg-[#06070a] text-slate-100 flex flex-col select-none overflow-hidden relative">
        {/* Table Top Header Bar (Ultra-Compact on mobile landscape) */}
        <div className="bg-[#0b0d14]/95 backdrop-blur border-b border-amber-500/20 px-2 sm:px-3 py-0.5 sm:py-1 flex items-center justify-between z-30 shrink-0 h-8 sm:h-10">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={handleLeaveTable}
              className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Leave Table"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-[10px] sm:text-xs font-black tracking-wider text-white uppercase">
                {game?.mode === 'pool101' ? 'POOL 101' : game?.mode}
              </span>
              <span className="text-[9px] font-mono text-amber-400">
                ₹{game?.entryFee} • {players.length}/6
              </span>
            </div>
          </div>

          {/* Reconnecting / Server sync indicator */}
          {isReconnecting && (
            <div className="flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[8px] font-bold animate-pulse">
              <Loader2 className="w-2 h-2 animate-spin" />
              <span>SYNCING</span>
            </div>
          )}

          {/* Controls: Auto-Rotate, Rules, Audio, Drop */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleAutoRotate}
              className="p-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] flex items-center"
              title="Rotate Screen"
            >
              <RotateCw className="w-3 h-3 text-amber-400" />
            </button>

            <button
              onClick={() => setShowHowToPlayModal(true)}
              className="py-0.5 px-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-bold flex items-center gap-0.5"
              title="Rules"
            >
              <BookOpen className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Rules</span>
            </button>

            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                soundManager.enabled = next;
              }}
              className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300"
              title="Audio"
            >
              {soundEnabled ? <Volume2 className="w-3 h-3 text-amber-400" /> : <VolumeX className="w-3 h-3 text-slate-500" />}
            </button>

            <button
              onClick={() => setShowDropModal(true)}
              disabled={game?.status !== 'PLAYING' || myPlayer?.status === 'dropped'}
              className="py-0.5 px-2 rounded-md bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-[9px] font-black uppercase transition-all disabled:opacity-40"
            >
              DROP
            </button>
          </div>
        </div>

        {/* Mobile Portrait Rotation Notification Bar */}
        {isPortrait && (
          <div className="bg-amber-500/25 border-b border-amber-500/40 px-3 py-0.5 flex items-center justify-between text-xs text-amber-100 z-30 shrink-0">
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-3 h-3 text-amber-400 rotate-90 shrink-0" />
              <span className="text-[9px] sm:text-xs font-bold">
                📱 Hold phone sideways for full casino table view
              </span>
            </div>
            <button
              onClick={handleToggleAutoRotate}
              className="py-0.2 px-1.5 rounded bg-amber-400 hover:bg-amber-300 text-black text-[8px] font-black uppercase shadow shrink-0"
            >
              Rotate
            </button>
          </div>
        )}

        {/* Error Toast */}
        {errorToast && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-rose-950/95 border border-rose-500/60 text-rose-200 text-xs px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce max-w-sm sm:max-w-md">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate text-[10px] sm:text-xs">{errorToast}</span>
            <button onClick={() => setErrorToast(null)} className="ml-2 hover:text-white shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 
          6-PLAYER CIRCULAR/OVAL LUXURY CASINO TABLE (Fully Adaptive for Phone Landscape, Tablet & Desktop)
        */}
        <div className="flex-1 relative flex items-center justify-center p-0.5 sm:p-1 w-full h-full max-h-[calc(100dvh-32px)] overflow-hidden">
          <div className="w-full max-w-7xl h-full max-h-full rounded-xl sm:rounded-2xl md:rounded-[36px] bg-gradient-to-b from-[#2a1708] via-[#1a0f05] to-[#2a1708] p-0.5 sm:p-1 shadow-2xl relative border-2 border-amber-600/30 flex items-center justify-center">
            {/* Gold Rail Lip */}
            <div className="w-full h-full rounded-lg sm:rounded-xl md:rounded-[30px] border border-amber-400/40 p-0.5 bg-[#0d0905]">
              {/* Green Felt Surface with Radial Glow */}
              <div className="w-full h-full rounded-md sm:rounded-lg md:rounded-[26px] table-felt-radial border border-emerald-950 shadow-inner relative flex flex-col justify-between p-0.5 sm:p-1 overflow-hidden">
                {/* Felt Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
                  <span className="text-3xl sm:text-6xl md:text-8xl font-black text-white">♠ RUMMYADDA</span>
                </div>

                {/* 
                  1. TOP OPPONENT SEATS ROW (5 Seats for Opponents in 6-Player Table)
                */}
                <div className="grid grid-cols-5 gap-1 sm:gap-2 w-full relative z-10 pt-0.5 shrink-0">
                  {opponentSlots.map((idx) => {
                    const opp = opponents[idx];
                    if (opp) {
                      const isOppTurn = game?.turnUid === opp.uid;
                      return (
                        <div key={opp.uid} className="flex flex-col items-center gap-0.2 relative">
                          <div
                            className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-md sm:rounded-lg p-0.5 transition-all shadow-md ${
                              isOppTurn
                                ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 ring-2 ring-amber-400/50 scale-105'
                                : 'bg-slate-700/60'
                            }`}
                          >
                            <div className="w-full h-full bg-[#11131c] rounded-[4px] sm:rounded-[6px] flex items-center justify-center text-white font-bold text-[8px] sm:text-[10px] relative">
                              <span>{opp.displayName?.charAt(0).toUpperCase() || 'P'}</span>
                              {opp.isDealer && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400 text-black font-black text-[6px] sm:text-[7px] flex items-center justify-center shadow">
                                  D
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-center leading-tight">
                            <span className="block text-[7px] sm:text-[8px] font-bold text-white max-w-[45px] sm:max-w-[65px] truncate">
                              {opp.displayName}
                            </span>
                            <span className="text-[6px] sm:text-[7px] font-mono text-amber-300 font-semibold block">
                              {opp.status === 'dropped' ? (
                                <span className="text-rose-400">Dropped</span>
                              ) : (
                                `${opp.cardCount || 13} Cards`
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Empty seat slot
                    return (
                      <div key={`empty-${idx}`} className="flex flex-col items-center gap-0.2 opacity-30">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-md sm:rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center text-slate-500">
                          <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </div>
                        <span className="text-[6px] sm:text-[7px] text-slate-400 font-medium">Empty</span>
                      </div>
                    );
                  })}
                </div>

                {/* 
                  2. CENTER TABLE AREA (Waiting state / 15s Countdown / Playing Decks - Balanced Responsive Layout)
                */}
                <div className="flex-1 flex items-center justify-center gap-3 sm:gap-6 md:gap-10 relative z-10 my-auto min-h-0 py-0.5">
                  {/* WAITING ROOM (when waiting for real players) */}
                  {game?.status === 'WAITING' && (
                    <div className="bg-black/90 backdrop-blur-md border border-amber-500/40 px-5 sm:px-8 py-4 sm:py-6 rounded-2xl sm:rounded-3xl text-center space-y-3.5 shadow-2xl max-w-sm sm:max-w-md w-full">
                      <div className="flex items-center justify-center gap-2 text-amber-400">
                        <Users className="w-5 h-5 animate-pulse" />
                        <span className="font-extrabold text-xs sm:text-sm uppercase tracking-wider">
                          Waiting for Players ({players.length}/6)
                        </span>
                      </div>

                      <div className="py-2 space-y-2">
                        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs text-slate-200 font-semibold">
                          Waiting for another real player to join the table...
                        </p>
                        <p className="text-[11px] text-amber-300/80">
                          Table Fee: ₹{game.entryFee} • Match starts automatically when 2nd player joins
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleLeaveQueue}
                        disabled={leavingQueue}
                        className="w-full py-2 px-4 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 font-bold text-xs border border-white/10 hover:border-rose-500/40 transition-colors disabled:opacity-50"
                      >
                        {leavingQueue ? 'Refunding...' : 'Cancel (Refund)'}
                      </button>
                    </div>
                  )}

                  {/* 15-SECOND SYNCHRONIZED COUNTDOWN */}
                  {game?.status === 'COUNTDOWN' && (
                    <div className="bg-black/85 backdrop-blur-md border border-amber-400 px-6 sm:px-8 py-3 sm:py-5 rounded-2xl sm:rounded-3xl text-center space-y-1.5 shadow-2xl animate-pulse">
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-400">
                        Match Starting ({players.length}/6 Players)
                      </span>
                      <div className="text-3xl sm:text-5xl font-black text-amber-300 font-mono">
                        {countdownLeft}s
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-300">Dealing 13 cards to each player...</p>
                    </div>
                  )}

                  {/* ACTIVE PLAYING CENTER */}
                  {game?.status === 'PLAYING' && (
                    <div className="flex items-center gap-3 sm:gap-6 scale-90 sm:scale-100 origin-center">
                      {/* Wild Joker Display */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[8px] uppercase font-black tracking-wider text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded-full border border-amber-500/30">
                          JOKER
                        </span>
                        {game.wildJoker ? (
                          <div className="rotate-90 origin-center scale-80 sm:scale-95">
                            <PlayingCard card={game.wildJoker} size="sm" disabled />
                          </div>
                        ) : null}
                      </div>

                      {/* Closed Deck (Draw Pile) */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[8px] uppercase font-bold text-slate-300">Closed</span>
                        <div
                          onClick={() => handleDraw('closed')}
                          className={`w-9 h-13 min-[400px]:w-10 min-[400px]:h-14 sm:w-13 sm:h-18 rounded-lg bg-gradient-to-br from-rose-900 via-rose-800 to-amber-900 border-2 border-amber-400/50 shadow-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                            isMyTurn && !hasDrawn
                              ? 'ring-2 sm:ring-4 ring-amber-400 hover:scale-105 shadow-amber-500/40 animate-pulse'
                              : 'opacity-90'
                          }`}
                        >
                          <span className="text-xs sm:text-base font-black text-amber-400">♠</span>
                          <span className="text-[8px] sm:text-[9px] font-bold text-amber-200">
                            {game.closedDeckCount}
                          </span>
                        </div>
                      </div>

                      {/* Open Deck (Discard Pile with Direct Drop Support) */}
                      <div
                        data-drop-discard="true"
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (isMyTurn && hasDrawn) {
                            e.dataTransfer.dropEffect = 'move';
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!isMyTurn || !hasDrawn) return;
                          const cardId = e.dataTransfer.getData('text/plain') || draggedCardInfo?.cardId;
                          if (cardId) {
                            handleDiscard(cardId);
                          }
                          setDraggedCardInfo(null);
                        }}
                        className={`flex flex-col items-center gap-0.5 p-0.5 rounded-lg transition-all ${
                          isMyTurn && hasDrawn
                            ? 'ring-2 ring-amber-400/80 bg-amber-500/10'
                            : ''
                        }`}
                      >
                        <span className="text-[8px] uppercase font-bold text-slate-300">
                          {isMyTurn && hasDrawn ? '🗑️ Discard' : 'Open'}
                        </span>
                        {game.openDeck.length > 0 ? (
                          <div
                            onClick={() => {
                              if (isMyTurn && !hasDrawn) {
                                handleDraw('open');
                              } else if (isMyTurn && hasDrawn && selectedCardIds.length > 0) {
                                handleDiscard(selectedCardIds[selectedCardIds.length - 1]);
                              }
                            }}
                            className={`${isMyTurn && !hasDrawn ? 'ring-2 sm:ring-4 ring-amber-400 rounded-lg cursor-pointer hover:scale-105 transition-transform' : isMyTurn && hasDrawn ? 'cursor-pointer hover:scale-105 ring-2 ring-amber-400 rounded-lg' : ''}`}
                            title={isMyTurn && hasDrawn ? 'Click or drop here to discard card' : 'Open Deck'}
                          >
                            <PlayingCard
                              card={game.openDeck[game.openDeck.length - 1]}
                              wildJokerRank={wildJokerRank}
                              size="sm"
                              disabled={!isMyTurn}
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              if (isMyTurn && hasDrawn && selectedCardIds.length > 0) {
                                handleDiscard(selectedCardIds[selectedCardIds.length - 1]);
                              }
                            }}
                            className={`w-9 h-13 min-[400px]:w-10 min-[400px]:h-14 sm:w-13 sm:h-18 rounded-lg border-2 border-dashed flex items-center justify-center text-[9px] transition-colors ${
                              isMyTurn && hasDrawn
                                ? 'border-amber-400/80 text-amber-300 cursor-pointer bg-amber-500/10'
                                : 'border-white/20 text-slate-500'
                            }`}
                          >
                            {isMyTurn && hasDrawn ? 'Drop' : 'Empty'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 
                  3. BOTTOM AREA (Your Seat, Hand Cards, Turn Timer & Action Bar)
                */}
                <div className="w-full relative z-30 shrink-0 flex flex-col items-center gap-0.5 sm:gap-1 pb-0.5">
                  {/* Floating Toast Notification */}
                  {toastNotification && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black font-black text-xs px-4 py-1.5 rounded-full shadow-2xl animate-bounce border border-yellow-200">
                      {toastNotification}
                    </div>
                  )}

                  {/* Sleek Turn Status Message Bar */}
                  {game?.status === 'PLAYING' && (
                    <div className="flex items-center justify-center gap-2 bg-black/70 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/10 shrink-0">
                      <span className={`text-[8px] sm:text-[9px] font-bold ${isMyTurn ? 'text-amber-400 animate-pulse font-extrabold' : 'text-slate-300'}`}>
                        {isMyTurn
                          ? !hasDrawn
                            ? '👉 Your Turn: Draw Card'
                            : '👉 Select Card to Discard or Declare'
                          : `${players.find((p) => p.uid === game.turnUid)?.displayName || 'Opponent'}'s turn`}
                      </span>
                      <span className="font-mono text-white flex items-center gap-0.5 text-[8px] sm:text-[9px]">
                        <Clock className="w-2.5 h-2.5 text-amber-400" />
                        <span className={turnTimeLeft <= 10 ? 'text-rose-400 font-black animate-pulse' : 'text-amber-300'}>
                          {turnTimeLeft}s
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Multi-Card Selection Actions Floating Bar */}
                  {selectedCardIds.length >= 2 && (() => {
                    const allCards = handGroups.flat().length > 0 ? handGroups.flat() : (myPlayer?.cards || []);
                    const selCards = allCards.filter((c) => selectedCardIds.includes(c.id));
                    const selStatus = getGroupMeldStatus(selCards, wildJokerRank);

                    return (
                      <div className="flex items-center gap-1.5 mb-0.5 animate-bounce z-40">
                        <button
                          onClick={handleCreateSetFromSelection}
                          className={`py-1 px-3 rounded-full font-black text-[9px] sm:text-[10px] uppercase shadow-lg flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-all ${
                            selStatus.isValid
                              ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black ring-1 ring-amber-300 shadow-amber-500/50'
                              : 'bg-gradient-to-r from-slate-200 to-slate-400 text-black ring-1 ring-white/30'
                          }`}
                        >
                          <span>{selStatus.isValid ? '⭐' : '✨'}</span>
                          <span>
                            {selStatus.type === 'set'
                              ? `CREATE SET (${selectedCardIds.length}) +20`
                              : selStatus.type === 'impure_seq'
                              ? `CREATE JOKER SEQ (${selectedCardIds.length}) +20`
                              : selStatus.type === 'pure_seq'
                              ? `CREATE PURE SEQ (${selectedCardIds.length}) +20`
                              : `GROUP (${selectedCardIds.length})`}
                          </span>
                        </button>
                        <button
                          onClick={() => setSelectedCardIds([])}
                          className="py-0.5 px-2 rounded-full bg-black/80 hover:bg-black text-slate-300 text-[8px] font-bold border border-white/20"
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  })()}

                  {/* Single Card Quick Movement Actions Bar */}
                  {selectedCardIds.length === 1 && (
                    <div className="flex items-center gap-1 mb-0.5 z-40 bg-black/85 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-amber-500/30 shadow-lg text-[9px]">
                      {isMyTurn && hasDrawn && (
                        <button
                          onClick={() => handleDiscard(selectedCardIds[0])}
                          className="py-0.5 px-2.5 rounded-md bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black font-black uppercase text-[9px] shadow-lg animate-pulse flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                        >
                          <span>🗑️ Discard</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleMoveSelectedCard('left')}
                        className="py-0.2 px-1.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold border border-white/10 flex items-center gap-0.5 cursor-pointer text-[8px]"
                        title="Move card left side"
                      >
                        <span>← Left</span>
                      </button>
                      <button
                        onClick={() => handleMoveSelectedCard('right')}
                        className="py-0.2 px-1.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold border border-white/10 flex items-center gap-0.5 cursor-pointer text-[8px]"
                        title="Move card right side"
                      >
                        <span>Right →</span>
                      </button>
                      <button
                        onClick={() => moveCardBetweenGroups(-1, 0, -1)}
                        className="py-0.2 px-1.5 rounded bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 font-bold border border-amber-500/30 cursor-pointer text-[8px]"
                        title="Create new group with this card"
                      >
                        <span>+ Group</span>
                      </button>
                      <button
                        onClick={() => setSelectedCardIds([])}
                        className="py-0.2 px-1 rounded text-slate-400 hover:text-white text-[8px] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Player Hand Groups Spread Across Full Width of Screen */}
                  {handGroups.length > 0 && (
                    <div className="w-full max-w-7xl px-1 flex items-end justify-center sm:justify-around gap-1 sm:gap-2 overflow-x-auto py-0.5 max-w-full">
                      {handGroups.map((group, groupIdx) => {
                        const meldStatus = getGroupMeldStatus(group, wildJokerRank);
                        const isOver = dragOverGroupIdx === groupIdx;

                        return (
                          <div
                            key={`group-${groupIdx}`}
                            data-drop-group={groupIdx}
                            onDragOver={(e) => handleDragOverGroup(e, groupIdx)}
                            onDragLeave={() => setDragOverGroupIdx(null)}
                            onDrop={(e) => handleDropOnGroup(e, groupIdx)}
                            className={`relative rounded-lg sm:rounded-xl p-0.5 sm:p-1 transition-all duration-200 flex flex-col items-center gap-0.5 shrink-0 ${
                              isOver
                                ? 'ring-2 ring-amber-400 bg-amber-500/20 scale-105'
                                : meldStatus.type === 'set'
                                ? meldStatus.hasJoker
                                  ? 'bg-amber-500/15 border border-amber-400 shadow shadow-amber-500/20'
                                  : 'bg-purple-500/10 border border-purple-400/50 shadow-sm'
                                : meldStatus.type === 'pure_seq'
                                ? 'bg-emerald-500/10 border border-emerald-500/40 shadow-sm'
                                : meldStatus.type === 'impure_seq'
                                ? 'bg-teal-500/10 border border-teal-400/60 shadow-sm'
                                : 'bg-black/40 border border-white/10'
                            }`}
                          >
                            {/* Group Header Badge */}
                            <div className="flex items-center justify-between w-full px-0.5 gap-0.5 text-[7px] sm:text-[8px] font-bold">
                              <span className="text-slate-400 font-mono">G{groupIdx + 1}</span>
                              {meldStatus.type === 'set' ? (
                                meldStatus.hasJoker ? (
                                  <span className="px-1 py-0.1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-black text-[7px] sm:text-[8px] shadow flex items-center gap-0.5">
                                    ⭐ SET (3)
                                  </span>
                                ) : (
                                  <span className="px-1 py-0.1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[7px] sm:text-[8px] font-black">
                                    ✓ SET (3)
                                  </span>
                                )
                              ) : meldStatus.type === 'pure_seq' ? (
                                <span className="px-1 py-0.1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[7px] sm:text-[8px] font-black">
                                  ✓ PURE SEQ
                                </span>
                              ) : meldStatus.type === 'impure_seq' ? (
                                <span className="px-1 py-0.1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[7px] sm:text-[8px] font-black">
                                  ⭐ JOKER SEQ
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[7px]">Hand ({group.length})</span>
                              )}
                              {handGroups.length > 1 && (
                                <button
                                  onClick={() => handleUngroup(groupIdx)}
                                  className="text-slate-500 hover:text-rose-400 text-[7px] transition-colors ml-0.5"
                                  title="Ungroup cards"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {/* Cards in Group */}
                            <div className="flex items-center -space-x-3.5 min-[400px]:-space-x-3 sm:-space-x-2.5 overflow-visible px-0.5 py-0.5">
                              {group.map((card, cardIdx) => {
                                const isWild = card.rank === wildJokerRank;
                                const isSelected = selectedCardIds.includes(card.id);

                                return (
                                  <div
                                    key={card.id}
                                    className="relative group/c shrink-0"
                                    draggable={true}
                                    onDragStart={(e) => handleDragStartCard(e, card.id, groupIdx, cardIdx)}
                                    onTouchStart={() => handleTouchStartCard(card.id, groupIdx, cardIdx)}
                                    onTouchEnd={handleTouchEndCard}
                                  >
                                    {isWild && (
                                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-20 bg-amber-400 text-black font-black text-[6px] sm:text-[7px] px-0.5 py-0.1 rounded shadow">
                                        ★
                                      </span>
                                    )}
                                    <PlayingCard
                                      card={card}
                                      wildJokerRank={wildJokerRank}
                                      isSelected={isSelected}
                                      onClick={() => handleCardClick(card.id)}
                                      size="hand"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* Drop Target to Create New Side Group */}
                      <div
                        data-drop-group={-1}
                        onDragOver={(e) => handleDragOverGroup(e, -1)}
                        onDrop={(e) => handleDropOnGroup(e, -1)}
                        className="rounded-lg border border-dashed border-white/20 hover:border-amber-400/60 p-1 flex flex-col items-center justify-center text-[7px] sm:text-[8px] text-slate-500 hover:text-amber-300 cursor-pointer h-11 sm:h-13 shrink-0 transition-colors"
                        title="Drag and drop card here to place as new group"
                      >
                        <span className="text-xs font-bold">+</span>
                        <span>Group</span>
                      </div>
                    </div>
                  )}

                  {/* Fallback Single Flat Hand if handGroups empty */}
                  {handGroups.length === 0 && myPlayer?.cards && myPlayer.cards.length > 0 && (
                    <div className="flex items-center justify-center -space-x-3.5 min-[400px]:-space-x-3 sm:-space-x-2.5 max-w-full overflow-x-auto py-0.5 px-2">
                      {myPlayer.cards.map((card) => {
                        const isWild = card.rank === wildJokerRank;
                        const isSelected = selectedCardIds.includes(card.id);
                        return (
                          <div key={card.id} className="relative group shrink-0">
                            {isWild && (
                              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-20 bg-amber-400 text-black font-black text-[6px] sm:text-[7px] px-0.5 py-0.1 rounded shadow">
                                ★
                              </span>
                            )}
                            <PlayingCard
                              card={card}
                              wildJokerRank={wildJokerRank}
                              isSelected={isSelected}
                              onClick={() => handleCardClick(card.id)}
                              size="hand"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Action Controls Bar - Solid Guaranteed Visible 4-Button Dock */}
                  {game?.status === 'PLAYING' && (() => {
                    const dropInfo = calculateDropPenalty(
                      game?.entryFee || 20,
                      game?.pointValue || ((game?.entryFee || 20) / 80),
                      myPlayer?.turnsCount || 0,
                      isMyTurn && Boolean(hasDrawn)
                    );

                    const completedSetsCount = handGroups.filter((g) => isValidSet(g, wildJokerRank)).length;

                    return (
                      <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-0.5 shrink-0 z-40 my-0.2 px-1">
                        {/* Ultra-compact Live Status Line: Sets Bonus & Penalty Goal */}
                        <div className="flex items-center justify-between w-full px-1 text-[8px] sm:text-[9px] leading-tight">
                          {/* Live Sets Made Bonus Counter (+20 Pts per Set) */}
                          <div
                            className="py-0.2 px-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center gap-1 font-bold text-amber-300"
                            title="Every completed 3-card set gives +20 Points!"
                          >
                            <span>⭐</span>
                            <span className="text-slate-300">Sets:</span>
                            <span className="font-mono font-black text-amber-300">{completedSetsCount}</span>
                            <span className="text-emerald-400 font-mono font-bold">
                              (+{completedSetsCount * 20} Pts)
                            </span>
                          </div>

                          {/* Live Hand Penalty Score */}
                          <div
                            className="py-0.2 px-2 rounded-full bg-black/80 border border-white/15 text-[8px] sm:text-[9px] flex items-center gap-1"
                            title="Unmatched cards penalty score (Goal: 0 Pts to win)"
                          >
                            <span className="text-slate-400">Penalty:</span>
                            <span className={`font-mono font-black ${currentHandPenalty === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {currentHandPenalty} Pts
                            </span>
                            <span className="text-amber-300 text-[7px] hidden xs:inline">(Goal: 0 🏆)</span>
                          </div>
                        </div>

                        {/* 4 Primary Player Action Buttons: DROP | SORT | DISCARD | DECLARE */}
                        <div className="w-full grid grid-cols-4 gap-1 sm:gap-1.5 bg-black/95 backdrop-blur-md p-1 rounded-lg sm:rounded-xl border border-amber-500/40 shadow-xl shrink-0 z-40">
                          {/* 1. DROP BUTTON */}
                          <button
                            type="button"
                            onClick={() => setShowDropModal(true)}
                            disabled={actionLoading || myPlayer?.status === 'dropped'}
                            className="h-8 sm:h-9 px-1 rounded-md sm:rounded-lg bg-gradient-to-b from-rose-600/30 to-rose-900/40 hover:from-rose-600/50 hover:to-rose-800/60 border border-rose-500/60 text-rose-200 font-black text-[9px] sm:text-[10px] uppercase shadow transition-all active:scale-95 flex flex-col items-center justify-center leading-none cursor-pointer disabled:opacity-40"
                            title="Drop hand"
                          >
                            <span className="tracking-wide">DROP</span>
                            <span className="text-[7px] sm:text-[8px] font-mono font-semibold text-rose-300 mt-0.5">
                              -₹{dropInfo.penaltyRupees}
                            </span>
                          </button>

                          {/* 2. SORT BUTTON */}
                          <button
                            type="button"
                            onClick={handleAutoSortHand}
                            disabled={actionLoading || myPlayer?.status === 'dropped'}
                            className="h-8 sm:h-9 px-1 rounded-md sm:rounded-lg bg-gradient-to-b from-purple-600/30 to-purple-900/40 hover:from-purple-600/50 hover:to-purple-800/60 border border-purple-500/60 text-purple-200 font-black text-[9px] sm:text-[10px] uppercase shadow transition-all active:scale-95 flex flex-col items-center justify-center leading-none cursor-pointer disabled:opacity-40"
                            title="Sort cards into sequences and 3-card sets"
                          >
                            <div className="flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                              <span className="tracking-wide">SORT</span>
                            </div>
                            <span className="text-[7px] text-purple-300/80 mt-0.5">Auto</span>
                          </button>

                          {/* 3. DISCARD BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleDiscard()}
                            disabled={actionLoading || myPlayer?.status === 'dropped'}
                            className={`h-8 sm:h-9 px-1 rounded-md sm:rounded-lg font-black text-[9px] sm:text-[10px] uppercase shadow transition-all active:scale-95 flex flex-col items-center justify-center leading-none ${
                              isMyTurn && hasDrawn && selectedCardIds.length > 0
                                ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black ring-2 ring-amber-300 shadow-amber-500/50 animate-pulse cursor-pointer'
                                : isMyTurn && hasDrawn
                                ? 'bg-gradient-to-r from-amber-600/40 to-yellow-600/40 border border-amber-400 text-amber-200 cursor-pointer animate-pulse'
                                : isMyTurn
                                ? 'bg-white/15 hover:bg-white/20 text-white border border-white/20 cursor-pointer'
                                : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
                            }`}
                            title={
                              !isMyTurn
                                ? "Opponent's turn"
                                : !hasDrawn
                                ? 'Draw a card first'
                                : selectedCardIds.length === 0
                                ? 'Select card to discard'
                                : 'Discard selected card'
                            }
                          >
                            <span className="tracking-wide">DISCARD</span>
                            <span className="text-[7px] mt-0.5 truncate max-w-full font-medium">
                              {isMyTurn
                                ? !hasDrawn
                                  ? 'Draw 1st'
                                  : selectedCardIds.length > 0
                                  ? '✓ Ready'
                                  : 'Select Card'
                                : 'Wait'}
                            </span>
                          </button>

                          {/* 4. DECLARE / SHOW BUTTON */}
                          <button
                            type="button"
                            onClick={handleOpenDeclare}
                            disabled={actionLoading || myPlayer?.status === 'dropped'}
                            className={`h-8 sm:h-9 px-1 rounded-md sm:rounded-lg font-black text-[9px] sm:text-[10px] uppercase shadow transition-all active:scale-95 flex flex-col items-center justify-center leading-none ${
                              isMyTurn
                                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 text-black cursor-pointer shadow-emerald-500/40 ring-1 ring-emerald-300'
                                : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
                            }`}
                            title="Declare Hand Show"
                          >
                            <span className="tracking-wide">DECLARE</span>
                            <span className="text-[7px] text-emerald-950 font-bold mt-0.5">Show Hand</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 
          HOW TO PLAY TUTORIAL MODAL
        */}
        <HowToPlayModal
          isOpen={showHowToPlayModal}
          onClose={() => setShowHowToPlayModal(false)}
        />

        {/* 
          DECLARATION REVIEW MODAL 
        */}
        {showDeclareModal && (() => {
          const declareValidation = validateDeclaration(declareGroups, wildJokerRank);
          return (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
              <div className="bg-[#12131e] border border-amber-500/40 rounded-3xl p-5 sm:p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                      <span>Declare Hand Show</span>
                      {declareValidation.isValid ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-black">
                          VALID SHOW ✓
                        </span>
                      ) : (
                        <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded-full font-black">
                          INCOMPLETE ⚠️
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Valid show requires at least 2 sequences (including at least 1 Pure Sequence without jokers).
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeclareModal(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Finish / Discard Card (if drawn 14th card) */}
                {declareFinishCard && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/60 border border-amber-500/30">
                    <span className="text-xs font-bold text-amber-300">Finish / Discard Card:</span>
                    <PlayingCard card={declareFinishCard} wildJokerRank={wildJokerRank} size="sm" disabled />
                    <span className="text-[10px] text-slate-400">Discarded to finish hand declaration</span>
                  </div>
                )}

                {/* Live Meld Validation Banner */}
                {declareValidation.isValid ? (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Valid Show!</strong> All 13 cards form valid melds ({declareValidation.pureSequenceCount} Pure Seq, {declareValidation.totalSequenceCount} Total Seq). You will win this match!
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      <strong>Warning:</strong> {declareValidation.message} Declaring an invalid hand incurs an <strong>80 points penalty</strong>!
                    </span>
                  </div>
                )}

                {/* Grouping Area */}
                <div className="space-y-2.5">
                  <p className="text-xs text-amber-300 font-semibold">Your Grouped Cards (13 Cards):</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {declareGroups.map((grp, gIdx) => {
                      const grpStatus = getGroupMeldStatus(grp, wildJokerRank);

                      return (
                        <div key={gIdx} className="p-2.5 rounded-xl bg-[#090a12] border border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-400">Group {gIdx + 1} ({grp.length} Cards)</span>
                            <span className={
                              grpStatus.type === 'pure_seq'
                                ? 'text-emerald-400'
                                : grpStatus.type === 'impure_seq'
                                ? 'text-teal-300'
                                : grpStatus.type === 'set'
                                ? 'text-amber-300'
                                : 'text-rose-400'
                            }>
                              {grpStatus.type === 'pure_seq'
                                ? 'Pure Sequence ✓ (+20 Pts)'
                                : grpStatus.type === 'impure_seq'
                                ? `Joker Sequence ⭐ (${grp.length})`
                                : grpStatus.type === 'set'
                                ? (grpStatus.hasJoker ? `Joker Set ⭐ (${grp.length}) +20 Pts` : `Valid Set ✓ (${grp.length}) +20 Pts`)
                                : 'Unmelded ✕'}
                            </span>
                          </div>
                          <div className="flex -space-x-2 overflow-x-auto py-0.5">
                            {grp.map((c) => (
                              <PlayingCard key={c.id} card={c} wildJokerRank={wildJokerRank} size="sm" disabled />
                            ))}
                          </div>
                          {grpStatus.hasJoker && grpStatus.isValid && grpStatus.detailText && (
                            <div className="text-[9px] text-amber-300 font-medium">
                              💡 {grpStatus.detailText}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    onClick={() => setShowDeclareModal(false)}
                    className="py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-300"
                  >
                    Cancel / Keep Playing
                  </button>
                  <button
                    onClick={handleConfirmDeclare}
                    disabled={actionLoading}
                    className={`py-2.5 px-6 rounded-xl font-black text-xs uppercase shadow-md transition-all ${
                      declareValidation.isValid
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:scale-105 shadow-emerald-500/30'
                        : 'bg-rose-600/80 hover:bg-rose-600 text-white'
                    }`}
                  >
                    {declareValidation.isValid ? 'Confirm & Win Match 🏆' : 'Submit Anyway (Risk 80 Pts)'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 
          DROP CONFIRMATION MODAL 
        */}
        {showDropModal && (() => {
          const entryFee = game?.entryFee || 20;
          const dropInfo = calculateDropPenalty(
            entryFee,
            game?.pointValue || (entryFee / 80),
            myPlayer?.turnsCount || 0,
            isMyTurn && Boolean(hasDrawn)
          );
          const refundAmount = Math.max(0, entryFee - dropInfo.penaltyRupees);

          return (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#12131e] border border-rose-500/50 rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto text-xl font-bold">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {dropInfo.isFirstDrop ? 'Confirm First Drop?' : 'Confirm Middle Drop?'}
                  </h3>
                  <span className="inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {dropInfo.isFirstDrop ? 'First Drop: 20 Points (25%)' : 'Middle Drop: 40 Points (50%)'}
                  </span>
                </div>

                <div className="bg-black/60 border border-white/10 rounded-2xl p-3.5 space-y-2 text-xs text-left">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Table Entry Buy-in:</span>
                    <span className="font-mono font-bold text-white">₹{entryFee}</span>
                  </div>
                  <div className="flex items-center justify-between text-rose-400 font-bold">
                    <span>Drop Penalty ({dropInfo.isFirstDrop ? '25%' : '50%'}):</span>
                    <span className="font-mono text-sm font-black">-₹{dropInfo.penaltyRupees}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-400 font-bold pt-1.5 border-t border-white/10">
                    <span>Refunded to Wallet:</span>
                    <span className="font-mono text-sm font-black">+₹{refundAmount}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {dropInfo.isFirstDrop
                    ? `First drop penalty ₹${dropInfo.penaltyRupees} will be deducted and remaining ₹${refundAmount} will be returned to your wallet.`
                    : `Middle drop penalty ₹${dropInfo.penaltyRupees} will be deducted and remaining ₹${refundAmount} will be returned to your wallet.`}
                </p>

                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    onClick={() => setShowDropModal(false)}
                    className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-300 transition-colors"
                  >
                    Keep Playing
                  </button>
                  <button
                    onClick={handleManualDrop}
                    disabled={actionLoading}
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-black uppercase shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? 'Dropping...' : `Confirm Drop (-₹${dropInfo.penaltyRupees})`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 
          MATCH RESULT OVERLAY 
        */}
        {game?.status === 'RESULT' && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-gradient-to-b from-[#161726] to-[#0c0d15] border border-amber-500/40 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 text-center max-h-[92vh] overflow-y-auto">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 p-0.5 mx-auto shadow-xl shadow-amber-500/30">
                <div className="w-full h-full bg-[#150a0f] rounded-[14px] flex items-center justify-center text-2xl font-black text-amber-400">
                  <Trophy className="w-7 h-7" />
                </div>
              </div>

              <div>
                <span className="text-xs font-extrabold tracking-widest uppercase text-amber-400">
                  Match Result
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  {game.winnerUid === user?.uid ? '🏆 Congratulations! You Won!' : 'Match Concluded'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hand #{game.gameId.slice(-8)} • Table {game.mode.toUpperCase()} (₹{game.entryFee} Stake)
                </p>
              </div>

              {/* Player Standings */}
              <div className="bg-[#090a12] border border-white/5 rounded-2xl p-4 text-xs divide-y divide-white/5">
                {players.map((p) => {
                  const isWinner = p.uid === game.winnerUid;
                  const pts = game.resultData?.scores[p.uid] ?? p.score ?? 0;
                  const entryFee = game.entryFee || 20;
                  const loserMoneyLoss = pts === 20
                    ? Math.round(entryFee * 0.25 * 100) / 100
                    : pts === 40
                    ? Math.round(entryFee * 0.50 * 100) / 100
                    : Math.min(
                        entryFee,
                        Math.max(1, Math.round(pts * (game.pointValue || (entryFee / 80)) * 100) / 100)
                      );
                  const loserRefund = Math.max(0, (p.entryPaid || entryFee) - loserMoneyLoss);

                  return (
                    <div key={p.uid} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                          isWinner ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/40' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isWinner ? 'W' : 'L'}
                        </span>
                        <div className="text-left">
                          <p className="font-bold text-white flex items-center gap-1.5">
                            <span>{p.displayName}</span>
                            {isWinner && <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-black">WINNER 🏆</span>}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">{p.playerId}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`font-black text-sm ${isWinner ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWinner ? `+${pts} Pts (Won)` : `-${pts} Pts (${p.status === 'dropped' ? (pts === 20 ? 'First Drop' : 'Middle Drop') : 'Loss'})`}
                        </p>
                        {isWinner && game.resultData?.payouts[p.uid] ? (
                          <div>
                            <span className="text-[11px] text-amber-300 font-bold block">
                              +₹{game.resultData.payouts[p.uid].toLocaleString('en-IN')} Net Winnings
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold block">
                              +₹{(game.resultData.winnerBuyInRefund || entryFee).toLocaleString('en-IN')} Buy-in Refunded
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[11px] text-rose-400 font-bold block">
                              -₹{loserMoneyLoss.toLocaleString('en-IN')} Penalty
                            </span>
                            {loserRefund > 0 && (
                              <span className="text-[10px] text-emerald-400 font-semibold block">
                                +₹{loserRefund.toLocaleString('en-IN')} Refunded from Buy-in
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Loser wallet deduction confirmation banner */}
              {game.winnerUid !== user?.uid && (() => {
                const myPts = game.resultData?.scores[user?.uid || ''] ?? myPlayer?.score ?? 20;
                const entryFee = game.entryFee || 20;
                const myLoss = myPts === 20
                  ? Math.round(entryFee * 0.25 * 100) / 100
                  : myPts === 40
                  ? Math.round(entryFee * 0.50 * 100) / 100
                  : Math.min(entryFee, Math.max(1, Math.round(myPts * (game.pointValue || (entryFee / 80)) * 100) / 100));
                const myRefund = Math.max(0, (myPlayer?.entryPaid || entryFee) - myLoss);

                return (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 text-xs text-rose-300 text-left flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <p className="font-bold text-white">Loss Settled</p>
                      <p className="text-[11px] text-slate-300">
                        ₹{myLoss} penalty deducted for {myPts} points. Remaining ₹{myRefund} from your ₹{entryFee} buy-in has been refunded to your wallet.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Winning Amount & 14% Platform Fee Breakdown */}
              {game.resultData && (game.resultData.grossWin || 0) > 0 && (
                <div className="bg-[#090a12] border border-amber-500/20 rounded-2xl p-4 text-xs space-y-2 text-left">
                  <div className="flex items-center justify-between font-bold text-amber-300 pb-1 border-b border-white/5">
                    <span>🏆 Points Won:</span>
                    <span className="font-mono text-base font-black text-emerald-400">
                      +{(game.winnerUid && game.resultData.scores[game.winnerUid]) || (game.resultData.winnerUid && game.resultData.scores[game.resultData.winnerUid]) || 0} Points
                    </span>
                  </div>
                  {Boolean(game.resultData?.winnerSetPoints && game.resultData.winnerSetPoints > 0) && (
                    <div className="flex items-center justify-between text-amber-300 text-[11px]">
                      <span>⭐ Set Bonus Points:</span>
                      <span className="font-mono font-bold">
                        +{game.resultData.winnerSetPoints} Pts ({game.resultData.winnerSets} sets × 20 Pts)
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between font-bold text-slate-300">
                    <span>Total Pot Won from Opponents:</span>
                    <span className="font-mono text-white">₹{game.resultData.grossWin?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-rose-300">
                    <span>Platform Fee (14% automatic cut):</span>
                    <span className="font-mono font-bold text-rose-400">-₹{game.resultData.platformFee?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-cyan-300 font-bold pt-1 border-t border-white/5">
                    <span>Entry Buy-in Returned (100% Refunded):</span>
                    <span className="font-mono text-base font-black text-cyan-300">+₹{(game.resultData.winnerBuyInRefund || game.entryFee)?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-400 font-bold pt-1.5 border-t border-white/10">
                    <span className="text-sm">Total Added to Your Balance:</span>
                    <span className="font-mono text-base font-black text-emerald-300">
                      +₹{((game.resultData.playerNetShare || 0) + (game.resultData.winnerBuyInRefund || game.entryFee || 0))?.toLocaleString('en-IN')} (Net Profit: +₹{game.resultData.playerNetShare?.toLocaleString('en-IN')})
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-300/90 pt-1">
                    💡 आपकी एंट्री फीस (₹{game.resultData.winnerBuyInRefund || game.entryFee}) पूरी वापस कर दी गई है और शुद्ध जीत (₹{game.resultData.playerNetShare}) Winnings वॉलेट में जमा हो चुकी है!
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link
                  href="/lobby"
                  className="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
                >
                  Return to Lobby
                </Link>
                <Link
                  href="/lobby"
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase shadow-lg shadow-amber-500/20"
                >
                  Play Another Match
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
