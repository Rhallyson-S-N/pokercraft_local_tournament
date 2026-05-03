/**
 * Bankroll Analysis Chart
 * Shows bankruptcy/survival rates using Monte Carlo simulation (WASM)
 */

import type { TournamentSummary } from '../../types'
import { getTournamentRRs, getTournamentBuyIn } from '../../types'
import type { Data, Layout } from 'plotly.js-dist-min'

export interface BankrollAnalysisOptions {
  initialCapitals?: number[]
  simulationCount?: number
  minIterations?: number
}

export interface BankrollResult {
  initialCapital: number
  bankruptcyRate: number
  survivalRate: number
}

export interface BankrollAnalysisData {
  traces: Data[]
  layout: Partial<Layout>
}

/**
 * Collect all relative returns from tournaments
 */
export function collectRelativeReturns(tournaments: TournamentSummary[]): number[] {
  const returns: number[] = []
  for (const t of tournaments) {
    const buyIn = getTournamentBuyIn(t)
    if (buyIn > 0) {
      returns.push(...getTournamentRRs(t))
    }
  }
  return returns
}

/**
 * Run bankroll simulation using WASM
 * Returns null if simulation fails (e.g., negative expected returns)
 */
export async function runBankrollSimulation(
  relativeReturns: number[],
  initialCapital: number,
  maxIterations: number,
  simulationCount: number,
  simulate: (
    initialCapital: number,
    relativeReturns: Float64Array,
    maxIterations: number,
    profitExitMultiplier: number,
    simulationCount: number
  ) => { bankruptcy_rate: number; survival_rate: number }
): Promise<BankrollResult | null> {
  try {
    const result = simulate(
      initialCapital,
      new Float64Array(relativeReturns),
      maxIterations,
      0.0, // No profit exit
      simulationCount
    )
    return {
      initialCapital,
      bankruptcyRate: result.bankruptcy_rate,
      survivalRate: result.survival_rate,
    }
  } catch {
    return null
  }
}

/**
 * Generate bankroll analysis chart data
 */
export function getBankrollAnalysisData(
  results: BankrollResult[]
): BankrollAnalysisData {
  if (results.length === 0) {
    return {
      traces: [],
      layout: {
        title: { text: 'Bankroll Analysis' },
        annotations: [
          {
            text: 'No data available (simulation may have failed)',
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 0.5,
            showarrow: false,
            font: { size: 16 },
          },
        ],
      },
    }
  }

  const labels = results.map(r => `${r.initialCapital} BI`)
  const bankruptcyRates = results.map(r => r.bankruptcyRate)
  const survivalRates = results.map(r => r.survivalRate)

  const traces: Data[] = [
    {
      type: 'bar',
      x: labels,
      y: bankruptcyRates,
      name: 'Risco de Quebra',
      marker: { color: 'rgba(224, 90, 78, 0.8)' },
      text: bankruptcyRates.map(r => `${(r * 100).toFixed(1)}%`),
      textfont: { family: "'JetBrains Mono', monospace", color: '#fff' },
      textposition: 'auto',
      hovertemplate: '%{x}: %{y:.2%}',
    } as Data,
    {
      type: 'bar',
      x: labels,
      y: survivalRates,
      name: 'Taxa de Sobrevivência',
      marker: { color: 'rgba(76, 175, 122, 0.8)' },
      text: survivalRates.map(r => `${(r * 100).toFixed(1)}%`),
      textfont: { family: "'JetBrains Mono', monospace", color: '#fff' },
      textposition: 'auto',
      hovertemplate: '%{x}: %{y:.2%}',
    } as Data,
  ]

  const layout: Partial<Layout> = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: '#e2e8f0', family: "'Crimson Pro', serif" },
    title: { 
      text: 'Sua Segurança Financeira (Risco de Quebra)',
      font: { color: '#c9a84c', family: "'Playfair Display', serif" }
    },
    hoverlabel: {
      bgcolor: 'rgba(7, 26, 14, 0.95)',
      bordercolor: '#c9a84c',
      font: { color: '#f0e6c8', size: 13, family: "'JetBrains Mono', monospace" }
    },
    barmode: 'stack',
    yaxis: {
      gridcolor: 'rgba(255,255,255,0.05)',
      zerolinecolor: 'rgba(255,255,255,0.1)',
      title: { text: 'Probabilidade de Perda' },
      tickformat: '.0%',
      range: [0, 1],
    },
    xaxis: {
      gridcolor: 'rgba(255,255,255,0.05)',
      zerolinecolor: 'rgba(255,255,255,0.1)',
      title: { text: 'Tamanho da sua Banca (em número de Buy-ins)' },
    },
    legend: {
      orientation: 'h',
      xanchor: 'center',
      x: 0.5,
      yanchor: 'top',
      y: -0.2,
      font: { family: "'JetBrains Mono', monospace", size: 10 }
    },
    margin: { l: 60, r: 40, t: 100, b: 60 },
    height: 500,
  }

  return { traces, layout }
}

/**
 * Full bankroll analysis pipeline
 */
export async function analyzeBankroll(
  tournaments: TournamentSummary[],
  simulate: (
    initialCapital: number,
    relativeReturns: Float64Array,
    maxIterations: number,
    profitExitMultiplier: number,
    simulationCount: number
  ) => { bankruptcy_rate: number; survival_rate: number },
  options: BankrollAnalysisOptions = {}
): Promise<BankrollAnalysisData> {
  const {
    initialCapitals = [10, 20, 50, 100, 200, 500],
    simulationCount = 25000,
    minIterations = 40000,
  } = options

  const relativeReturns = collectRelativeReturns(tournaments)
  if (relativeReturns.length === 0) {
    return getBankrollAnalysisData([])
  }

  const maxIterations = Math.max(minIterations, tournaments.length * 10)
  const results: BankrollResult[] = []

  for (const initialCapital of initialCapitals) {
    const result = await runBankrollSimulation(
      relativeReturns,
      initialCapital,
      maxIterations,
      simulationCount,
      simulate
    )
    if (result) {
      results.push(result)
    }
  }

  return getBankrollAnalysisData(results)
}
