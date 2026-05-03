import type { HandHistory } from '../../types'
import { getHandHistoryNetProfit, getHandHistoryTotalChipsPut, getHandHistorySeatNumber, getHandHistoryOffsetFromButton, getHandHistoryShowdownPlayers } from '../../types'
import type { Data, Layout } from 'plotly.js-dist-min'

export interface PositionStat {
  position: string
  profit: number
  chipsWon: number
  chipsInvested: number
  hands: number
  sawFlop: number
  sawShowdown: number
  rfiOpps: number
  rfis: number
  threeBetOpps: number
  threeBets: number
}

const EMPTY_STAT = (pos: string): PositionStat => ({
  position: pos, profit: 0, chipsWon: 0, chipsInvested: 0, hands: 0, sawFlop: 0, sawShowdown: 0, rfiOpps: 0, rfis: 0, threeBetOpps: 0, threeBets: 0
})

import { getHandHistoryInitialChips } from '../../types'

export type StackInterval = 'all' | '14' | '17' | '20' | '30' | '50' | '100'

export function calculatePositionStats(hands: HandHistory[], playerId: string = 'Hero'): Record<StackInterval, Record<string, PositionStat>> {
  const intervals: StackInterval[] = ['all', '14', '17', '20', '30', '50', '100']
  const statsByInterval = {} as Record<StackInterval, Record<string, PositionStat>>

  for (const iv of intervals) {
    statsByInterval[iv] = {
      BB:  EMPTY_STAT('BB'),
      SB:  EMPTY_STAT('SB'),
      BTN: EMPTY_STAT('BTN'),
      CO:  EMPTY_STAT('CO'),
      MP:  EMPTY_STAT('MP'),
      UTG: EMPTY_STAT('UTG'),
    }
  }

  for (const h of hands) {
    if (!h.seats.has(getHandHistorySeatNumber(h, playerId))) continue
    
    const offset = getHandHistoryOffsetFromButton(h, playerId)
    let posStr = 'UTG'
    if (offset === 1) posStr = 'SB'
    else if (offset === 2) posStr = 'BB'
    else if (offset === 0) posStr = 'BTN'
    else if (offset === -1) posStr = 'CO'
    else if (offset === -2) posStr = 'MP'

    const bbValue = h.bb > 0 ? h.bb : 1
    const heroChips = getHandHistoryInitialChips(h, playerId)
    const heroBBs = heroChips / bbValue

    let iv: StackInterval = '100'
    if (heroBBs <= 14) iv = '14'
    else if (heroBBs <= 17) iv = '17'
    else if (heroBBs <= 20) iv = '20'
    else if (heroBBs <= 30) iv = '30'
    else if (heroBBs <= 50) iv = '50'

    const targetIntervals: StackInterval[] = ['all', iv]

    const chipsPut = getHandHistoryTotalChipsPut(h, playerId)
    const chipsWon = h.wons.get(playerId) ?? 0
    const netProfit = chipsWon - chipsPut

    // RFI and 3-Bet Calculation
    let hadRfiOpportunity = true
    let madeRFI = false
    let heroActed = false
    let raisesBeforeHero = 0
    let made3Bet = false

    for (const action of h.actionsPreflop) {
      if (action.playerId === playerId) {
        if (!heroActed) {
          heroActed = true
          // Hero's first action
          if (hadRfiOpportunity && action.action === 'raise') {
            madeRFI = true
          }
          if (raisesBeforeHero === 1 && action.action === 'raise') {
            made3Bet = true
          }
        }
      } else {
        if (!heroActed) {
          if (action.action === 'call' || action.action === 'raise' || action.action === 'bet') {
            hadRfiOpportunity = false
          }
          if (action.action === 'raise') {
            raisesBeforeHero++
          }
        }
      }
    }
    
    // Saw flop?
    const hasFlopActions = h.actionsFlop.length > 0
    let sawFlop = false
    if (hasFlopActions) {
      const foldedPre = h.actionsPreflop.some(a => a.playerId === playerId && a.action === 'fold')
      if (!foldedPre) sawFlop = true
    }
    
    // Showdown?
    const showdownPlayers = getHandHistoryShowdownPlayers(h)
    const sawShowdown = showdownPlayers.has(playerId)

    for (const bucket of targetIntervals) {
      if (!statsByInterval[bucket][posStr]) statsByInterval[bucket][posStr] = EMPTY_STAT(posStr)
      
      const s = statsByInterval[bucket][posStr]
      s.hands++
      s.chipsInvested += chipsPut
      s.chipsWon += chipsWon
      s.profit += netProfit
      
      if (hadRfiOpportunity && heroActed) {
        s.rfiOpps++
        if (madeRFI) s.rfis++
      }

      if (heroActed && raisesBeforeHero === 1) {
        s.threeBetOpps++
        if (made3Bet) s.threeBets++
      }
      
      if (sawFlop) s.sawFlop++
      if (sawShowdown) s.sawShowdown++
    }
  }

  return statsByInterval
}

export function createOpponentsChart(hands: HandHistory[], playerId: string = 'Hero'): { traces: Data[], layout: Partial<Layout> } {
  // Simple heuristic: just calculate total net profit for all opponents
  const opponentProfits = new Map<string, number>()
  
  for (const h of hands) {
    for (const [, [pid]] of h.seats) {
      if (pid === playerId) continue
      const profit = getHandHistoryNetProfit(h, pid)
      opponentProfits.set(pid, (opponentProfits.get(pid) || 0) + profit)
    }
  }

  // Sort by profit
  const sortedOpponents = Array.from(opponentProfits.entries()).sort((a, b) => a[1] - b[1])
  
  // Take top 5 winners and top 5 losers to keep chart clean
  const toDisplay = [...sortedOpponents.slice(0, 10), ...sortedOpponents.slice(-10)]
  // filter duplicates
  const uniqueDisplay = Array.from(new Map(toDisplay.map(item => [item[0], item])).values()).sort((a, b) => a[1] - b[1])

  const names = uniqueDisplay.map(d => d[0])
  const profits = uniqueDisplay.map(d => d[1])
  const colors = profits.map(p => p >= 0 ? '#4ade80' : '#f87171')
  const text = profits.map(p => p >= 0 ? `+$${p.toFixed(2)}` : `-$${Math.abs(p).toFixed(2)}`)

  const trace: Data = {
    type: 'bar',
    x: profits,
    y: names,
    orientation: 'h',
    marker: { color: colors },
    text: text,
    textposition: 'auto',
  }

  const layout: Partial<Layout> = {
    title: { text: 'Adversários (Lucro/Prejuízo)' },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: '#e2e8f0' },
    margin: { l: 150, r: 20, t: 40, b: 40 },
    xaxis: { title: { text: 'Net Profit ($)' }, gridcolor: 'rgba(255,255,255,0.1)' },
    yaxis: { title: { text: '' }, automargin: true },
  }

  return { traces: [trace], layout }
}
