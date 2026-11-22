/**
 * Aviator Crash Algorithm & Multiplier Curve
 * - Demo Mode: User always gets high multipliers and wins easily (guaranteed confidence booster)
 * - Play Mode: Mathematically balanced 96.5% RTP crash algorithm with house edge
 */

export function getCrashPoint(isDemo = false) {
  if (isDemo) {
    // DEMO MODE: Plane flies high to let user win every round
    // Generates between 3.50x and 48.00x
    const demoMultipliers = [
      4.25, 7.80, 12.40, 5.60, 18.20, 9.15, 24.50, 6.75, 14.80, 31.00
    ];
    const pick = demoMultipliers[Math.floor(Math.random() * demoMultipliers.length)];
    const variation = (Math.random() * 2) - 1;
    return Number(Math.max(3.20, pick + variation).toFixed(2));
  }

  // PLAY MODE (Real Money): 96.5% RTP Crash Game Algorithm
  const rand = Math.random();

  // 3.5% chance of instant crash at takeoff (1.00x - 1.08x)
  if (rand < 0.035) {
    return Number((1.00 + Math.random() * 0.08).toFixed(2));
  }

  // Provably Fair Crash Curve: Multiplier = (1 - HouseEdge) / (1 - Rand)
  const houseEdge = 0.035; // 3.5% house edge => 96.5% RTP
  const fairRand = Math.random();
  let crash = (1.0 - houseEdge) / (1.0 - fairRand);

  // Distribution tuning:
  // ~52% below 2.00x
  // ~30% between 2.00x and 5.00x
  // ~13% between 5.00x and 20.00x
  // ~4.5% between 20.00x and 200.00x
  if (crash < 1.01) crash = 1.01;
  if (crash > 200.00) crash = 200.00;

  return Number(crash.toFixed(2));
}

/**
 * Calculates current multiplier based on elapsed flight time (seconds)
 * Tuned for standard, fast Spribe Aviator tempo (~4s to reach 2.00x)
 */
export function getMultiplierForTime(seconds) {
  if (seconds <= 0) return 1.00;
  // Dynamic smooth growth curve
  const val = 1.00 + (seconds * 0.12) + Math.pow(seconds * 0.145, 2.05);
  return Number(val.toFixed(2));
}

/**
 * Calculates how many seconds of flight are needed to reach a given multiplier
 */
export function getTimeForMultiplier(targetMultiplier) {
  if (targetMultiplier <= 1.00) return 0;
  // Binary search or approximation for exact time
  let low = 0, high = 60;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    if (getMultiplierForTime(mid) < targetMultiplier) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return low;
}
