/**
 * GTO RFI (Raise First In) Frequencies extracted from Reg Life PDF
 * Organized by effective stack size (in Big Blinds) and Position.
 * Values are percentages (0-100).
 */

export type Position = 'UTG' | 'MP' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB'

export const GTO_RFI_FREQUENCIES: Record<number, Partial<Record<Position, number>>> = {
  // 14 BB Efetivos
  14: {
    UTG: 15.1, // 12.1% + 3% shove
    MP:  16.9, // 12% + 4.9% shove
    LJ:  29.1, // 21.8% + 7.3% shove
    HJ:  24.0, // 12.7% + 11.3% shove
    CO:  30.0, // 12.9% + 17.1% shove
    BTN: 37.7, // 14.2% + 23.5% shove
    SB:  35.0, // 7.5% + 27.5% shove
  },
  // 17 BB Efetivos
  17: {
    UTG: 15.8,
    MP:  17.7,
    LJ:  20.3,
    HJ:  24.1, // 21.6% + 2.5% shove
    CO:  29.8, // 23.1% + 6.7% shove
    BTN: 39.2, // 25.2% + 14% shove
    SB:  34.1, // 16.8% + 17.3% shove
  },
  // 20 BB Efetivos
  20: {
    UTG: 17.2,
    MP:  18.8,
    LJ:  21.6,
    HJ:  26.0,
    CO:  31.8,
    BTN: 41.6, // 36.6% + 5% shove
    SB:  31.2, // 21% + 10.2% shove
  },
  // 30 BB Efetivos
  30: {
    UTG: 19.0,
    MP:  21.9,
    LJ:  25.3,
    HJ:  29.6,
    CO:  37.2,
    BTN: 48.8,
    SB:  29.7,
  },
  // 50 BB Efetivos
  50: {
    UTG: 17.7,
    MP:  20.4,
    LJ:  24.9,
    HJ:  29.6,
    CO:  37.6,
    BTN: 54.0,
    SB:  21.7,
  },
  // 100 BB Efetivos
  100: {
    UTG: 16.5,
    MP:  19.2,
    LJ:  21.8,
    HJ:  27.9,
    CO:  36.3,
    BTN: 55.9,
    SB:  9.9,
  }
}

/**
 * Approximate GTO 3-bet frequencies for the Big Blind against an average open.
 * Values derived from Reg Life PDF averages across different positions.
 */
export const GTO_BB_3BET_FREQUENCIES: Record<number, number> = {
  14: 12.0, // mostly shoves
  17: 10.0,
  20: 5.0,  // calls/shoves mix
  30: 6.5,
  50: 9.5,
  100: 10.0,
}

/**
 * Standard preflop GTO hand playability ranking (169 hands).
 * Ordered from strongest (0) to weakest (168).
 * Suited connectors and suited aces are ranked higher than low offsuit broadways.
 */
export const GTO_HAND_RANKING = [
  "AA", "KK", "QQ", "AKs", "JJ", "AQs", "KQs", "AKo", "TT", "AJs", 
  "KJs", "QJs", "AQo", "99", "ATs", "KTs", "QTs", "JTs", "88", "AJo", 
  "KQo", "77", "A9s", "A5s", "K9s", "Q9s", "J9s", "T9s", "A8s", "A4s", 
  "66", "A7s", "A3s", "A6s", "KJo", "A2s", "55", "QJo", "K8s", "K7s", 
  "44", "J8s", "Q8s", "T8s", "98s", "ATo", "33", "K6s", "K5s", "K4s", 
  "22", "87s", "K3s", "K2s", "JTo", "Q7s", "76s", "Q6s", "KTo", "97s", 
  "Q5s", "86s", "Q4s", "Q3s", "T7s", "65s", "Q2s", "J7s", "75s", "J6s", 
  "A9o", "54s", "J5s", "96s", "J4s", "J3s", "85s", "64s", "J2s", "T6s", 
  "A8o", "T5s", "74s", "T4s", "T3s", "53s", "T2s", "95s", "A5o", "94s", 
  "A7o", "84s", "93s", "63s", "92s", "43s", "83s", "A4o", "82s", "A6o", 
  "52s", "A3o", "73s", "A2o", "42s", "72s", "K9o", "62s", "32s", "Q9o", 
  "J9o", "T9o", "K8o", "K7o", "Q8o", "98o", "K6o", "J8o", "T8o", "K5o", 
  "87o", "K4o", "Q7o", "K3o", "97o", "K2o", "Q6o", "76o", "J7o", "Q5o", 
  "86o", "Q4o", "T7o", "Q3o", "65o", "Q2o", "96o", "J6o", "75o", "J5o", 
  "85o", "54o", "J4o", "T6o", "J3o", "64o", "J2o", "95o", "T5o", "84o", 
  "74o", "T4o", "53o", "T3o", "94o", "T2o", "63o", "83o", "93o", "43o", 
  "73o", "92o", "82o", "52o", "62o", "42o", "72o", "32o"
]

/**
 * Returns a Set of hand strings that fall within the top X% of hands.
 */
export function getGTORangeByFrequency(frequencyPct: number): Set<string> {
  const count = Math.round((frequencyPct / 100) * 169)
  const hands = GTO_HAND_RANKING.slice(0, count)
  return new Set(hands)
}

export interface GtoActionFrequencies {
  raise: number
  allin: number
  call: number
}

/**
 * Mathematically estimates the action frequencies (Raise, All-in, Call) for a specific hand
 * given the effective stack size, position, and the total size of the opening range.
 */
export function getGtoHandActionFrequencies(
  hand: string, 
  stack: number, 
  pos: Position, 
  rangeSize: number
): GtoActionFrequencies | null {
  const rankIndex = GTO_HAND_RANKING.indexOf(hand)
  
  // If the hand is outside the recommended range, it's a Fold (null)
  if (rankIndex === -1 || rankIndex >= rangeSize) return null

  // Big Blind 3-bet logic (pos === 'BB')
  if (pos === 'BB') {
    if (stack <= 20) {
      // Short stack BB 3-bet is mostly All-in
      return { raise: 0.1, allin: 0.9, call: 0 }
    } else {
      // Deep stack BB 3-bet is mostly non-allin raise
      return { raise: 0.9, allin: 0.1, call: 0 }
    }
  }

  // Small Blind logic
  if (pos === 'SB' && stack >= 30) {
    // SB plays a mixed strategy of Limp (Call) and Raise
    // Top hands raise, weaker hands limp
    if (rankIndex < rangeSize * 0.3) {
      return { raise: 0.8, allin: 0, call: 0.2 }
    } else {
      return { raise: 0.2, allin: 0, call: 0.8 }
    }
  }

  // General RFI logic for other positions
  if (stack <= 20) {
    // Push/Fold mixed strategy
    // Premium hands (Top 15%) trap with a small raise
    if (rankIndex < rangeSize * 0.2) {
      return { raise: 0.85, allin: 0.15, call: 0 }
    }
    // Mid/Bottom range shoves for fold equity
    return { raise: 0.1, allin: 0.9, call: 0 }
  } else if (stack <= 30) {
    // Standard tournament depth
    // Mostly raise, some occasional shoves with pairs like 22-55
    if (hand.match(/^[2-6]{2}$/)) {
      return { raise: 0.4, allin: 0.6, call: 0 }
    }
    return { raise: 0.95, allin: 0.05, call: 0 }
  } else {
    // Deep stack (>30bb) -> Almost pure raise
    return { raise: 1.0, allin: 0, call: 0 }
  }
}

/**
 * Get the closest GTO stack depth for a given effective stack
 */
export function getClosestGTOStack(effectiveStack: number): number {
  const depths = [14, 17, 20, 30, 50, 100]
  let closest = depths[0]
  let minDiff = Math.abs(effectiveStack - depths[0])

  for (const depth of depths) {
    const diff = Math.abs(effectiveStack - depth)
    if (diff < minDiff) {
      minDiff = diff
      closest = depth
    }
  }

  return closest
}
