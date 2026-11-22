import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { firebaseConfig, SUPPORT_WHATSAPP } from './firebase-config.js';
import { getCrashPoint, getMultiplierForTime } from './algorithm.js';
import { sound } from './sound.js';

// ==========================================
// 1. FIREBASE INITIALIZATION & SHARED WALLET
// ==========================================
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  auth = getAuth(app);
} catch (e) {
  console.warn('Firebase init:', e);
}

// Current User & Wallet State
let currentUser = null;
let currentProfile = null;
let realWallet = {
  depositBalance: 0,
  winBalance: 0,
  bonusBalance: 0
};

// Mode: DEMO vs REAL PLAY
let isDemoMode = true;
let demoBalance = 5000.0;

// Multiplier and Round State
const RoundState = {
  WAITING: 'WAITING',
  FLYING: 'FLYING',
  CRASHED: 'CRASHED'
};

let currentRoundState = RoundState.WAITING;
let roundStartTime = 0;
let crashPoint = 2.00;
let currentMultiplier = 1.00;
let recentHistory = [2.45, 1.18, 15.82, 4.10, 1.04, 7.32, 28.90, 1.95, 3.20];

// Betting Panels State
const p1 = {
  stake: 10, // Min 10rs for Aviator
  isBetPlaced: false,
  isCashedOut: false,
  cashoutMultiplier: 0,
  autoCashout: false,
  targetMultiplier: 2.00
};

const p2 = {
  stake: 20,
  isBetPlaced: false,
  isCashedOut: false,
  cashoutMultiplier: 0,
  autoCashout: false,
  targetMultiplier: 3.00
};

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const btnModeDemo = document.getElementById('btn-mode-demo');
const btnModePlay = document.getElementById('btn-mode-play');
const userBalanceDisplay = document.getElementById('user-balance-display');
const balanceLabel = document.getElementById('balance-label');
const multiplierVal = document.getElementById('multiplier-value');
const multiplierSub = document.getElementById('multiplier-sub');
const waitingOverlay = document.getElementById('waiting-overlay');
const waitingProgress = document.getElementById('waiting-progress');
const crashedBanner = document.getElementById('crashed-banner');
const crashFinalVal = document.getElementById('crash-final-val');
const historyPillsContainer = document.getElementById('history-pills');
const liveBetsList = document.getElementById('live-bets-list');

// Canvas
const canvas = document.getElementById('flight-canvas');
const ctx = canvas.getContext('2d');

// P1 Elements
const p1StakeVal = document.getElementById('p1-stake-val');
const p1MainBtn = document.getElementById('p1-main-btn');
const p1BtnText = document.getElementById('p1-btn-text');
const p1BtnSub = document.getElementById('p1-btn-sub');
const p1TabBet = document.getElementById('p1-tab-bet');
const p1TabAuto = document.getElementById('p1-tab-auto');
const p1AutoBox = document.getElementById('p1-auto-cashout-box');
const p1AutoMult = document.getElementById('p1-auto-multiplier');

// P2 Elements
const p2StakeVal = document.getElementById('p2-stake-val');
const p2MainBtn = document.getElementById('p2-main-btn');
const p2BtnText = document.getElementById('p2-btn-text');
const p2BtnSub = document.getElementById('p2-btn-sub');
const p2TabBet = document.getElementById('p2-tab-bet');
const p2TabAuto = document.getElementById('p2-tab-auto');
const p2AutoBox = document.getElementById('p2-auto-cashout-box');
const p2AutoMult = document.getElementById('p2-auto-multiplier');

// Modals
const modalDeposit = document.getElementById('modal-deposit');
const modalWithdraw = document.getElementById('modal-withdraw');
const modalSupport = document.getElementById('modal-support');
const modalAuth = document.getElementById('modal-auth');
const modalInsufficient = document.getElementById('modal-insufficient');
const insufficientMsg = document.getElementById('insufficient-msg');
const btnInsufficientDeposit = document.getElementById('btn-insufficient-deposit');

// Toast Notification System (Zero Emojis, Pure SVGs)
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    info: 'bg-[#151622] border-amber-500/40 text-amber-200',
    success: 'bg-[#0f1f17] border-emerald-500/50 text-emerald-200',
    error: 'bg-[#220d11] border-rose-500/50 text-rose-200',
    warning: 'bg-[#211607] border-amber-500/60 text-amber-100'
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
    insufficientMsg.innerText = `Your balance is ₹${currentPlayable.toFixed(2)}, but ₹${neededAmount.toFixed(2)} is required for this bet. Deposit cash to continue playing!`;
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
let authMode = 'signin'; // 'signin' or 'signup'
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
// 3. BALANCE & WALLET HELPERS
// ==========================================
function getPlayableBalance() {
  if (isDemoMode) return demoBalance;
  return (realWallet.depositBalance || 0) + (realWallet.winBalance || 0) + (realWallet.bonusBalance || 0);
}

function updateBalanceUI() {
  const playable = getPlayableBalance();
  userBalanceDisplay.innerText = `₹ ${playable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (isDemoMode) {
    balanceLabel.innerText = 'DEMO CHIPS (WIN)';
    balanceLabel.className = 'text-[9px] uppercase font-bold text-amber-400/80 leading-none';
  } else {
    balanceLabel.innerText = 'REAL CASH WALLET';
    balanceLabel.className = 'text-[9px] uppercase font-bold text-emerald-400/80 leading-none';
  }

  const wdVal = document.getElementById('withdrawable-val');
  if (wdVal) {
    wdVal.innerText = `₹ ${(realWallet.winBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }
}

// Deduct bet amount from wallet
async function deductBet(amount) {
  if (isDemoMode) {
    demoBalance = Math.max(0, demoBalance - amount);
    updateBalanceUI();
    return true;
  }

  if (!currentUser) {
    openAuthModal('signin');
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

    const txRef = doc(db, 'transactions', `aviator_bet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    setDoc(txRef, {
      id: txRef.id,
      uid: currentUser.uid,
      type: 'game_entry',
      amount: amount,
      currency: 'INR',
      status: 'completed',
      description: `Aviator Bet - ₹${amount}`,
      createdAt: new Date().toISOString()
    }).catch(console.warn);

    return true;
  } catch (err) {
    console.error('Bet deduction error:', err);
    showToast('Failed to place bet. Please try again.', 'error');
    return false;
  }
}

// Credit winnings to wallet
async function creditWinnings(winAmount, multiplier) {
  if (isDemoMode) {
    demoBalance += winAmount;
    updateBalanceUI();
    return;
  }

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

    const txRef = doc(db, 'transactions', `aviator_win_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    setDoc(txRef, {
      id: txRef.id,
      uid: currentUser.uid,
      type: 'game_win',
      amount: winAmount,
      currency: 'INR',
      status: 'completed',
      description: `Aviator Win (${multiplier}x) - ₹${winAmount.toFixed(2)}`,
      createdAt: new Date().toISOString()
    }).catch(console.warn);
  } catch (err) {
    console.error('Credit winnings error:', err);
  }
}

// ==========================================
// 4. CANVAS RENDERING & FLIGHT ANIMATION
// ==========================================
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const stars = [];
for (let i = 0; i < 40; i++) {
  stars.push({
    x: Math.random() * 800,
    y: Math.random() * 400,
    r: Math.random() * 1.5 + 0.5,
    speed: Math.random() * 0.8 + 0.2
  });
}

function drawFlightCanvas(tNorm, crashed = false) {
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;

  ctx.clearRect(0, 0, w, h);

  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#0a0b10');
  bgGrad.addColorStop(1, '#11131a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  for (const s of stars) {
    if (currentRoundState === RoundState.FLYING) {
      s.x -= s.speed * (1 + currentMultiplier * 0.2);
      if (s.x < 0) s.x = w;
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (currentRoundState === RoundState.WAITING) return;

  const originX = 30;
  const originY = h - 25;
  const progress = Math.min(1.0, tNorm);

  const currentX = originX + (w - originX - 60) * Math.min(1, Math.pow(progress, 0.75));
  const currentY = originY - (h - 70) * Math.min(1, Math.pow(progress, 1.4));

  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.quadraticCurveTo(
    originX + (currentX - originX) * 0.45,
    originY,
    currentX,
    currentY
  );
  ctx.lineTo(currentX, originY);
  ctx.closePath();

  const areaGrad = ctx.createLinearGradient(0, currentY, 0, originY);
  areaGrad.addColorStop(0, crashed ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.4)');
  areaGrad.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
  ctx.fillStyle = areaGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.quadraticCurveTo(
    originX + (currentX - originX) * 0.45,
    originY,
    currentX,
    currentY
  );
  ctx.strokeStyle = crashed ? '#dc2626' : '#ef4444';
  ctx.lineWidth = 3.5;
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (!crashed) {
    drawPlane(currentX, currentY, progress);
  }
}

let propAngle = 0;
function drawPlane(x, y, progress) {
  ctx.save();
  ctx.translate(x, y);

  const pitch = -Math.min(0.45, Math.pow(progress, 0.6) * 0.4);
  ctx.rotate(pitch);

  ctx.fillStyle = '#e11d48';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.ellipse(4, -3, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#be123c';
  ctx.beginPath();
  ctx.moveTo(-4, -2);
  ctx.lineTo(0, -18);
  ctx.lineTo(6, -18);
  ctx.lineTo(4, -2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(-24, -10);
  ctx.lineTo(-20, -10);
  ctx.lineTo(-14, 0);
  ctx.closePath();
  ctx.fill();

  propAngle += 0.8;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(23, -Math.sin(propAngle) * 9);
  ctx.lineTo(23, Math.sin(propAngle) * 9);
  ctx.stroke();

  ctx.restore();
}

// ==========================================
// 5. ROUND LIFECYCLE & ALGORITHM EXECUTION
// ==========================================
function startWaitingPeriod() {
  currentRoundState = RoundState.WAITING;
  sound.stopFlightSound();

  crashedBanner.classList.add('hidden');
  multiplierSub.classList.add('opacity-0');
  multiplierVal.className = 'text-5xl sm:text-7xl font-black text-white font-mono-num tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]';
  multiplierVal.innerText = '1.00x';

  waitingOverlay.classList.remove('hidden');
  waitingOverlay.style.opacity = '1';

  p1.isCashedOut = false;
  p2.isCashedOut = false;
  updateBetPanelUI(1);
  updateBetPanelUI(2);

  const duration = 2400; // Ultra snappy 2.4s waiting countdown
  const start = performance.now();

  function progressLoop(now) {
    const elapsed = now - start;
    const pct = Math.min(100, (elapsed / duration) * 100);
    waitingProgress.style.width = `${pct}%`;

    if (elapsed < duration) {
      requestAnimationFrame(progressLoop);
    } else {
      waitingOverlay.classList.add('hidden');
      launchFlightRound();
    }
  }
  requestAnimationFrame(progressLoop);
}

function launchFlightRound() {
  currentRoundState = RoundState.FLYING;
  roundStartTime = performance.now();

  crashPoint = getCrashPoint(isDemoMode);
  currentMultiplier = 1.00;

  sound.startFlightSound();
  seedLiveBets();

  if (p1.isBetPlaced) updateBetPanelUI(1);
  if (p2.isBetPlaced) updateBetPanelUI(2);

  flightLoop();
}

function flightLoop() {
  if (currentRoundState !== RoundState.FLYING) return;

  const elapsedSec = (performance.now() - roundStartTime) / 1000;
  currentMultiplier = getMultiplierForTime(elapsedSec);

  sound.updateFlightPitch(currentMultiplier);

  checkAutoCashout(1);
  checkAutoCashout(2);

  if (currentMultiplier >= crashPoint) {
    triggerCrash();
    return;
  }

  multiplierVal.innerText = `${currentMultiplier.toFixed(2)}x`;

  const scale = Math.min(1.3, 1 + (currentMultiplier - 1) * 0.03);
  multiplierVal.style.transform = `scale(${scale})`;

  updateLiveCashoutButtons();

  const tNorm = Math.min(1, elapsedSec / 10);
  drawFlightCanvas(tNorm, false);

  requestAnimationFrame(flightLoop);
}

function triggerCrash() {
  currentRoundState = RoundState.CRASHED;
  sound.playCrash();

  multiplierVal.innerText = `${crashPoint.toFixed(2)}x`;
  multiplierVal.className = 'text-5xl sm:text-7xl font-black text-red-500 font-mono-num tracking-tight drop-shadow-[0_4px_16px_rgba(225,29,72,0.8)]';
  multiplierSub.classList.remove('opacity-0');

  crashFinalVal.innerText = `${crashPoint.toFixed(2)}x`;
  crashedBanner.classList.remove('hidden');

  drawFlightCanvas(1, true);

  if (p1.isBetPlaced && !p1.isCashedOut) {
    p1.isBetPlaced = false;
    updateBetPanelUI(1);
  }
  if (p2.isBetPlaced && !p2.isCashedOut) {
    p2.isBetPlaced = false;
    updateBetPanelUI(2);
  }

  addHistoryPill(crashPoint);

  setTimeout(() => {
    startWaitingPeriod();
  }, 1200);
}

// ==========================================
// 6. BETTING LOGIC & AUTO CASHOUT
// ==========================================
async function handlePanelAction(panelNum) {
  const p = panelNum === 1 ? p1 : p2;

  // 1. INSTANT CASHOUT (0ms LATENCY)
  if (currentRoundState === RoundState.FLYING && p.isBetPlaced && !p.isCashedOut) {
    p.isCashedOut = true;
    p.cashoutMultiplier = currentMultiplier;
    const winAmount = Number((p.stake * p.cashoutMultiplier).toFixed(2));

    sound.playCashout();
    if (typeof confetti === 'function') {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
    }

    // Optimistic balance credit
    if (isDemoMode) {
      demoBalance += winAmount;
    } else {
      realWallet.winBalance = (realWallet.winBalance || 0) + winAmount;
    }
    updateBalanceUI();
    updateBetPanelUI(panelNum);

    // Non-blocking background sync
    if (!isDemoMode && currentUser) {
      creditWinnings(winAmount, p.cashoutMultiplier).catch(console.warn);
    }
    return;
  }

  // 2. INSTANT BET / CANCEL (0ms LATENCY)
  if (currentRoundState === RoundState.WAITING) {
    if (p.isBetPlaced) {
      // Cancel bet instantly
      p.isBetPlaced = false;
      if (isDemoMode) {
        demoBalance += p.stake;
      } else {
        realWallet.depositBalance = (realWallet.depositBalance || 0) + p.stake;
      }
      updateBalanceUI();
      updateBetPanelUI(panelNum);
    } else {
      // Validate balance
      const playable = isDemoMode ? demoBalance : getPlayableBalance();
      if (!isDemoMode && !currentUser) {
        openAuthModal('signin');
        showToast('Please sign in to place real cash bets.', 'info');
        return;
      }
      if (playable < p.stake) {
        showInsufficientBalanceDialog(p.stake, playable);
        return;
      }

      // Optimistic instant bet placement
      p.isBetPlaced = true;
      if (isDemoMode) {
        demoBalance -= p.stake;
      } else {
        let rem = p.stake;
        const depDec = Math.min(realWallet.depositBalance || 0, rem);
        realWallet.depositBalance = Math.max(0, (realWallet.depositBalance || 0) - depDec);
        rem -= depDec;
        const bonDec = Math.min(realWallet.bonusBalance || 0, rem);
        realWallet.bonusBalance = Math.max(0, (realWallet.bonusBalance || 0) - bonDec);
        rem -= bonDec;
        realWallet.winBalance = Math.max(0, (realWallet.winBalance || 0) - rem);
      }
      updateBalanceUI();
      updateBetPanelUI(panelNum);

      // Asynchronous background sync
      if (!isDemoMode && currentUser) {
        deductBet(p.stake).catch(err => {
          console.warn('Bet deduction error:', err);
          p.isBetPlaced = false;
          updateBetPanelUI(panelNum);
          showToast('Failed to sync bet with server.', 'error');
        });
      }
    }
  }
}

function checkAutoCashout(panelNum) {
  const p = panelNum === 1 ? p1 : p2;
  if (p.isBetPlaced && !p.isCashedOut && p.autoCashout) {
    if (currentMultiplier >= p.targetMultiplier) {
      handlePanelAction(panelNum);
    }
  }
}

function updateLiveCashoutButtons() {
  if (currentRoundState !== RoundState.FLYING) return;

  if (p1.isBetPlaced && !p1.isCashedOut) {
    const payout = (p1.stake * currentMultiplier).toFixed(2);
    p1BtnText.innerText = 'CASH OUT';
    p1BtnSub.innerText = `₹ ${payout}`;
    p1MainBtn.className = 'flex-1 rounded-2xl bg-gradient-to-b from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 active:scale-95 text-slate-950 font-black text-lg sm:text-xl uppercase tracking-wider flex flex-col items-center justify-center shadow-lg glow-gold transition-all cursor-pointer p-2 min-h-[82px] animate-pulse-subtle';
  }

  if (p2.isBetPlaced && !p2.isCashedOut) {
    const payout = (p2.stake * currentMultiplier).toFixed(2);
    p2BtnText.innerText = 'CASH OUT';
    p2BtnSub.innerText = `₹ ${payout}`;
    p2MainBtn.className = 'flex-1 rounded-2xl bg-gradient-to-b from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 active:scale-95 text-slate-950 font-black text-lg sm:text-xl uppercase tracking-wider flex flex-col items-center justify-center shadow-lg glow-gold transition-all cursor-pointer p-2 min-h-[82px] animate-pulse-subtle';
  }
}

function updateBetPanelUI(panelNum) {
  const p = panelNum === 1 ? p1 : p2;
  const btn = panelNum === 1 ? p1MainBtn : p2MainBtn;
  const txt = panelNum === 1 ? p1BtnText : p2BtnText;
  const sub = panelNum === 1 ? p1BtnSub : p2BtnSub;
  const stakeElem = panelNum === 1 ? p1StakeVal : p2StakeVal;

  stakeElem.innerText = p.stake;

  if (p.isCashedOut) {
    txt.innerText = 'WON!';
    sub.innerText = `+₹ ${(p.stake * p.cashoutMultiplier).toFixed(2)} (@ ${p.cashoutMultiplier.toFixed(2)}x)`;
    btn.className = 'flex-1 rounded-2xl bg-gradient-to-b from-emerald-600 to-teal-700 text-white font-black text-base uppercase flex flex-col items-center justify-center shadow-md p-2 min-h-[82px] pointer-events-none';
    return;
  }

  if (p.isBetPlaced) {
    if (currentRoundState === RoundState.WAITING) {
      txt.innerText = 'CANCEL';
      sub.innerText = `WAITING (₹ ${p.stake.toFixed(2)})`;
      btn.className = 'flex-1 rounded-2xl bg-gradient-to-b from-red-600 to-rose-700 hover:brightness-110 active:scale-95 text-white font-black text-base uppercase flex flex-col items-center justify-center shadow-md p-2 min-h-[82px] cursor-pointer';
    } else if (currentRoundState === RoundState.FLYING) {
      txt.innerText = 'CASH OUT';
      sub.innerText = `₹ ${(p.stake * currentMultiplier).toFixed(2)}`;
      btn.className = 'flex-1 rounded-2xl bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 font-black text-lg uppercase flex flex-col items-center justify-center shadow-lg glow-gold p-2 min-h-[82px] cursor-pointer';
    }
    return;
  }

  txt.innerText = 'BET';
  sub.innerText = `₹ ${p.stake.toFixed(2)}`;
  btn.className = 'flex-1 rounded-2xl bg-gradient-to-b from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-95 text-slate-950 font-black text-lg sm:text-xl uppercase tracking-wider flex flex-col items-center justify-center shadow-lg glow-green transition-all cursor-pointer p-2 min-h-[82px]';
}

document.getElementById('p1-btn-minus').onclick = () => {
  p1.stake = Math.max(10, p1.stake - 10);
  updateBetPanelUI(1);
};
document.getElementById('p1-btn-plus').onclick = () => {
  p1.stake += 10;
  updateBetPanelUI(1);
};
document.querySelectorAll('.p1-chip').forEach(btn => {
  btn.onclick = () => {
    p1.stake = parseInt(btn.dataset.val, 10);
    updateBetPanelUI(1);
  };
});

document.getElementById('p2-btn-minus').onclick = () => {
  p2.stake = Math.max(10, p2.stake - 10);
  updateBetPanelUI(2);
};
document.getElementById('p2-btn-plus').onclick = () => {
  p2.stake += 10;
  updateBetPanelUI(2);
};
document.querySelectorAll('.p2-chip').forEach(btn => {
  btn.onclick = () => {
    p2.stake = parseInt(btn.dataset.val, 10);
    updateBetPanelUI(2);
  };
});

p1MainBtn.onclick = () => handlePanelAction(1);
p2MainBtn.onclick = () => handlePanelAction(2);

p1TabBet.onclick = () => {
  p1TabBet.className = 'px-3 py-1 rounded-md bg-white/10 text-white font-black';
  p1TabAuto.className = 'px-3 py-1 rounded-md text-slate-400 hover:text-white';
  p1AutoBox.classList.add('hidden');
  p1.autoCashout = false;
};
p1TabAuto.onclick = () => {
  p1TabAuto.className = 'px-3 py-1 rounded-md bg-white/10 text-white font-black';
  p1TabBet.className = 'px-3 py-1 rounded-md text-slate-400 hover:text-white';
  p1AutoBox.classList.remove('hidden');
  p1AutoBox.classList.add('flex');
  p1.autoCashout = true;
};
p1AutoMult.onchange = (e) => {
  p1.targetMultiplier = Math.max(1.1, parseFloat(e.target.value) || 2.0);
};

p2TabBet.onclick = () => {
  p2TabBet.className = 'px-3 py-1 rounded-md bg-white/10 text-white font-black';
  p2TabAuto.className = 'px-3 py-1 rounded-md text-slate-400 hover:text-white';
  p2AutoBox.classList.add('hidden');
  p2.autoCashout = false;
};
p2TabAuto.onclick = () => {
  p2TabAuto.className = 'px-3 py-1 rounded-md bg-white/10 text-white font-black';
  p2TabBet.className = 'px-3 py-1 rounded-md text-slate-400 hover:text-white';
  p2AutoBox.classList.remove('hidden');
  p2AutoBox.classList.add('flex');
  p2.autoCashout = true;
};
p2AutoMult.onchange = (e) => {
  p2.targetMultiplier = Math.max(1.1, parseFloat(e.target.value) || 3.0);
};

// ==========================================
// 7. HISTORY PILLS & SIMULATED LIVE BETS
// ==========================================
function renderHistory() {
  historyPillsContainer.innerHTML = '';
  recentHistory.forEach(val => {
    const pill = document.createElement('span');
    let colorClass = '';
    if (val < 2.00) {
      colorClass = 'bg-[#34b4ff]/20 text-[#34b4ff] border border-[#34b4ff]/40';
    } else if (val < 10.00) {
      colorClass = 'bg-[#913ef8]/20 text-[#be7dff] border border-[#913ef8]/40';
    } else {
      colorClass = 'bg-[#e89e24]/20 text-[#ffbe47] border border-[#e89e24]/40';
    }
    pill.className = `px-2 py-0.5 rounded-full text-[11px] font-black font-mono-num ${colorClass}`;
    pill.innerText = `${val.toFixed(2)}x`;
    historyPillsContainer.appendChild(pill);
  });
}

function addHistoryPill(val) {
  recentHistory.unshift(val);
  if (recentHistory.length > 20) recentHistory.pop();
  renderHistory();
}
renderHistory();

const botNames = ['Vikram', 'Aakash', 'Rohit', 'Pooja', 'Ankit', 'Sunny', 'Karan', 'Priya', 'Deepak'];
function seedLiveBets() {
  if (!liveBetsList) return;
  liveBetsList.innerHTML = '';
  botNames.forEach(name => {
    const bet = [10, 20, 50, 100, 200, 500][Math.floor(Math.random() * 6)];
    const cashMult = (1.2 + Math.random() * 3.5).toFixed(2);
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between py-1 px-1 bg-white/[0.02] rounded border border-white/5';
    row.innerHTML = `
      <span class="text-slate-300 font-bold">${name.substring(0, 3)}***</span>
      <span class="text-slate-100 font-bold">₹${bet}</span>
      <span class="text-emerald-400 font-bold">${cashMult}x</span>
    `;
    liveBetsList.appendChild(row);
  });
}
seedLiveBets();

// ==========================================
// 8. MODE SWITCH (DEMO vs REAL PLAY)
// ==========================================
function switchGameMode(mode) {
  if (mode === 'play') {
    isDemoMode = false;
    btnModePlay.className = 'px-2.5 py-1 rounded-full bg-emerald-500 text-black font-bold transition-all';
    btnModeDemo.className = 'px-2.5 py-1 rounded-full text-slate-400 hover:text-white font-bold transition-all';
    if (!currentUser) {
      openAuthModal('signin');
    }
  } else {
    isDemoMode = true;
    btnModeDemo.className = 'px-2.5 py-1 rounded-full bg-amber-500 text-black font-bold transition-all';
    btnModePlay.className = 'px-2.5 py-1 rounded-full text-slate-400 hover:text-white font-bold transition-all';
  }
  updateBalanceUI();
}

btnModeDemo.onclick = () => switchGameMode('demo');
btnModePlay.onclick = () => switchGameMode('play');

// Sound toggle (NO EMOJIS - pure SVG)
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

// ==========================================
// 9. MODALS: DEPOSIT, WITHDRAW, SUPPORT, AUTH
// ==========================================
function openModal(el) {
  el.classList.remove('hidden');
  el.classList.add('flex');
}
function closeModal(el) {
  el.classList.add('hidden');
  el.classList.remove('flex');
}

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.onclick = () => {
    closeModal(modalDeposit);
    closeModal(modalWithdraw);
    closeModal(modalSupport);
    closeModal(modalAuth);
    if (modalInsufficient) closeModal(modalInsufficient);
  };
});

document.getElementById('btn-open-deposit').onclick = () => {
  const savedMob = localStorage.getItem('rummy_user_mobile') || currentProfile?.phone || '';
  if (savedMob) {
    const depMob = document.getElementById('deposit-mobile-input');
    if (depMob && !depMob.value) depMob.value = savedMob;
  }
  openModal(modalDeposit);
};

document.getElementById('btn-open-withdraw').onclick = () => {
  const savedMob = localStorage.getItem('rummy_user_mobile') || currentProfile?.phone || '';
  if (savedMob) {
    const wdMob = document.getElementById('withdraw-mobile-input');
    if (wdMob && !wdMob.value) wdMob.value = savedMob;
  }
  updateBalanceUI();
  openModal(modalWithdraw);
};
document.getElementById('btn-open-support').onclick = () => openModal(modalSupport);

// EXACT RUMMYADDA AUTH MODAL TOGGLE & SUBMIT
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

// Handle Exact RummyAdda Auth Submit
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
    // Standard Sign In
    try {
      await signInWithEmailAndPassword(auth, authEmail, pass);
      showToast('Signed in successfully! Welcome to RummyAdda Aviator.', 'success');
      closeModal(modalAuth);
    } catch (err) {
      console.warn('Sign in error:', err);
      authErrorText.innerText = getAuthErrorMessage(err, 'signin');
      authErrorBox.classList.remove('hidden');
    }
  } else {
    // Create Account (Sign Up)
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

      // Setup Firestore User Profile
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

      // Setup Firestore Wallet with ₹20 Bonus
      await setDoc(doc(db, 'wallets', uid), {
        uid,
        depositBalance: 0,
        winBalance: 0,
        bonusBalance: 20, // ₹20 Welcome bonus
        rewardPoints: 0,
        welcomeBonusClaimed: true,
        updatedAt: now
      });

      // Log Welcome Bonus Transaction
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

// Deposit preset click
document.querySelectorAll('.dep-preset').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.dep-preset').forEach(b => {
      b.className = 'dep-preset py-2 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10';
    });
    btn.className = 'dep-preset py-2 rounded-xl bg-amber-400 text-black border border-amber-400 font-bold';
    const depInput = document.getElementById('deposit-amount-input');
    if (depInput) depInput.value = btn.dataset.amt;
  };
});

// Full page wallet navigation handlers
const btnOpenWalletPage = document.getElementById('btn-open-wallet-page');
if (btnOpenWalletPage) {
  btnOpenWalletPage.onclick = () => {
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = '/wallet/deposit';
      } else {
        window.location.href = '/wallet/deposit';
      }
    } catch (e) {
      window.location.href = '/wallet/deposit';
    }
  };
}

const btnOpenWithdrawPage = document.getElementById('btn-open-withdraw-page');
if (btnOpenWithdrawPage) {
  btnOpenWithdrawPage.onclick = () => {
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = '/wallet/withdraw';
      } else {
        window.location.href = '/wallet/withdraw';
      }
    } catch (e) {
      window.location.href = '/wallet/withdraw';
    }
  };
}

// Submit WhatsApp Deposit Request (Exact Rummy Adda Shared Flow)
const btnSubmitDeposit = document.getElementById('btn-submit-deposit');
if (btnSubmitDeposit) {
  btnSubmitDeposit.onclick = async () => {
    if (!currentUser) {
      closeModal(modalDeposit);
      openAuthModal('signin');
      showToast('Please sign in to deposit cash.', 'info');
      return;
    }

    const amtInput = document.getElementById('deposit-amount-input');
    const mobInput = document.getElementById('deposit-mobile-input');
    const depErrBox = document.getElementById('dep-error-box');
    const depErrText = document.getElementById('dep-error-text');

    if (depErrBox) depErrBox.classList.add('hidden');

    const amt = parseFloat(amtInput?.value) || 0;
    const cleanMobile = (mobInput?.value || '').trim().replace(/[^0-9]/g, '');

    if (isNaN(amt) || amt < 50) {
      if (depErrText && depErrBox) {
        depErrText.innerText = 'Minimum deposit chips amount is ₹50.';
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
    if (cleanMobile.length < 10) {
      if (depErrText && depErrBox) {
        depErrText.innerText = 'Please enter a valid 10-digit mobile number.';
        depErrBox.classList.remove('hidden');
      }
      showToast('Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }

    localStorage.setItem('rummy_user_mobile', cleanMobile);
    btnSubmitDeposit.disabled = true;
    btnSubmitDeposit.innerText = 'Opening WhatsApp...';

    try {
      const depId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const playerId = currentProfile?.playerId || `P${currentUser.uid.slice(0, 5).toUpperCase()}`;
      const userDisplayName = currentProfile?.displayName || currentUser.email?.split('@')[0] || 'Player';
      const shortId = playerId.slice(-4);

      if (db) {
        await setDoc(doc(db, 'deposits', depId), {
          depositId: depId,
          uid: currentUser.uid,
          playerId,
          requestedAmount: amt,
          mobileNumber: cleanMobile,
          status: 'pending',
          whatsappOpenedAt: now,
          createdAt: now
        });
      }

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

// Submit Withdrawal Request (Exact Rummy Adda Shared Flow: UPI & Bank Transfer)
const btnSubmitWithdraw = document.getElementById('btn-submit-withdraw');
if (btnSubmitWithdraw) {
  btnSubmitWithdraw.onclick = async () => {
    const amtInput = document.getElementById('withdraw-amount-input');
    const mobInput = document.getElementById('withdraw-mobile-input');
    const upiInput = document.getElementById('withdraw-upi-input');
    const accInput = document.getElementById('withdraw-acc-input');
    const ifscInput = document.getElementById('withdraw-ifsc-input');
    const holderInput = document.getElementById('withdraw-holder-input');

    const wdErrBox = document.getElementById('wd-error-box');
    const wdErrText = document.getElementById('wd-error-text');

    if (wdErrBox) wdErrBox.classList.add('hidden');

    if (!currentUser) {
      closeModal(modalWithdraw);
      openAuthModal('signin');
      showToast('Please sign in to withdraw cash.', 'info');
      return;
    }

    const amt = parseFloat(amtInput?.value) || 0;
    const cleanMobile = (mobInput?.value || '').trim().replace(/[^0-9]/g, '');
    const upi = (upiInput?.value || '').trim();
    const acc = (accInput?.value || '').trim();
    const ifsc = (ifscInput?.value || '').trim().toUpperCase();
    const holder = (holderInput?.value || '').trim();
    const winBal = realWallet.winBalance || 0;

    if (isNaN(amt) || amt < 100) {
      if (wdErrText && wdErrBox) {
        wdErrText.innerText = 'Minimum withdrawal amount is ₹100.';
        wdErrBox.classList.remove('hidden');
      }
      showToast('Minimum withdrawal amount is ₹100.', 'warning');
      return;
    }
    if (amt > winBal) {
      if (wdErrText && wdErrBox) {
        wdErrText.innerText = `Insufficient winning balance. You have ₹${winBal.toFixed(2)} available.`;
        wdErrBox.classList.remove('hidden');
      }
      showToast(`Insufficient winning balance (₹${winBal.toFixed(2)}).`, 'warning');
      return;
    }
    if (cleanMobile.length < 10) {
      if (wdErrText && wdErrBox) {
        wdErrText.innerText = 'Please enter a valid 10-digit mobile number.';
        wdErrBox.classList.remove('hidden');
      }
      showToast('Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }

    if (wdMethod === 'upi') {
      if (!upi.includes('@')) {
        if (wdErrText && wdErrBox) {
          wdErrText.innerText = 'Please enter a valid UPI ID (e.g. mobile@upi or user@paytm).';
          wdErrBox.classList.remove('hidden');
        }
        showToast('Please enter a valid UPI ID.', 'warning');
        return;
      }
    } else {
      if (!acc || acc.length < 8) {
        if (wdErrText && wdErrBox) {
          wdErrText.innerText = 'Please enter a valid Bank Account Number.';
          wdErrBox.classList.remove('hidden');
        }
        showToast('Please enter a valid Bank Account Number.', 'warning');
        return;
      }
      if (!ifsc || ifsc.length < 11) {
        if (wdErrText && wdErrBox) {
          wdErrText.innerText = 'Please enter a valid 11-character IFSC Code.';
          wdErrBox.classList.remove('hidden');
        }
        showToast('Please enter a valid 11-character IFSC Code.', 'warning');
        return;
      }
      if (!holder) {
        if (wdErrText && wdErrBox) {
          wdErrText.innerText = 'Please enter the Account Holder full name.';
          wdErrBox.classList.remove('hidden');
        }
        showToast('Please enter the Account Holder full name.', 'warning');
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

// ==========================================
// 10. AUTH & FIRESTORE REALTIME SYNC
// ==========================================
if (auth) {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const authBtnText = document.getElementById('auth-btn-text');

    if (user) {
      authBtnText.innerText = 'Logout';
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) currentProfile = snap.data();
      });

      onSnapshot(doc(db, 'wallets', user.uid), snap => {
        if (snap.exists()) {
          const w = snap.data();
          realWallet = {
            depositBalance: w.depositBalance || 0,
            winBalance: w.winBalance || 0,
            bonusBalance: w.bonusBalance || 0
          };
          updateBalanceUI();
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
      authBtnText.innerText = 'Sign In';
      realWallet = { depositBalance: 0, winBalance: 0, bonusBalance: 0 };
      updateBalanceUI();
    }
  });
}

updateBalanceUI();
startWaitingPeriod();

// ==========================================
// 11. NAVIGATION, LANDSCAPE CONTROLS & URL PARAMS
// ==========================================
const btnBackLobby = document.getElementById('btn-back-lobby');
if (btnBackLobby) {
  btnBackLobby.onclick = () => {
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = '/lobby';
      } else {
        window.location.href = '/lobby';
      }
    } catch (e) {
      window.location.href = '/lobby';
    }
  };
}

const btnRequestLandscape = document.getElementById('btn-request-landscape');
if (btnRequestLandscape) {
  btnRequestLandscape.onclick = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape');
      }
      showToast('Cockpit landscape mode activated!', 'success');
    } catch (e) {
      showToast('Please rotate your device horizontally for landscape view.', 'info');
    }
  };
}

const btnDismissLandscape = document.getElementById('btn-dismiss-landscape');
if (btnDismissLandscape) {
  btnDismissLandscape.onclick = () => {
    const prompt = document.getElementById('landscape-prompt');
    if (prompt) prompt.style.display = 'none';
  };
}

function handleUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const stakeParam = parseInt(urlParams.get('stake'), 10);
  const autostart = urlParams.get('autostart');

  if (stakeParam && !isNaN(stakeParam) && stakeParam >= 10) {
    p1Stake = stakeParam;
    updateP1UI();
  }

  if (autostart === '1') {
    switchGameMode('play');
  }
}
handleUrlParams();
