/**
 * RRE Heatmap Chart
 * Shows RRE (Relative Return of Entry) distributions by buy-in, entries, and time of day
 */

import type { TournamentSummary } from '../../types'
import {
  getTournamentBuyIn,
  getTournamentRRE,
  getTournamentTimeOfWeek,
} from '../../types'
import { log2OrNaN } from '../../analytics'
import type { Data, Layout } from 'plotly.js-dist-min'

export interface RREHeatmapData {
  traces: Data[]
  layout: Partial<Layout>
}

/**
 * Generate RRE heatmap chart data
 */
export function getRREHeatmapData(tournaments: TournamentSummary[]): RREHeatmapData {
  // Calculate data for each tournament
  const data = tournaments.map(t => ({
    buyIn: getTournamentBuyIn(t),
    rre: getTournamentRRE(t),
    totalEntries: t.totalPlayers,
    timeOfDay: getTournamentTimeOfWeek(t)[1], // minutes of day
  }))

  const log2RRE = data.map(d => log2OrNaN(d.rre))
  const log2BuyIn = data.map(d => log2OrNaN(d.buyIn))
  const log2Entries = data.map(d => log2OrNaN(d.totalEntries))
  const timeOfDay = data.map(d => d.timeOfDay)
  const rreValues = data.map(d => d.rre)

  // Shared colorscale for dark mode (transparent to bright blue/green)
  const colorscale: [number, string][] = [
    [0, 'rgba(30, 41, 59, 0)'],
    [0.5, 'rgba(59, 130, 246, 0.6)'],
    [1, 'rgba(74, 222, 128, 0.9)'],
  ]

  // Common histogram2d options
  const commonOptions = {
    ybins: { size: 0.5, start: -3 },
    histfunc: 'sum' as const,
    coloraxis: 'coloraxis',
  }

  const traces: Data[] = []

  // Histogram2d: RRE by Buy-In
  traces.push({
    type: 'histogram2d',
    x: log2BuyIn,
    y: log2RRE,
    z: rreValues,
    name: 'RRE por Buy-In',
    hovertemplate: 'Log2(RRE) = [%{y}]<br>Log2(Buy-In) = [%{x}]<br>Soma RRE: %{z:.3f}<extra></extra>',
    xaxis: 'x',
    yaxis: 'y',
    ...commonOptions,
  } as unknown as Data)

  // Histogram2d: RRE by Total Entries
  traces.push({
    type: 'histogram2d',
    x: log2Entries,
    y: log2RRE,
    z: rreValues,
    xbins: { start: 1.0, size: 1.0 },
    name: 'RRE por Entradas',
    hovertemplate: 'Log2(RRE) = [%{y}]<br>Log2(Entradas) = [%{x}]<br>Soma RRE: %{z:.3f}<extra></extra>',
    xaxis: 'x2',
    yaxis: 'y',
    ...commonOptions,
  } as unknown as Data)

  // Histogram2d: RRE by Time of Day
  traces.push({
    type: 'histogram2d',
    x: timeOfDay,
    y: log2RRE,
    z: rreValues,
    xbins: { start: 0.0, size: 120, end: 1440 }, // 2-hour bins, 24 hours
    name: 'RRE por Horário',
    hovertemplate: 'Log2(RRE) = [%{y}]<br>Horário = [%{x}] mins<br>Soma RRE: %{z:.3f}<extra></extra>',
    xaxis: 'x3',
    yaxis: 'y',
    ...commonOptions,
  } as unknown as Data)

  // Marginal histogram
  traces.push({
    type: 'histogram',
    x: rreValues,
    y: log2RRE,
    histfunc: 'sum',
    orientation: 'h',
    ybins: { size: 0.5, start: -3 },
    marker: { color: 'rgba(96, 165, 250, 0.6)' },
    name: 'RRE Marginal',
    hovertemplate: 'Log2(RRE) = [%{y}]<br>Soma RRE: %{x:.3f}<extra></extra>',
    xaxis: 'x4',
    yaxis: 'y',
  } as unknown as Data)

  const layout = {
    title: { text: 'Distribuição de RRE (Return on Risk Entity)' },
    height: 500,
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: '#e2e8f0' },
    grid: {
      rows: 1,
      columns: 4,
      pattern: 'independent',
    },
    // Column widths ratio 2:2:2:1 (matching Python version)
    xaxis: {
      title: { text: 'Log2(Buy-In)' },
      domain: [0, 0.27],
      fixedrange: true,
      zeroline: false,
      gridcolor: 'rgba(255,255,255,0.05)',
    },
    xaxis2: {
      title: { text: 'Log2(Entradas)' },
      domain: [0.29, 0.56],
      fixedrange: true,
      zeroline: false,
      gridcolor: 'rgba(255,255,255,0.05)',
    },
    xaxis3: {
      title: { text: 'Hora do Dia (mins)' },
      domain: [0.58, 0.85],
      fixedrange: true,
      zeroline: false,
      gridcolor: 'rgba(255,255,255,0.05)',
    },
    xaxis4: {
      title: { text: 'Marginal' },
      domain: [0.87, 1],
      fixedrange: true,
      zeroline: false,
      gridcolor: 'rgba(255,255,255,0.05)',
    },
    yaxis: {
      title: { text: 'Log2(RRE)' },
      fixedrange: true,
      gridcolor: 'rgba(255,255,255,0.05)',
    },
    coloraxis: {
      colorscale: colorscale,
      colorbar: {
        tickfont: { color: '#e2e8f0' },
      }
    },
    shapes: [
      // Vertical dividers between heatmaps
      {
        type: 'line',
        xref: 'paper',
        x0: 0.28,
        x1: 0.28,
        yref: 'paper',
        y0: 0,
        y1: 1,
        line: { color: 'rgba(255,255,255,0.1)', width: 1 },
      },
      {
        type: 'line',
        xref: 'paper',
        x0: 0.57,
        x1: 0.57,
        yref: 'paper',
        y0: 0,
        y1: 1,
        line: { color: 'rgba(255,255,255,0.1)', width: 1 },
      },
      {
        type: 'line',
        xref: 'paper',
        x0: 0.86,
        x1: 0.86,
        yref: 'paper',
        y0: 0,
        y1: 1,
        line: { color: 'rgba(255,255,255,0.1)', width: 1 },
      },
      // Break-even line (Log2(1) = 0)
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 0.85,
        yref: 'y',
        y0: 0,
        y1: 0,
        line: { color: 'rgba(239,68,68,0.5)', dash: 'dash' },
      },
      // Good run line (Log2(4) = 2)
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 0.85,
        yref: 'y',
        y0: 2,
        y1: 2,
        line: { color: 'rgba(255,255,255,0.3)', dash: 'dash' },
      },
      // Deep run line (Log2(32) = 5)
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 0.85,
        yref: 'y',
        y0: 5,
        y1: 5,
        line: { color: 'rgba(255,255,255,0.5)', dash: 'dash' },
      },
    ],
    annotations: [
      { x: 0, y: 0, xref: 'paper', yref: 'y', text: 'Break-even', showarrow: false, xanchor: 'left', yanchor: 'bottom', font: { color: 'rgba(239,68,68,0.8)' } },
      { x: 0, y: 2, xref: 'paper', yref: 'y', text: 'Good run (4x)', showarrow: false, xanchor: 'left', yanchor: 'bottom', font: { color: 'rgba(255,255,255,0.6)' } },
      { x: 0, y: 5, xref: 'paper', yref: 'y', text: 'Deep run (32x)', showarrow: false, xanchor: 'left', yanchor: 'bottom', font: { color: 'rgba(255,255,255,0.8)' } },
    ],
  }

  return { traces, layout: layout as Partial<Layout> }
}
