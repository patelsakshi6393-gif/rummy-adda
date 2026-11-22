import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { firebaseConfig, SUPPORT_WHATSAPP } from './firebase-config.js';
import { LudoGame, SAFE_SQUARES } from './ludo-engine.js';
import { sound } from './sound.js';

// ==========================================
// 1. FIREBASE & SHARED WALLET
// ==========================================
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

// Match Settings
let selectedPlayers = 2;
let selectedStake = 1; // Min 1rs for Ludo
let game = null;
let botTimer = null;
let turnTimerInterval = null;
let turnTimeRemaining = 15;

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const headerBalanceVal = document.getElementById('header-balance-val');
const prizePoolDisplay = document.getElementById('prize-pool-display');
const boardPrizeVal = document.getElementById('board-prize-val');
const ludoLobbyView = document.getElementById('ludo-lobby-view');
const ludoBoardView = document.getElementById('ludo-board-view');
const ludoSvg = document.getElementById('ludo-svg');
const btnRollDice = document.getElementById('btn-roll-dice');
const diceSvg = document.getElementById('dice-svg');
const turnBadgeP1 = document.getElementById('turn-badge-p1');
const turnBadgeP2 = document.getElementById('turn-badge-p2');
const timerP1 = document.getElementById('timer-p1');
const timerP2 = document.getElementById('timer-p2');

const modalWinner = document.getElementById('modal-winner');
const winnerTitle = document.getElementById('winner-title');
const winnerSub = document.getElementById('winner-sub');
const winnerPayout = document.getElementById('winner-payout');

const modalDeposit = document.getElementById('modal-deposit');
const modalWithdraw = document.getElementById('modal-withdraw');
const modalSupport = document.getElementById('modal-support');
const modalAuth = document.getElementById('modal-auth');
const modalInsufficient = document.getElementById('modal-insufficient');
const insufficientMsg = document.getElementById('insufficient-msg');
const btnInsufficientDeposit = document.getElementById('btn-insufficient-deposit');
const modalLeave = document.getElementById('modal-leave');
const btnConfirmLeave = document.getElementById('btn-confirm-leave');

// Toast Notification System (Zero Emojis, Pure SVGs)
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    info: 'bg-[#24040a] border-amber-500/40 text-amber-200',
    success: 'bg-[#0f1f17] border-emerald-500/50 text-emerald-200',
    error: 'bg-[#220d11] border-rose-500/50 text-rose-200',
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

// Insufficient Balance Dialog Handler
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

// Auth Switcher State
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
const authSuccessBox = document.getElementById('auth-success-box');
const authSuccessText = document.getElementById('auth-success-text');

// ==========================================
// 3. REAL 3D ACRYLIC VECTOR DICE (NO EMOJIS)
// ==========================================
function renderDiceFace(val) {
  diceSvg.innerHTML = '';

  // Background rounded acrylic cube with subtle gradient
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', '2');
  bg.setAttribute('y', '2');
  bg.setAttribute('width', '52');
  bg.setAttribute('height', '52');
  bg.setAttribute('rx', '10');
  bg.setAttribute('fill', 'url(#diceCubeGrad)');
  bg.setAttribute('stroke', '#94a3b8');
  bg.setAttribute('stroke-width', '1.5');
  diceSvg.appendChild(bg);

  // Gradient definition
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="diceCubeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
  `;
  diceSvg.appendChild(defs);

  if (val <= 0) {
    // Unrolled initial state: subtle indented dot
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', '28');
    dot.setAttribute('cy', '28');
    dot.setAttribute('r', '5');
    dot.setAttribute('fill', '#94a3b8');
    dot.setAttribute('opacity', '0.4');
    diceSvg.appendChild(dot);
    return;
  }

  // Draw authentic indented pips
  const pips = {
    1: [[28, 28, '#dc2626', 7]], // Authentic red center pip for 1
    2: [[17, 17, '#0f172a', 5], [39, 39, '#0f172a', 5]],
    3: [[16, 16, '#0f172a', 5], [28, 28, '#0f172a', 5], [40, 40, '#0f172a', 5]],
    4: [[17, 17, '#0f172a', 5], [39, 17, '#0f172a', 5], [17, 39, '#0f172a', 5], [39, 39, '#0f172a', 5]],
    5: [[17, 17, '#0f172a', 5], [39, 17, '#0f172a', 5], [28, 28, '#dc2626', 5.5], [17, 39, '#0f172a', 5], [39, 39, '#0f172a', 5]],
    6: [[17, 15, '#0f172a', 5], [17, 28, '#0f172a', 5], [17, 41, '#0f172a', 5], [39, 15, '#0f172a', 5], [39, 28, '#0f172a', 5], [39, 41, '#0f172a', 5]]
  };

  const currentPips = pips[val] || pips[1];
  currentPips.forEach(([cx, cy, fill, r]) => {
    // Subtle pip inner shadow
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    shadow.setAttribute('cx', cx);
    shadow.setAttribute('cy', cy + 0.8);
    shadow.setAttribute('r', r);
    shadow.setAttribute('fill', 'rgba(0,0,0,0.25)');
    diceSvg.appendChild(shadow);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', fill);
    diceSvg.appendChild(circle);
  });
}
renderDiceFace(0);

// ==========================================
// 4. WALLET & AUTH SYNCHRONIZATION
// ==========================================
function getPlayableBalance() {
  return (userWallet.depositBalance || 0) + (userWallet.winBalance || 0) + (userWallet.bonusBalance || 0);
}

function updateWalletUI() {
  const playable = getPlayableBalance();
  headerBalanceVal.innerText = `₹ ${playable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const wdVal = document.getElementById('withdrawable-val');
  if (wdVal) {
    wdVal.innerText = `₹ ${(userWallet.winBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

async function deductMatchFee(amount) {
  if (!currentUser) {
    openAuthModal('signin');
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
      description: `Ludo Table Entry - ₹${amount}`,
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

// ==========================================
// 5. LOBBY SELECTION & MATCH LAUNCH
// ==========================================
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

function updatePrizePool() {
  const pot = (selectedStake * selectedPlayers * 0.9).toFixed(2);
  prizePoolDisplay.innerText = `₹ ${pot}`;
  boardPrizeVal.innerText = `₹ ${pot}`;
}
updatePrizePool();

document.getElementById('btn-start-ludo-match').onclick = async () => {
  const ok = await deductMatchFee(selectedStake);
  if (!ok) return;

  game = new LudoGame(selectedPlayers, selectedStake);
  ludoLobbyView.classList.add('hidden');
  ludoBoardView.classList.remove('hidden');
  ludoBoardView.classList.add('flex');

  renderDiceFace(0);
  renderLudoBoard();
  startTurnTimer();
  updateTurnUI();
};

document.getElementById('btn-leave-match').onclick = () => {
  openModal(modalLeave);
};

if (btnConfirmLeave) {
  btnConfirmLeave.onclick = () => {
    closeModal(modalLeave);
    if (botTimer) clearTimeout(botTimer);
    if (turnTimerInterval) clearInterval(turnTimerInterval);
    game = null;
    ludoBoardView.classList.add('hidden');
    ludoBoardView.classList.remove('flex');
    ludoLobbyView.classList.remove('hidden');
    showToast('Match forfeited. Returned to lobby.', 'info');
  };
}

// ==========================================
// 6. SVG 15x15 REAL LUDO BOARD RENDERER
// ==========================================
function renderLudoBoard() {
  if (!game) return;
  ludoSvg.innerHTML = '';

  // Gradient definitions for realistic gloss
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <!-- Red Yard Gradient -->
    <linearGradient id="redYardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#b91c1c"/>
    </linearGradient>
    <!-- Green Yard Gradient -->
    <linearGradient id="greenYardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#15803d"/>
    </linearGradient>
    <!-- Yellow Yard Gradient -->
    <linearGradient id="yellowYardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#facc15"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
    <!-- Blue Yard Gradient -->
    <linearGradient id="blueYardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <!-- Golden Vector Star Gradient -->
    <linearGradient id="goldStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <!-- 3D Token Specular Highlight -->
    <radialGradient id="tokenHighlight" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.4"/>
    </radialGradient>
  `;
  ludoSvg.appendChild(defs);

  // Background base
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '15');
  bg.setAttribute('height', '15');
  bg.setAttribute('fill', '#ffffff');
  ludoSvg.appendChild(bg);

  // 4 Big Quadrants with Rich Gradients & Beveled Inner Podiums
  drawYard(0, 0, 'url(#redYardGrad)', '#991b1b');
  drawYard(9, 0, 'url(#greenYardGrad)', '#166534');
  drawYard(9, 9, 'url(#yellowYardGrad)', '#854d0e');
  drawYard(0, 9, 'url(#blueYardGrad)', '#1e40af');

  // Track cells
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const inYard = (r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8);
      const inCenter = (r >= 6 && r <= 8 && c >= 6 && c <= 8);

      if (!inYard && !inCenter) {
        let fill = '#f8fafc';
        if (r === 7 && c >= 1 && c <= 5) fill = '#ef4444';
        else if (c === 7 && r >= 1 && r <= 5) fill = '#22c55e';
        else if (r === 7 && c >= 9 && c <= 13) fill = '#eab308';
        else if (c === 7 && r >= 9 && r <= 13) fill = '#3b82f6';
        else if (r === 6 && c === 1) fill = '#ef4444';
        else if (r === 1 && c === 8) fill = '#22c55e';
        else if (r === 8 && c === 13) fill = '#eab308';
        else if (r === 13 && c === 6) fill = '#3b82f6';

        drawCell(c, r, fill);

        // Safe Squares with Clean Vector Golden Stars (NO EMOJIS)
        const isSafe = (r === 6 && c === 1) || (r === 8 && c === 2) || (r === 2 && c === 6) ||
                       (r === 1 && c === 8) || (r === 6 && c === 12) || (r === 8 && c === 13) ||
                       (r === 12 && c === 8) || (r === 13 && c === 6);
        if (isSafe) {
          drawVectorStar(c + 0.5, r + 0.5);
        }
      }
    }
  }

  // Center Home Triangles
  drawCenterTriangles();

  // Draw 3D Glossy Tokens
  drawTokens();
}

function drawCell(x, y, fill) {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', '1');
  rect.setAttribute('height', '1');
  rect.setAttribute('fill', fill);
  rect.setAttribute('stroke', '#cbd5e1');
  rect.setAttribute('stroke-width', '0.035');
  ludoSvg.appendChild(rect);
}

// Crisp 5-point vector star (Pure SVG geometry, Zero emoji)
function drawVectorStar(cx, cy) {
  const points = [];
  const spikes = 5;
  const outerR = 0.32;
  const innerR = 0.14;

  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    points.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
  }

  const star = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  star.setAttribute('points', points.join(' '));
  star.setAttribute('fill', 'url(#goldStarGrad)');
  star.setAttribute('stroke', '#b45309');
  star.setAttribute('stroke-width', '0.02');
  star.setAttribute('filter', 'drop-shadow(0 0.04 0.04 rgba(0,0,0,0.3))');
  ludoSvg.appendChild(star);
}

function drawYard(x, y, gradFill, borderColor) {
  // Main Yard Box with Bevel
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', '6');
  rect.setAttribute('height', '6');
  rect.setAttribute('fill', gradFill);
  rect.setAttribute('stroke', borderColor);
  rect.setAttribute('stroke-width', '0.06');
  ludoSvg.appendChild(rect);

  // Inner White Podium Box with rounded corners
  const inner = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  inner.setAttribute('x', x + 0.9);
  inner.setAttribute('y', y + 0.9);
  inner.setAttribute('width', '4.2');
  inner.setAttribute('height', '4.2');
  inner.setAttribute('rx', '0.6');
  inner.setAttribute('fill', '#ffffff');
  inner.setAttribute('stroke', 'rgba(0,0,0,0.08)');
  inner.setAttribute('stroke-width', '0.04');
  ludoSvg.appendChild(inner);

  // 4 Token Yard Pedestals with Golden Rings
  const offsets = [ [x + 2, y + 2], [x + 4, y + 2], [x + 2, y + 4], [x + 4, y + 4] ];
  offsets.forEach(([cx, cy]) => {
    // Outer shadow ring
    const outerRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outerRing.setAttribute('cx', cx);
    outerRing.setAttribute('cy', cy);
    outerRing.setAttribute('r', '0.65');
    outerRing.setAttribute('fill', '#f1f5f9');
    outerRing.setAttribute('stroke', '#cbd5e1');
    outerRing.setAttribute('stroke-width', '0.04');
    ludoSvg.appendChild(outerRing);

    // Inner target well
    const innerRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    innerRing.setAttribute('cx', cx);
    innerRing.setAttribute('cy', cy);
    innerRing.setAttribute('r', '0.45');
    innerRing.setAttribute('fill', gradFill);
    innerRing.setAttribute('opacity', '0.35');
    ludoSvg.appendChild(innerRing);
  });
}

function drawCenterTriangles() {
  drawPoly('6,6 6,9 7.5,7.5', '#ef4444');
  drawPoly('6,6 9,6 7.5,7.5', '#22c55e');
  drawPoly('9,6 9,9 7.5,7.5', '#eab308');
  drawPoly('6,9 9,9 7.5,7.5', '#3b82f6');

  // Center apex medallion
  const centerStar = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  centerStar.setAttribute('cx', '7.5');
  centerStar.setAttribute('cy', '7.5');
  centerStar.setAttribute('r', '0.5');
  centerStar.setAttribute('fill', '#ffffff');
  centerStar.setAttribute('stroke', '#e2e8f0');
  centerStar.setAttribute('stroke-width', '0.04');
  ludoSvg.appendChild(centerStar);

  drawVectorStar(7.5, 7.5);
}

function drawPoly(pts, fill) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  p.setAttribute('points', pts);
  p.setAttribute('fill', fill);
  p.setAttribute('stroke', '#cbd5e1');
  p.setAttribute('stroke-width', '0.035');
  ludoSvg.appendChild(p);
}

// 3D GLOSSY MULTI-LAYER TOKENS
function drawTokens() {
  const validMoves = (game.currentTurn === 'red' && game.hasRolled) ? game.getValidMoves('red') : [];

  game.turnOrder.forEach(color => {
    game.tokens[color].forEach(tok => {
      if (tok.step === 56) return;

      const [r, c] = game.getTokenGridCoord(color, tok.id);
      const isMovable = color === 'red' && validMoves.includes(tok.id);

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', isMovable ? 'token-movable' : '');

      const cx = c + 0.5;
      const cy = r + 0.5;

      // 1. Drop shadow for 3D elevation
      const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      shadow.setAttribute('cx', cx);
      shadow.setAttribute('cy', cy + 0.08);
      shadow.setAttribute('rx', '0.36');
      shadow.setAttribute('ry', '0.32');
      shadow.setAttribute('fill', 'rgba(0,0,0,0.35)');
      g.appendChild(shadow);

      // 2. Outer Metallic Rim
      const baseRim = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      baseRim.setAttribute('cx', cx);
      baseRim.setAttribute('cy', cy);
      baseRim.setAttribute('r', '0.38');
      baseRim.setAttribute('fill', color === 'red' ? '#991b1b' : (color === 'green' ? '#14532d' : '#854d0e'));
      baseRim.setAttribute('stroke', isMovable ? '#facc15' : '#ffffff');
      baseRim.setAttribute('stroke-width', isMovable ? '0.09' : '0.035');
      g.appendChild(baseRim);

      // 3. Colored Gloss Dome
      const dome = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dome.setAttribute('cx', cx);
      dome.setAttribute('cy', cy);
      dome.setAttribute('r', '0.32');
      dome.setAttribute('fill', color === 'red' ? '#ef4444' : (color === 'green' ? '#22c55e' : '#eab308'));
      g.appendChild(dome);

      // 4. Specular 3D Highlight
      const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      highlight.setAttribute('cx', cx);
      highlight.setAttribute('cy', cy);
      highlight.setAttribute('r', '0.32');
      highlight.setAttribute('fill', 'url(#tokenHighlight)');
      g.appendChild(highlight);

      // 5. Center Golden Crown Ring
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', cx);
      ring.setAttribute('cy', cy);
      ring.setAttribute('r', '0.13');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', '#ffffff');
      ring.setAttribute('stroke-width', '0.035');
      g.appendChild(ring);

      if (isMovable) {
        g.onclick = () => onPlayerTokenClick(tok.id);
      }

      ludoSvg.appendChild(g);
    });
  });
}

// ==========================================
// 7. GAMEPLAY, TURN TIMERS & BOT
// ==========================================
function startTurnTimer() {
  if (turnTimerInterval) clearInterval(turnTimerInterval);
  turnTimeRemaining = 15;

  updateTimerRings();
  turnTimerInterval = setInterval(() => {
    turnTimeRemaining -= 1;
    updateTimerRings();

    if (turnTimeRemaining <= 0) {
      clearInterval(turnTimerInterval);
      handleTurnTimeout();
    }
  }, 1000);
}

function updateTimerRings() {
  const fraction = Math.max(0, turnTimeRemaining / 15);
  // P1 circumference = 131.95, P2 circumference = 119.38
  const offsetP1 = 131.95 * (1 - fraction);
  const offsetP2 = 119.38 * (1 - fraction);

  if (game && game.currentTurn === 'red') {
    timerP1.style.strokeDashoffset = offsetP1;
    timerP1.style.stroke = turnTimeRemaining <= 4 ? '#ef4444' : '#f59e0b';
    timerP2.style.strokeDashoffset = '119.38';
  } else {
    timerP2.style.strokeDashoffset = offsetP2;
    timerP2.style.stroke = turnTimeRemaining <= 4 ? '#ef4444' : '#22c55e';
    timerP1.style.strokeDashoffset = '131.95';
  }
}

function handleTurnTimeout() {
  if (!game) return;
  if (game.currentTurn === 'red') {
    if (!game.hasRolled) {
      btnRollDice.click();
    } else {
      const valid = game.getValidMoves('red');
      if (valid.length > 0) onPlayerTokenClick(valid[0]);
    }
  }
}

function updateTurnUI() {
  if (!game) return;

  if (game.currentTurn === 'red') {
    turnBadgeP1.innerText = game.hasRolled ? 'SELECT A TOKEN TO MOVE' : 'YOUR TURN (TAP DICE)';
    turnBadgeP1.className = 'text-xs font-black text-amber-400 animate-pulse';
    turnBadgeP2.innerText = 'Waiting';
    turnBadgeP2.className = 'px-3 py-1 rounded-full text-[10px] font-black uppercase bg-white/5 text-slate-400 border border-white/10';
    btnRollDice.disabled = game.hasRolled;
    btnRollDice.classList.remove('opacity-50', 'pointer-events-none');
  } else {
    turnBadgeP1.innerText = "Opponent is rolling...";
    turnBadgeP1.className = 'text-xs font-bold text-slate-400';
    turnBadgeP2.innerText = 'PLAYING TURN';
    turnBadgeP2.className = 'px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse';
    btnRollDice.disabled = true;
    btnRollDice.classList.add('opacity-50', 'pointer-events-none');

    botTimer = setTimeout(playBotTurn, 900);
  }
}

// Player (Red) Dice Roll Action
btnRollDice.onclick = () => {
  if (!game || game.currentTurn !== 'red' || game.hasRolled) return;

  sound.playDiceRoll();
  btnRollDice.classList.add('dice-rolling');

  setTimeout(() => {
    btnRollDice.classList.remove('dice-rolling');
    const roll = game.rollDice();
    renderDiceFace(roll);

    const validMoves = game.getValidMoves('red');
    if (validMoves.length === 0) {
      turnBadgeP1.innerText = `Rolled ${roll} - No Valid Moves`;
      setTimeout(() => {
        renderLudoBoard();
        startTurnTimer();
        updateTurnUI();
      }, 700);
    } else if (validMoves.length === 1) {
      setTimeout(() => {
        onPlayerTokenClick(validMoves[0]);
      }, 400);
    } else {
      renderLudoBoard();
      updateTurnUI();
    }
  }, 450);
};

function onPlayerTokenClick(tokenId) {
  if (!game || game.currentTurn !== 'red') return;

  if (!game.hasRolled) {
    showToast('Please roll the dice first by tapping on it!', 'warning');
    return;
  }

  const valid = game.getValidMoves('red');
  if (!valid.includes(tokenId)) {
    const tok = game.tokens.red.find(t => t.id === tokenId);
    if (tok && tok.step === -1) {
      showToast('Need a 6 to bring token out of base yard!', 'warning');
    } else {
      showToast('Cannot move this token. Roll exceeds home path.', 'warning');
    }
    return;
  }

  const res = game.moveToken(tokenId, 'red');
  if (res.success) {
    if (res.capture) sound.playCapture();
    else sound.playTokenMove();

    renderLudoBoard();

    if (res.winner) {
      handleMatchOver(res.winner);
      return;
    }

    startTurnTimer();
    updateTurnUI();
  }
}

// Bot (Green) Play Turn Logic
function playBotTurn() {
  if (!game || game.currentTurn !== 'green') return;

  sound.playDiceRoll();
  btnRollDice.classList.add('dice-rolling');

  setTimeout(() => {
    btnRollDice.classList.remove('dice-rolling');
    const roll = game.rollDice();
    renderDiceFace(roll);

    const valid = game.getValidMoves('green');
    if (valid.length === 0) {
      setTimeout(() => {
        renderLudoBoard();
        startTurnTimer();
        updateTurnUI();
      }, 600);
      return;
    }

    let chosen = valid[0];
    const canExit = valid.find(id => game.tokens.green.find(t => t.id === id).step === -1);
    if (canExit) chosen = canExit;

    setTimeout(() => {
      const res = game.moveToken(chosen, 'green');
      if (res.success) {
        if (res.capture) sound.playCapture();
        else sound.playTokenMove();

        renderLudoBoard();

        if (res.winner) {
          handleMatchOver(res.winner);
          return;
        }

        startTurnTimer();
        updateTurnUI();
      }
    }, 600);
  }, 450);
}

// ==========================================
// 8. MATCH OVER & SETTLEMENT
// ==========================================
async function handleMatchOver(winnerColor) {
  if (turnTimerInterval) clearInterval(turnTimerInterval);
  sound.playWin();

  if (winnerColor === 'red') {
    if (typeof confetti === 'function') {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }
    winnerTitle.innerText = 'YOU WON!';
    winnerTitle.className = 'text-2xl font-black text-amber-300 uppercase tracking-tight';
    winnerSub.innerText = `Victory! Prize money of ₹${game.prizePool.toFixed(2)} credited to your wallet.`;
    winnerPayout.innerText = `₹ ${game.prizePool.toFixed(2)}`;

    await creditMatchWinnings(game.prizePool);
  } else {
    winnerTitle.innerText = 'OPPONENT WON';
    winnerTitle.className = 'text-2xl font-black text-rose-400 uppercase tracking-tight';
    winnerSub.innerText = 'Better luck next time! Join another table to win cash.';
    winnerPayout.innerText = '₹ 0.00';
  }

  modalWinner.classList.remove('hidden');
  modalWinner.classList.add('flex');
}

document.getElementById('btn-play-again').onclick = () => {
  modalWinner.classList.add('hidden');
  modalWinner.classList.remove('flex');
  ludoBoardView.classList.add('hidden');
  ludoBoardView.classList.remove('flex');
  ludoLobbyView.classList.remove('hidden');
};

// ==========================================
// 9. MODALS, SUPPORT & EXACT RUMMYADDA AUTH
// ==========================================
function openModal(el) { el.classList.remove('hidden'); el.classList.add('flex'); }
function closeModal(el) { el.classList.add('hidden'); el.classList.remove('flex'); }

document.querySelectorAll('.modal-close').forEach(b => {
  b.onclick = () => {
    closeModal(modalDeposit);
    closeModal(modalWithdraw);
    closeModal(modalSupport);
    closeModal(modalAuth);
    if (modalInsufficient) closeModal(modalInsufficient);
    if (modalLeave) closeModal(modalLeave);
  };
});

document.getElementById('btn-open-deposit').onclick = () => openModal(modalDeposit);
document.getElementById('btn-open-withdraw').onclick = () => openModal(modalWithdraw);
document.getElementById('btn-open-support').onclick = () => openModal(modalSupport);

// Sound Mute Toggle
document.getElementById('btn-toggle-sound').onclick = () => {
  const isMuted = sound.toggleMute();
  const onIcon = document.getElementById('sound-icon-on');
  const offIcon = document.getElementById('sound-icon-off');
  if (isMuted) {
    onIcon.classList.add('hidden');
    offIcon.classList.remove('hidden');
  } else {
    onIcon.classList.remove('hidden');
    offIcon.classList.add('hidden');
  }
};

// RummyAdda Auth Mode Switcher
function openAuthModal(mode = 'signin') {
  setAuthMode(mode);
  openModal(modalAuth);
}

function setAuthMode(mode) {
  authMode = mode;
  authErrorBox.classList.add('hidden');
  authSuccessBox.classList.add('hidden');

  if (mode === 'signin') {
    authTabSignin.className = 'py-2.5 px-3 rounded-xl bg-amber-500 text-black font-extrabold text-xs uppercase tracking-wider shadow';
    authTabSignup.className = 'py-2.5 px-3 rounded-xl text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider text-center transition-colors flex items-center justify-center gap-1.5';
    authHeading.innerHTML = 'Sign In to <span class="text-amber-400">RummyAdda</span>';
    authSubheading.innerText = 'Enter your mobile number and password to join live tables';
    authConfirmBox.classList.add('hidden');
    authReferralBox.classList.add('hidden');
    authTermsBox.classList.add('hidden');
    authTermsBox.classList.remove('flex');
    authSubmitText.innerText = 'SIGN IN NOW';
  } else {
    authTabSignup.className = 'py-2.5 px-3 rounded-xl bg-amber-500 text-black font-extrabold text-xs uppercase tracking-wider shadow flex items-center justify-center gap-1.5';
    authTabSignin.className = 'py-2.5 px-3 rounded-xl text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider text-center transition-colors';
    authHeading.innerHTML = 'Create Account on <span class="text-amber-400">RummyAdda</span>';
    authSubheading.innerText = 'Register now and get ₹20 free cash bonus instantly';
    authConfirmBox.classList.remove('hidden');
    authReferralBox.classList.remove('hidden');
    authTermsBox.classList.remove('hidden');
    authTermsBox.classList.add('flex');
    authSubmitText.innerText = 'CREATE ACCOUNT & CLAIM ₹20 BONUS';
  }
}

authTabSignin.onclick = () => setAuthMode('signin');
authTabSignup.onclick = () => setAuthMode('signup');

document.getElementById('btn-open-auth').onclick = () => {
  if (currentUser) {
    signOut(auth).then(() => {
      showToast('Logged out of account.', 'info');
    });
  } else {
    openAuthModal('signin');
  }
};

// Helper to translate Firebase Auth error codes into friendly user messages
function getAuthErrorMessage(err, mode) {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid mobile number or password. Please verify or click "Create Account".';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account already exists with this mobile number. Please switch to "Sign In".';
  }
  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many failed attempts. Please wait 1-2 minutes and try again.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection error. Please check your internet connection.';
  }
  return err?.message || (mode === 'signin' ? 'Sign in failed. Please try again.' : 'Failed to create account.');
}

document.getElementById('auth-form').onsubmit = async (e) => {
  e.preventDefault();
  authErrorBox.classList.add('hidden');
  authSuccessBox.classList.add('hidden');

  const phone = document.getElementById('auth-phone-input').value.trim().replace(/[^\d]/g, '');
  const pass = document.getElementById('auth-password-input').value;

  if (phone.length !== 10) {
    authErrorText.innerText = 'Please enter a valid 10-digit mobile number.';
    authErrorBox.classList.remove('hidden');
    return;
  }

  const authEmail = `${phone}@phone.rummyadda.in`;

  if (authMode === 'signin') {
    try {
      await signInWithEmailAndPassword(auth, authEmail, pass);
      showToast('Signed in successfully! Welcome to Ludo Adda.', 'success');
      closeModal(modalAuth);
    } catch (err) {
      console.warn('Sign in error:', err);
      authErrorText.innerText = getAuthErrorMessage(err, 'signin');
      authErrorBox.classList.remove('hidden');
    }
  } else {
    const confirmPass = document.getElementById('auth-confirm-input').value;
    const termsCheck = document.getElementById('auth-terms-check').checked;

    if (pass.length < 6) {
      authErrorText.innerText = 'Password must be at least 6 characters.';
      authErrorBox.classList.remove('hidden');
      return;
    }
    if (pass !== confirmPass) {
      authErrorText.innerText = 'Passwords do not match.';
      authErrorBox.classList.remove('hidden');
      return;
    }
    if (!termsCheck) {
      authErrorText.innerText = 'You must confirm you are 18+ years of age.';
      authErrorBox.classList.remove('hidden');
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, authEmail, pass);
      const uid = userCred.user.uid;
      const now = new Date().toISOString();
      const playerId = 'RA-' + Math.random().toString(36).substring(2, 8).toUpperCase();

      await setDoc(doc(db, 'users', uid), {
        uid,
        playerId,
        displayName: 'Royal Player',
        phone,
        email: authEmail,
        role: 'player',
        accountStatus: 'active',
        totalReferrals: 0,
        referralEarnings: 0,
        createdAt: now
      });

      await setDoc(doc(db, 'wallets', uid), {
        uid,
        depositBalance: 0,
        winBalance: 0,
        bonusBalance: 20, // ₹20 Welcome bonus
        rewardPoints: 0,
        welcomeBonusClaimed: true,
        updatedAt: now
      });

      const txRef = doc(db, 'transactions', `welcome_${uid}`);
      await setDoc(txRef, {
        id: txRef.id,
        uid,
        type: 'bonus',
        amount: 20,
        currency: 'INR',
        status: 'completed',
        description: 'Welcome Bonus - ₹20 Non-withdrawable Game Credits',
        createdAt: now
      });

      authSuccessText.innerText = 'Account created successfully! ₹20 bonus added to your wallet.';
      authSuccessBox.classList.remove('hidden');
      showToast('Account created! ₹20 bonus added to your wallet.', 'success');

      setTimeout(() => {
        closeModal(modalAuth);
      }, 1000);
    } catch (err) {
      console.warn('Sign up error:', err);
      authErrorText.innerText = getAuthErrorMessage(err, 'signup');
      authErrorBox.classList.remove('hidden');
    }
  }
};

// Deposit preset click handler
document.querySelectorAll('.dep-preset').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.dep-preset').forEach(b => {
      b.className = 'dep-preset py-2 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10';
    });
    btn.className = 'dep-preset py-2 rounded-xl bg-amber-400 text-black border border-amber-400 font-bold';
    document.getElementById('dep-custom-input').value = btn.dataset.amt;
  };
});

// Deposit via WhatsApp Helpline
document.getElementById('btn-submit-deposit').onclick = async () => {
  const amtInput = document.getElementById('dep-custom-input');
  const mobInput = document.getElementById('dep-mobile-input');
  const depErrBox = document.getElementById('dep-error-box');
  const depErrText = document.getElementById('dep-error-text');

  if (depErrBox) depErrBox.classList.add('hidden');

  const amt = parseInt(amtInput.value, 10);
  const mob = mobInput.value.trim().replace(/[^\d]/g, '');

  if (isNaN(amt) || amt < 50) {
    if (depErrText && depErrBox) {
      depErrText.innerText = 'Minimum deposit amount is ₹50.';
      depErrBox.classList.remove('hidden');
    }
    showToast('Minimum deposit is ₹50.', 'warning');
    return;
  }
  if (amt > 100000) {
    if (depErrText && depErrBox) {
      depErrText.innerText = 'Maximum deposit amount is ₹1,00,000.';
      depErrBox.classList.remove('hidden');
    }
    showToast('Maximum deposit is ₹1,00,000.', 'warning');
    return;
  }
  if (!mob || mob.length !== 10) {
    if (depErrText && depErrBox) {
      depErrText.innerText = 'Please enter a valid 10-digit mobile number.';
      depErrBox.classList.remove('hidden');
    }
    showToast('Please enter a valid 10-digit mobile number.', 'warning');
    return;
  }

  showToast(`Initiating deposit of ₹${amt}...`, 'info');

  const depId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  if (db && currentUser) {
    try {
      await setDoc(doc(db, 'deposits', depId), {
        depositId: depId,
        uid: currentUser.uid,
        playerId: currentProfile?.playerId || 'PLAYER',
        requestedAmount: amt,
        mobile: mob,
        status: 'pending',
        createdAt: now
      });
    } catch (e) {
      console.warn('Deposit record error:', e);
    }
  }

  const msg = `*RUMMY ADDA / LUDO - DEPOSIT*\nPlayer: ${currentProfile?.displayName || 'Player'} (${currentProfile?.playerId || 'LUDO'})\nMobile: ${mob}\nDeposit Amount: ₹${amt.toLocaleString('en-IN')}\n\nHello, मुझे Ludo खेलने के लिए ₹${amt} डिपॉजिट करना है। कृपया UPI Details भेजें।`;
  window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  closeModal(modalDeposit);
};

// Withdrawal Request Submission
document.getElementById('btn-submit-withdraw').onclick = async () => {
  const amtInput = document.getElementById('wd-amount-input');
  const upiInput = document.getElementById('wd-upi-input');
  const wdErrBox = document.getElementById('wd-error-box');
  const wdErrText = document.getElementById('wd-error-text');
  const wdSuccBox = document.getElementById('wd-success-box');
  const wdSuccText = document.getElementById('wd-success-text');

  if (wdErrBox) wdErrBox.classList.add('hidden');
  if (wdSuccBox) wdSuccBox.classList.add('hidden');

  if (!currentUser) {
    if (wdErrText && wdErrBox) {
      wdErrText.innerText = 'Please sign in with your real account first.';
      wdErrBox.classList.remove('hidden');
    }
    showToast('Please sign in with your real account first.', 'warning');
    openAuthModal('signin');
    return;
  }

  const amt = parseInt(amtInput.value, 10);
  const upi = upiInput.value.trim();
  const winBal = userWallet.winBalance || 0;

  if (isNaN(amt) || amt < 100) {
    if (wdErrText && wdErrBox) {
      wdErrText.innerText = 'Minimum withdrawal amount is ₹100.';
      wdErrBox.classList.remove('hidden');
    }
    showToast('Minimum withdrawal amount is ₹100.', 'warning');
    return;
  }
  if (!upi || !upi.includes('@')) {
    if (wdErrText && wdErrBox) {
      wdErrText.innerText = 'Please enter a valid UPI ID (e.g. mobile@paytm or name@okaxis).';
      wdErrBox.classList.remove('hidden');
    }
    showToast('Please enter a valid UPI ID.', 'warning');
    return;
  }
  if (amt > winBal) {
    if (wdErrText && wdErrBox) {
      wdErrText.innerText = `Insufficient withdrawable balance. You have ₹${winBal.toFixed(2)} available.`;
      wdErrBox.classList.remove('hidden');
    }
    showToast(`Insufficient withdrawable balance (₹${winBal.toFixed(2)}).`, 'warning');
    return;
  }

  try {
    const wdId = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await setDoc(doc(db, 'withdrawals', wdId), {
      withdrawalId: wdId,
      uid: currentUser.uid,
      playerId: currentProfile?.playerId || 'PLAYER',
      amount: amt,
      method: 'upi',
      maskedDestination: upi,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    const walletRef = doc(db, 'wallets', currentUser.uid);
    await updateDoc(walletRef, {
      winBalance: Math.max(0, winBal - amt),
      updatedAt: new Date().toISOString()
    });

    if (wdSuccText && wdSuccBox) {
      wdSuccText.innerText = `Withdrawal request for ₹${amt} submitted! Funds will be transferred to ${upi}.`;
      wdSuccBox.classList.remove('hidden');
    }
    showToast(`Withdrawal of ₹${amt} requested successfully!`, 'success');

    setTimeout(() => {
      closeModal(modalWithdraw);
      if (wdSuccBox) wdSuccBox.classList.add('hidden');
    }, 1800);
  } catch (err) {
    console.error('Withdrawal error:', err);
    if (wdErrText && wdErrBox) {
      wdErrText.innerText = 'Failed to submit withdrawal request. Please check connection and try again.';
      wdErrBox.classList.remove('hidden');
    }
    showToast('Failed to submit withdrawal request.', 'error');
  }
};

// Auth Sync & Auto-Heal Wallets
if (auth) {
  onAuthStateChanged(auth, user => {
    currentUser = user;
    const authLabel = document.getElementById('auth-label');
    if (user) {
      authLabel.innerText = 'Logout';
      getDoc(doc(db, 'users', user.uid)).then(s => { if (s.exists()) currentProfile = s.data(); });
      onSnapshot(doc(db, 'wallets', user.uid), s => {
        if (s.exists()) {
          const w = s.data();
          userWallet = { depositBalance: w.depositBalance || 0, winBalance: w.winBalance || 0, bonusBalance: w.bonusBalance || 0 };
          updateWalletUI();
        } else {
          // Auto-heal missing wallet doc
          const now = new Date().toISOString();
          setDoc(doc(db, 'wallets', user.uid), {
            uid: user.uid,
            depositBalance: 0,
            winBalance: 0,
            bonusBalance: 20,
            welcomeBonusClaimed: true,
            updatedAt: now
          }).catch(console.warn);
        }
      });
    } else {
      authLabel.innerText = 'Sign In';
      userWallet = { depositBalance: 0, winBalance: 0, bonusBalance: 0 };
      updateWalletUI();
    }
  });
}
