# RummyLudo - Real Cash Ludo Game

Standalone Real Cash Ludo game built for Indian gaming.
Shares the same Firebase backend, user database, and wallet with RummyAdda.

### Features
1. **Starting Stake**: Starts from **₹1** (₹1, ₹5, ₹10, ₹25, ₹50, ₹100, ₹250, ₹500).
2. **Match Modes**:
   - 2 Players (1v1 Quick Cash)
   - 4 Players (Classic)
3. **Gameplay**:
   - Standard 15x15 board with safe star cells and colored home columns.
   - 3D tactile dice roller with roll sound and turn indicators.
   - Opponent token capture (sends back to yard and grants extra roll).
   - Extra roll on rolling 6.
   - Instant AI bot opponent for zero waiting time.
4. **Shared Wallet**:
   - Matches balance with RummyAdda (`depositBalance`, `winBalance`, `bonusBalance`).
   - Winnings credited automatically to `winBalance`.
5. **Deposit & Withdrawal**:
   - WhatsApp Deposit flow to `+91 9118431155`.
   - Instant UPI Withdrawal flow.
   - WhatsApp Support helpline.

### How to Run Standalone
```bash
cd rummyludo
npm start
# Opens at http://localhost:3001
```
Or open `index.html` directly in any web browser.
