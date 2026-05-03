/**
 * Historical Performance Chart
 * Shows net profit, profitable ratio, and average buy-in over time
 */

import type { TournamentSummary } from '../../types'
import {
  getTournamentBuyIn,
  getTournamentProfit,
} from '../../types'
import { cumsum, cummax, cummin, rollingMean, expandingMean } from '../../analytics'
import type { Data, Layout } from 'plotly.js-dist-min'

export const DEFAULT_WINDOW_SIZES = [25, 100, 400, 800] as const

export interface HistoricalPerformanceOptions {
  windowSizes?: readonly number[]
}

export interface HistoricalPerformanceData {
  traces: Data[]
  layout: Partial<Layout>
}

/**
 * Generate historical performance chart data
 */
export function getHistoricalPerformanceData(
  tournaments: TournamentSummary[],
  options: HistoricalPerformanceOptions = {}
): HistoricalPerformanceData {
  const { windowSizes = DEFAULT_WINDOW_SIZES } = options

  // Base data
  const indices = tournaments.map((_, i) => i + 1)
  const profits = tournaments.map(t => getTournamentProfit(t))
  const rakes = tournaments.map(t => t.rake * t.myEntries)
  const buyIns = tournaments.map(t => getTournamentBuyIn(t))
  const profitable = profits.map(p => (p > 0 ? 1 : 0))

  // Cumulative calculations
  const netProfit = cumsum(profits)
  const netRake = cumsum(rakes)
  const idealProfit = netProfit.map((np, i) => np + netRake[i])
  const maxProfit = cummax(netProfit)
  const drawdown = netProfit.map((np, i) => np - maxProfit[i])
  const maxDrawdown = cummin(drawdown)

  // Profitable ratio
  const profitableExpanding = expandingMean(profitable)
  const profitableRolling: Record<number, (number | null)[]> = {}
  for (const ws of windowSizes) {
    profitableRolling[ws] = rollingMean(profitable, ws)
  }

  // Average buy-in

  const avgBuyInExpanding = expandingMean(buyIns)
  const avgBuyInRolling: Record<number, (number | null)[]> = {}
  for (const ws of windowSizes) {
    avgBuyInRolling[ws] = rollingMean(buyIns, ws)
  }

  // Build traces
  const traces: Data[] = []

  // Row 1: Net Profit, Rake, Ideal Profit, Max Drawdown
  traces.push({
    x: indices,
    y: netProfit,
    name: 'Lucro Líquido',
    mode: 'lines',
    legendgroup: 'profit',
    legendgrouptitle: { text: 'Lucros & Rake' },
    hovertemplate: '%{y:$,.2f}',
    yaxis: 'y1',
  } as Data)

  traces.push({
    x: indices,
    y: netRake,
    name: 'Rake Pago',
    mode: 'lines',
    legendgroup: 'profit',
    visible: 'legendonly',
    hovertemplate: '%{y:$,.2f}',
    yaxis: 'y1',
  } as Data)

  traces.push({
    x: indices,
    y: idealProfit,
    name: 'Lucro Ideal',
    mode: 'lines',
    legendgroup: 'profit',
    hovertemplate: '%{y:$,.2f}',
    yaxis: 'y1',
  } as Data)

  traces.push({
    x: indices,
    y: maxDrawdown,
    name: 'Max Drawdown',
    mode: 'lines',
    legendgroup: 'profit',
    hovertemplate: '%{y:$,.2f}',
    yaxis: 'y1',
  } as Data)

  // Row 2: Profitable Ratio
  traces.push({
    x: indices,
    y: profitableExpanding,
    name: 'Desde o #0',
    mode: 'lines',
    legendgroup: 'profitableRatio',
    legendgrouptitle: { text: 'Taxa de Lucro (ITM)' },
    hovertemplate: '%{y:.2%}',
    yaxis: 'y2',
  } as Data)

  for (const ws of windowSizes) {
    traces.push({
      x: indices,
      y: profitableRolling[ws],
      name: `Últimos ${ws}`,
      mode: 'lines',
      legendgroup: 'profitableRatio',
      visible: ws > 25 ? 'legendonly' : true,
      hovertemplate: '%{y:.2%}',
      yaxis: 'y2',
    } as Data)
  }

  // Row 3: Average Buy-In
  traces.push({
    x: indices,
    y: avgBuyInExpanding,
    name: 'Desde o #0',
    mode: 'lines',
    legendgroup: 'avgBuyIn',
    legendgrouptitle: { text: 'Buy-in Médio' },
    hovertemplate: '%{y:$,.2f}',
    yaxis: 'y3',
  } as Data)

  for (const ws of windowSizes) {
    traces.push({
      x: indices,
      y: avgBuyInRolling[ws],
      name: `Últimos ${ws}`,
      mode: 'lines',
      legendgroup: 'avgBuyIn',
      visible: ws > 25 ? 'legendonly' : true,
      hovertemplate: '%{y:$,.2f}',
      yaxis: 'y3',
    } as Data)
  }

  // Calculate y-axis ranges (single pass for each metric)
  const allProfitableValues = windowSizes.flatMap(ws =>
    profitableRolling[ws].filter((v): v is number => v !== null)
  )
  const minProfitableRolling = allProfitableValues.length > 0
    ? Math.min(...allProfitableValues)
    : 0
  const maxProfitableRolling = allProfitableValues.length > 0
    ? Math.max(...allProfitableValues)
    : 1

  const allAvgBuyInValues = [
    ...avgBuyInExpanding,
    ...windowSizes.flatMap(ws => avgBuyInRolling[ws].filter((v): v is number => v !== null))
  ]
  const minAvgBuyIn = Math.min(...allAvgBuyInValues)
  const maxAvgBuyIn = Math.max(...allAvgBuyInValues)

  const layout: Partial<Layout> = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: '#e2e8f0' },
    title: { text: 'Performance Histórica' },
    hovermode: 'x unified',
    height: 800,
    grid: {
      rows: 3,
      columns: 1,
      pattern: 'independent',
      roworder: 'top to bottom',
    },
    xaxis: {
      gridcolor: 'rgba(255,255,255,0.05)',
      zerolinecolor: 'rgba(255,255,255,0.1)',
      showticklabels: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unifiedhovertitle: { text: 'Torneio #%{x}' } as any,
    } as Partial<Layout['xaxis']>,
    xaxis2: {
      gridcolor: 'rgba(255,255,255,0.05)',
      zerolinecolor: 'rgba(255,255,255,0.1)',
      showticklabels: false,
    },
    xaxis3: {
      showticklabels: true,
      gridcolor: 'rgba(255,255,255,0.05)',
      zerolinecolor: 'rgba(255,255,255,0.1)',
    },
    yaxis: {
      gridcolor: 'rgba(255,255,255,0.05)',
      zerolinecolor: 'rgba(255,255,255,0.1)',
      title: { text: 'Lucro Líquido & Rake' },
      tickformat: '$',
      domain: [0.7, 1],
    },
    yaxis2: {
      gridcolor: 'rgba(255,255,255,0.05)',
      zerolinecolor: 'rgba(255,255,255,0.1)',
      title: { text: 'Taxa de Lucro (ITM)' },
      tickformat: '.0%',
      range: [
        Math.max(0, minProfitableRolling - 0.02),
        Math.min(1, maxProfitableRolling + 0.02),
      ],
      domain: [0.4, 0.65],
    },
    yaxis3: {
      gridcolor: 'rgba(255,255,255,0.05)',
      zerolinecolor: 'rgba(255,255,255,0.1)',
      title: { text: 'Buy-In Médio' },
      type: 'log',
      tickformat: '$',
      range: [
        Math.log10(Math.max(minAvgBuyIn, 0.1)) - 0.05,
        Math.log10(Math.max(maxAvgBuyIn, 0.1)) + 0.05,
      ],
      domain: [0.05, 0.35],
    },
    legend: {
      orientation: 'h',
      xanchor: 'center',
      x: 0.5,
      yanchor: 'top',
      y: -0.02,
      groupclick: 'toggleitem',
    },
    shapes: [
      // Break-even line on profit chart
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 1,
        yref: 'y',
        y0: 0,
        y1: 0,
        line: { color: 'rgba(239,68,68,0.5)', dash: 'dash' },
      },
      // Current net profit line
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 1,
        yref: 'y',
        y0: netProfit[netProfit.length - 1],
        y1: netProfit[netProfit.length - 1],
        line: { color: 'rgba(59,130,246,0.5)', dash: 'dash' },
      },
      // Max drawdown line
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 1,
        yref: 'y',
        y0: maxDrawdown[maxDrawdown.length - 1],
        y1: maxDrawdown[maxDrawdown.length - 1],
        line: { color: 'rgba(168,85,247,0.5)', dash: 'dash' },
      },
      // Buy-in threshold lines
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 1,
        yref: 'y3',
        y0: 5,
        y1: 5,
        line: { color: 'rgba(255,255,255,0.2)', dash: 'dash' },
      },
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 1,
        yref: 'y3',
        y0: 20,
        y1: 20,
        line: { color: 'rgba(255,255,255,0.2)', dash: 'dash' },
      },
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 1,
        yref: 'y3',
        y0: 100,
        y1: 100,
        line: { color: 'rgba(255,255,255,0.2)', dash: 'dash' },
      },
    ],
    annotations: [
      {
        text: '<b>Break-even</b>',
        xref: 'paper',
        x: 1,
        xanchor: 'right',
        yref: 'y',
        y: 0,
        yanchor: 'top',
        showarrow: false,
        font: { color: 'rgba(239,68,68,0.8)', size: 14 },
      },
      {
        text: '<b>Lucro Atual</b>',
        xref: 'paper',
        x: 0,
        xanchor: 'left',
        yref: 'y',
        y: netProfit[netProfit.length - 1],
        yanchor: 'bottom',
        showarrow: false,
        font: { color: 'rgba(96,165,250,0.8)', size: 14 },
      },
      {
        text: '<b>Max Drawdown</b>',
        xref: 'paper',
        x: 0,
        xanchor: 'left',
        yref: 'y',
        y: maxDrawdown[maxDrawdown.length - 1],
        yanchor: 'bottom',
        showarrow: false,
        font: { color: 'rgba(192,132,252,0.8)', size: 14 },
      },
      {
        text: '<b>Micro</b>',
        xref: 'paper',
        x: 0,
        xanchor: 'left',
        yref: 'y3',
        y: Math.log10(5),
        yanchor: 'top',
        showarrow: false,
        font: { color: 'rgba(255,255,255,0.5)', size: 12 },
      },
      {
        text: '<b>Low/Mid</b>',
        xref: 'paper',
        x: 0,
        xanchor: 'left',
        yref: 'y3',
        y: Math.log10(20),
        yanchor: 'top',
        showarrow: false,
        font: { color: 'rgba(255,255,255,0.5)', size: 12 },
      },
      {
        text: '<b>High</b>',
        xref: 'paper',
        x: 0,
        xanchor: 'left',
        yref: 'y3',
        y: Math.log10(100),
        yanchor: 'top',
        showarrow: false,
        font: { color: 'rgba(255,255,255,0.5)', size: 12 },
      },
    ],
  }

  return { traces, layout }
}
