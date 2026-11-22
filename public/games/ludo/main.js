import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { firebaseConfig, SUPPORT_WHATSAPP } from './firebase-config.js';
import { LudoGame, SAFE_SQUARES } from './ludo-engine.js';
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

// Match Settings: Player is 'blue', Bot is 'green'
let selectedPlayers = 2;
let selectedStake = 1; // Min ₹1 for Ludo
let game = null;
let botTimer = null;
let isMovingToken = false;

// Color Palette Matching Image 1
const COLOR_MAP = {
  blue: '#0084d6',  // Player "You" (Bottom-Left)
  green: '#008e36', // Bot (Top-Right)
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

async function startLudoMatch() {
  const ok = await deductMatchFee(selectedStake);
  if (!ok) return;

  // Initialize Game: Blue ("You") starts first vs Green ("Bot")
  game = new LudoGame(selectedPlayers, selectedStake);

  if (mainHeader) mainHeader.classList.add('hidden');
  ludoLobbyView.classList.add('hidden');
  ludoBoardView.classList.remove('hidden');
  ludoBoardView.classList.add('flex');

  updatePrizePool();
  renderDiceFace(diceSvg, 2);
  renderDiceFace(botDiceSvg, 1);
  renderLudoBoard();
  updateTurnState();
}

function returnToLobby() {
  if (botTimer) clearTimeout(botTimer);
  game = null;
  ludoBoardView.classList.add('hidden');
  ludoBoardView.classList.remove('flex');
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
  startLudoMatch();
};

// ============================================================================
// 6. SVG 15x15 BOARD RENDERER (EXACT IMAGE 1 REPLICA)
// ============================================================================
function renderLudoBoard() {
  if (!game) return;
  ludoSvg.innerHTML = '';

  // Base white canvas
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '15');
  bg.setAttribute('height', '15');
  bg.setAttribute('fill', '#ffffff');
  ludoSvg.appendChild(bg);

  // 1. Draw 4 Quadrant Yards (Matching Image 1)
  // Top-Left: RED
  drawYard(0, 0, COLOR_MAP.red);
  // Top-Right: GREEN (Bot)
  drawYard(9, 0, COLOR_MAP.green);
  // Bottom-Left: BLUE (You)
  drawYard(0, 9, COLOR_MAP.blue);
  // Bottom-Right: YELLOW
  drawYard(9, 9, COLOR_MAP.yellow);

  // 2. Yard Labels on the Board: "Bot" over Green yard, "You" under Blue yard
  drawBoardText(12, 0.75, 'Bot');
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

  // 5. Draw 3D Teardrop Location-Pin Pawns
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
  t.setAttribute('font-size', '0.65');
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

// 3D TEARDROP LOCATION-PIN PAWNS (EXACT IMAGE 1 REPLICA)
function drawTokens() {
  const isPlayerTurn = game.currentTurn === 'blue';
  const validMoves = (isPlayerTurn && game.hasRolled && !isMovingToken) ? game.getValidMoves('blue') : [];

  game.turnOrder.forEach(color => {
    const colorHex = COLOR_MAP[color];

    game.tokens[color].forEach(tok => {
      if (tok.step === 56) return; // Reached center home

      const [r, c] = game.getTokenGridCoord(color, tok.id);
      const isMovable = color === 'blue' && validMoves.includes(tok.id);

      const cx = c + 0.5;
      const cy = r + 0.5;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      if (isMovable) {
        g.setAttribute('class', 'token-movable cursor-pointer');
      }

      // 1. Ground Drop Shadow underneath pin tip
      const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      shadow.setAttribute('cx', cx);
      shadow.setAttribute('cy', cy + 0.34);
      shadow.setAttribute('rx', '0.30');
      shadow.setAttribute('ry', '0.12');
      shadow.setAttribute('fill', 'rgba(0,0,0,0.4)');
      g.appendChild(shadow);

      // 2. Movable Golden Pulsing Aura Ring
      if (isMovable) {
        const aura = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        aura.setAttribute('cx', cx);
        aura.setAttribute('cy', cy - 0.05);
        aura.setAttribute('r', '0.45');
        aura.setAttribute('fill', 'none');
        aura.setAttribute('stroke', '#facc15');
        aura.setAttribute('stroke-width', '0.08');
        aura.setAttribute('class', 'token-movable-ring');
        g.appendChild(aura);
      }

      // 3. White Location Pin Teardrop Silhouette
      const pin = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const pinPath = `
        M ${cx} ${cy + 0.35} 
        C ${cx - 0.33} ${cy + 0.06}, ${cx - 0.33} ${cy - 0.35}, ${cx} ${cy - 0.35} 
        C ${cx + 0.33} ${cy - 0.35}, ${cx + 0.33} ${cy + 0.06}, ${cx} ${cy + 0.35} Z
      `;
      pin.setAttribute('d', pinPath);
      pin.setAttribute('fill', '#ffffff');
      pin.setAttribute('stroke', '#475569');
      pin.setAttribute('stroke-width', isMovable ? '0.04' : '0.025');
      g.appendChild(pin);

      // 4. Colored Circular Dot inside the pin head
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', cx);
      dot.setAttribute('cy', cy - 0.10);
      dot.setAttribute('r', '0.15');
      dot.setAttribute('fill', colorHex);
      dot.setAttribute('stroke', 'rgba(0,0,0,0.2)');
      dot.setAttribute('stroke-width', '0.02');
      g.appendChild(dot);

      // 5. Specular glint on pin
      const glint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glint.setAttribute('cx', cx - 0.05);
      glint.setAttribute('cy', cy - 0.16);
      glint.setAttribute('r', '0.04');
      glint.setAttribute('fill', '#ffffff');
      glint.setAttribute('opacity', '0.8');
      g.appendChild(glint);

      if (isMovable) {
        g.onclick = () => onPlayerTokenClick(tok.id);
      }

      ludoSvg.appendChild(g);
    });
  });
}

// ============================================================================
// 7. GAMEPLAY, TURNS & BOT LOGIC
// ============================================================================
function updateTurnState() {
  if (!game) return;

  const isPlayerTurn = game.currentTurn === 'blue';

  if (isPlayerTurn) {
    if (!game.hasRolled) {
      // Prompt user to roll dice with animated golden arrow
      diceArrowIndicator.classList.remove('hidden');
      btnRollDice.disabled = false;
      btnRollDice.classList.remove('opacity-60', 'pointer-events-none');
    } else {
      // Rolled, waiting to move token
      diceArrowIndicator.classList.add('hidden');
      btnRollDice.disabled = true;
      btnRollDice.classList.add('opacity-60', 'pointer-events-none');
    }
  } else {
    // Bot's Turn
    diceArrowIndicator.classList.add('hidden');
    btnRollDice.disabled = true;
    btnRollDice.classList.add('opacity-60', 'pointer-events-none');

    // Bot auto-play delay
    botTimer = setTimeout(playBotTurn, 800);
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
      setTimeout(() => {
        renderLudoBoard();
        updateTurnState();
      }, 700);
    } else if (validMoves.length === 1) {
      // Auto move single eligible token after brief pause
      setTimeout(() => {
        onPlayerTokenClick(validMoves[0]);
      }, 350);
    } else {
      // Multiple tokens can move, let user tap
      showToast(`Rolled ${roll}. Tap a pulsing pin to move!`, 'info');
      renderLudoBoard();
      updateTurnState();
    }
  }, 450);
};

// Also click on arrow rolls the dice
diceArrowIndicator.onclick = () => {
  btnRollDice.click();
};

// Player Moves Token
async function onPlayerTokenClick(tokenId) {
  if (!game || game.currentTurn !== 'blue' || !game.hasRolled || isMovingToken) return;

  isMovingToken = true;
  sound.playTokenMove();

  const res = game.moveToken(tokenId, 'blue');
  renderLudoBoard();

  if (res.capture) {
    sound.playCapture();
    showToast('Bot pawn captured! Extra turn awarded!', 'success');
  }

  if (res.winner) {
    handleGameOver('blue');
    isMovingToken = false;
    return;
  }

  isMovingToken = false;
  updateTurnState();
}

// Bot (Green) AI Player
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
      setTimeout(() => {
        renderLudoBoard();
        updateTurnState();
      }, 600);
      return;
    }

    // Bot Decision Engine: Prioritize captures, exiting yard on 6, or advancing closest to home
    let chosenId = validMoves[0];
    let highestScore = -1;

    validMoves.forEach(tid => {
      const tok = game.tokens['green'].find(t => t.id === tid);
      let score = 0;

      if (tok.step === -1 && roll === 6) {
        score = 80; // Highly desirable to get token on track
      } else {
        const nextStep = tok.step + roll;
        // Check if lands on opponent token
        const nextTrackIdx = game.getTrackIndex('green', nextStep);
        if (!SAFE_SQUARES.includes(nextTrackIdx)) {
          const capturesPlayer = game.tokens['blue'].some(pt => pt.step >= 0 && pt.step <= 50 && game.getTrackIndex('blue', pt.step) === nextTrackIdx);
          if (capturesPlayer) score = 100;
        }
        score = Math.max(score, nextStep);
      }

      if (score > highestScore) {
        highestScore = score;
        chosenId = tid;
      }
    });

    setTimeout(() => {
      sound.playTokenMove();
      const res = game.moveToken(chosenId, 'green');
      renderLudoBoard();

      if (res.capture) {
        sound.playCapture();
        showToast('Bot captured your pawn!', 'warning');
      }

      if (res.winner) {
        handleGameOver('green');
        return;
      }

      updateTurnState();
    }, 500);
  }, 450);
}

// Game Over & Payout
function handleGameOver(winnerColor) {
  if (winnerColor === 'blue') {
    sound.playWin();
    try {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      }
    } catch (e) {}

    winnerTitle.innerText = 'YOU WON!';
    winnerTitle.className = 'text-2xl font-black text-amber-300 uppercase tracking-tight';
    winnerSub.innerText = 'Congratulations! Prize money has been credited directly to your winning wallet.';
    winnerPayout.innerText = `₹ ${game.prizePool.toFixed(2)}`;
    creditMatchWinnings(game.prizePool);
  } else {
    sound.playGameOver();
    winnerTitle.innerText = 'BOT WON';
    winnerTitle.className = 'text-2xl font-black text-rose-400 uppercase tracking-tight';
    winnerSub.innerText = 'Good game! The Bot reached home first this round. Better luck next match!';
    winnerPayout.innerText = '₹ 0.00';
  }

  openModal(modalWinner);
}

btnPlayAgain.onclick = () => {
  closeModal(modalWinner);
  startLudoMatch();
};

// ============================================================================
// 8. DEPOSIT, WITHDRAW & SUPPORT MODALS
// ============================================================================
document.getElementById('btn-open-deposit').onclick = () => openModal(modalDeposit);
const btnOpenWd = document.getElementById('btn-open-withdraw');
if (btnOpenWd) btnOpenWd.onclick = () => openModal(modalWithdraw);
document.getElementById('btn-open-support').onclick = () => openModal(modalSupport);

const supportLink = document.getElementById('btn-support-link');
if (supportLink) {
  supportLink.href = `https://wa.me/${SUPPORT_WHATSAPP}?text=Hello%20Ludo%20Support,%20I%20need%20assistance.`;
}

// Deposit Amount Presets
const depAmtInput = document.getElementById('deposit-amount-input');
const qrImg = document.getElementById('upi-qr-image');

function refreshQR(amount) {
  const upiId = 'gamepay@upi';
  const name = 'RummyAddaGaming';
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;
  }
}
refreshQR(500);

document.querySelectorAll('.dep-preset').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.dep-preset').forEach(b => {
      b.className = 'dep-preset py-2 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10';
    });
    btn.className = 'dep-preset py-2 rounded-xl bg-amber-400 text-black border border-amber-400 font-bold';
    const amt = btn.dataset.amt;
    if (depAmtInput) depAmtInput.value = amt;
    refreshQR(amt);
  };
});

if (depAmtInput) {
  depAmtInput.oninput = () => {
    const val = parseFloat(depAmtInput.value);
    if (!isNaN(val) && val > 0) refreshQR(val);
  };
}

// Submit Deposit
const btnSubmitDeposit = document.getElementById('btn-submit-deposit');
if (btnSubmitDeposit) {
  btnSubmitDeposit.onclick = async () => {
    if (!currentUser) {
      closeModal(modalDeposit);
      openModal(modalAuth);
      return;
    }

    const amt = parseFloat(depAmtInput.value) || 0;
    const utr = (document.getElementById('deposit-utr-input')?.value || '').trim();
    const errBox = document.getElementById('dep-error-box');
    const errTxt = document.getElementById('dep-error-text');

    if (amt < 10) {
      if (errBox && errTxt) {
        errBox.classList.remove('hidden');
        errTxt.innerText = 'Minimum deposit amount is ₹10.';
      }
      return;
    }
    if (utr.length < 12) {
      if (errBox && errTxt) {
        errBox.classList.remove('hidden');
        errTxt.innerText = 'Please enter a valid 12-digit UTR / UPI reference number.';
      }
      return;
    }

    btnSubmitDeposit.disabled = true;
    btnSubmitDeposit.innerText = 'Verifying...';

    try {
      const depRef = doc(db, 'deposits', `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
      await setDoc(depRef, {
        id: depRef.id,
        uid: currentUser.uid,
        amount: amt,
        utr: utr,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      closeModal(modalDeposit);
      showToast(`Deposit request for ₹${amt} submitted successfully. Verification takes 2-5 mins.`, 'success');
      if (depAmtInput) depAmtInput.value = '';
      const utrEl = document.getElementById('deposit-utr-input');
      if (utrEl) utrEl.value = '';
    } catch (e) {
      showToast('Failed to submit deposit. Please try again.', 'error');
    } finally {
      btnSubmitDeposit.disabled = false;
      btnSubmitDeposit.innerText = 'Verify & Credit Deposit';
    }
  };
}

// Submit Withdrawal
const btnSubmitWithdraw = document.getElementById('btn-submit-withdraw');
if (btnSubmitWithdraw) {
  btnSubmitWithdraw.onclick = async () => {
    if (!currentUser) {
      closeModal(modalWithdraw);
      openModal(modalAuth);
      return;
    }

    const amt = parseFloat(document.getElementById('withdraw-amount-input')?.value) || 0;
    const upi = (document.getElementById('withdraw-upi-input')?.value || '').trim();
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
        errTxt.innerText = `Insufficient winning balance (₹${(userWallet.winBalance || 0).toFixed(2)}).`;
      }
      return;
    }
    if (!upi.includes('@')) {
      if (errBox && errTxt) {
        errBox.classList.remove('hidden');
        errTxt.innerText = 'Please enter a valid UPI ID (e.g. mobile@upi).';
      }
      return;
    }

    btnSubmitWithdraw.disabled = true;
    btnSubmitWithdraw.innerText = 'Processing...';

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

      const wdRef = doc(db, 'withdrawals', `wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
      await setDoc(wdRef, {
        id: wdRef.id,
        uid: currentUser.uid,
        amount: amt,
        upiId: upi,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      closeModal(modalWithdraw);
      showToast(`Withdrawal of ₹${amt} requested successfully. Dispatched within 15 mins.`, 'success');
    } catch (e) {
      showToast(e.message || 'Withdrawal failed', 'error');
    } finally {
      btnSubmitWithdraw.disabled = false;
      btnSubmitWithdraw.innerText = 'Request Withdrawal';
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
    // Hide header immediately and launch game
    if (mainHeader) mainHeader.classList.add('hidden');
    setTimeout(() => {
      startLudoMatch();
    }, 200);
  }
}
