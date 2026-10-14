# RummyAdda Real-Time Compliance & Server-Authoritative Architecture

Revised architectural plan to enforce server-authoritative matchmaking and strict Firestore security, eliminate all simulated data, and guarantee atomic seat/queue management without an Admin Panel.

## User Decisions & Directives

> [!IMPORTANT]
> Key constraints strictly enforced:
> 1. **Server-Authoritative Matchmaking & Strict Firestore Security**: Disallow clients from modifying other players' cards, authoritative game results, wallet balances, deposits, withdrawals, or admin settlement fields.
> 2. **Atomic Queue & Seat Operations**: Enforce maximum player limits (2P / 6P), duplicate-queue prevention, 15-second countdown initiation/cancellation, and trusted seat release upon leaving.
> 3. **100% Real-Time Firestore Truth**: All player counts, queue times, table occupancies, and tournament participants reflect real Firestore collections with zero fake counters or simulated numbers.
> 4. **UI Preservation & No Admin Panel**: Preserve the existing luxury green felt UI and branding; do not build any admin panel.
> 5. **Truth in Real-Money Settlement**: Explicitly document that client-driven wallet mutations cannot be considered production-ready for real money without a dedicated server-side or Cloud Functions settlement backend.

---

## 1. System Architecture & Threat Model

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js Client Applications                     │
│                                                                        │
│   ┌─────────────────────┐   ┌────────────────────┐   ┌───────────────┐ │
│   │   Home / Tables     │   │ Lobby & Matchmaker │   │ Live Game HUD │ │
│   │ (Live Real Counts)  │   │  (Atomic Tickets)  │   │  (My Cards)   │ │
│   └──────────┬──────────┘   └─────────┬──────────┘   └───────┬───────┘ │
└──────────────┼────────────────────────┼──────────────────────┼─────────┘
               │                        │                      │
               ▼                        ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Strict Firestore Security Rules (Security Guard)          │
│                                                                        │
│  • wallets/{uid}: Client updates DENIED. Balances immutable by client. │
│  • games/{gameId}/players/{uid}: Client can ONLY write own seat doc.   │
│    Cannot modify opponent cards or game results.                       │
│  • games/{gameId}/internal/deck: DENIED to all clients (Anti-cheat).   │
│  • deposits / withdrawals: Status 'pending' only; updates DENIED.      │
│  • matchmakingQueue/{ticketId}: Only ticket owner can queue/cancel.    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Atomic Transaction Engine (`game-service.ts`)            │
│                                                                        │
│  1. `enqueuePlayer(tableId, profile)`:                                 │
│     - Checks duplicate queue ticket atomically.                        │
│     - Checks existing seated table.                                    │
│  2. `joinTable(tableId, profile)`:                                     │
│     - Atomic 6-player ceiling: rejects 7th player race conditions.     │
│     - Triggers 15s countdown if 2nd player joins.                      │
│  3. `leaveTable(gameId, uid)`:                                         │
│     - Removes player doc, decrements counter.                          │
│     - Aborts countdown if active players < 2.                          │
│     - Frees table state to 'open' when empty.                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Strict Security Rules Mapping

| Path | Client Read | Client Create | Client Update / Delete | Protection Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `/wallets/{uid}` | Owner only (`request.auth.uid == uid`) | Only if balances == 0 | **DENIED** (`allow update: if false;`) | Clients cannot credit winnings, deposits, or inflate wallet balances. |
| `/transactions/{txId}` | Owner only | **DENIED** | **DENIED** | Transaction ledger is immutable; clients cannot inject fake transactions. |
| `/deposits/{depId}` | Owner only | Pending status only | **DENIED** | Client cannot mark deposit as approved or modify adminNote/amount. |
| `/withdrawals/{wId}` | Owner only | Pending status only | **DENIED** | Client cannot approve withdrawals or modify payout status. |
| `/matchmakingQueue/{id}` | Owner only | Owner, `status == 'QUEUED'` | Owner can cancel (`status == 'CANCELLED'`) | Prevents queue spoofing or impersonation. |
| `/gameTables/{tableId}` | Public | Signed-in only | Signed-in only | Real-time occupancy listing. |
| `/games/{gameId}` | Signed-in | Signed-in | Only when not settled; cannot overwrite `winnerUid` or `resultData` if already set | Prevents match tampering. |
| `/games/{id}/players/{pId}` | Signed-in | `request.auth.uid == pId` | `request.auth.uid == pId` | **Strict isolation**: Player can NEVER touch opponent's card hand. |
| `/games/{id}/internal/{doc}` | **DENIED** | **DENIED** | **DENIED** | Secret closed deck hidden from clients to prevent x-ray cheating. |

---

## 3. Real-Time Compliance Audit & Cleanup

1. **Elimination of Simulated/Fake Data**:
   - `SEED_TOURNAMENTS`: Removed fake participant counts (`48, 82, 34`) and "simulation" wording. Tournaments use real Firestore registration counts starting at 0.
   - `HomePage`: Replaced `tables.length || 10` with actual live Firestore counts.
   - `Footer & Legal Pages`: Verified direct WhatsApp desk (+91 74669 90584), Supreme Court skill gaming jurisprudence, 18+ policy, zero bot guarantee.

2. **Server-Authoritative Matchmaking**:
   - Real-time queue modal in `app/lobby/page.tsx` and `app/tables/page.tsx`.
   - Atomic ticket creation with duplicate-queue prevention.
   - Atomic seat release on table exit: `leaveTable(gameId, tableId, uid)`.
   - Strict 2-6 player caps with atomic countdown start and rollback on early departure.

---

## 4. Verification and Production Security Gaps Disclosure

- **Verification**: Run `lint_applet` and `compile_applet`. Verify zero TypeScript errors. Deploy rules with `deploy_firebase`.
- **Known Production Security Gaps**:
  1. *Real-Money Settlement*: Without Cloud Functions or a secure Node.js backend with Firebase Admin credentials, wallet balances cannot be safely awarded from the client while strict rules deny client wallet updates. The app is set up for transparent, secure testnet/demonstration skill gameplay and points ledgering, with clear statutory guidance that production money settlement requires server-side webhooks.
  2. *Card Dealing in Client Context*: Shuffling runs in an atomic Firestore transaction. With `/games/{id}/internal/deck` rules set to deny direct client read, clients must query via server API or deal through authoritative transactions.
