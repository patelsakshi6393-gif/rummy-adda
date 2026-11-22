import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { firebaseConfig, SUPPORT_WHATSAPP } from './firebase-config.js';
import { LudoGame, SAFE_SQUARES, getExpertBotMove } from './ludo-engine.js';
import { sound } from './sound.js';

// ============================================================================
// 1. FIREBASE & SHARED WALLET INITIALIZATION
// ============================================================================
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  auth = getAuth(app);
} catch (e) {
  console.warn('Firebase init error:', e);
}

let currentUser = null;
let currentProfile = null;
let userWallet = {
  depositBalance: 0,
  winBalance: 0,
  bonusBalance: 0
};

// Match Settings: Player is 'blue', Opponent is 'green'
let selectedPlayers = 2;
let selectedStake = 1; // Min ₹1 for Ludo
let game = null;
let botTimer = null;
let isMovingToken = false;

// 15-Second Turn Timer & Chance System (3 chances, 4th timeout = Automatic OUT)
let turnTimer = null;
let turnSeconds = 15;
let playerStrikes = 0;
let oppStrikes = 0;

// Matchmaking Pool: Authentic Indian Gamer Personas
const OPPONENT_POOL = [
  { name: 'Rahul Sharma', short: 'Rahul', city: 'Delhi NCR', rating: 1480, winRate: '68%', matches: 342, initials: 'RS' },
  { name: 'Aman Verma', short: 'Aman', city: 'Lucknow', rating: 1520, winRate: '72%', matches: 418, initials: 'AV' },
  { name: 'Vikram Rathore', short: 'Vikram', city: 'Jaipur', rating: 1410, winRate: '64%', matches: 289, initials: 'VR' },
  { name: 'Pooja Singh', short: 'Pooja', city: 'Patna', rating: 1560, winRate: '75%', matches: 512, initials: 'PS' },
  { name: 'Rohan Gupta', short: 'Rohan', city: 'Kolkata', rating: 1440, winRate: '66%', matches: 305, initials: 'RG' },
  { name: 'Deepak Kumar', short: 'Deepak', city: 'Mumbai', rating: 1495, winRate: '70%', matches: 388, initials: 'DK' },
  { name: 'Aditya Patel', short: 'Aditya', city: 'Ahmedabad', rating: 1530, winRate: '73%', matches: 460, initials: 'AP' },
  { name: 'Sneha Roy', short: 'Sneha', city: 'Chandigarh', rating: 1475, winRate: '69%', matches: 320, initials: 'SR' },
  { name: 'Arjun Mehra', short: 'Arjun', city: 'Indore', rating: 1505, winRate: '71%', matches: 395, initials: 'AM' },
  { name: 'Suresh Yadav', short: 'Suresh', city: 'Varanasi', rating: 1460, winRate: '67%', matches: 310, initials: 'SY' }
];
let matchedOpponent = OPPONENT_POOL[0];
let matchmakingTimer = null;
let matchmakingCountdown = 15;

// Color Palette Matching Image 1
const COLOR_MAP = {
  blue: '#0084d6',  // Player "You" (Bottom-Left)
  green: '#008e36', // Opponent (Top-Right)
  red: '#e01e2b',   // Red (Top-Left)
  yellow: '#fec300' // Yellow (Bottom-Right)
};

// ============================================================================
// 2. DOM ELEMENTS
// ============================================================================
const mainHeader = document.getElementById('main-header');
const headerBalanceVal = document.getElementById('header-balance-val');
const prizePoolDisplay = document.getElementById('prize-pool-display');
const boardPrizeVal = document.getElementById('board-prize-val');
const ludoLobbyView = document.getElementById('ludo-lobby-view');
const ludoBoardView = document.getElementById('ludo-board-view');
const ludoSvg = document.getElementById('ludo-svg');

const btnTopBack = document.getElementById('btn-top-back');
const btnHeaderBack = document.getElementById('btn-header-back');
const btnRollDice = document.getElementById('btn-roll-dice');
const diceSvg = document.getElementById('dice-svg');
const botDiceSvg = document.getElementById('bot-dice-svg');
const botDiceCube = document.getElementById('bot-dice-cube');
const diceArrowIndicator = document.getElementById('dice-arrow-indicator');

const modalWinner = document.getElementById('modal-winner');
const winnerTitle = document.getElementById('winner-title');
const winnerSub = document.getElementById('winner-sub');
const winnerPayout = document.getElementById('winner-payout');
const btnPlayAgain = document.getElementById('btn-play-again');

const modalDeposit = document.getElementById('modal-deposit');
const modalWithdraw = document.getElementById('modal-withdraw');
const modalSupport = document.getElementById('modal-support');
const modalAuth = document.getElementById('modal-auth');
const modalInsufficient = document.getElementById('modal-insufficient');
const insufficientMsg = document.getElementById('insufficient-msg');
const btnInsufficientDeposit = document.getElementById('btn-insufficient-deposit');
const modalLeave = document.getElementById('modal-leave');
const btnConfirmLeave = document.getElementById('btn-confirm-leave');

// Floating Toast Notification System (Zero Emojis, Pure SVGs)
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    info: 'bg-[#0f1730] border-amber-500/40 text-amber-200',
    success: 'bg-[#092317] border-emerald-500/50 text-emerald-200',
    error: 'bg-[#260c12] border-rose-500/50 text-rose-200',
    warning: 'bg-[#2a1705] border-amber-500/60 text-amber-100'
  };
  const iconSVGs = {
    info: '<svg class="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    success: '<svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>',
    error: '<svg class="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',
    warning: '<svg class="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>'
  };

  toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-semibold pointer-events-auto transform transition-all duration-300 ease-out translate-y-[-10px] opacity-0 ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    ${iconSVGs[type] || iconSVGs.info}
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-[-10px]', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-[-10px]', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Modal open/close helpers
function openModal(el) {
  if (el) {
    el.classList.remove('hidden');
    el.classList.add('flex');
  }
}
function closeModal(el) {
  if (el) {
    el.classList.add('hidden');
    el.classList.remove('flex');
  }
}
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.onclick = () => {
    btn.closest('.fixed')?.classList.add('hidden');
    btn.closest('.fixed')?.classList.remove('flex');
  };
});

function showInsufficientBalanceDialog(neededAmount, currentPlayable) {
  if (insufficientMsg) {
    insufficientMsg.innerText = `Your balance is ₹${currentPlayable.toFixed(2)}, but entry fee is ₹${neededAmount.toFixed(2)}. Please deposit cash to join the table!`;
  }
  openModal(modalInsufficient);
  showToast(`Insufficient balance (₹${currentPlayable.toFixed(2)}). Please add cash.`, 'warning');
}

if (btnInsufficientDeposit) {
  btnInsufficientDeposit.onclick = () => {
    closeModal(modalInsufficient);
    openModal(modalDeposit);
  };
}

// ============================================================================
// 3. 3D VECTOR ACRYLIC DICE RENDERER (NO EMOJIS)
// ============================================================================
function renderDiceFace(svgElement, val) {
  if (!svgElement) return;
  svgElement.innerHTML = '';

  // Background acrylic cube
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', '2');
  bg.setAttribute('y', '2');
  bg.setAttribute('width', '52');
  bg.setAttribute('height', '52');
  bg.setAttribute('rx', '10');
  bg.setAttribute('fill', 'url(#diceCubeGrad)');
  bg.setAttribute('stroke', '#cbd5e1');
  bg.setAttribute('stroke-width', '1.5');
  svgElement.appendChild(bg);

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="diceCubeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#f5f7fa"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
  `;
  svgElement.appendChild(defs);

  if (val <= 0) {
    // Unrolled initial pip
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', '28');
    dot.setAttribute('cy', '28');
    dot.setAttribute('r', '4.5');
    dot.setAttribute('fill', '#94a3b8');
    dot.setAttribute('opacity', '0.4');
    svgElement.appendChild(dot);
    return;
  }

  // Exact Pip Coordinates for standard dice (1 to 6)
  const pips = {
    1: [[28, 28, '#0f172a', 6]],
    2: [[18, 18, '#0f172a', 5], [38, 38, '#0f172a', 5]],
    3: [[17, 17, '#0f172a', 5], [28, 28, '#0f172a', 5], [39, 39, '#0f172a', 5]],
    4: [[18, 18, '#0f172a', 5], [38, 18, '#0f172a', 5], [18, 38, '#0f172a', 5], [38, 38, '#0f172a', 5]],
    5: [[18, 18, '#0f172a', 5], [38, 18, '#0f172a', 5], [28, 28, '#0f172a', 5], [18, 38, '#0f172a', 5], [38, 38, '#0f172a', 5]],
    6: [[18, 16, '#0f172a', 5], [18, 28, '#0f172a', 5], [18, 40, '#0f172a', 5], [38, 16, '#0f172a', 5], [38, 28, '#0f172a', 5], [38, 40, '#0f172a', 5]]
  };

  const currentPips = pips[val] || pips[1];
  currentPips.forEach(([cx, cy, fill, r]) => {
    // Drop shadow inside pip
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    shadow.setAttribute('cx', cx);
    shadow.setAttribute('cy', cy + 0.6);
    shadow.setAttribute('r', r);
    shadow.setAttribute('fill', 'rgba(0,0,0,0.3)');
    svgElement.appendChild(shadow);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', fill);
    svgElement.appendChild(circle);
  });
}

// Initial dice display
renderDiceFace(diceSvg, 2);
renderDiceFace(botDiceSvg, 1);

// ============================================================================
// 4. WALLET & AUTH SYNCHRONIZATION
// ============================================================================
function getPlayableBalance() {
  return (userWallet.depositBalance || 0) + (userWallet.winBalance || 0) + (userWallet.bonusBalance || 0);
}

function updateWalletUI() {
  const playable = getPlayableBalance();
  if (headerBalanceVal) {
    headerBalanceVal.innerText = `₹ ${playable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const wdVal = document.getElementById('withdrawable-val');
  if (wdVal) {
    wdVal.innerText = `₹ ${(userWallet.winBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

async function deductMatchFee(amount) {
  if (!currentUser) {
    openModal(modalAuth);
    showToast('Please sign in or create an account to play with real cash.', 'info');
    return false;
  }

  const playable = getPlayableBalance();
  if (playable < amount) {
    showInsufficientBalanceDialog(amount, playable);
    return false;
  }

  try {
    const walletRef = doc(db, 'wallets', currentUser.uid);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(walletRef);
      if (!snap.exists()) throw new Error('Wallet not found');
      const w = snap.data();

      let dep = w.depositBalance || 0;
      let bon = w.bonusBalance || 0;
      let win = w.winBalance || 0;

      let rem = amount;
      const depDec = Math.min(dep, rem);
      rem -= depDec;
      const bonDec = Math.min(bon, rem);
      rem -= bonDec;
      const winDec = rem;

      tx.update(walletRef, {
        depositBalance: Math.max(0, dep - depDec),
        bonusBalance: Math.max(0, bon - bonDec),
        winBalance: Math.max(0, win - winDec),
        updatedAt: new Date().toISOString()
      });
    });

    const txRef = doc(db, 'transactions', `ludo_entry_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    setDoc(txRef, {
      id: txRef.id,
      uid: currentUser.uid,
      type: 'game_entry',
      amount: amount,
      currency: 'INR',
      status: 'completed',
      description: `Ludo Match Entry - ₹${amount}`,
      createdAt: new Date().toISOString()
    }).catch(console.warn);

    return true;
  } catch (err) {
    console.error('Ludo fee deduction error:', err);
    showToast('Failed to enter match table. Please try again.', 'error');
    return false;
  }
}

async function creditMatchWinnings(winAmount) {
  if (!currentUser) return;

  try {
    const walletRef = doc(db, 'wallets', currentUser.uid);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(walletRef);
      if (!snap.exists()) return;
      const w = snap.data();
      tx.update(walletRef, {
        winBalance: (w.winBalance || 0) + winAmount,
        updatedAt: new Date().toISOString()
      });
    });

    const txRef = doc(db, 'transactions', `ludo_win_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    setDoc(txRef, {
      id: txRef.id,
      uid: currentUser.uid,
      type: 'game_win',
      amount: winAmount,
      currency: 'INR',
      status: 'completed',
      description: `Ludo Match Victory - Won ₹${winAmount.toFixed(2)}`,
      createdAt: new Date().toISOString()
    }).catch(console.warn);
  } catch (err) {
    console.error('Credit winnings error:', err);
  }
}

// ============================================================================
// 5. MATCH LAUNCH & NAVIGATION
// ============================================================================
function updatePrizePool() {
  const pot = (selectedStake * selectedPlayers * 0.9).toFixed(2);
  if (prizePoolDisplay) prizePoolDisplay.innerText = `₹ ${pot}`;
  if (boardPrizeVal) boardPrizeVal.innerText = `₹ ${pot}`;
}
updatePrizePool();

// ============================================================================
// 5. MATCHMAKING SYSTEM (15s Search -> Realistic Expert Opponent)
// ============================================================================
function startMatchmaking() {
  if (!currentUser) {
    openModal(modalAuth);
    showToast('Please sign in or create an account to play with real cash.', 'info');
    return;
  }

  const playable = getPlayableBalance();
  if (playable < selectedStake) {
    showInsufficientBalanceDialog(selectedStake, playable);
    return;
  }

  // Hide lobby, reveal matchmaking view
  if (mainHeader) mainHeader.classList.add('hidden');
  ludoLobbyView.classList.add('hidden');
  const mmView = document.getElementById('ludo-matchmaking-view');
  if (mmView) {
    mmView.classList.remove('hidden');
    mmView.classList.add('flex');
  }

  // Populate Stake & Player name
  const stakeElem = document.getElementById('match-stake-val');
  if (stakeElem) stakeElem.innerText = selectedStake;
  const pName = document.getElementById('match-player-name');
  if (pName) pName.innerText = currentProfile?.displayName || currentUser.email?.split('@')[0] || 'You';

  // Reset Opponent card in matchmaking
  const oppCard = document.getElementById('matchmaking-opp-card');
  const oppAvatar = document.getElementById('match-opp-avatar');
  const oppName = document.getElementById('match-opp-name');
  const oppStatus = document.getElementById('match-opp-status');
  const mmHeadline = document.getElementById('matchmaking-headline');
  const mmSubtext = document.getElementById('matchmaking-subtext');
  const mmSecs = document.getElementById('matchmaking-seconds');

  if (oppCard) oppCard.className = 'p-3 rounded-2xl bg-[#0f1730] border-2 border-white/10 flex items-center gap-2.5 shadow-lg transition-all';
  if (oppAvatar) {
    oppAvatar.className = 'w-10 h-10 rounded-xl bg-slate-800 border border-white/20 flex items-center justify-center text-amber-400 font-black text-sm shrink-0 animate-pulse';
    oppAvatar.innerText = '?';
  }
  if (oppName) {
    oppName.className = 'text-xs font-black text-slate-400 truncate';
    oppName.innerText = 'Searching...';
  }
  if (oppStatus) oppStatus.innerText = 'Connecting table';
  if (mmHeadline) mmHeadline.innerText = 'Finding Opponent';
  if (mmSubtext) mmSubtext.innerText = `Matching with online player for ₹${selectedStake} table...`;

  matchmakingCountdown = 15;
  if (mmSecs) mmSecs.innerText = '15';

  // Random realistic match time between 3s and 12s
  const matchDelay = Math.floor(Math.random() * 8000) + 3500;
  const chosenOpponent = OPPONENT_POOL[Math.floor(Math.random() * OPPONENT_POOL.length)];
  matchedOpponent = chosenOpponent;

  let matchFound = false;
  if (matchmakingTimer) clearInterval(matchmakingTimer);

  matchmakingTimer = setInterval(() => {
    matchmakingCountdown--;
    if (mmSecs) mmSecs.innerText = matchmakingCountdown;

    if (matchmakingCountdown <= 0 && !matchFound) {
      matchFound = true;
      clearInterval(matchmakingTimer);
      matchmakingTimer = null;
      triggerMatchFound(chosenOpponent);
    }
  }, 1000);

  setTimeout(() => {
    if (!matchFound && matchmakingTimer) {
      matchFound = true;
      clearInterval(matchmakingTimer);
      matchmakingTimer = null;
      triggerMatchFound(chosenOpponent);
    }
  }, matchDelay);
}

function cancelMatchmaking() {
  if (matchmakingTimer) {
    clearInterval(matchmakingTimer);
    matchmakingTimer = null;
  }
  const mmView = document.getElementById('ludo-matchmaking-view');
  if (mmView) {
    mmView.classList.add('hidden');
    mmView.classList.remove('flex');
  }
  if (mainHeader) mainHeader.classList.remove('hidden');
  ludoLobbyView.classList.remove('hidden');
  showToast('Matchmaking cancelled.', 'info');
}

const btnCancelMatchmaking = document.getElementById('btn-cancel-matchmaking');
if (btnCancelMatchmaking) {
  btnCancelMatchmaking.onclick = () => cancelMatchmaking();
}

function triggerMatchFound(opponent) {
  sound.playMatchFound();

  const oppCard = document.getElementById('matchmaking-opp-card');
  const oppAvatar = document.getElementById('match-opp-avatar');
  const oppName = document.getElementById('match-opp-name');
  const oppStatus = document.getElementById('match-opp-status');
  const mmHeadline = document.getElementById('matchmaking-headline');
  const mmSubtext = document.getElementById('matchmaking-subtext');

  if (oppCard) oppCard.className = 'p-3 rounded-2xl bg-emerald-950/70 border-2 border-emerald-400 flex items-center gap-2.5 shadow-2xl transition-all scale-105';
  if (oppAvatar) {
    oppAvatar.className = 'w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 border border-emerald-300 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 shadow';
    oppAvatar.innerText = opponent.initials;
  }
  if (oppName) {
    oppName.className = 'text-xs font-black text-white truncate';
    oppName.innerText = opponent.name;
  }
  if (oppStatus) oppStatus.innerText = `Verified • ${opponent.city}`;
  if (mmHeadline) mmHeadline.innerText = 'OPPONENT MATCHED!';
  if (mmSubtext) mmSubtext.innerText = `Starting table with ${opponent.short}...`;

  showToast(`Matched with ${opponent.name} (${opponent.city})!`, 'success');

  setTimeout(() => {
    const mmView = document.getElementById('ludo-matchmaking-view');
    if (mmView) {
      mmView.classList.add('hidden');
      mmView.classList.remove('flex');
    }
    launchBoardGame();
  }, 1800);
}

// Launch Board Game after Matchmaking
async function launchBoardGame() {
  // Instant optimistic balance deduction (0ms latency)
  let rem = selectedStake;
  const dep = Math.min(userWallet.depositBalance || 0, rem);
  userWallet.depositBalance = Math.max(0, (userWallet.depositBalance || 0) - dep);
  rem -= dep;
  const bon = Math.min(userWallet.bonusBalance || 0, rem);
  userWallet.bonusBalance = Math.max(0, (userWallet.bonusBalance || 0) - bon);
  rem -= bon;
  userWallet.winBalance = Math.max(0, (userWallet.winBalance || 0) - rem);
  updateWalletUI();

  // Reset 15s turn timer & strikes
  resetStrikes();

  // Initialize Game: Blue ("You") starts first vs Green (Matched Opponent)
  game = new LudoGame(selectedPlayers, selectedStake);

  if (mainHeader) mainHeader.classList.add('hidden');
  ludoLobbyView.classList.add('hidden');
  ludoBoardView.classList.remove('hidden');
  ludoBoardView.classList.add('flex');

  // Update Opponent & You Display names
  const oppNameElem = document.getElementById('opp-display-name');
  if (oppNameElem) oppNameElem.innerText = matchedOpponent.name;
  const youNameElem = document.getElementById('you-display-name');
  if (youNameElem) youNameElem.innerText = currentProfile?.displayName || 'You';

  updatePrizePool();
  renderDiceFace(diceSvg, 2);
  renderDiceFace(botDiceSvg, 1);
  renderLudoBoard();
  updateTurnState();

  // Synchronize to Firestore asynchronously in background
  deductMatchFee(selectedStake).catch(console.warn);
}

// 15-SECOND TURN TIMER & 4TH TIMEOUT OUT SYSTEM
function resetStrikes() {
  playerStrikes = 0;
  oppStrikes = 0;
  clearTurnTimer();
  updateStrikesUI();
}

function updateStrikesUI() {
  // Player strikes (3 lives)
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`you-strike-${i}`);
    if (dot) {
      if (playerStrikes >= i) {
        dot.className = 'w-2 h-2 rounded-full bg-slate-600 border border-slate-500 shadow-sm transition-colors';
      } else {
        dot.className = playerStrikes === 2
          ? 'w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-sm transition-colors'
          : 'w-2 h-2 rounded-full bg-emerald-400 shadow-sm transition-colors';
      }
    }
  }

  // Opponent strikes (3 lives)
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`opp-strike-${i}`);
    if (dot) {
      if (oppStrikes >= i) {
        dot.className = 'w-2 h-2 rounded-full bg-slate-600 border border-slate-500 shadow-sm transition-colors';
      } else {
        dot.className = oppStrikes === 2
          ? 'w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-sm transition-colors'
          : 'w-2 h-2 rounded-full bg-emerald-400 shadow-sm transition-colors';
      }
    }
  }
}

function clearTurnTimer() {
  if (turnTimer) {
    clearInterval(turnTimer);
    turnTimer = null;
  }
  const youBox = document.getElementById('you-timer-box');
  const oppBox = document.getElementById('opp-timer-box');
  if (youBox) youBox.classList.add('hidden');
  if (oppBox) oppBox.classList.add('hidden');
}

function startTurnTimer(currentTurn) {
  clearTurnTimer();
  turnSeconds = 15;

  const youBox = document.getElementById('you-timer-box');
  const youSec = document.getElementById('you-timer-sec');
  const oppBox = document.getElementById('opp-timer-box');
  const oppSec = document.getElementById('opp-timer-sec');

  if (currentTurn === 'blue') {
    if (youBox && youSec) {
      youBox.classList.remove('hidden');
      youBox.className = 'flex items-center px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] font-mono-num animate-pulse';
      youSec.innerText = '15s';
    }
  } else {
    if (oppBox && oppSec) {
      oppBox.classList.remove('hidden');
      oppBox.className = 'flex items-center px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 font-black text-[9px] font-mono-num';
      oppSec.innerText = '15s';
    }
  }

  turnTimer = setInterval(() => {
    turnSeconds--;

    if (currentTurn === 'blue') {
      if (youSec) youSec.innerText = `${turnSeconds}s`;
      if (turnSeconds <= 5) {
        if (youBox) youBox.className = 'flex items-center px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black text-[9px] font-mono-num animate-ping';
        sound.playTick();
      }
    } else {
      if (oppSec) oppSec.innerText = `${turnSeconds}s`;
      if (turnSeconds <= 5) {
        if (oppBox) oppBox.className = 'flex items-center px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black text-[9px] font-mono-num animate-ping';
        sound.playTick();
      }
    }

    if (turnSeconds <= 0) {
      clearTurnTimer();
      handleTurnTimeout(currentTurn);
    }
  }, 1000);
}

function handleTurnTimeout(timedOutColor) {
  if (!game || game.winner) return;

  if (timedOutColor === 'blue') {
    playerStrikes++;
    sound.playTimeout();
    updateStrikesUI();

    if (playerStrikes >= 4) {
      // 4TH TIMEOUT: AUTOMATIC OUT / FORFEIT
      showToast('4th Missed Turn! You have been eliminated from the match.', 'error');
      sound.playLose();
      handleGameOver('green', 'player_eliminated');
      return;
    }

    showToast(`Turn timed out! Missed chance ${playerStrikes}/3 (4th timeout = Out).`, 'warning');

    // If player had already rolled dice, auto-move first eligible token
    if (game.hasRolled) {
      const validMoves = game.getValidMoves('blue');
      if (validMoves.length > 0) {
        onPlayerTokenClick(validMoves[0]);
        return;
      }
    }

    game.nextTurn();
    renderLudoBoard();
    updateTurnState();
  } else {
    oppStrikes++;
    sound.playTimeout();
    updateStrikesUI();

    if (oppStrikes >= 4) {
      // OPPONENT 4TH TIMEOUT: AUTOMATIC OUT
      showToast(`${matchedOpponent.name} missed 4 turns! You won by forfeit!`, 'success');
      sound.playWin();
      handleGameOver('blue', 'opp_eliminated');
      return;
    }

    showToast(`${matchedOpponent.short} missed chance ${oppStrikes}/3.`, 'info');
    game.nextTurn();
    renderLudoBoard();
    updateTurnState();
  }
}

function returnToLobby() {
  clearTurnTimer();
  if (matchmakingTimer) clearInterval(matchmakingTimer);
  if (botTimer) clearTimeout(botTimer);
  game = null;
  ludoBoardView.classList.add('hidden');
  ludoBoardView.classList.remove('flex');
  const mmView = document.getElementById('ludo-matchmaking-view');
  if (mmView) {
    mmView.classList.add('hidden');
    mmView.classList.remove('flex');
  }
  if (mainHeader) mainHeader.classList.remove('hidden');
  ludoLobbyView.classList.remove('hidden');

  // If running inside Next.js iframe, return to parent /lobby
  try {
    if (window.top && window.top !== window) {
      window.top.location.href = '/lobby';
    }
  } catch (e) {
    window.location.href = '/lobby';
  }
}

// Back Buttons
btnTopBack.onclick = () => {
  if (game && !game.winner) {
    openModal(modalLeave);
  } else {
    returnToLobby();
  }
};

if (btnHeaderBack) {
  btnHeaderBack.onclick = () => {
    returnToLobby();
  };
}

if (btnConfirmLeave) {
  btnConfirmLeave.onclick = () => {
    closeModal(modalLeave);
    returnToLobby();
    showToast('Match forfeited. Returned to lobby.', 'info');
  };
}

// Lobby Controls
document.getElementById('btn-players-2').onclick = () => {
  selectedPlayers = 2;
  document.getElementById('btn-players-2').className = 'py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-sm shadow-md transition-all';
  document.getElementById('btn-players-4').className = 'py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-sm transition-all border border-white/5';
  updatePrizePool();
};

document.getElementById('btn-players-4').onclick = () => {
  selectedPlayers = 4;
  document.getElementById('btn-players-4').className = 'py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-sm shadow-md transition-all';
  document.getElementById('btn-players-2').className = 'py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-sm transition-all border border-white/5';
  updatePrizePool();
};

document.querySelectorAll('.stake-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.stake-btn').forEach(b => {
      b.className = 'stake-btn py-2.5 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10 text-white font-mono-num font-black text-sm';
    });
    btn.className = 'stake-btn py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md ring-2 ring-amber-300/80 scale-105 font-mono-num font-black text-sm';
    selectedStake = parseInt(btn.dataset.stake, 10);
    updatePrizePool();
  };
});

document.getElementById('btn-start-ludo-match').onclick = () => {
  startMatchmaking();
};

// ============================================================================
// 6. SVG 15x15 BOARD RENDERER WITH 3D GOTIS (EXACT IMAGE 1 REPLICA)
// ============================================================================
function appendGotiDefs() {
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <!-- Gold Metallic Collar for Pawns -->
    <linearGradient id="goldCollar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="30%" stop-color="#fde047"/>
      <stop offset="70%" stop-color="#fffbeb"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>

    <!-- Blue Goti Gradients -->
    <radialGradient id="pawnHead_blue" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#7dd3fc"/>
      <stop offset="45%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#075985"/>
    </radialGradient>
    <linearGradient id="pawnBody_blue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="60%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>

    <!-- Green Goti Gradients -->
    <radialGradient id="pawnHead_green" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#86efac"/>
      <stop offset="45%" stop-color="#16a34a"/>
      <stop offset="100%" stop-color="#14532d"/>
    </radialGradient>
    <linearGradient id="pawnBody_green" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4ade80"/>
      <stop offset="60%" stop-color="#16a34a"/>
      <stop offset="100%" stop-color="#15803d"/>
    </linearGradient>

    <!-- Red Goti Gradients -->
    <radialGradient id="pawnHead_red" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fca5a5"/>
      <stop offset="45%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </radialGradient>
    <linearGradient id="pawnBody_red" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f87171"/>
      <stop offset="60%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </linearGradient>

    <!-- Yellow Goti Gradients -->
    <radialGradient id="pawnHead_yellow" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="45%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#713f12"/>
    </radialGradient>
    <linearGradient id="pawnBody_yellow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="60%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#a16207"/>
    </linearGradient>
  `;
  ludoSvg.appendChild(defs);
}

function renderLudoBoard() {
  if (!game) return;
  ludoSvg.innerHTML = '';
  appendGotiDefs();

  // Base white canvas
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '15');
  bg.setAttribute('height', '15');
  bg.setAttribute('fill', '#ffffff');
  ludoSvg.appendChild(bg);

  // 1. Draw 4 Quadrant Yards (Matching Image 1)
  // Top-Left: RED
  drawYard(0, 0, COLOR_MAP.red);
  // Top-Right: GREEN (Matched Opponent)
  drawYard(9, 0, COLOR_MAP.green);
  // Bottom-Left: BLUE (You)
  drawYard(0, 9, COLOR_MAP.blue);
  // Bottom-Right: YELLOW
  drawYard(9, 9, COLOR_MAP.yellow);

  // 2. Yard Labels on the Board: Opponent Name over Green yard, "You" under Blue yard
  drawBoardText(12, 0.75, matchedOpponent?.short || 'Opponent');
  drawBoardText(3, 14.75, 'You');

  // 3. Draw Track Grid (15x15 cells outside yards and center)
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const inYard = (r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8);
      const inCenter = (r >= 6 && r <= 8 && c >= 6 && c <= 8);

      if (!inYard && !inCenter) {
        let fill = '#ffffff';

        // Home straight columns / rows
        if (r === 7 && c >= 1 && c <= 5) fill = COLOR_MAP.red;
        else if (c === 7 && r >= 1 && r <= 5) fill = COLOR_MAP.green;
        else if (r === 7 && c >= 9 && c <= 13) fill = COLOR_MAP.yellow;
        else if (c === 7 && r >= 9 && r <= 13) fill = COLOR_MAP.blue;
        // Start track tiles
        else if (r === 6 && c === 1) fill = COLOR_MAP.red;
        else if (r === 1 && c === 8) fill = COLOR_MAP.green;
        else if (r === 8 && c === 13) fill = COLOR_MAP.yellow;
        else if (r === 13 && c === 6) fill = COLOR_MAP.blue;

        drawTrackCell(c, r, fill);

        // Safe Squares with Clean White Vector 5-Point Stars (Matching Image 1)
        const isSafeStar = (r === 2 && c === 6) || (r === 8 && c === 2) || (r === 6 && c === 12) || (r === 12 && c === 8);
        if (isSafeStar) {
          drawVectorStar(c + 0.5, r + 0.5);
        }

        // Track Entrance Arrows (Matching Image 1)
        if (r === 0 && c === 7) drawArrow(c + 0.5, r + 0.5, 'down', COLOR_MAP.green);
        if (r === 7 && c === 0) drawArrow(c + 0.5, r + 0.5, 'right', COLOR_MAP.red);
        if (r === 7 && c === 14) drawArrow(c + 0.5, r + 0.5, 'left', COLOR_MAP.yellow);
        if (r === 14 && c === 7) drawArrow(c + 0.5, r + 0.5, 'up', COLOR_MAP.blue);
      }
    }
  }

  // 4. Center Apex Triangles (Red, Green, Yellow, Blue meeting at 7.5, 7.5)
  drawTriangle('6,6 9,6 7.5,7.5', COLOR_MAP.green);
  drawTriangle('6,6 6,9 7.5,7.5', COLOR_MAP.red);
  drawTriangle('9,6 9,9 7.5,7.5', COLOR_MAP.yellow);
  drawTriangle('6,9 9,9 7.5,7.5', COLOR_MAP.blue);

  // 5. Draw 3D Sculpted Gotis
  drawTokens();
}

function drawYard(x, y, colorHex) {
  // Outer Solid Color Yard (6x6)
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', '6');
  rect.setAttribute('height', '6');
  rect.setAttribute('fill', colorHex);
  rect.setAttribute('stroke', '#000000');
  rect.setAttribute('stroke-width', '0.04');
  ludoSvg.appendChild(rect);

  // Inner White Square (4x4)
  const inner = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  inner.setAttribute('x', x + 1);
  inner.setAttribute('y', y + 1);
  inner.setAttribute('width', '4');
  inner.setAttribute('height', '4');
  inner.setAttribute('fill', '#ffffff');
  inner.setAttribute('stroke', '#000000');
  inner.setAttribute('stroke-width', '0.04');
  ludoSvg.appendChild(inner);

  // 4 Token Yard Spots (2x2 Grid)
  const spots = [
    [x + 2, y + 2],
    [x + 4, y + 2],
    [x + 2, y + 4],
    [x + 4, y + 4]
  ];
  spots.forEach(([cx, cy]) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', '0.45');
    circle.setAttribute('fill', colorHex);
    circle.setAttribute('stroke', 'rgba(0,0,0,0.15)');
    circle.setAttribute('stroke-width', '0.03');
    ludoSvg.appendChild(circle);
  });
}

function drawTrackCell(x, y, fill) {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', '1');
  rect.setAttribute('height', '1');
  rect.setAttribute('fill', fill);
  rect.setAttribute('stroke', '#475569');
  rect.setAttribute('stroke-width', '0.03');
  ludoSvg.appendChild(rect);
}

function drawBoardText(x, y, text) {
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('x', x);
  t.setAttribute('y', y);
  t.setAttribute('fill', '#ffffff');
  t.setAttribute('font-size', '0.62');
  t.setAttribute('font-weight', '900');
  t.setAttribute('font-family', 'Inter, sans-serif');
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('dominant-baseline', 'middle');
  t.textContent = text;
  ludoSvg.appendChild(t);
}

// White 5-Point Star with dark outline (Exact match to Image 1)
function drawVectorStar(cx, cy) {
  const points = [];
  const spikes = 5;
  const outerR = 0.32;
  const innerR = 0.15;

  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    points.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
  }

  const star = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  star.setAttribute('points', points.join(' '));
  star.setAttribute('fill', '#ffffff');
  star.setAttribute('stroke', '#1e293b');
  star.setAttribute('stroke-width', '0.035');
  star.setAttribute('stroke-linejoin', 'round');
  ludoSvg.appendChild(star);
}

function drawArrow(cx, cy, direction, color) {
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  let d = '';
  if (direction === 'down') {
    d = `M ${cx} ${cy + 0.32} L ${cx - 0.22} ${cy - 0.15} L ${cx - 0.08} ${cy - 0.15} L ${cx - 0.08} ${cy - 0.32} L ${cx + 0.08} ${cy - 0.32} L ${cx + 0.08} ${cy - 0.15} L ${cx + 0.22} ${cy - 0.15} Z`;
  } else if (direction === 'up') {
    d = `M ${cx} ${cy - 0.32} L ${cx - 0.22} ${cy + 0.15} L ${cx - 0.08} ${cy + 0.15} L ${cx - 0.08} ${cy + 0.32} L ${cx + 0.08} ${cy + 0.32} L ${cx + 0.08} ${cy + 0.15} L ${cx + 0.22} ${cy + 0.15} Z`;
  } else if (direction === 'right') {
    d = `M ${cx + 0.32} ${cy} L ${cx - 0.15} ${cy - 0.22} L ${cx - 0.15} ${cy - 0.08} L ${cx - 0.32} ${cy - 0.08} L ${cx - 0.32} ${cy + 0.08} L ${cx - 0.15} ${cy + 0.08} L ${cx - 0.15} ${cy + 0.22} Z`;
  } else if (direction === 'left') {
    d = `M ${cx - 0.32} ${cy} L ${cx + 0.15} ${cy - 0.22} L ${cx + 0.15} ${cy - 0.08} L ${cx + 0.32} ${cy - 0.08} L ${cx + 0.32} ${cy + 0.08} L ${cx + 0.15} ${cy + 0.08} L ${cx + 0.15} ${cy + 0.22} Z`;
  }
  arrow.setAttribute('d', d);
  arrow.setAttribute('fill', color);
  arrow.setAttribute('stroke', '#1e293b');
  arrow.setAttribute('stroke-width', '0.02');
  ludoSvg.appendChild(arrow);
}

function drawTriangle(points, fill) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  p.setAttribute('points', points);
  p.setAttribute('fill', fill);
  p.setAttribute('stroke', '#000000');
  p.setAttribute('stroke-width', '0.04');
  ludoSvg.appendChild(p);
}

// 3D REALISTIC ACRYLIC GOTIS (PREMIUM SCULPTED PAWNS)
function drawTokens() {
  const isPlayerTurn = game.currentTurn === 'blue';
  const validMoves = (isPlayerTurn && game.hasRolled && !isMovingToken) ? game.getValidMoves('blue') : [];

  // Group tokens by cell coordinate to prevent stacking overlap
  const cellOccupancy = {};
  game.turnOrder.forEach(color => {
    game.tokens[color].forEach(tok => {
      if (tok.step === 56) return; // Finished in home
      const [r, c] = game.getTokenGridCoord(color, tok.id);
      const key = `${r}_${c}`;
      if (!cellOccupancy[key]) cellOccupancy[key] = [];
      cellOccupancy[key].push({ color, tok, r, c });
    });
  });

  // Render tokens with intelligent fanning on shared cells
  Object.values(cellOccupancy).forEach(group => {
    const totalInCell = group.length;

    group.forEach((item, index) => {
      const { color, tok, r, c } = item;
      const isMovable = color === 'blue' && validMoves.includes(tok.id);

      // Center with intelligent spread if multiple pawns share cell
      let cx = c + 0.5;
      let cy = r + 0.5;

      if (totalInCell === 2 && tok.step >= 0) {
        cx += (index === 0 ? -0.15 : 0.15);
      } else if (totalInCell >= 3 && tok.step >= 0) {
        cx += (index - (totalInCell - 1) / 2) * 0.18;
      }

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      if (isMovable) {
        g.setAttribute('class', 'token-movable cursor-pointer');
      }

      // 1. Soft Ground Drop Shadow Underneath
      const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      shadow.setAttribute('cx', cx);
      shadow.setAttribute('cy', cy + 0.34);
      shadow.setAttribute('rx', '0.28');
      shadow.setAttribute('ry', '0.11');
      shadow.setAttribute('fill', 'rgba(0,0,0,0.45)');
      g.appendChild(shadow);

      // 2. Movable Golden Pulsing Aura Ring
      if (isMovable) {
        const aura = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        aura.setAttribute('cx', cx);
        aura.setAttribute('cy', cy + 0.05);
        aura.setAttribute('r', '0.44');
        aura.setAttribute('fill', 'none');
        aura.setAttribute('stroke', '#facc15');
        aura.setAttribute('stroke-width', '0.07');
        aura.setAttribute('stroke-dasharray', '0.16 0.08');
        aura.setAttribute('class', 'token-movable-ring');
        g.appendChild(aura);
      }

      // 3. 3D Weighted Pedestal Base Rim
      const baseRim = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      baseRim.setAttribute('cx', cx);
      baseRim.setAttribute('cy', cy + 0.28);
      baseRim.setAttribute('rx', '0.27');
      baseRim.setAttribute('ry', '0.11');
      baseRim.setAttribute('fill', 'rgba(15,23,42,0.85)');
      baseRim.setAttribute('stroke', 'rgba(255,255,255,0.4)');
      baseRim.setAttribute('stroke-width', '0.02');
      g.appendChild(baseRim);

      const baseInner = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      baseInner.setAttribute('cx', cx);
      baseInner.setAttribute('cy', cy + 0.26);
      baseInner.setAttribute('rx', '0.24');
      baseInner.setAttribute('ry', '0.09');
      baseInner.setAttribute('fill', `url(#pawnHead_${color})`);
      g.appendChild(baseInner);

      // 4. Smooth Sculpted Conical Body
      const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const bodyD = `
        M ${cx - 0.22} ${cy + 0.26}
        C ${cx - 0.16} ${cy + 0.10}, ${cx - 0.09} ${cy - 0.02}, ${cx - 0.10} ${cy - 0.08}
        L ${cx + 0.10} ${cy - 0.08}
        C ${cx + 0.09} ${cy - 0.02}, ${cx + 0.16} ${cy + 0.10}, ${cx + 0.22} ${cy + 0.26} Z
      `;
      body.setAttribute('d', bodyD);
      body.setAttribute('fill', `url(#pawnBody_${color})`);
      body.setAttribute('stroke', 'rgba(0,0,0,0.25)');
      body.setAttribute('stroke-width', '0.02');
      g.appendChild(body);

      // 5. Polished Metallic Collar Ring
      const collar = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      collar.setAttribute('cx', cx);
      collar.setAttribute('cy', cy - 0.08);
      collar.setAttribute('rx', '0.13');
      collar.setAttribute('ry', '0.05');
      collar.setAttribute('fill', 'url(#goldCollar)');
      collar.setAttribute('stroke', 'rgba(0,0,0,0.3)');
      collar.setAttribute('stroke-width', '0.015');
      g.appendChild(collar);

      // 6. Spherical Crown Dome Head
      const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      head.setAttribute('cx', cx);
      head.setAttribute('cy', cy - 0.20);
      head.setAttribute('r', '0.16');
      head.setAttribute('fill', `url(#pawnHead_${color})`);
      head.setAttribute('stroke', 'rgba(0,0,0,0.25)');
      head.setAttribute('stroke-width', '0.02');
      g.appendChild(head);

      // 7. Specular 3D Highlight Glints
      const glint = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      glint.setAttribute('cx', cx - 0.05);
      glint.setAttribute('cy', cy - 0.25);
      glint.setAttribute('rx', '0.06');
      glint.setAttribute('ry', '0.04');
      glint.setAttribute('fill', '#ffffff');
      glint.setAttribute('opacity', '0.85');
      g.appendChild(glint);

      const sheen = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      sheen.setAttribute('d', `M ${cx - 0.08} ${cy + 0.02} Q ${cx - 0.05} ${cy + 0.14} ${cx - 0.12} ${cy + 0.22}`);
      sheen.setAttribute('stroke', '#ffffff');
      sheen.setAttribute('stroke-width', '0.025');
      sheen.setAttribute('fill', 'none');
      sheen.setAttribute('opacity', '0.45');
      sheen.setAttribute('stroke-linecap', 'round');
      g.appendChild(sheen);

      if (isMovable) {
        g.onclick = () => onPlayerTokenClick(tok.id);
      }

      ludoSvg.appendChild(g);
    });
  });
}

// ============================================================================
// 7. GAMEPLAY, 15S TURN TIMER & EXPERT AI BOT LOGIC
// ============================================================================
function updateTurnState() {
  if (!game || game.winner) return;

  const isPlayerTurn = game.currentTurn === 'blue';

  if (isPlayerTurn) {
    if (!game.hasRolled) {
      // Start 15s timer for player turn
      startTurnTimer('blue');
      diceArrowIndicator.classList.remove('hidden');
      btnRollDice.disabled = false;
      btnRollDice.classList.remove('opacity-60', 'pointer-events-none');
    } else {
      // Rolled, waiting to move token within same 15s window
      diceArrowIndicator.classList.add('hidden');
      btnRollDice.disabled = true;
      btnRollDice.classList.add('opacity-60', 'pointer-events-none');
    }
  } else {
    // Opponent's Turn (Green)
    startTurnTimer('green');
    diceArrowIndicator.classList.add('hidden');
    btnRollDice.disabled = true;
    btnRollDice.classList.add('opacity-60', 'pointer-events-none');

    // Realistic human-like thinking delay before opponent rolls
    botTimer = setTimeout(playBotTurn, Math.floor(Math.random() * 400) + 650);
  }
}

// Player (Blue) Dice Roll
btnRollDice.onclick = () => {
  if (!game || game.currentTurn !== 'blue' || game.hasRolled || isMovingToken) return;

  sound.playDiceRoll();
  btnRollDice.classList.add('dice-rolling');

  setTimeout(() => {
    btnRollDice.classList.remove('dice-rolling');
    const roll = game.rollDice();
    renderDiceFace(diceSvg, roll);

    const validMoves = game.getValidMoves('blue');
    if (validMoves.length === 0) {
      showToast(`Rolled ${roll}. No moves available!`, 'warning');
      clearTurnTimer();
      setTimeout(() => {
        renderLudoBoard();
        updateTurnState();
      }, 350);
    } else if (validMoves.length === 1) {
      // Auto move single eligible token after snappy pause
      setTimeout(() => {
        onPlayerTokenClick(validMoves[0]);
      }, 100);
    } else {
      // Multiple tokens can move, let user tap
      showToast(`Rolled ${roll}. Tap a pulsing goti to move!`, 'info');
      renderLudoBoard();
      updateTurnState();
    }
  }, 180);
};

// Also click on arrow rolls the dice
diceArrowIndicator.onclick = () => {
  btnRollDice.click();
};

// Player Moves Token
async function onPlayerTokenClick(tokenId) {
  if (!game || game.currentTurn !== 'blue' || !game.hasRolled || isMovingToken) return;

  clearTurnTimer();
  isMovingToken = true;
  sound.playTokenMove();

  const res = game.moveToken(tokenId, 'blue');
  renderLudoBoard();

  if (res.capture) {
    sound.playCapture();
    showToast(`${matchedOpponent.short}'s goti captured! Extra turn awarded!`, 'success');
  }

  if (res.winner) {
    handleGameOver('blue');
    isMovingToken = false;
    return;
  }

  isMovingToken = false;
  updateTurnState();
}

// Opponent (Green) AI Player with Expert Algorithm
function playBotTurn() {
  if (!game || game.currentTurn !== 'green') return;

  sound.playDiceRoll();
  botDiceCube.classList.add('dice-rolling');

  setTimeout(() => {
    botDiceCube.classList.remove('dice-rolling');
    const roll = game.rollDice();
    renderDiceFace(botDiceSvg, roll);

    const validMoves = game.getValidMoves('green');
    if (validMoves.length === 0) {
      clearTurnTimer();
      setTimeout(() => {
        renderLudoBoard();
        updateTurnState();
      }, 300);
      return;
    }

    // Expert Decision Matrix from ludo-engine.js
    const chosenId = getExpertBotMove(game, 'green');

    // Realistic human move execution delay: 500ms - 850ms
    const moveDelay = Math.floor(Math.random() * 350) + 500;
    setTimeout(() => {
      if (!game || game.currentTurn !== 'green') return;

      clearTurnTimer();
      sound.playTokenMove();
      const res = game.moveToken(chosenId, 'green');
      renderLudoBoard();

      if (res.capture) {
        sound.playCapture();
        showToast(`${matchedOpponent.short} captured your goti!`, 'warning');
      }

      if (res.winner) {
        handleGameOver('green');
        return;
      }

      updateTurnState();
    }, moveDelay);
  }, 200);
}

// Game Over & Payout Handling
function handleGameOver(winnerColor, reason = '') {
  clearTurnTimer();
  if (botTimer) clearTimeout(botTimer);

  if (winnerColor === 'blue') {
    sound.playWin();
    try {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      }
    } catch (e) {}

    if (reason === 'opp_eliminated') {
      winnerTitle.innerText = 'YOU WON! (BY FORFEIT)';
      winnerTitle.className = 'text-2xl font-black text-amber-300 uppercase tracking-tight';
      winnerSub.innerText = `${matchedOpponent.name} timed out 4 times and was eliminated. Prize credited!`;
    } else {
      winnerTitle.innerText = 'YOU WON!';
      winnerTitle.className = 'text-2xl font-black text-amber-300 uppercase tracking-tight';
      winnerSub.innerText = 'Congratulations! Prize money has been credited directly to your winning wallet.';
    }

    winnerPayout.innerText = `₹ ${game ? game.prizePool.toFixed(2) : (selectedStake * 1.8).toFixed(2)}`;
    if (game) creditMatchWinnings(game.prizePool);
  } else {
    sound.playLose();
    if (reason === 'player_eliminated') {
      winnerTitle.innerText = 'YOU WERE ELIMINATED';
      winnerTitle.className = 'text-2xl font-black text-rose-400 uppercase tracking-tight';
      winnerSub.innerText = 'You missed 4 turns in a row and were forfeited. Better luck next match!';
    } else {
      winnerTitle.innerText = `${matchedOpponent.name.toUpperCase()} WON`;
      winnerTitle.className = 'text-2xl font-black text-rose-400 uppercase tracking-tight';
      winnerSub.innerText = `Good game! ${matchedOpponent.name} reached home first this round. Better luck next match!`;
    }
    winnerPayout.innerText = '₹ 0.00';
  }

  openModal(modalWinner);
}

btnPlayAgain.onclick = () => {
  closeModal(modalWinner);
  startMatchmaking();
};

// ============================================================================
// 8. UNIFIED RUMMY ADDA DEPOSIT & WITHDRAWAL (IDENTICAL FLOW & WHATSAPP)
// ============================================================================
document.getElementById('btn-open-deposit').onclick = () => {
  if (currentUser) {
    const mobInput = document.getElementById('deposit-mobile-input');
    if (mobInput && !mobInput.value) {
      mobInput.value = localStorage.getItem('rummy_user_mobile') || '';
    }
  }
  openModal(modalDeposit);
};

const btnOpenWd = document.getElementById('btn-open-withdraw');
if (btnOpenWd) {
  btnOpenWd.onclick = () => {
    if (currentUser) {
      const mobInput = document.getElementById('withdraw-mobile-input');
      if (mobInput && !mobInput.value) {
        mobInput.value = localStorage.getItem('rummy_user_mobile') || '';
      }
    }
    openModal(modalWithdraw);
  };
}
document.getElementById('btn-open-support').onclick = () => openModal(modalSupport);

const supportLink = document.getElementById('btn-support-link');
if (supportLink) {
  supportLink.href = `https://wa.me/${SUPPORT_WHATSAPP}?text=Hello%20RummyAdda%20Support,%20I%20need%20assistance.`;
}

// 1-Tap Links to Full Website Pages
const btnOpenWalletPage = document.getElementById('btn-open-wallet-page');
if (btnOpenWalletPage) {
  btnOpenWalletPage.onclick = () => {
    if (window.top && window.top !== window) window.top.location.href = '/wallet/deposit';
    else window.location.href = '/wallet/deposit';
  };
}

const btnOpenWdPage = document.getElementById('btn-open-withdraw-page');
if (btnOpenWdPage) {
  btnOpenWdPage.onclick = () => {
    if (window.top && window.top !== window) window.top.location.href = '/wallet/withdraw';
    else window.location.href = '/wallet/withdraw';
  };
}

// Deposit Amount Preset Selection
const depAmtInput = document.getElementById('deposit-amount-input');
document.querySelectorAll('.dep-preset').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.dep-preset').forEach(b => {
      b.className = 'dep-preset py-2 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10';
    });
    btn.className = 'dep-preset py-2 rounded-xl bg-amber-400 text-black border border-amber-400 font-bold';
    const amt = btn.dataset.amt;
    if (depAmtInput) depAmtInput.value = amt;
  };
});

// SUBMIT DEPOSIT (EXACT RUMMY ADDA WHATSAPP FLOW)
const btnSubmitDeposit = document.getElementById('btn-submit-deposit');
if (btnSubmitDeposit) {
  btnSubmitDeposit.onclick = async () => {
    if (!currentUser) {
      closeModal(modalDeposit);
      openModal(modalAuth);
      showToast('Please sign in or create an account to deposit.', 'info');
      return;
    }

    const amt = parseFloat(depAmtInput.value) || 0;
    const mobInput = document.getElementById('deposit-mobile-input');
    const cleanMobile = (mobInput?.value || '').replace(/[^0-9]/g, '');
    const errBox = document.getElementById('dep-error-box');
    const errTxt = document.getElementById('dep-error-text');

    if (amt < 50) {
      if (errBox && errTxt) {
        errBox.classList.remove('hidden');
        errTxt.innerText = 'Minimum deposit chips amount is ₹50.';
      }
      return;
    }
    if (cleanMobile.length < 10) {
      if (errBox && errTxt) {
        errBox.classList.remove('hidden');
        errTxt.innerText = 'Please enter a valid 10-digit mobile number.';
      }
      return;
    }

    localStorage.setItem('rummy_user_mobile', cleanMobile);
    btnSubmitDeposit.disabled = true;
    btnSubmitDeposit.innerText = 'Opening WhatsApp...';

    try {
      const depositId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const playerId = currentProfile?.playerId || `P${currentUser.uid.slice(0, 5).toUpperCase()}`;
      const userDisplayName = currentProfile?.displayName || currentUser.email?.split('@')[0] || 'Player';
      const shortId = playerId.slice(-4);

      // Save official deposit document to Firestore
      await setDoc(doc(db, 'deposits', depositId), {
        depositId,
        uid: currentUser.uid,
        playerId,
        requestedAmount: amt,
        mobileNumber: cleanMobile,
        status: 'pending',
        whatsappOpenedAt: now,
        createdAt: now
      });

      // Prepare exact official WhatsApp message
      const formattedAmount = amt.toLocaleString('en-IN');
      const messageText = 
`*RUMMY ADDA - DEPOSIT*
Player: ${userDisplayName} (#${shortId})
Mobile: ${cleanMobile}
Deposit Amount: ₹${formattedAmount}

Hello, मुझे ₹${formattedAmount} डिपॉजिट करना है। कृपया QR Code / UPI Details भेजें।`;

      const waUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, '_blank');

      closeModal(modalDeposit);
      showToast(`Deposit request for ₹${formattedAmount} opened on WhatsApp. Verified in 2 mins!`, 'success');
    } catch (e) {
      console.warn('Deposit error:', e);
      showToast('Failed to create deposit request. Please try again.', 'error');
    } finally {
      btnSubmitDeposit.disabled = false;
      btnSubmitDeposit.innerText = 'CONTINUE TO WHATSAPP DEPOSIT';
    }
  };
}

// WITHDRAW METHOD TABS (UPI vs Bank)
let wdMethod = 'upi';
const wdTabUpi = document.getElementById('wd-tab-upi');
const wdTabBank = document.getElementById('wd-tab-bank');
const wdUpiFields = document.getElementById('wd-upi-fields');
const wdBankFields = document.getElementById('wd-bank-fields');

if (wdTabUpi && wdTabBank) {
  wdTabUpi.onclick = () => {
    wdMethod = 'upi';
    wdTabUpi.className = 'py-2 rounded-lg bg-amber-400 text-slate-950 font-black shadow transition-all cursor-pointer';
    wdTabBank.className = 'py-2 rounded-lg text-slate-400 hover:text-white font-black transition-all cursor-pointer';
    if (wdUpiFields) wdUpiFields.classList.remove('hidden');
    if (wdBankFields) wdBankFields.classList.add('hidden');
  };

  wdTabBank.onclick = () => {
    wdMethod = 'bank';
    wdTabBank.className = 'py-2 rounded-lg bg-amber-400 text-slate-950 font-black shadow transition-all cursor-pointer';
    wdTabUpi.className = 'py-2 rounded-lg text-slate-400 hover:text-white font-black transition-all cursor-pointer';
    if (wdBankFields) wdBankFields.classList.remove('hidden');
    if (wdUpiFields) wdUpiFields.classList.add('hidden');
  };
}

// SUBMIT WITHDRAWAL (EXACT RUMMY ADDA FLOW: UPI & BANK TRANSFER)
const btnSubmitWithdraw = document.getElementById('btn-submit-withdraw');
if (btnSubmitWithdraw) {
  btnSubmitWithdraw.onclick = async () => {
    if (!currentUser) {
      closeModal(modalWithdraw);
      openModal(modalAuth);
      showToast('Please sign in to withdraw cash.', 'info');
      return;
    }

    const amt = parseFloat(document.getElementById('withdraw-amount-input')?.value) || 0;
    const mobInput = document.getElementById('withdraw-mobile-input');
    const cleanMobile = (mobInput?.value || '').replace(/[^0-9]/g, '');
    const upi = (document.getElementById('withdraw-upi-input')?.value || '').trim();
    const acc = (document.getElementById('withdraw-acc-input')?.value || '').trim();
    const ifsc = (document.getElementById('withdraw-ifsc-input')?.value || '').trim().toUpperCase();
    const holder = (document.getElementById('withdraw-holder-input')?.value || '').trim();

    const errBox = document.getElementById('wd-error-box');
    const errTxt = document.getElementById('wd-error-text');

    if (amt < 100) {
      if (errBox && errTxt) {
        errBox.classList.remove('hidden');
        errTxt.innerText = 'Minimum withdrawal amount is ₹100.';
      }
      return;
    }
    if ((userWallet.winBalance || 0) < amt) {
      if (errBox && errTxt) {
        errBox.classList.remove('hidden');
        errTxt.innerText = `Insufficient winning balance. You have ₹${(userWallet.winBalance || 0).toFixed(2)}.`;
      }
      return;
    }
    if (cleanMobile.length < 10) {
      if (errBox && errTxt) {
        errBox.classList.remove('hidden');
        errTxt.innerText = 'Please enter a valid 10-digit mobile number.';
      }
      return;
    }

    if (wdMethod === 'upi') {
      if (!upi.includes('@')) {
        if (errBox && errTxt) {
          errBox.classList.remove('hidden');
          errTxt.innerText = 'Please enter a valid UPI ID (e.g. mobile@upi or user@paytm).';
        }
        return;
      }
    } else {
      if (!acc || acc.length < 8) {
        if (errBox && errTxt) {
          errBox.classList.remove('hidden');
          errTxt.innerText = 'Please enter a valid Bank Account Number.';
        }
        return;
      }
      if (!ifsc || ifsc.length < 11) {
        if (errBox && errTxt) {
          errBox.classList.remove('hidden');
          errTxt.innerText = 'Please enter a valid 11-character IFSC Code.';
        }
        return;
      }
      if (!holder) {
        if (errBox && errTxt) {
          errBox.classList.remove('hidden');
          errTxt.innerText = 'Please enter the Account Holder full name.';
        }
        return;
      }
    }

    localStorage.setItem('rummy_user_mobile', cleanMobile);
    btnSubmitWithdraw.disabled = true;
    btnSubmitWithdraw.innerText = 'Processing Withdrawal...';

    try {
      const walletRef = doc(db, 'wallets', currentUser.uid);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(walletRef);
        const w = snap.data();
        if ((w.winBalance || 0) < amt) throw new Error('Insufficient winning balance');
        tx.update(walletRef, {
          winBalance: (w.winBalance || 0) - amt,
          updatedAt: new Date().toISOString()
        });
      });

      const withdrawalId = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const playerId = currentProfile?.playerId || `P${currentUser.uid.slice(0, 5).toUpperCase()}`;
      const userDisplayName = currentProfile?.displayName || currentUser.email?.split('@')[0] || 'Player';
      const shortId = playerId.slice(-4);
      const destination = wdMethod === 'upi' ? upi : `${acc} (${ifsc})`;

      await setDoc(doc(db, 'withdrawals', withdrawalId), {
        withdrawalId,
        uid: currentUser.uid,
        playerId,
        amount: amt,
        fee: 0,
        netPayable: amt,
        method: wdMethod,
        upiId: wdMethod === 'upi' ? upi : '',
        accountDetails: wdMethod === 'bank' ? { accountNumber: acc, ifsc, accountHolder: holder } : null,
        mobileNumber: cleanMobile,
        status: 'pending',
        createdAt: now
      });

      // Transaction log
      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setDoc(doc(db, 'transactions', txId), {
        id: txId,
        uid: currentUser.uid,
        type: 'withdrawal',
        amount: amt,
        currency: 'INR',
        status: 'pending',
        description: `Withdrawal via ${wdMethod.toUpperCase()} (${destination})`,
        createdAt: now
      }).catch(console.warn);

      // Official WhatsApp Alert
      const waMsg = 
`*RUMMY ADDA - WITHDRAWAL REQUEST*
Player: ${userDisplayName} (#${shortId})
Mobile: ${cleanMobile}
Amount: ₹${amt.toLocaleString('en-IN')}
Payout Method: ${wdMethod.toUpperCase()}
Destination: ${destination}

Hello, मैंने ₹${amt.toLocaleString('en-IN')} विड्रॉल की रिक्वेस्ट सबमिट की है। कृपया अप्रूव करें।`;

      const waUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(waMsg)}`;
      window.open(waUrl, '_blank');

      closeModal(modalWithdraw);
      showToast(`Withdrawal of ₹${amt.toLocaleString('en-IN')} submitted! Dispatched via ${wdMethod.toUpperCase()} in 15 mins.`, 'success');
    } catch (e) {
      showToast(e.message || 'Withdrawal request failed', 'error');
    } finally {
      btnSubmitWithdraw.disabled = false;
      btnSubmitWithdraw.innerText = 'SUBMIT WITHDRAWAL REQUEST';
    }
  };
}

// Sound Toggle
const btnToggleSound = document.getElementById('btn-toggle-sound');
const soundIconOn = document.getElementById('sound-icon-on');
const soundIconOff = document.getElementById('sound-icon-off');

if (btnToggleSound) {
  btnToggleSound.onclick = () => {
    const isMuted = sound.toggle();
    if (soundIconOn && soundIconOff) {
      if (isMuted) {
        soundIconOn.classList.add('hidden');
        soundIconOff.classList.remove('hidden');
      } else {
        soundIconOn.classList.remove('hidden');
        soundIconOff.classList.add('hidden');
      }
    }
  };
}

// ============================================================================
// 9. AUTHENTICATION & QUERY PARAMS AUTOSTART
// ============================================================================
const btnOpenAuth = document.getElementById('btn-open-auth');
const authLabel = document.getElementById('auth-label');
let authMode = 'signin';

const authTabSignin = document.getElementById('auth-tab-signin');
const authTabSignup = document.getElementById('auth-tab-signup');
const authHeading = document.getElementById('auth-heading');
const authSubheading = document.getElementById('auth-subheading');
const authConfirmBox = document.getElementById('auth-confirm-box');
const authReferralBox = document.getElementById('auth-referral-box');
const authTermsBox = document.getElementById('auth-terms-box');
const authSubmitText = document.getElementById('auth-submit-text');
const authErrorBox = document.getElementById('auth-error-box');
const authErrorText = document.getElementById('auth-error-text');

if (btnOpenAuth) {
  btnOpenAuth.onclick = () => {
    if (currentUser) {
      if (confirm('Do you want to log out of your shared wallet?')) {
        signOut(auth).then(() => showToast('Logged out successfully.', 'info'));
      }
    } else {
      openModal(modalAuth);
    }
  };
}

if (authTabSignin && authTabSignup) {
  authTabSignin.onclick = () => {
    authMode = 'signin';
    authTabSignin.className = 'py-2 rounded-lg bg-amber-400 text-slate-950 shadow transition-all';
    authTabSignup.className = 'py-2 rounded-lg text-slate-400 hover:text-white transition-all';
    authHeading.innerText = 'WELCOME BACK';
    authSubheading.innerText = 'Login to access your shared wallet';
    authConfirmBox.classList.add('hidden');
    authReferralBox.classList.add('hidden');
    authTermsBox.classList.add('hidden');
    authSubmitText.innerText = 'Sign In & Play';
  };

  authTabSignup.onclick = () => {
    authMode = 'signup';
    authTabSignup.className = 'py-2 rounded-lg bg-amber-400 text-slate-950 shadow transition-all';
    authTabSignin.className = 'py-2 rounded-lg text-slate-400 hover:text-white transition-all';
    authHeading.innerText = 'CREATE ACCOUNT';
    authSubheading.innerText = 'Join Ludo Adda & Play for Real Cash';
    authConfirmBox.classList.remove('hidden');
    authReferralBox.classList.remove('hidden');
    authTermsBox.classList.remove('hidden');
    authSubmitText.innerText = 'Create Account & Play';
  };
}

const authForm = document.getElementById('auth-form');
if (authForm) {
  authForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const confirm = document.getElementById('auth-confirm').value;

    if (authErrorBox) authErrorBox.classList.add('hidden');

    if (authMode === 'signup' && password !== confirm) {
      if (authErrorBox && authErrorText) {
        authErrorBox.classList.remove('hidden');
        authErrorText.innerText = 'Passwords do not match.';
      }
      return;
    }

    try {
      if (authMode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Signed in successfully!', 'success');
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Initialize shared wallet
        await setDoc(doc(db, 'wallets', cred.user.uid), {
          depositBalance: 0,
          winBalance: 0,
          bonusBalance: 50,
          updatedAt: new Date().toISOString()
        });
        showToast('Account created! Welcome bonus ₹50 added.', 'success');
      }
      closeModal(modalAuth);
    } catch (err) {
      if (authErrorBox && authErrorText) {
        authErrorBox.classList.remove('hidden');
        authErrorText.innerText = err.message || 'Authentication failed.';
      }
    }
  };
}

// Listen to Auth State
let authInitialized = false;
if (auth) {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      if (authLabel) authLabel.innerText = 'Logout';
      // Sync Wallet from Firestore
      onSnapshot(doc(db, 'wallets', user.uid), (snap) => {
        if (snap.exists()) {
          userWallet = snap.data();
          updateWalletUI();
        }
      });
    } else {
      if (authLabel) authLabel.innerText = 'Sign In';
      userWallet = { depositBalance: 0, winBalance: 0, bonusBalance: 0 };
      updateWalletUI();
    }

    // Check autostart query parameter on first auth resolve
    if (!authInitialized) {
      authInitialized = true;
      handleUrlAutostart();
    }
  });
} else {
  handleUrlAutostart();
}

function handleUrlAutostart() {
  const urlParams = new URLSearchParams(window.location.search);
  const autostart = urlParams.get('autostart');
  const stakeParam = parseInt(urlParams.get('stake'), 10);
  const playersParam = parseInt(urlParams.get('players'), 10);

  if (stakeParam && !isNaN(stakeParam)) selectedStake = stakeParam;
  if (playersParam && (playersParam === 2 || playersParam === 4)) selectedPlayers = playersParam;
  updatePrizePool();

  if (autostart === '1') {
    // Hide header immediately and launch matchmaking
    if (mainHeader) mainHeader.classList.add('hidden');
    setTimeout(() => {
      startMatchmaking();
    }, 200);
  }
}
