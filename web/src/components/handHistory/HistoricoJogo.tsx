import type { HandHistory } from '../../types'
import { generateSequences, getSequenceDisplayName, getHandHistoryNetProfit, type TournamentSummary } from '../../types'

interface Props {
  handHistories: HandHistory[]
  tournaments: TournamentSummary[]
  playerId?: string
}

export function HistoricoJogo({ handHistories, tournaments, playerId = 'Hero' }: Props) {
  const sequences = generateSequences(handHistories)
  
  // Find best and worst hands overall
  let bestHandValue = -Infinity
  let worstHandValue = Infinity
  let bestHandCards = ''
  let worstHandCards = ''

  for (const h of handHistories) {
    const rawProfit = getHandHistoryNetProfit(h, playerId)
    // Avoid division by zero in weird data cases, default to raw profit if BB is 0
    const profitBB = h.bb > 0 ? rawProfit / h.bb : rawProfit 
    const cards = h.knownCards.get(playerId)
    const cardStr = cards ? `${cards[0]} ${cards[1]}` : 'N/A'

    if (profitBB > bestHandValue && cards) {
      bestHandValue = profitBB
      bestHandCards = cardStr
    }
    if (profitBB < worstHandValue && cards) {
      worstHandValue = profitBB
      worstHandCards = cardStr
    }
  }

  // Format sequences for table
  const tableData = sequences.map((seq, i) => {
    const first = seq.histories[0]
    const last = seq.histories[seq.histories.length - 1]
    
    // Duration in ms
    const durationMs = last.datetime.getTime() - first.datetime.getTime()
    const mins = Math.floor(durationMs / 60000)
    const secs = Math.floor((durationMs % 60000) / 1000)
    const durationStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

    let buyIn = 1.00
    let myPrize = 0

    // Try to find the exact tournament
    const tourney = tournaments.find(t => t.id === first.tournamentId)
    if (tourney) {
      buyIn = tourney.buyInPure + tourney.rake
      myPrize = tourney.myPrize
    } else {
      // Fallback
      const match = first.tournamentName?.match(/\$([0-9.]+)/)
      if (match) buyIn = parseFloat(match[1])
      
      let chipProfit = 0
      for (const h of seq.histories) chipProfit += getHandHistoryNetProfit(h, playerId)
      if (chipProfit > 0) myPrize = buyIn * 2
    }

    const moneyProfit = myPrize > 0 ? myPrize : -buyIn

    return {
      id: i,
      date: first.datetime.toLocaleString(),
      stakes: `$${first.sb}/$${first.bb}`,
      table: getSequenceDisplayName(seq),
      hands: seq.histories.length,
      duration: durationStr,
      profit: moneyProfit
    }
  }).reverse() // Newest first

  let totalPlayed = tableData.length
  let totalLosses = 0
  let totalWinnings = 0

  for (const row of tableData) {
    if (row.profit < 0) {
      totalLosses += Math.abs(row.profit)
    } else {
      totalWinnings += row.profit
    }
  }

  return (
    <div className="historico-jogo">
      <div className="summary-cards">
        <div className="summary-card">
          <h4>Melhor e Pior Mão</h4>
          <div className="hands-display">
            <div className="hand-box best">
              <span className="label">Melhor mão</span>
              <span className="cards">{bestHandCards || '--'}</span>
              <span className="value">+{Math.max(0, bestHandValue).toFixed(2)} BB</span>
            </div>
            <div className="hand-box worst">
              <span className="label">Pior mão</span>
              <span className="cards">{worstHandCards || '--'}</span>
              <span className="value">-{Math.abs(Math.min(0, worstHandValue)).toFixed(2)} BB</span>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <h4>Resumo de Torneios</h4>
          <div className="hands-display">
            <div className="hand-box">
              <span className="label">Jogados</span>
              <span className="value" style={{ color: '#e2e8f0' }}>{totalPlayed}</span>
            </div>
            <div className="hand-box worst">
              <span className="label">Perdas (Buy-in)</span>
              <span className="value">-$ {totalLosses.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="hand-box best">
              <span className="label">Ganhos (Prêmios)</span>
              <span className="value">+$ {totalWinnings.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="sessions-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Montantes de aposta</th>
              <th>Mesa</th>
              <th>Mãos</th>
              <th>Duração</th>
              <th>Ganhos/perdas</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map(row => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.stakes}</td>
                <td>{row.table}</td>
                <td>{row.hands}</td>
                <td>{row.duration}</td>
                <td className={row.profit >= 0 ? 'profit-pos' : 'profit-neg'}>
                  {row.profit >= 0 ? `+$ ${row.profit.toFixed(2).replace('.', ',')}` : `-$ ${Math.abs(row.profit).toFixed(2).replace('.', ',')}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footer">
          Total de sessões: {tableData.length}
        </div>
      </div>
    </div>
  )
}
