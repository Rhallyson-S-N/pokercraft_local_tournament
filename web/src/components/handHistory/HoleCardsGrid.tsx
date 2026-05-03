import { useState, useMemo } from 'react'
import type { HandHistory } from '../../types'
import {
  getHandHistoryNetProfit,
  getHandHistoryOffsetFromButton,
  getHandHistoryInitialChips,
} from '../../types'
import type { StackInterval } from '../../visualization/handHistory/stats'
import {
  GTO_RFI_FREQUENCIES,
  GTO_BB_3BET_FREQUENCIES,
  getGTORangeByFrequency,
  getGtoHandActionFrequencies,
  type Position
} from '../../visualization/handHistory/gtoRanges'

// Card number order (A highest, 2 lowest)
const CARD_NUMBERS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

// O(1) lookup map
const CARD_NUMBER_INDEX = new Map<string, number>(
  CARD_NUMBERS.map((c, i) => [c, i])
)

/** Position definitions: offset → label */
const POSITIONS: { key: string; label: string; offsets: number[] }[] = [
  { key: 'all',  label: 'Geral',  offsets: [] },     // all positions (special)
  { key: 'utg',  label: 'UTG',    offsets: [-5, -6, -7, -8] }, // UTG and earlier
  { key: 'utg1', label: 'UTG+1',  offsets: [-4] },
  { key: 'mp',   label: 'MP',     offsets: [-3] },
  { key: 'mp1',  label: 'MP+1',   offsets: [-2] },
  { key: 'co',   label: 'CO',     offsets: [-1] },
  { key: 'btn',  label: 'BTN',    offsets: [0] },
  { key: 'sb',   label: 'SB',     offsets: [1] },
  { key: 'bb',   label: 'BB',     offsets: [2] },
]

interface CellData {
  hand: string
  totalProfit: number
  count: number
}

/**
 * Get the matrix position from two cards
 */
function getHandInfo(card1: string, card2: string): { row: number; col: number } {
  const num1 = card1[0]
  const num2 = card2[0]
  const suit1 = card1[1]
  const suit2 = card2[1]

  const isSuited = suit1 === suit2
  const idx1 = CARD_NUMBER_INDEX.get(num1) ?? 0
  const idx2 = CARD_NUMBER_INDEX.get(num2) ?? 0

  const bigIdx = Math.min(idx1, idx2)
  const smallIdx = Math.max(idx1, idx2)

  if (bigIdx === smallIdx) {
    return { row: bigIdx, col: bigIdx }
  } else if (isSuited) {
    return { row: bigIdx, col: smallIdx }
  } else {
    return { row: smallIdx, col: bigIdx }
  }
}

/**
 * Get background color for a cell based on profit value.
 */
function getCellColor(profit: number, count: number, isGtoMode: boolean, isInGtoRange: boolean): string {
  if (isGtoMode) {
    return isInGtoRange ? 'rgba(74, 222, 128, 0.3)' : 'transparent'
  }

  if (count === 0) return 'transparent'

  if (Math.abs(profit) < 0.005) {
    return '#6b6540'
  }

  if (profit > 0) {
    const t = Math.min(Math.abs(profit) / 1.5, 1)
    const r = Math.round(50 - t * 20)
    const g = Math.round(95 + t * 50)
    const b = Math.round(50 - t * 20)
    return `rgb(${r}, ${g}, ${b})`
  } else {
    const t = Math.min(Math.abs(profit) / 1.5, 1)
    const r = Math.round(150 + t * 40)
    const g = Math.round(55 - t * 25)
    const b = Math.round(50 - t * 20)
    return `rgb(${r}, ${g}, ${b})`
  }
}

/**
 * Get text color for profit value
 */
function getProfitTextColor(profit: number, isGtoMode: boolean, isInGtoRange: boolean): string {
  if (isGtoMode) {
    return isInGtoRange ? '#4ade80' : '#475569'
  }

  if (Math.abs(profit) < 0.005) return '#d4c87a'
  if (profit > 0) return '#c8e6a0'
  return '#f5c0c0'
}

/**
 * Format profit in BB units
 */
function formatProfit(profit: number): string {
  if (Math.abs(profit) < 0.005) return '0BB'
  const sign = profit > 0 ? '' : '-'
  return `${sign}${Math.abs(profit).toFixed(2)}BB`
}

/**
 * Build the cell label text from matrix indices
 */
function getCellLabel(row: number, col: number): string {
  const r = CARD_NUMBERS[row]
  const c = CARD_NUMBERS[col]
  if (row === col) return `${r}${c}`
  if (row < col) return `${r}${c}s`
  return `${c}${r}o`
}

/**
 * Map an offset to a capped value (UTG for <= -5)
 */
function capOffset(offset: number): number {
  return offset <= -5 ? -5 : offset
}

interface HoleCardsGridProps {
  handHistories: HandHistory[]
}

export function HoleCardsGrid({ handHistories }: HoleCardsGridProps) {
  const [selectedPosition, setSelectedPosition] = useState('all')
  const [selectedStackInterval, setSelectedStackInterval] = useState<StackInterval>('all')
  const [viewMode, setViewMode] = useState<'profit' | 'gto'>('profit')

  // Pre-compute hero data with offsets and stack intervals
  const handsWithData = useMemo(() => {
    const result: { hh: HandHistory; row: number; col: number; profitBB: number; offset: number; stackInterval: StackInterval }[] = []

    for (const hh of handHistories) {
      const heroCards = hh.knownCards.get('Hero')
      if (!heroCards) continue

      let offset: number
      try {
        offset = getHandHistoryOffsetFromButton(hh, 'Hero')
      } catch {
        continue
      }

      const bbValue = hh.bb > 0 ? hh.bb : 1
      const heroChips = getHandHistoryInitialChips(hh, 'Hero')
      const heroBBs = heroChips / bbValue
      
      let iv: StackInterval = '100'
      if (heroBBs <= 14) iv = '14'
      else if (heroBBs <= 17) iv = '17'
      else if (heroBBs <= 20) iv = '20'
      else if (heroBBs <= 30) iv = '30'
      else if (heroBBs <= 50) iv = '50'

      const { row, col } = getHandInfo(heroCards[0], heroCards[1])
      const profit = getHandHistoryNetProfit(hh, 'Hero')
      const profitBB = profit / bbValue

      result.push({ hh, row, col, profitBB, offset: capOffset(offset), stackInterval: iv })
    }

    return result
  }, [handHistories])

  // Count hands per position for the selector badges
  const positionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const pos of POSITIONS) {
      counts[pos.key] = 0
    }
    for (const h of handsWithData) {
      if (selectedStackInterval !== 'all' && h.stackInterval !== selectedStackInterval) continue
      counts['all']++
      for (const pos of POSITIONS) {
        if (pos.key !== 'all' && pos.offsets.includes(h.offset)) {
          counts[pos.key]++
        }
      }
    }
    return counts
  }, [handsWithData, selectedStackInterval])

  // Build matrix for selected position
  const { matrix, filteredCount } = useMemo(() => {
    const mat: CellData[][] = Array.from({ length: 13 }, (_, row) =>
      Array.from({ length: 13 }, (_, col) => ({
        hand: getCellLabel(row, col),
        totalProfit: 0,
        count: 0,
      }))
    )

    const posConfig = POSITIONS.find(p => p.key === selectedPosition)!
    let count = 0

    for (const h of handsWithData) {
      // Filter by stack interval
      if (selectedStackInterval !== 'all' && h.stackInterval !== selectedStackInterval) continue

      // Filter by position
      if (posConfig.key !== 'all' && !posConfig.offsets.includes(h.offset)) continue

      mat[h.row][h.col].totalProfit += h.profitBB
      mat[h.row][h.col].count++
      count++
    }

    return { matrix: mat, filteredCount: count }
  }, [handsWithData, selectedPosition, selectedStackInterval])

  const gtoContext = useMemo(() => {
    if (viewMode !== 'gto') return { rangeSet: new Set<string>(), rangeSize: 0, stack: 30, posStr: 'BTN' as Position }
    if (selectedPosition === 'all') return { rangeSet: new Set<string>(), rangeSize: 0, stack: 30, posStr: 'BTN' as Position }

    const stack = selectedStackInterval === 'all' ? 30 : Number(selectedStackInterval)
    let posStr = selectedPosition.toUpperCase()
    // Map internal position keys to GTO keys if needed (utg1 -> UTG, mp1 -> MP, etc for simplicity)
    if (posStr === 'UTG1') posStr = 'UTG'
    if (posStr === 'MP1') posStr = 'MP'
    
    let freq = 0
    if (posStr === 'BB') {
      freq = GTO_BB_3BET_FREQUENCIES[stack] ?? 0
    } else {
      freq = GTO_RFI_FREQUENCIES[stack]?.[posStr as Position] ?? 0
    }

    const rangeSet = getGTORangeByFrequency(freq)
    const rangeSize = Math.round((freq / 100) * 169)

    return { rangeSet, rangeSize, stack, posStr: posStr as Position }
  }, [viewMode, selectedPosition, selectedStackInterval])

  const totalProfit = useMemo(() => {
    let sum = 0
    for (const row of matrix) {
      for (const cell of row) {
        sum += cell.totalProfit
      }
    }
    return sum
  }, [matrix])

  const totalPlayed = useMemo(() => {
    let sum = 0
    for (const row of matrix) {
      for (const cell of row) {
        if (cell.count > 0) sum++
      }
    }
    return sum
  }, [matrix])

  return (
    <div className="holecards-container">
      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="holecards-positions">
          {POSITIONS.map(pos => (
            <button
              key={pos.key}
              className={`holecards-pos-btn${selectedPosition === pos.key ? ' active' : ''}`}
              onClick={() => setSelectedPosition(pos.key)}
            >
              <span className="pos-label">{pos.label}</span>
              <span className="pos-count">{positionCounts[pos.key]}</span>
            </button>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <select 
            value={selectedStackInterval} 
            onChange={e => setSelectedStackInterval(e.target.value as StackInterval)}
            style={{ padding: '0.5rem', borderRadius: '4px', background: '#1e293b', color: '#e2e8f0', border: '1px solid #475569', minWidth: '200px' }}
          >
            <option value="all">Todas as mãos (Geral)</option>
            <option value="14">≤ 14 BB (Stack Curto)</option>
            <option value="17">14 BB a 17 BB</option>
            <option value="20">17 BB a 20 BB</option>
            <option value="30">20 BB a 30 BB (Torneio Padrão)</option>
            <option value="50">30 BB a 50 BB</option>
            <option value="100">&gt; 50 BB (Deep Stack)</option>
          </select>

          <div style={{ display: 'flex', background: '#1e293b', borderRadius: '4px', padding: '2px', border: '1px solid #475569' }}>
            <button
              onClick={() => setViewMode('profit')}
              style={{
                padding: '0.4rem 1rem', border: 'none', borderRadius: '3px', cursor: 'pointer',
                background: viewMode === 'profit' ? '#3b82f6' : 'transparent',
                color: viewMode === 'profit' ? '#fff' : '#94a3b8'
              }}
            >
              Lucro Real
            </button>
            <button
              onClick={() => setViewMode('gto')}
              disabled={selectedPosition === 'all'}
              title={selectedPosition === 'all' ? 'Selecione uma posição para ver o GTO' : ''}
              style={{
                padding: '0.4rem 1rem', border: 'none', borderRadius: '3px', cursor: selectedPosition === 'all' ? 'not-allowed' : 'pointer',
                background: viewMode === 'gto' ? '#3b82f6' : 'transparent',
                color: viewMode === 'gto' ? '#fff' : '#94a3b8',
                opacity: selectedPosition === 'all' ? 0.5 : 1
              }}
            >
              Range GTO
            </button>
          </div>
        </div>
        
        {viewMode === 'gto' && selectedPosition !== 'all' && (
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '600px', textAlign: 'center' }}>
            <strong>Estratégia GTO Pré-Flop:</strong> Mapa de calor matemático baseado nas frequências da posição e stack selecionados. As cores das células indicam a ação pré-flop recomendada (Raise, All-in ou Call) para as melhores mãos iniciais.
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="holecards-stats">
        <div className="hc-stat">
          <span className="hc-stat-label">Mãos</span>
          <span className="hc-stat-value">{filteredCount}</span>
        </div>
        <div className="hc-stat">
          <span className="hc-stat-label">Combinações jogadas</span>
          <span className="hc-stat-value">{totalPlayed}/169</span>
        </div>
        <div className="hc-stat">
          <span className="hc-stat-label">Lucro total</span>
          <span className={`hc-stat-value ${totalProfit >= 0 ? 'profit-pos' : 'profit-neg'}`}>
            {formatProfit(totalProfit)}
          </span>
        </div>
      </div>

      <div className="holecards-main">
        {/* Legend */}
        {viewMode === 'profit' ? (
          <div className="holecards-legend">
            <h4>LEGENDA</h4>
            <div className="legend-item">
              <span className="legend-swatch legend-profit"></span>
              <span>Dinheiro ganho</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch legend-even"></span>
              <span>Break-even</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch legend-loss"></span>
              <span>Dinheiro perdido</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch legend-none"></span>
              <span>Nenhum</span>
            </div>
          </div>
        ) : (
          <div className="holecards-legend">
            <h4 style={{ marginBottom: '10px' }}>ESTRATÉGIA GTO</h4>
            <div className="legend-item" style={{ marginBottom: '6px' }}>
              <span className="legend-swatch" style={{ background: '#3b82f6', border: '1px solid rgba(255,255,255,0.2)' }}></span>
              <span>Raise (Aumentar)</span>
            </div>
            <div className="legend-item" style={{ marginBottom: '6px' }}>
              <span className="legend-swatch" style={{ background: '#ef4444', border: '1px solid rgba(255,255,255,0.2)' }}></span>
              <span>All-in (Push)</span>
            </div>
            {gtoContext.posStr === 'SB' && gtoContext.stack >= 30 && (
              <div className="legend-item" style={{ marginBottom: '6px' }}>
                <span className="legend-swatch" style={{ background: '#eab308', border: '1px solid rgba(255,255,255,0.2)' }}></span>
                <span>Call (Limp)</span>
              </div>
            )}
            <div className="legend-item">
              <span className="legend-swatch legend-none"></span>
              <span>Fold (Não jogar)</span>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="holecards-grid-wrapper">
          <div className="holecards-grid">
            {matrix.map((row, rowIdx) =>
              row.map((cell, colIdx) => {
                const isGtoMode = viewMode === 'gto'
                const isInGtoRange = isGtoMode && gtoContext.rangeSet.has(cell.hand)
                
                let bgColor = getCellColor(cell.totalProfit, cell.count, isGtoMode, isInGtoRange)
                let borderStyle = isGtoMode && isInGtoRange 
                  ? '1px solid rgba(74, 222, 128, 0.6)' 
                  : undefined

                // In GTO Mode, we compute the action frequencies to create a heatmap gradient
                if (isGtoMode && isInGtoRange) {
                  const freqs = getGtoHandActionFrequencies(cell.hand, gtoContext.stack, gtoContext.posStr, gtoContext.rangeSize)
                  if (freqs) {
                    const rPct = Math.round(freqs.raise * 100)
                    const aPct = Math.round(freqs.allin * 100)
                    // CSS linear gradient logic for mixed actions
                    // e.g. blue up to rPct, then red up to rPct+aPct, then yellow
                    let gradientParts = []
                    let currentPct = 0
                    if (rPct > 0) {
                      gradientParts.push(`#3b82f6 ${currentPct}%`, `#3b82f6 ${currentPct + rPct}%`)
                      currentPct += rPct
                    }
                    if (aPct > 0) {
                      gradientParts.push(`#ef4444 ${currentPct}%`, `#ef4444 ${currentPct + aPct}%`)
                      currentPct += aPct
                    }
                    if (currentPct < 100) {
                      gradientParts.push(`#eab308 ${currentPct}%`, `#eab308 100%`)
                    }
                    
                    bgColor = gradientParts.length > 0 
                      ? `linear-gradient(135deg, ${gradientParts.join(', ')})`
                      : 'rgba(74, 222, 128, 0.3)'
                      
                    borderStyle = '1px solid rgba(255,255,255,0.1)'
                  }
                }

                const hasData = cell.count > 0 || isGtoMode
                const profitColor = getProfitTextColor(cell.totalProfit, isGtoMode, isInGtoRange)
                const isPair = rowIdx === colIdx

                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={`holecards-cell${hasData ? '' : ' empty'}${isPair ? ' pair' : ''}`}
                    style={{
                      background: bgColor,
                      borderColor: borderStyle 
                        ? 'transparent' // Handled by inline border instead of external class
                        : isPair && hasData
                          ? 'rgba(255,255,255,0.3)'
                          : hasData
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(255,255,255,0.04)',
                      border: borderStyle
                    }}
                    title={isGtoMode && isInGtoRange 
                      ? `${cell.hand} (GTO Recomendado)\nSeu Histórico: ${cell.count} mãos jogadas com lucro de ${formatProfit(cell.totalProfit)}` 
                      : hasData
                        ? `${cell.hand}: ${formatProfit(cell.totalProfit)} (${cell.count} mãos)`
                        : cell.hand
                    }
                  >
                    <span className="cell-hand" style={{ 
                      color: (cell.count > 0 || (isGtoMode && isInGtoRange)) ? '#fff' : '#475569',
                      textShadow: isGtoMode && isInGtoRange ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none'
                    }}>
                      {cell.hand}
                    </span>
                    {(cell.count > 0 || isGtoMode) && (
                      <span className="cell-profit" style={{ 
                        color: isGtoMode && isInGtoRange ? 'rgba(255,255,255,0.7)' : profitColor,
                        textShadow: isGtoMode && isInGtoRange ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none',
                        fontSize: isGtoMode ? '0.65rem' : undefined
                      }}>
                        {isGtoMode ? '' : formatProfit(cell.totalProfit)}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Hand count */}
      <div className="holecards-footer">
        {filteredCount} de {handHistories.length} mãos no histórico
      </div>
    </div>
  )
}
