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
} from '@/lib/game-service';
import {
  isPureSequence,
  isImpureSequence,
  isValidSet,
  calculateLossPoints,
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
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

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

  // Open Declare Modal with grouped hand
  const handleOpenDeclare = () => {
    if (myPlayer?.cards) {
      const cards = [...myPlayer.cards];
      setDeclareGroups([
        cards.slice(0, 4),
        cards.slice(4, 7),
        cards.slice(7, 10),
        cards.slice(10),
      ]);
    }
    setShowDeclareModal(true);
  };

  const isMyTurn = game?.status === 'PLAYING' && game.turnUid === user?.uid;
  const hasDrawn = game?.hasDrawn;
  const wildJokerRank = game?.wildJoker?.rank;
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

  const handleDiscard = async () => {
    if (!game || !user || !isMyTurn || !hasDrawn || !selectedCardId || actionLoading) return;
    const cardObj = myPlayer?.cards?.find((c) => c.id === selectedCardId);
    if (!cardObj) return;

    setActionLoading(true);
    setErrorToast(null);
    try {
      soundManager.playCardDiscard();
      await discardCard(game.gameId, user.uid, cardObj);
      setSelectedCardId(null);
    } catch (err: unknown) {
      setErrorToast(err instanceof Error ? err.message : String(err));
    } finally {
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
    const sorted = [...myPlayer.cards].sort((a, b) => {
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      return a.rank.localeCompare(b.rank);
    });

    if (myPlayer) {
      const pRef = doc(db, 'games', gameId, 'players', myPlayer.uid);
      updateDoc(pRef, { cards: sorted });
      soundManager.playCardDraw();
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
        {/* Table Top Header Bar (Compact on mobile landscape) */}
        <div className="bg-[#0b0d14]/95 backdrop-blur border-b border-amber-500/20 px-2.5 sm:px-4 py-1.5 sm:py-2.5 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleLeaveTable}
              className="p-1 sm:p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Leave Table"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[11px] sm:text-xs font-black tracking-wider text-white uppercase">
                  {game?.mode} RUMMY
                </span>
                <span className="text-slate-600 hidden xs:inline">•</span>
                <span className="text-[10px] sm:text-[11px] font-mono text-amber-400 hidden xs:inline">
                  #{game?.gameId?.slice(-6)}
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400">
                Fee: ₹{game?.entryFee} • Players: {players.length}/6
              </p>
            </div>
          </div>

          {/* Reconnecting / Server sync indicator */}
          {isReconnecting && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-bold animate-pulse">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>SYNCING...</span>
            </div>
          )}

          {/* Controls: Auto-Rotate, How to Play, Copy invite, Audio, Drop */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Automatic Rotate / Fullscreen Button */}
            <button
              onClick={handleToggleAutoRotate}
              className="py-1 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-[10px] sm:text-xs font-bold flex items-center gap-1 transition-colors shadow"
              title="Auto-Rotate Screen to Landscape / Fullscreen"
            >
              <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
              <span className="hidden md:inline">Landscape Mode</span>
            </button>

            <button
              onClick={() => setShowHowToPlayModal(true)}
              className="py-1 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-[10px] sm:text-xs font-bold flex items-center gap-1 transition-colors shadow"
              title="How to Play Rummy"
            >
              <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
              <span className="hidden md:inline">Rules</span>
            </button>

            <button
              onClick={handleCopyInvite}
              className="py-1 px-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-[10px] sm:text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Share / Test with 2nd player"
            >
              {copiedLink ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" /> : <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />}
              <span className="hidden md:inline">{copiedLink ? 'Copied' : 'Invite'}</span>
            </button>

            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                soundManager.enabled = next;
              }}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
              title="Toggle Audio"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />}
            </button>

            <button
              onClick={() => setShowDropModal(true)}
              disabled={!isMyTurn || game?.status !== 'PLAYING'}
              className="py-1 sm:py-1.5 px-2.5 sm:px-3 rounded-lg sm:rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-[10px] sm:text-xs font-bold transition-all disabled:opacity-40"
            >
              DROP
            </button>
          </div>
        </div>

        {/* Mobile Portrait Rotation Notification Bar */}
        {isPortrait && (
          <div className="bg-amber-500/25 border-b border-amber-500/40 px-3 py-1 flex items-center justify-between text-xs text-amber-100 z-30 shrink-0">
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-amber-400 rotate-90 shrink-0" />
              <span className="text-[10px] sm:text-xs font-bold">
                📱 Automatic Landscape: Hold your phone sideways for full casino table view
              </span>
            </div>
            <button
              onClick={handleToggleAutoRotate}
              className="py-0.5 px-2 rounded bg-amber-400 hover:bg-amber-300 text-black text-[9px] font-black uppercase shadow shrink-0"
            >
              Rotate Screen
            </button>
          </div>
        )}

        {/* Error Toast */}
        {errorToast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-rose-950/95 border border-rose-500/60 text-rose-200 text-xs px-3 sm:px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce max-w-sm sm:max-w-md">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{errorToast}</span>
            <button onClick={() => setErrorToast(null)} className="ml-2 hover:text-white shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 
          6-PLAYER CIRCULAR/OVAL LUXURY CASINO TABLE (Fully Adaptive for Phone Landscape, Tablet & Desktop)
        */}
        <div className="flex-1 relative flex items-center justify-center p-1 sm:p-2.5 md:p-4 w-full h-full max-h-[calc(100dvh-44px)] overflow-hidden">
          <div className="w-full max-w-7xl h-full max-h-full rounded-2xl sm:rounded-[36px] md:rounded-[56px] lg:rounded-[72px] bg-gradient-to-b from-[#2a1708] via-[#1a0f05] to-[#2a1708] p-1 sm:p-2 md:p-3 shadow-2xl relative border-2 border-amber-600/30 flex items-center justify-center">
            {/* Gold Rail Lip */}
            <div className="w-full h-full rounded-xl sm:rounded-[30px] md:rounded-[48px] lg:rounded-[64px] border border-amber-400/40 p-0.5 sm:p-1.5 md:p-2 bg-[#0d0905]">
              {/* Green Felt Surface with Radial Glow */}
              <div className="w-full h-full rounded-lg sm:rounded-[26px] md:rounded-[42px] lg:rounded-[58px] table-felt-radial border border-emerald-950 shadow-inner relative flex flex-col justify-between p-1 sm:p-2.5 md:p-3.5 overflow-hidden">
                {/* Felt Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05]">
                  <span className="text-4xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white">♠ RUMMYADDA</span>
                </div>

                {/* 
                  1. TOP OPPONENT SEATS ROW (5 Seats for Opponents in 6-Player Table)
                */}
                <div className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-3 w-full relative z-10 pt-0.5 shrink-0">
                  {opponentSlots.map((idx) => {
                    const opp = opponents[idx];
                    if (opp) {
                      const isOppTurn = game?.turnUid === opp.uid;
                      return (
                        <div key={opp.uid} className="flex flex-col items-center gap-0.5 relative">
                          <div
                            className={`w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl p-0.5 transition-all shadow-xl ${
                              isOppTurn
                                ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 ring-2 sm:ring-4 ring-amber-400/50 scale-105'
                                : 'bg-slate-700/60'
                            }`}
                          >
                            <div className="w-full h-full bg-[#11131c] rounded-[10px] sm:rounded-[14px] flex items-center justify-center text-white font-bold text-[10px] sm:text-xs md:text-sm relative">
                              <span>{opp.displayName?.charAt(0).toUpperCase() || 'P'}</span>
                              {opp.isDealer && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-400 text-black font-black text-[8px] flex items-center justify-center shadow">
                                  D
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-center">
                            <span className="block text-[8px] sm:text-[10px] md:text-[11px] font-bold text-white max-w-[60px] sm:max-w-[70px] truncate">
                              {opp.displayName}
                            </span>
                            <span className="text-[7px] sm:text-[9px] font-mono text-amber-300 font-semibold block">
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
                      <div key={`empty-${idx}`} className="flex flex-col items-center gap-0.5 opacity-40">
                        <div className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center text-slate-500">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                        <span className="text-[7px] sm:text-[9px] text-slate-400 font-medium">Empty</span>
                      </div>
                    );
                  })}
                </div>

                {/* 
                  2. CENTER TABLE AREA (Waiting state / 15s Countdown / Playing Decks)
                */}
                <div className="flex-1 flex items-center justify-center gap-3 sm:gap-6 md:gap-10 relative z-10 my-0.5 min-h-0">
                  {/* WAITING ROOM (when waiting for real players) */}
                  {game?.status === 'WAITING' && (
                    <div className="bg-black/90 backdrop-blur-md border border-amber-500/40 px-4 sm:px-8 py-3 sm:py-5 rounded-2xl sm:rounded-3xl text-center space-y-2.5 shadow-2xl max-w-sm sm:max-w-md w-full">
                      <div className="flex items-center justify-center gap-2 text-amber-400">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                        <span className="font-extrabold text-xs sm:text-sm uppercase tracking-wider">
                          Waiting for Players ({players.length}/6)
                        </span>
                      </div>

                      <p className="text-[10px] sm:text-xs text-slate-300 leading-relaxed">
                        Wait for real players to join, or click below to play instantly with AI Bot!
                      </p>

                      {/* Instant AI Bot Match Button */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!game || !user) return;
                          setActionLoading(true);
                          setErrorToast(null);
                          try {
                            await startPracticeBotMatch(game.gameId, user.uid, profile);
                          } catch (err: unknown) {
                            setErrorToast(err instanceof Error ? err.message : String(err));
                          } finally {
                            setActionLoading(false);
                          }
                        }}
                        disabled={actionLoading}
                        className="w-full py-2 sm:py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs uppercase shadow-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                      >
                        <Bot className="w-4 h-4 text-black" />
                        <span>{actionLoading ? 'Starting Match...' : 'Play Instant Practice (AI Bot)'}</span>
                      </button>

                      <div className="flex flex-col sm:flex-row gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={handleCopyInvite}
                          className="flex-1 py-1.5 sm:py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-colors"
                        >
                          {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedLink ? 'Link Copied!' : 'Invite 2nd Player'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleLeaveQueue}
                          disabled={leavingQueue}
                          className="py-1.5 sm:py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white font-bold text-[11px] sm:text-xs border border-white/10 transition-colors disabled:opacity-50"
                        >
                          {leavingQueue ? 'Refunding...' : 'Cancel (Refund)'}
                        </button>
                      </div>
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
                    <div className="flex items-center gap-3 sm:gap-8">
                      {/* Wild Joker Display */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[9px] uppercase font-black tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                          WILD JOKER
                        </span>
                        {game.wildJoker ? (
                          <div className="rotate-90 origin-center scale-90 sm:scale-100">
                            <PlayingCard card={game.wildJoker} size="sm" disabled />
                          </div>
                        ) : null}
                      </div>

                      {/* Closed Deck (Draw Pile) */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[9px] uppercase font-bold text-slate-300">Closed Deck</span>
                        <div
                          onClick={() => handleDraw('closed')}
                          className={`w-12 h-18 sm:w-16 sm:h-24 rounded-xl bg-gradient-to-br from-rose-900 via-rose-800 to-amber-900 border-2 border-amber-400/50 shadow-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                            isMyTurn && !hasDrawn
                              ? 'ring-4 ring-amber-400 hover:scale-105 shadow-amber-500/40 animate-pulse'
                              : 'opacity-90'
                          }`}
                        >
                          <span className="text-base sm:text-lg font-black text-amber-400">♠</span>
                          <span className="text-[10px] font-bold text-amber-200">
                            {game.closedDeckCount}
                          </span>
                        </div>
                      </div>

                      {/* Open Deck (Discard Pile) */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[9px] uppercase font-bold text-slate-300">Open Deck</span>
                        {game.openDeck.length > 0 ? (
                          <div
                            onClick={() => handleDraw('open')}
                            className={`${isMyTurn && !hasDrawn ? 'ring-4 ring-amber-400 rounded-xl cursor-pointer hover:scale-105 transition-transform' : ''}`}
                          >
                            <PlayingCard
                              card={game.openDeck[game.openDeck.length - 1]}
                              wildJokerRank={wildJokerRank}
                              size="sm"
                              disabled={!isMyTurn || hasDrawn}
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-18 sm:w-16 sm:h-24 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-xs text-slate-500">
                            Empty
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 
                  3. BOTTOM AREA (Your Seat, Hand Cards, Turn Timer & Action Bar)
                */}
                <div className="w-full relative z-20 flex flex-col items-center gap-1.5 pb-1">
                  {/* Turn Status Message */}
                  {game?.status === 'PLAYING' && (
                    <div className="w-full max-w-md flex flex-col items-center gap-0.5">
                      <div className="flex items-center justify-between w-full text-xs font-bold px-2">
                        <span className={isMyTurn ? 'text-amber-400 animate-pulse font-extrabold' : 'text-slate-300'}>
                          {isMyTurn
                            ? !hasDrawn
                              ? '👉 Your Turn: Draw card from Closed Deck or Open Pile'
                              : '👉 Select a card to Discard or Declare'
                            : `${players.find((p) => p.uid === game.turnUid)?.displayName || 'Opponent'}'s turn...`}
                        </span>
                        <span className="font-mono text-white flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{turnTimeLeft}s</span>
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                        <div
                          className={`h-full transition-all duration-1000 ${
                            turnTimeLeft <= 10
                              ? 'bg-rose-500'
                              : turnTimeLeft <= 25
                              ? 'bg-amber-400'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (turnTimeLeft / 45) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Player Hand Cards with Wild Joker Indication */}
                  {myPlayer?.cards && myPlayer.cards.length > 0 && (
                    <div className="flex items-center justify-center -space-x-3 sm:-space-x-4 max-w-full overflow-x-auto py-1 px-4">
                      {myPlayer.cards.map((card) => {
                        const isWild = card.rank === wildJokerRank;
                        const isSelected = selectedCardId === card.id;
                        return (
                          <div key={card.id} className="relative group">
                            {isWild && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 bg-amber-400 text-black font-black text-[8px] px-1 py-0.2 rounded shadow">
                                JOKER
                              </span>
                            )}
                            <PlayingCard
                              card={card}
                              wildJokerRank={wildJokerRank}
                              isSelected={isSelected}
                              onClick={() => setSelectedCardId(isSelected ? null : card.id)}
                              size="md"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Action Controls Bar */}
                  {game?.status === 'PLAYING' && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
                      <button
                        onClick={handleAutoSortHand}
                        className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
                      >
                        SORT
                      </button>

                      {/* Live Hand Penalty Score & Explanatory Button */}
                      <button
                        type="button"
                        onClick={() => setShowHowToPlayModal(true)}
                        className="py-1 px-2.5 rounded-xl bg-black/60 border border-amber-500/30 hover:border-amber-400 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="In Rummy, points are penalties! Goal is 0 Points to win. Click to learn how to play."
                      >
                        <span className="text-slate-400 text-[11px]">Penalty:</span>
                        <span className={`font-mono font-black ${currentHandPenalty === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {currentHandPenalty} Pts
                        </span>
                        <span className="text-[10px] text-amber-300 font-bold hidden sm:inline">
                          (Goal: 0 Pts 🏆)
                        </span>
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                      </button>

                      <button
                        onClick={handleDiscard}
                        disabled={!isMyTurn || !hasDrawn || !selectedCardId || actionLoading}
                        className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase shadow-md transition-all active:scale-95 disabled:opacity-40"
                      >
                        DISCARD
                      </button>

                      <button
                        onClick={handleOpenDeclare}
                        disabled={!isMyTurn || actionLoading}
                        className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-xs uppercase shadow-md transition-all hover:scale-105 disabled:opacity-40"
                      >
                        DECLARE / SHOW
                      </button>
                    </div>
                  )}
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
        {showDeclareModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#12131e] border border-amber-500/40 rounded-3xl p-6 max-w-2xl w-full space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Declare Hand Show</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
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

              {/* Grouping Area */}
              <div className="space-y-3">
                <p className="text-xs text-amber-300 font-semibold">Your Grouped Cards:</p>
                <div className="grid grid-cols-2 gap-3">
                  {declareGroups.map((grp, gIdx) => (
                    <div key={gIdx} className="p-3 rounded-xl bg-[#090a12] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Group {gIdx + 1}</span>
                        <span className="text-amber-400">
                          {isPureSequence(grp, wildJokerRank)
                            ? 'Pure Sequence ✓'
                            : isImpureSequence(grp, wildJokerRank)
                            ? 'Impure Sequence'
                            : isValidSet(grp, wildJokerRank)
                            ? 'Valid Set'
                            : 'Unmelded'}
                        </span>
                      </div>
                      <div className="flex -space-x-2">
                        {grp.map((c) => (
                          <PlayingCard key={c.id} card={c} wildJokerRank={wildJokerRank} size="sm" disabled />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => setShowDeclareModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-white/10 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeclare}
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-xs uppercase shadow-md hover:scale-105 transition-all"
                >
                  Confirm Declaration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 
          DROP CONFIRMATION MODAL 
        */}
        {showDropModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#12131e] border border-rose-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto text-xl font-bold">
                !
              </div>
              <h3 className="text-lg font-bold text-white">Confirm Drop?</h3>
              <p className="text-xs text-slate-300">
                {game?.openDeck.length && game.openDeck.length > 1
                  ? 'Middle Drop: 40 points penalty will be applied.'
                  : 'First Drop: 20 points penalty will be applied.'}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowDropModal(false)}
                  className="py-2 px-4 rounded-xl bg-white/10 text-xs font-semibold text-slate-300"
                >
                  Keep Playing
                </button>
                <button
                  onClick={handleManualDrop}
                  className="py-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                >
                  Yes, Drop Hand
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 
          MATCH RESULT OVERLAY 
        */}
        {game?.status === 'RESULT' && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-gradient-to-b from-[#161726] to-[#0c0d15] border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 p-0.5 mx-auto shadow-xl shadow-amber-500/30">
                <div className="w-full h-full bg-[#150a0f] rounded-[14px] flex items-center justify-center text-3xl font-black text-amber-400">
                  <Trophy className="w-8 h-8" />
                </div>
              </div>

              <div>
                <span className="text-xs font-extrabold tracking-widest uppercase text-amber-400">
                  Match Result
                </span>
                <h2 className="text-2xl font-black text-white mt-1">
                  {game.winnerUid === user?.uid ? '🏆 Congratulations! You Won!' : 'Match Concluded'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hand #{game.gameId.slice(-8)} • Table {game.mode.toUpperCase()}
                </p>
              </div>

              {/* Player Standings */}
              <div className="bg-[#090a12] border border-white/5 rounded-2xl p-4 text-xs divide-y divide-white/5">
                {players.map((p) => {
                  const isWinner = p.uid === game.winnerUid;
                  const pts = game.resultData?.scores[p.uid] ?? p.score;
                  return (
                    <div key={p.uid} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          isWinner ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isWinner ? 'W' : 'L'}
                        </span>
                        <div className="text-left">
                          <p className="font-bold text-white">{p.displayName}</p>
                          <p className="text-[10px] font-mono text-slate-400">{p.playerId}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`font-black ${isWinner ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWinner ? '0 pts (Winner)' : `${pts} pts`}
                        </p>
                        {isWinner && game.resultData?.payouts[p.uid] ? (
                          <span className="text-[10px] text-amber-300 font-bold">
                            +₹{game.resultData.payouts[p.uid].toLocaleString('en-IN')} credited to Winnings!
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link
                  href="/lobby"
                  className="py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
                >
                  Return to Lobby
                </Link>
                <Link
                  href="/lobby"
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase shadow-lg shadow-amber-500/20"
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
