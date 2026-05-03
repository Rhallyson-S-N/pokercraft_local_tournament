/**
 * Tab navigation for chart sections
 */

export type ChartTab = 'summary' | 'tournament' | 'handHistory'

interface ChartTabsProps {
  activeTab: ChartTab
  onTabChange: (tab: ChartTab) => void
  tournamentCount: number
  handHistoryCount: number
}

export function ChartTabs({
  activeTab,
  onTabChange,
  tournamentCount,
  handHistoryCount,
}: ChartTabsProps) {
  const hasTournaments = tournamentCount > 0
  const hasHandHistories = handHistoryCount > 0

  if (!hasTournaments && !hasHandHistories) {
    return null
  }

  return (
    <nav className="chart-tabs">
      <button
        className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
        onClick={() => onTabChange('summary')}
      >
        <span className="tab-icon">📊</span>
        <span className="tab-label">Visão Geral</span>
      </button>
      <button
        className={`tab ${activeTab === 'tournament' ? 'active' : ''} ${!hasTournaments ? 'disabled' : ''}`}
        onClick={() => hasTournaments && onTabChange('tournament')}
        disabled={!hasTournaments}
      >
        <span className="tab-icon">🏆</span>
        <span className="tab-label">Análise de Torneios</span>
        {hasTournaments && <span className="tab-count">{tournamentCount}</span>}
      </button>
      <button
        className={`tab ${activeTab === 'handHistory' ? 'active' : ''} ${!hasHandHistories ? 'disabled' : ''}`}
        onClick={() => hasHandHistories && onTabChange('handHistory')}
        disabled={!hasHandHistories}
      >
        <span className="tab-icon">🃏</span>
        <span className="tab-label">Histórico de Mãos</span>
        {hasHandHistories && <span className="tab-count">{handHistoryCount}</span>}
      </button>
    </nav>
  )
}
