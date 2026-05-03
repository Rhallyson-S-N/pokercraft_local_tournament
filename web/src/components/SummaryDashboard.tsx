import React, { useMemo } from 'react'
import { type TournamentSummary, getTournamentBuyIn } from '../types'

interface SummaryDashboardProps {
  tournaments: TournamentSummary[]
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ tournaments }) => {
  const stats = useMemo(() => {
    if (tournaments.length === 0) return null

    let totalBuyIn = 0
    let totalPrize = 0
    let cashes = 0
    let bestRank = Infinity

    tournaments.forEach(t => {
      totalBuyIn += getTournamentBuyIn(t) * t.myEntries
      totalPrize += t.myPrize
      if (t.myPrize > 0) cashes++
      if (t.myRank > 0 && t.myRank < bestRank) bestRank = t.myRank
    })

    const netProfit = totalPrize - totalBuyIn
    const roi = totalBuyIn > 0 ? (netProfit / totalBuyIn) * 100 : 0
    const itm = (cashes / tournaments.length) * 100

    // Recent tournaments (last 6)
    const recent = [...tournaments]
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 6)

    return {
      totalTournaments: tournaments.length,
      totalBuyIn,
      totalPrize,
      netProfit,
      roi,
      itm,
      bestRank: bestRank === Infinity ? '-' : `${bestRank}º`,
      recent
    }
  }, [tournaments])

  if (!stats) {
    return <div className="no-data">Carregue seus arquivos do PokerCraft para ver o resumo.</div>
  }

  const isProfit = stats.netProfit >= 0

  return (
    <div className="sub-tab-content">
      {/* Hero Banner */}
      <div className="chart-section" style={{ marginBottom: '2rem', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ 
              fontFamily: "'Playfair Display', serif", 
              fontSize: '2.5rem', 
              margin: 0, 
              color: 'var(--text-primary)' 
            }}>
              Sua jornada nas <em style={{ color: 'var(--gold)', fontStyle: 'normal' }}>mesas</em>
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0', fontWeight: 300 }}>
              Análise consolidada de {stats.totalTournaments} torneios
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              fontFamily: "'JetBrains Mono', monospace", 
              fontSize: '0.7rem', 
              color: 'var(--text-muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.15em' 
            }}>
              Resultado Líquido
            </div>
            <div style={{ 
              fontFamily: "'Playfair Display', serif", 
              fontSize: '2.8rem', 
              fontWeight: 900, 
              color: isProfit ? 'var(--green-profit)' : 'var(--red-loss)' 
            }}>
              {isProfit ? '+' : ''}${stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="summary-cards" style={{ marginBottom: '2rem' }}>
        <div className="summary-card">
          <h4>ROI Médio</h4>
          <div className="stat-value" style={{ color: stats.roi >= 0 ? 'var(--green-profit)' : 'var(--red-loss)' }}>
            {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
          </div>
          <div className="stat-sub" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Retorno sobre investimento
          </div>
          <span style={{ position: 'absolute', right: '1rem', bottom: '0.5rem', fontSize: '2rem', opacity: 0.05 }}>📈</span>
        </div>

        <div className="summary-card">
          <h4>Taxa ITM</h4>
          <div className="stat-value">
            {stats.itm.toFixed(1)}%
          </div>
          <div className="stat-sub" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            In The Money ({stats.totalTournaments} jogos)
          </div>
          <span style={{ position: 'absolute', right: '1rem', bottom: '0.5rem', fontSize: '2rem', opacity: 0.05 }}>💰</span>
        </div>

        <div className="summary-card">
          <h4>Melhor Posição</h4>
          <div className="stat-value" style={{ color: 'var(--gold)' }}>
            {stats.bestRank}
          </div>
          <div className="stat-sub" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Sua melhor colocação
          </div>
          <span style={{ position: 'absolute', right: '1rem', bottom: '0.5rem', fontSize: '2rem', opacity: 0.05 }}>🏆</span>
        </div>

        <div className="summary-card">
          <h4>Investimento</h4>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>
            ${stats.totalBuyIn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="stat-sub" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Total de Buy-ins pagos
          </div>
          <span style={{ position: 'absolute', right: '1rem', bottom: '0.5rem', fontSize: '2rem', opacity: 0.05 }}>🎟️</span>
        </div>
      </div>

      {/* Recent Tournaments Table */}
      <div className="table-container">
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(201, 168, 76, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '1rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Torneios Recentes
          </h3>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            Últimos {stats.recent.length} eventos
          </span>
        </div>
        <table className="sessions-table">
          <thead>
            <tr>
              <th>Torneio</th>
              <th>Data</th>
              <th>Posição</th>
              <th style={{ textAlign: 'right' }}>Prêmio</th>
            </tr>
          </thead>
          <tbody>
            {stats.recent.map(t => {
              const profit = t.myPrize - getTournamentBuyIn(t) * t.myEntries
              return (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.totalPlayers} jogadores</div>
                  </td>
                  <td>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(t.startTime).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      width: '28px', height: '28px', 
                      borderRadius: '50%', 
                      background: t.myRank === 1 ? 'rgba(201, 168, 76, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      color: t.myRank === 1 ? 'var(--gold)' : 'var(--text-muted)',
                      border: t.myRank === 1 ? '1px solid var(--gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 700,
                      fontSize: '0.8rem'
                    }}>
                      {t.myRank}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={profit >= 0 ? 'profit-pos' : 'profit-neg'}>
                      {profit >= 0 ? '+' : ''}${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
