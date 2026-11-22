/**
 * Complete Ludo Game Engine
 * 15x15 Coordinate Mapping, Safe Squares, Token Navigation & Capture Rules
 */

// 52 Common Track Tile Coordinates on a 15x15 Grid: [row, col] (0-indexed)
export const TRACK_COORDS = [
  // Red Track (0..12)
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], // 0..4 (0 is Red start)
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], // 5..10
  [0, 7], // 11
  [0, 8], // 12
  // Green Track (13..25)
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], // 13..17 (13 is Green start)
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // 18..23
  [7, 14], // 24
  [8, 14], // 25
  // Yellow Track (26..38)
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // 26..30 (26 is Yellow start)
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // 31..36
  [14, 7], // 37
  [14, 6], // 38
  // Blue Track (39..51)
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], // 39..43 (39 is Blue start)
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], // 44..49
  [7, 0], // 50
  [6, 0]  // 51
];

// Home Straight Columns (5 steps leading into center triangle)
export const HOME_STRAIGHTS = {
  red: [ [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6] ],
  green: [ [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7] ],
  yellow: [ [7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8] ],
  blue: [ [13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7] ]
};

// Yard Positions for 4 tokens of each color (Symmetric 2x2 grid inside 4x4 inner yard)
export const YARD_POSITIONS = {
  red: [ [2, 2], [2, 4], [4, 2], [4, 4] ],
  green: [ [2, 11], [2, 13], [4, 11], [4, 13] ],
  yellow: [ [11, 11], [11, 13], [13, 11], [13, 13] ],
  blue: [ [11, 2], [11, 4], [13, 2], [13, 4] ]
};

// Start track index for each color
export const COLOR_START_INDEX = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

// Safe squares on 52-tile track (Star squares + Start squares)
export const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

export class LudoGame {
  constructor(playerCount = 2, stake = 1) {
    this.playerCount = playerCount; // 2 or 4
    this.stake = stake; // Starting from ₹1!
    this.platformFeePercent = 10; // 10%
    this.prizePool = Number((stake * playerCount * (1 - this.platformFeePercent / 100)).toFixed(2));

    this.turnOrder = playerCount === 2 ? ['blue', 'green'] : ['blue', 'red', 'green', 'yellow'];
    this.currentTurnIndex = 0;
    this.currentTurn = this.turnOrder[0];

    this.diceValue = 0;
    this.hasRolled = false;
    this.consecutiveSixes = 0;
    this.winner = null;

    // Tokens state for each color: 4 tokens
    // step: -1 = yard, 0..50 = track, 51..55 = home straight, 56 = Home (Finished)
    this.tokens = {
      red: [ { id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 } ],
      green: [ { id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 } ],
      yellow: [ { id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 } ],
      blue: [ { id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 } ]
    };
  }

  rollDice() {
    if (this.hasRolled && this.getValidMoves().length > 0) {
      return this.diceValue;
    }

    this.diceValue = Math.floor(Math.random() * 6) + 1;
    this.hasRolled = true;

    if (this.diceValue === 6) {
      this.consecutiveSixes += 1;
      if (this.consecutiveSixes === 3) {
        // Penalty for 3 consecutive sixes: turn cancelled
        this.nextTurn();
        return this.diceValue;
      }
    } else {
      this.consecutiveSixes = 0;
    }

    // If no moves are possible, pass turn quickly (200ms)
    const valid = this.getValidMoves();
    if (valid.length === 0 && this.diceValue !== 6) {
      setTimeout(() => {
        this.nextTurn();
      }, 200);
    }

    return this.diceValue;
  }

  getValidMoves(color = this.currentTurn) {
    if (!this.hasRolled) return [];
    const roll = this.diceValue;
    const tokens = this.tokens[color];
    const valid = [];

    tokens.forEach(tok => {
      if (tok.step === 56) return; // Already reached home

      if (tok.step === -1) {
        // Can only exit yard if roll is 6
        if (roll === 6) {
          valid.push(tok.id);
        }
      } else if (tok.step + roll <= 56) {
        valid.push(tok.id);
      }
    });

    return valid;
  }

  moveToken(tokenId, color = this.currentTurn) {
    if (!this.hasRolled) return { success: false, reason: 'Must roll dice first' };
    const valid = this.getValidMoves(color);
    if (!valid.includes(tokenId)) return { success: false, reason: 'Invalid move' };

    const tok = this.tokens[color].find(t => t.id === tokenId);
    const roll = this.diceValue;
    let extraRoll = false;

    if (tok.step === -1) {
      // Exiting yard to starting square
      tok.step = 0;
      extraRoll = true; // Rolling 6 grants extra turn
    } else {
      tok.step += roll;
    }

    // Check Home Reach
    if (tok.step === 56) {
      extraRoll = true;
      // In Quick Real Cash Ludo, 1 token reaching home secures victory!
      // (Or check if all tokens finished)
      const finishedCount = this.tokens[color].filter(t => t.step === 56).length;
      if (finishedCount >= 1) {
        this.winner = color;
        return { success: true, capture: false, extraRoll: false, winner: color };
      }
    }

    // Check for opponent capture if on main track
    let captured = false;
    if (tok.step >= 0 && tok.step <= 50) {
      const trackIdx = this.getTrackIndex(color, tok.step);
      // Safe squares cannot be captured
      if (!SAFE_SQUARES.includes(trackIdx)) {
        // Check if any opponent token is on this exact track cell
        for (const oppColor of this.turnOrder) {
          if (oppColor === color) continue;
          for (const oppTok of this.tokens[oppColor]) {
            if (oppTok.step >= 0 && oppTok.step <= 50) {
              const oppTrackIdx = this.getTrackIndex(oppColor, oppTok.step);
              if (oppTrackIdx === trackIdx) {
                // CAPTURE! Send back to yard
                oppTok.step = -1;
                captured = true;
                extraRoll = true; // Capture grants extra roll
                break;
              }
            }
          }
        }
      }
    }

    // If rolled a 6, grant extra roll
    if (roll === 6) {
      extraRoll = true;
    }

    this.hasRolled = false;

    if (!extraRoll && !this.winner) {
      this.nextTurn();
    }

    return { success: true, capture: captured, extraRoll, winner: this.winner };
  }

  getTrackIndex(color, step) {
    const startIdx = COLOR_START_INDEX[color];
    return (startIdx + step) % 52;
  }

  getTokenGridCoord(color, tokenId) {
    const tok = this.tokens[color].find(t => t.id === tokenId);
    if (!tok) return [0, 0];

    // In yard
    if (tok.step === -1) {
      return YARD_POSITIONS[color][tokenId];
    }

    // In home straight (51..55)
    if (tok.step >= 51 && tok.step <= 55) {
      const straightIdx = tok.step - 51;
      return HOME_STRAIGHTS[color][straightIdx];
    }

    // At Home (56)
    if (tok.step === 56) {
      return [7, 7]; // Center square
    }

    // On 52-tile track
    const trackIdx = this.getTrackIndex(color, tok.step);
    return TRACK_COORDS[trackIdx];
  }

  nextTurn() {
    this.consecutiveSixes = 0;
    this.hasRolled = false;
    this.diceValue = 0;
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
    this.currentTurn = this.turnOrder[this.currentTurnIndex];
  }
}
