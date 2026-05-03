import { useState } from 'react'
import type { PositionStat, StackInterval } from '../../visualization/handHistory/stats'
import { GTO_RFI_FREQUENCIES, GTO_BB_3BET_FREQUENCIES, type Position } from '../../visualization/handHistory/gtoRanges'

interface Props {
  stats: Record<StackInterval, Record<string, PositionStat>>
  totalHands: number
}

function profitPct(s: PositionStat): number {
  if (s.chipsInvested === 0) return 0
  return (s.profit / s.chipsInvested) * 100
}

function formatPct(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export function PosicaoTable({ stats, totalHands }: Props) {
  const [viewMode, setViewMode] = useState<'stats' | 'gto'>('stats')
  const [gtoStack, setGtoStack] = useState<StackInterval>('all')

  const positions = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']

  const currentStats = stats[gtoStack]

  let totalProfit = 0, totalInvested = 0, totalFlop = 0, totalShowdown = 0, totalHandsInPositions = 0
  let totalRfiOpps = 0, totalRfis = 0

  for (const pos of positions) {
    const s = currentStats[pos]
    if (!s) continue
    totalProfit += s.profit
    totalInvested += s.chipsInvested
    totalFlop += s.sawFlop
    totalShowdown += s.sawShowdown
    totalHandsInPositions += s.hands
    totalRfiOpps += s.rfiOpps
    totalRfis += s.rfis
  }

  const overallPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0
  const overallFlopPct = totalHandsInPositions > 0 ? (totalFlop / totalHandsInPositions) * 100 : 0
  const overallShowdownPct = totalHandsInPositions > 0 ? (totalShowdown / totalHandsInPositions) * 100 : 0
  const overallRfiPct = totalRfiOpps > 0 ? (totalRfis / totalRfiOpps) * 100 : 0

  return (
    <div className="posicao-view">
      <div className="pos-controls" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <button 
          className={`tab-btn ${viewMode === 'stats' ? 'active' : ''}`}
          onClick={() => setViewMode('stats')}
        >
          Estatísticas
        </button>
        <button 
          className={`tab-btn ${viewMode === 'gto' ? 'active' : ''}`}
          onClick={() => setViewMode('gto')}
        >
          Análise GTO (RFI)
        </button>
        <select 
          value={gtoStack} 
          onChange={e => setGtoStack(e.target.value as StackInterval)}
          style={{ 
            padding: '0.5rem', 
            borderRadius: '4px', 
            background: 'rgba(7, 26, 14, 0.8)', 
            color: 'var(--text-primary)', 
            border: '1px solid rgba(201, 168, 76, 0.3)',
            fontFamily: "'Crimson Pro', serif"
          }}
        >
          <option value="all">Todas as mãos (Geral)</option>
          <option value="14">≤ 14 BB (Stack Curto)</option>
          <option value="17">14 BB a 17 BB</option>
          <option value="20">17 BB a 20 BB</option>
          <option value="30">20 BB a 30 BB (Torneio Padrão)</option>
          <option value="50">30 BB a 50 BB</option>
          <option value="100">&gt; 50 BB (Deep Stack)</option>
        </select>
      </div>

      <div style={{ 
        maxWidth: '800px', 
        textAlign: 'center', 
        marginBottom: '2rem', 
        color: 'var(--text-secondary)', 
        fontSize: '0.9rem', 
        lineHeight: '1.6', 
        background: 'rgba(7, 26, 14, 0.6)', 
        padding: '1.25rem', 
        borderRadius: '6px', 
        border: '1px solid rgba(201, 168, 76, 0.15)' 
      }}>
        {viewMode === 'stats' ? (
          <>
            <strong style={{ color: 'var(--gold)' }}>Dica para Iniciantes:</strong> A sua posição na mesa dita a sua estratégia. Posições Iniciais (UTG, MP) exigem que você jogue apenas mãos fortes, pois muitos jogadores agirão depois de você. Já nas Posições Finais (CO, BTN), você tem a vantagem de ver a ação dos adversários e pode jogar mais mãos. Analise as porcentagens abaixo para descobrir onde estão seus maiores lucros e vazamentos.
          </>
        ) : (
          <>
            <strong style={{ color: 'var(--gold)' }}>Dica para Iniciantes:</strong> <em>RFI (Raise First In)</em> é quando você é o primeiro a aumentar a aposta. No <strong>Big Blind (BB)</strong> é impossível dar RFI, então mostramos a sua taxa de <strong>3-Bet</strong> (quando você reaumenta a aposta de alguém). Use essa visão para comparar suas frequências reais com a teoria matemática otimizada (GTO).
          </>
        )}
      </div>

      <div className="poker-table">
        {positions.map(pos => {
          const s = currentStats[pos] || { position: pos, profit: 0, chipsWon: 0, chipsInvested: 0, hands: 0, sawFlop: 0, sawShowdown: 0, rfiOpps: 0, rfis: 0, threeBetOpps: 0, threeBets: 0 }
          
          if (viewMode === 'gto') {
            const isBB = pos === 'BB'
            const gtoBaseline = gtoStack === 'all' ? 30 : Number(gtoStack)

            let myStat = 0
            let gtoStat = 0
            let opps = 0
            let label = "Seu RFI:"

            if (isBB) {
              myStat = s.threeBetOpps > 0 ? (s.threeBets / s.threeBetOpps) * 100 : 0
              gtoStat = GTO_BB_3BET_FREQUENCIES[gtoBaseline] ?? 0
              opps = s.threeBetOpps
              label = "Sua 3Bet:"
            } else {
              myStat = s.rfiOpps > 0 ? (s.rfis / s.rfiOpps) * 100 : 0
              gtoStat = GTO_RFI_FREQUENCIES[gtoBaseline]?.[pos as Position] ?? 0
              opps = s.rfiOpps
            }

            const diff = myStat - gtoStat
            const colorClass = Math.abs(diff) < 5 ? 'circle-positive' : 'circle-negative'
            
            return (
              <div key={pos} className={`pos-circle ${pos.toLowerCase()} ${colorClass}`}>
                <strong>{pos}</strong>
                <span className="pos-sublabel">{label}</span>
                <span className="profit" style={{ color: Math.abs(diff) < 5 ? 'var(--green-profit)' : 'var(--red-loss)' }}>
                  {myStat.toFixed(1)}%
                </span>
                <span className="stat" style={{ color: '#94a3b8' }}>GTO: {gtoStat.toFixed(1)}%</span>
                <span className="stat">Opps: {opps}</span>
              </div>
            )
          }

          // viewMode === 'stats'
          const pct = profitPct(s)
          const flopPct = s.hands > 0 ? (s.sawFlop / s.hands) * 100 : 0
          const isPositive = pct >= 0
          const circleColorClass = s.hands === 0 ? '' : isPositive ? 'circle-positive' : 'circle-negative'

          return (
            <div key={pos} className={`pos-circle ${pos.toLowerCase()} ${circleColorClass}`}>
              <strong>{pos}</strong>
              <span className="pos-sublabel">Ganhos/perdas</span>
              <span className="profit" style={{ color: isPositive ? 'var(--green-profit)' : 'var(--red-loss)' }}>
                {formatPct(pct)}
              </span>
              <span className="stat">Flop %: {flopPct.toFixed(1)}%</span>
              <span className="stat">Showdown: {s.sawShowdown}</span>
            </div>
          )
        })}

        <div className="table-center">
          {viewMode === 'gto' ? (
            <>
              <div className="center-line">
                <span>RFI Total: </span>
                <span style={{ color: 'var(--green-profit)', fontWeight: 'bold' }}>{overallRfiPct.toFixed(1)}%</span>
              </div>
              <div className="center-line">
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '10px' }}>
                  A cor verde indica um RFI<br/>próximo ao ideal (±5%).
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="center-line">
                <span>Ganhos/perdas: </span>
                <span style={{ color: overallPct >= 0 ? 'var(--green-profit)' : 'var(--red-loss)', fontWeight: 'bold' }}>
                  {formatPct(overallPct)}
                </span>
              </div>
              <div className="center-line">
                <span>Flop %: </span>
                <strong>{overallFlopPct.toFixed(1)}%</strong>
              </div>
              <div className="center-line">
                <span>Showdown %: </span>
                <strong>{overallShowdownPct.toFixed(1)}%</strong>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="posicao-footer">
        {totalHandsInPositions} de {totalHands} mãos
      </div>
    </div>
  )
}
