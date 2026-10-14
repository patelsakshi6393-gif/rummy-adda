# RummyAdda Real-Time Compliance & Server-Authoritative Architecture

Comprehensive architectural and implementation plan for RummyAdda. This plan incorporates all user requirements: server-authoritative matchmaking, strict Firestore security, preservation of the existing UI with zero Admin Panel creation, strict disabling of real-money settlement until a dedicated trusted settlement backend exists, and explicit disclosure of remaining security boundaries.

---

## 1. Executive Summary & Core Directives

> [!IMPORTANT]
> **Strict Architectural Boundaries**:
> 1. **No Admin Panel & UI Preservation**: Preserve the existing luxury emerald-felt casino UI, lobby, tables, rules, and wallet views. No Admin Panel or administrative UI will be created.
> 2. **Real-Money Settlement Disabled**: Client-driven wallet modifications are strictly prohibited in Firestore security rules. Real-money settlement remains explicitly disabled until a trusted backend (such as Cloud Functions or a dedicated secure Node.js microservice with Firebase Admin SDK) is provisioned. Demonstration and skill points are tracked, but no claim of production-ready real-money settlement is made.
> 3. **Trusted Backend Authority Required**: An operation is **not** secure simply because a client executes a Firestore transaction. All authoritative game state, card dealing (concealing the closed deck), matchmaking transitions, and wallet ledgering require trusted backend logic.
> 4. **No Rules Deployment Until Reviewed**: Firestore security rules will undergo thorough testing and boundary review before any deployment.
> 5. **Atomic Operations & Invariants**: Enforce atomic 6-player and 2-player ceilings, duplicate-queue prevention, 15-second countdown triggers with atomic rollback on player departure, and seat release.
> 6. **100% Real Firestore Data**: No simulated player counts, fake tournament registrations, or hardcoded fallback counters.

---

## 2. Threat Model & Security Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             Client Applications (Untrusted)                      │
│                                                                                  │
│    ┌──────────────────┐       ┌────────────────────┐      ┌──────────────────┐   │
│    │ Lobby & Tables   │       │ Live Game Felt HUD │      │ Profile & Wallet │   │
│    │ (Live Real Data) │       │ (Own Cards Only)   │      │ (Read-Only Bal)  │   │
│    └────────┬─────────┘       └─────────┬──────────┘      └────────┬─────────┘   │
└─────────────┼───────────────────────────┼──────────────────────────┼─────────────┘
              │                           │                          │
              ▼                           ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                      Trusted Server API Layer (/api/*)                           │
│                                                                                  │
│   • /api/matchmaking/queue: Atomic ticket verification & deduplication           │
│   • /api/game/deal: Server-authoritative card shuffling (closed deck hidden)     │
│   • /api/game/settle: Validates declaration sequences; awards score;             │
│                       refuses unverified cash payouts until backend settled      │
│   • /api/tables/leave: Atomic seat release & countdown abort                     │
└─────────────────────────────────────────┬────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   Strict Firestore Security Rules (Security Guard)               │
│                                                                                  │
│  • wallets/{uid}:                                                                │
│      - Read: request.auth.uid == uid                                             │
│      - Create: Initial zero balances only                                        │
│      - Update: DENIED (allow update: if false)                                   │
│  • transactions/{txId}:                                                          │
│      - Read: request.auth.uid == resource.data.uid                                │
│      - Create/Update/Delete: DENIED to untrusted clients                         │
│  • games/{gameId}/players/{uid}:                                                 │
│      - Read: Signed-in match participants                                        │
│      - Write: Own seat doc ONLY; cannot overwrite opponent cards or status       │
│  • games/{gameId}/internal/* (Deck, seed, secret hands):                         │
│      - Read/Write: DENIED to all clients (prevents deck inspection cheating)     │
│  • deposits/{id} & withdrawals/{id}:                                             │
│      - Create: Status MUST be 'pending'; cannot self-approve                     │
│      - Update/Delete: DENIED                                                     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Invariants & State Machine

### A. Matchmaking & Table Lifecycle
1. **Queue Ticket Invariant**:
   - Each player can have at most one active `QUEUED` ticket in `/matchmakingQueue`.
   - Before queueing or seating, queries check for active tickets or seated games.
2. **Table Capacity (2P / 6P)**:
   - When seating a player into `/gameTables/{tableId}` and `/games/{gameId}/players/{uid}`, the operation checks `currentPlayers < maxPlayers` (max 2 or max 6). If capacity is reached, the transaction aborts cleanly.
3. **15-Second Countdown Transition**:
   - Initiated atomically when `currentPlayers >= 2`.
   - If any player leaves during the countdown such that `currentPlayers < 2`, the countdown is cancelled and the table state reverts to `open` / `WAITING`.
4. **Seat Release & Cancellation**:
   - When a player leaves, navigates back to lobby, or drops:
     - Player document is marked `dropped` or removed.
     - `currentPlayers` is decremented.
     - If `currentPlayers == 0`, the table resets to `open`.

### B. Game State & Card Privacy
1. **Concealed Deck**:
   - The closed deck must not be stored in plain text inside `/games/{gameId}` where any subscribed client can inspect the order of upcoming cards.
   - It is stored under `/games/{gameId}/internal/deck` which clients cannot read via Firestore rules.
2. **Hands Privacy**:
   - Hand cards are written only to `/games/{gameId}/players/{uid}` with rules enforcing `request.auth.uid == uid` for write access.
3. **Turn Timers (Rule #45)**:
   - 60s base timer + two 5s extensions max -> auto-drop on expiration.

---

## 4. Real-Money Settlement Audit & Status

| Feature | Architecture State | Production Settlement Status |
| :--- | :--- | :--- |
| **Skill Points & Demonstration** | Enabled in client UI | Fully functional for skill gaming practice & demonstration. |
| **Deposit Request Intent** | Client submits `pending` intent; WhatsApp support link opens | **Not Production-Ready for Automated Real Money**. Requires manual verification or banking webhook integration. |
| **Withdrawal Request Intent** | Client creates `pending` intent with bank/UPI | **Not Production-Ready for Automated Payout**. Requires payment gateway payout service. |
| **Match Winner Settlement** | Calculated using 13-card rummy point rules (first drop 20, middle drop 40, full count 80) | **Demonstration Ledger Only**. Real-money wallet crediting is disabled in security rules (`allow update: if false`) to prevent client balance manipulation. |

---

## 5. Phased Implementation Plan

### Phase 1: Real-Time Data Cleanliness & Truth
- Inspect all UI views (`app/page.tsx`, `app/tables/page.tsx`, `app/tournaments/page.tsx`, `app/lobby/page.tsx`).
- Remove simulated participant counts in tournaments (replace fake seeds with real Firestore collection queries).
- Remove fallback counters (e.g. `tables.length || 10`) in home and table lobbies.

### Phase 2: Trusted Matchmaking & Seat Release Engine
- Update `lib/types.ts` with typed `MatchmakingTicket`.
- Refactor `lib/game-service.ts` to implement atomic duplicate-queue checking, atomic 6-player ceiling, 15-second countdown trigger, and atomic seat release on exit.
- Integrate `leaveTable` into `app/game/[gameId]/page.tsx` top-bar exit and drop handlers.

### Phase 3: Card Privacy & Server-Side Security
- Restructure deck storage so closed deck cards reside in an unreadable subcollection or server route.
- Implement server-side verification endpoints for dealing and match result validation.

### Phase 4: Strict Firestore Security Rules
- Draft strict `firestore.rules` enforcing:
  - Immutable wallets (`allow update: if false;`).
  - Read/write access strictly bounded to `request.auth.uid`.
  - Immutable transaction records.
  - Denied access to `/games/{gameId}/internal/*`.
- Review security boundaries thoroughly prior to deployment.

### Phase 5: Build, Lint & Verification Audit
- Run `npm run lint` and `compile_applet`.
- Verify zero syntax or compilation errors.
- Document and report verified behavior and every remaining security boundary or production requirement.
