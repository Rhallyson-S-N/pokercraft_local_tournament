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
      hole: 0.45,
      textinfo: 'percent',
      textposition: 'outside',
      insidetextorientation: 'radial',
      marker: {
        colors: [
          '#c9a84c', // Gold
          '#4caf7a', // Green Profit
          '#e05a4e', // Red Loss
          '#74aef2', // Blue
          '#f59e0b', // Amber
          '#8b5cf6', // Violet
          '#10b981', // Emerald
          '#6366f1', // Indigo
        ],
        line: { color: 'rgba(7, 26, 14, 0.8)', width: 2 }
      },
      insidetextfont: { family: "'JetBrains Mono', monospace", color: '#fff' },
      outsidetextfont: { family: "'JetBrains Mono', monospace", color: '#94a3b8' },
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
      leaf: { opacity: 0.8 },
      marker: {
        line: { color: 'rgba(201, 168, 76, 0.4)', width: 1.5 },
        colorscale: [
          [0, '#0b2615'],
          [0.5, '#4caf7a'],
          [1, '#c9a84c']
        ]
      },
      insidetextorientation: 'horizontal',
      insidetextfont: { family: "'JetBrains Mono', monospace", color: '#fff', size: 11 },
      outsidetextfont: { family: "'JetBrains Mono', monospace", color: '#94a3b8', size: 10 },
      name: 'Prêmios por Dia da Semana',
      hovertemplate: '%{label}: %{value:$,.2f}',
      domain: { x: [0.58, 1], y: [0, 1] },
    } as Data,
  ]

  const layout: Partial<Layout> = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: '#e2e8f0', family: "'Crimson Pro', serif" },
    hoverlabel: {
      bgcolor: 'rgba(7, 26, 14, 0.95)',
      bordercolor: '#c9a84c',
      font: { color: '#f0e6c8', size: 13, family: "'JetBrains Mono', monospace" }
    },
    title: {
      text: 'Origem dos seus Prêmios',
      font: { size: 24, color: '#c9a84c', family: "'Playfair Display', serif" },
      subtitle: { text: 'Torneios individuais e por dia da semana', font: { color: '#94a3b8' } },
      y: 0.97
    },
    height: 600,
    margin: { l: 40, r: 40, t: 120, b: 40 },
    annotations: [
      {
        text: '<b>PRÊMIOS INDIVIDUAIS</b>',
        x: 0.24,
        y: 1.12,
        xref: 'paper',
        yref: 'paper',
        xanchor: 'center',
        yanchor: 'bottom',
        showarrow: false,
        font: { size: 11, color: '#c9a84c', family: "'JetBrains Mono', monospace" },
      },
      {
        text: '<b>POR DIA DA SEMANA</b>',
        x: 0.79,
        y: 1.12,
        xref: 'paper',
        yref: 'paper',
        xanchor: 'center',
        yanchor: 'bottom',
        showarrow: false,
        font: { size: 11, color: '#c9a84c', family: "'JetBrains Mono', monospace" },
      },
    ],
  }

  return { traces, layout }
}
