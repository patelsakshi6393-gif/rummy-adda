# ₹20 Non-Withdrawable Welcome Bonus Plan

Every newly registered player account automatically receives a ₹20 Welcome Bonus credited to their `bonusBalance`. This balance is permanently non-withdrawable, strictly intended for entering real-time Indian Rummy matches (such as ₹20 Micro Stakes tables), with all net winnings credited directly to their withdrawable Winnings Balance.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters were confirmed during interactive clarification:
> - **Wallet Label**: "Bonus Balance (Non-withdrawable game credits)"
> - **Deduction Priority**: Deposited cash is used first; bonus credits are utilized when deposited cash is zero.
> - **Winnings Withdrawability**: Any winnings earned from matches played with this ₹20 bonus go directly to Winnings Balance and are 100% withdrawable (subject to standard ₹100 minimum cashout).

---

## 1. Overview & Core Concept

- **What It Does**: New players joining RummyAdda start immediately with ₹20 bonus credits without requiring an initial deposit. They can jump straight into 13-card Points Rummy, Pool 101, or Deals tables.
- **Target Audience**: All newly registered players completing mobile number authentication.
- **Key Value**: Immediate trial play with real players on live tables, zero risk, and the ability to win real withdrawable cash.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Signup Completion**:
   - Player inputs mobile number, password, and confirms 18+ terms.
   - Initial wallet initializes with `bonusBalance: 20`, `depositBalance: 0`, `winBalance: 0`.
   - A welcome badge appears on the wallet and lobby: *"₹20 Starter Bonus Credited!"*.

2. **Lobby & Match Stakes**:
   - Total Playable Balance displays `₹20` (`Deposit: ₹0 + Winnings: ₹0 + Bonus: ₹20`).
   - The ₹20 Micro Stake table (`₹0.25/pt`, ₹20 entry) is immediately accessible and clickable without top-up prompts.

3. **Match Deduction & Gameplay**:
   - When joining a ₹20 match: If `depositBalance` is 0, ₹20 is deducted from `bonusBalance`.
   - Player competes in authentic real-time 13-card rummy against live human players.

4. **Winning & Settlement**:
   - If the player wins, their share of the prize pool (after standard 20% platform rake) is credited directly to **`winBalance`**.
   - The player can withdraw their accumulated winnings once reaching the ₹100 threshold.

5. **Withdrawal Screen Protection**:
   - The withdrawal page (`/wallet/withdraw`) explicitly states:
     - `Withdrawable Winnings: ₹[winBalance]`
     - `Non-Withdrawable Bonus Balance: ₹[bonusBalance] (Playable Only)`
   - Form validation strictly caps withdrawal at `winBalance`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Wallet Schema Integration**
  - *Chosen Approach*: Use the existing `bonusBalance` field in Firestore `UserWallet` schema and initialize it to `20` upon creation.
  - *Why*: Maintains schema consistency without introducing breaking schema migrations or complex sub-wallets.
  
- **Decision 2: Deduction Hierarchy**
  - *Chosen Approach*: `depositBalance` -> `bonusBalance` -> `winBalance`.
  - *Why*: Aligns with the user's preference to preserve bonus credits for when deposited cash is depleted.

- **Decision 3: Idempotency & Abuse Prevention**
  - *Chosen Approach*: The ₹20 credit is awarded strictly once during document creation (`!walletSnap.exists()`). Existing accounts are never re-credited.
  - *Why*: Prevents duplicate bonus claims or balance tampering.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   New Player Signup                     │
│           (Mobile Number + Secure Password)            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             Firebase Auth & Firestore Init             │
│   users/{uid}   : Profile (RA-XXXXXX, phone)           │
│   wallets/{uid} : { deposit: 0, win: 0, bonus: 20 }    │
│   transactions  : Initial ledger Welcome Bonus: ₹20    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            Match Entry Deduction Engine                │
│                                                        │
│   Is depositBalance >= entryFee?                       │
│     ├── YES ──► Deduct from depositBalance             │
│     └── NO  ──► Deduct from bonusBalance (if available)│
│                 Remainder from winBalance              │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Match Settlement                       │
│   Game Winner Net Share (80%) ──► Added to winBalance  │
│                                   (100% Withdrawable)  │
└────────────────────────────────────────────────────────┘
```

### Component & State Mapping

1. **`lib/types.ts`**:
   - Update `getPlayableBalance`: `(depositBalance || 0) + (winBalance || 0) + (bonusBalance || 0)`.
   - Ensure `getWithdrawableBalance` remains strictly `winBalance || 0`.

2. **`lib/auth-context.tsx`**:
   - Set `bonusBalance: 20` in `initialWallet` during `signUpWithPhone` and in `onAuthStateChanged` when creating a new wallet.
   - Record an initial transaction entry in `transactions` for ₹20 Welcome Bonus.

3. **`lib/game-service.ts`**:
   - Update `findMatch` and `joinTable` to account for `bonusBalance` in total playable checks.
   - Update stake deduction logic: deduct from `depositBalance` first, then `bonusBalance`, then `winBalance`.
   - Update waiting/countdown queue exit refund to restore whatever portion was deducted from `bonusBalance`.

4. **UI Components (`/wallet`, `/wallet/withdraw`, Navbar, Home, Lobby)**:
   - Display `bonusBalance` clearly labeled as "Bonus Balance (Non-withdrawable game credits)".
   - Add locked/info tooltips explaining it is exclusively for playing match tables.
