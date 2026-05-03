/**
 * Prize Pies Chart
 * Shows distribution of prizes by tournament and by weekday
 */

import type { TournamentSummary } from '../../types'
import { getTournamentTimeOfWeek } from '../../types'
import type { Data, Layout } from 'plotly.js-dist-min'

const WEEKDAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const

export interface PrizePiesData {
  traces: Data[]
  layout: Partial<Layout>
}

/**
 * Format tournament name with date
 */
function formatTournamentName(t: TournamentSummary): string {
  const dateStr = t.startTime.toISOString().slice(0, 10).replace(/-/g, '')
  return `${t.name} (${dateStr})`
}

/**
 * Generate prize pies chart data
 */
export function getPrizePiesData(tournaments: TournamentSummary[]): PrizePiesData {
  const totalPrizes = tournaments.reduce((sum, t) => sum + t.myPrize, 0)
  const threshold = totalPrizes * 0.01

  // Individual tournament prizes (group small ones as "Others")
  const mainTournaments = tournaments.filter(t => t.myPrize >= threshold)
  const othersPrize = tournaments
    .filter(t => t.myPrize < threshold)
    .reduce((sum, t) => sum + t.myPrize, 0)

  const pieLabels = [
    ...mainTournaments.map(t => formatTournamentName(t)),
    ...(othersPrize > 0 ? ['Outros'] : []),
  ]
  const pieValues = [
    ...mainTournaments.map(t => t.myPrize),
    ...(othersPrize > 0 ? [othersPrize] : []),
  ]
  const piePulls = [
    ...mainTournaments.map(() => 0),
    ...(othersPrize > 0 ? [0.075] : []),
  ]

  // Prizes by weekday for sunburst
  const prizesByWeekday: Record<string, number> = {}
  for (const day of WEEKDAY_NAMES) {
    prizesByWeekday[day] = 0
  }

  const tournamentsByWeekday: Record<string, Array<{ name: string; prize: number }>> = {}
  for (const day of WEEKDAY_NAMES) {
    tournamentsByWeekday[day] = []
  }

  for (const t of tournaments) {
    const [dayIdx] = getTournamentTimeOfWeek(t)
    const dayName = WEEKDAY_NAMES[dayIdx]
    prizesByWeekday[dayName] += t.myPrize
    tournamentsByWeekday[dayName].push({
      name: formatTournamentName(t),
      prize: t.myPrize,
    })
  }

  // Build sunburst data
  const sunburstLabels: string[] = []
  const sunburstParents: string[] = []
  const sunburstValues: number[] = []

  for (const day of WEEKDAY_NAMES) {
    if (prizesByWeekday[day] <= 0) continue

    // Add weekday node
    sunburstLabels.push(day)
    sunburstParents.push('')
    sunburstValues.push(prizesByWeekday[day])

    // Add tournaments under this weekday (only significant ones)
    const dayTournaments = tournamentsByWeekday[day].filter(
      t => t.prize >= threshold * 0.5
    )
    for (const t of dayTournaments) {
      sunburstLabels.push(t.name)
      sunburstParents.push(day)
      sunburstValues.push(t.prize)
    }
  }

  const traces: Data[] = [
    {
      type: 'pie',
      labels: pieLabels,
      values: pieValues,
      pull: piePulls,
      name: 'Prêmios Individuais',
      hovertemplate: '%{label}: %{value:$,.2f}',
      domain: { x: [0, 0.48], y: [0, 1] },
      showlegend: false,
    } as Data,
    {
      type: 'sunburst',
      labels: sunburstLabels,
      parents: sunburstParents,
      values: sunburstValues,
      maxdepth: 2,
      name: 'Prêmios por Dia da Semana',
      hovertemplate: '%{label}: %{value:$,.2f}',
      domain: { x: [0.52, 1], y: [0, 1] },
    } as Data,
  ]

  const layout: Partial<Layout> = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: '#e2e8f0' },
    title: {
      text: 'Distribuição de Prêmios',
      subtitle: { text: 'Torneios individuais e por dia da semana' },
    },
    height: 500,
    annotations: [
      {
        text: '<b>Prêmios Individuais</b>',
        x: 0.24,
        y: 1.05,
        xref: 'paper',
        yref: 'paper',
        showarrow: false,
        font: { size: 14, color: '#e2e8f0' },
      },
      {
        text: '<b>Prêmios por Dia da Semana</b>',
        x: 0.76,
        y: 1.05,
        xref: 'paper',
        yref: 'paper',
        showarrow: false,
        font: { size: 14, color: '#e2e8f0' },
      },
    ],
  }

  return { traces, layout }
}
