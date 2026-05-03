import { useMemo } from 'react'
import type { TournamentSummary } from '../types'
import { getTournamentProfit, getTournamentBuyIn } from '../types'
import type { BankrollWorkerResult } from '../workers/analysisWorker'

interface Props {
  tournaments: TournamentSummary[]
  bankrollResults: BankrollWorkerResult[]
}

const WEEKDAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

export function TournamentInsightCards({ tournaments, bankrollResults }: Props) {
  const insights = useMemo(() => {
    if (tournaments.length === 0) return null

    // 1. Best Day
    const profitByDay: Record<number, number> = {}
    tournaments.forEach(t => {
      const day = (t.startTime.getDay() + 6) % 7 // 0=Mon, 6=Sun
      profitByDay[day] = (profitByDay[day] || 0) + getTournamentProfit(t)
    })
    
    const profitEntries = Object.entries(profitByDay)
    if (profitEntries.length === 0) return null

    const bestDayIdx = profitEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0]
    const bestDay = WEEKDAY_NAMES[parseInt(bestDayIdx)]

    // 2. Best Buy-in Range
    const ranges = [
      { label: 'Micro ($0-$5)', min: 0, max: 5 },
      { label: 'Low ($5-$20)', min: 5, max: 20 },
      { label: 'Mid ($20-$100)', min: 20, max: 100 },
      { label: 'High ($100+)', min: 100, max: Infinity }
    ]
    const profitByRange: Record<string, number> = {}
    tournaments.forEach(t => {
      const bi = getTournamentBuyIn(t)
      const range = ranges.find(r => bi >= r.min && bi < r.max)
      if (range) {
        profitByRange[range.label] = (profitByRange[range.label] || 0) + getTournamentProfit(t)
      }
    })
    
    const rangeEntries = Object.entries(profitByRange)
    const bestRange = rangeEntries.length > 0 
      ? rangeEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0]
      : 'N/A'

    // 3. Bankroll Health
    let bankrollHealth = 'Seguro'
    let healthColor = 'var(--green-profit)'
    if (bankrollResults.length > 0) {
      // Check the largest initial capital (usually the safest)
      const safest = bankrollResults[bankrollResults.length - 1]
      if (safest.bankruptcyRate > 0.1) {
        bankrollHealth = 'Perigoso'
        healthColor = 'var(--red-loss)'
      } else if (safest.bankruptcyRate > 0.02) {
        bankrollHealth = 'Atenção'
        healthColor = '#f59e0b'
      }
    }

    // 4. Trend
    const last10 = tournaments.slice(-10)
    const last10Profit = last10.reduce((sum, t) => sum + getTournamentProfit(t), 0)
    const trend = last10Profit > 5 ? 'Em Ascensão' : last10Profit < -5 ? 'Alerta' : 'Estável'
    const trendColor = last10Profit > 5 ? 'var(--green-profit)' : last10Profit < -5 ? 'var(--red-loss)' : 'var(--text-muted)'

    return { bestDay, bestRange, bankrollHealth, healthColor, trend, trendColor }
  }, [tournaments, bankrollResults])

  if (!insights) return null

  return (
    <div className="summary-cards" style={{ marginBottom: '2.5rem' }}>
      <div className="summary-card">
        <h4>Melhor Dia</h4>
        <div className="hand-box" style={{ borderTop: '2px solid var(--gold)' }}>
          <div className="value" style={{ color: 'var(--gold)' }}>{insights.bestDay}</div>
          <div className="label">Onde você brilha mais</div>
        </div>
      </div>
      <div className="summary-card">
        <h4>Zona de Conforto</h4>
        <div className="hand-box" style={{ borderTop: '2px solid var(--gold)' }}>
          <div className="value" style={{ color: 'var(--gold)' }}>{insights.bestRange}</div>
          <div className="label">Preço mais lucrativo</div>
        </div>
      </div>
      <div className="summary-card">
        <h4>Saúde da Banca</h4>
        <div className="hand-box" style={{ borderTop: `2px solid ${insights.healthColor}` }}>
          <div className="value" style={{ color: insights.healthColor }}>{insights.bankrollHealth}</div>
          <div className="label">Risco de quebra</div>
        </div>
      </div>
      <div className="summary-card">
        <h4>Tendência Atual</h4>
        <div className="hand-box" style={{ borderTop: `2px solid ${insights.trendColor}` }}>
          <div className="value" style={{ color: insights.trendColor }}>{insights.trend}</div>
          <div className="label">Últimos 10 torneios</div>
        </div>
      </div>
    </div>
  )
}
