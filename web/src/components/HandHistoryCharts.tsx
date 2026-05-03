/**
 * Hand history charts container with async loading and caching
 */

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import Plot from 'react-plotly.js'
import type { Data, Layout } from 'plotly.js-dist-min'
import type { HandHistory, TournamentSummary } from '../types'
import type { AllInHandData } from '../visualization/handHistory/allInEquityAsync'
import type { ExportChart, ExportHTMLSection } from '../export/htmlExport'
import { generateHoleCardsHTML, generatePositionHTML } from '../export/htmlExport'
import { yieldToBrowser } from '../utils'
import { calculatePositionStats, type PositionStat, type StackInterval } from '../visualization/handHistory/stats'
import { HistoricoJogo } from './handHistory/HistoricoJogo'
import { PosicaoTable } from './handHistory/PosicaoTable'
import { HoleCardsGrid } from './handHistory/HoleCardsGrid'

interface ChartData {
  traces: Data[]
  layout: Partial<Layout>
}

interface HandHistoryChartsProps {
  handHistories: HandHistory[]
  tournaments: TournamentSummary[]
}

export type SubTab = 'historico' | 'ev' | 'holecards' | 'posicao'

interface ChartsState {
  chipHistories: ChartData | null
  allInEquity: ChartData | null
  handUsage: ChartData | null
  posicaoStats: Record<StackInterval, Record<string, PositionStat>> | null
  isComputing: boolean
  progress: { message: string; percentage: number }
  activeSubTab: SubTab
}

export interface HandHistoryChartsRef {
  getChartData: () => ExportChart[]
  getHTMLSections: () => ExportHTMLSection[]
}

// Global cache for equity results (persists across re-renders)
const equityCache = new Map<string, AllInHandData>()
let cachedLuckScore = 0

export const HandHistoryCharts = forwardRef<HandHistoryChartsRef, HandHistoryChartsProps>(
  function HandHistoryCharts({ handHistories, tournaments }, ref) {
  const [state, setState] = useState<ChartsState>({
    chipHistories: null,
    allInEquity: null,
    handUsage: null,
    posicaoStats: null,
    isComputing: false,
    progress: { message: '', percentage: 0 },
    activeSubTab: 'historico'
  })

  const computeIdRef = useRef(0)
  const lastComputedRef = useRef<Set<string>>(new Set())

  useImperativeHandle(ref, () => ({
    getChartData() {
      const charts: ExportChart[] = []
      if (state.chipHistories) charts.push({ name: 'Chip Histories', ...state.chipHistories })
      if (state.allInEquity) charts.push({ name: 'All-In Equity', ...state.allInEquity })
      return charts
    },
    getHTMLSections() {
      const sections: ExportHTMLSection[] = []
      if (handHistories.length > 0) {
        sections.push(generateHoleCardsHTML(handHistories))
      }
      if (state.posicaoStats) {
        sections.push(generatePositionHTML(state.posicaoStats['all'], handHistories.length))
      }
      return sections
    },
  }))

  useEffect(() => {
    if (handHistories.length === 0) {
      return
    }

    // Check if we have new hands to process
    const currentIds = new Set(handHistories.map(h => h.id))
    const hasNewHands = handHistories.some(h => !lastComputedRef.current.has(h.id))

    if (!hasNewHands && lastComputedRef.current.size > 0) {
      return // No new data, skip recomputation
    }

    // Mark current IDs immediately to prevent duplicate computations
    // from re-renders with the same data
    lastComputedRef.current = currentIds

    const thisComputeId = ++computeIdRef.current
    const isStale = () => computeIdRef.current !== thisComputeId

    const compute = async () => {
      setState(prev => ({
        ...prev,
        isComputing: true,
        progress: { message: 'Loading chart modules...', percentage: 5 },
      }))

      await yieldToBrowser()

      try {
        const [
          { getChipHistoriesData, getHandUsageHeatmapsData },
          { collectAllInDataAsync, createAllInEquityChart },
        ] = await Promise.all([
          import('../visualization'),
          import('../visualization/handHistory/allInEquityAsync'),
        ])

        if (isStale()) return

        setState(prev => ({
          ...prev,
          progress: { message: 'Calculating Stats...', percentage: 10 },
        }))
        await yieldToBrowser()

        const posicaoStats = calculatePositionStats(handHistories)

        if (isStale()) return

        setState(prev => ({
          ...prev,
          posicaoStats,
          progress: { message: 'Generating chip histories...', percentage: 15 },
        }))
        await yieldToBrowser()

        // Chip histories (always recompute - fast enough)
        const chipHistories = await getChipHistoriesData(handHistories)
        if (isStale()) return

        setState(prev => ({
          ...prev,
          chipHistories,
          progress: { message: 'Generating hand usage heatmaps...', percentage: 20 },
        }))
        await yieldToBrowser()

        // Hand usage heatmaps (compute before equity)
        const handUsage = await getHandUsageHeatmapsData(handHistories)
        if (isStale()) return

        setState(prev => ({
          ...prev,
          handUsage,
          progress: { message: 'Checking equity cache...', percentage: 25 },
        }))
        await yieldToBrowser()

        // Filter out hands that are already cached
        const uncachedHands = handHistories.filter(h => !equityCache.has(h.id))
        const cachedCount = handHistories.length - uncachedHands.length

        if (uncachedHands.length > 0) {
          setState(prev => ({
            ...prev,
            progress: {
              message: `Found ${cachedCount} cached, calculating ${uncachedHands.length} new...`,
              percentage: 30,
            },
          }))

          // Calculate equity only for uncached hands
          const { data: newAllInData, luckScore: newLuckScore } = await collectAllInDataAsync(
            uncachedHands,
            (current, total) => {
              if (!isStale()) {
                const pct = 30 + Math.floor((current / total) * 65)
                setState(prev => ({
                  ...prev,
                  progress: {
                    message: `Calculating equity: ${current}/${total} all-ins...`,
                    percentage: pct,
                  },
                }))
              }
            }
          )
          if (isStale()) return

          // Add new results to cache
          for (const data of newAllInData) {
            equityCache.set(data.handId, data)
          }

          // Recalculate luck score with all cached data
          // (simplified: we store the latest, but ideally recalculate from all)
          if (newAllInData.length > 0) {
            cachedLuckScore = newLuckScore
          }
        }

        // Get all cached results for current hand histories
        const allCachedData: AllInHandData[] = []
        for (const h of handHistories) {
          const cached = equityCache.get(h.id)
          if (cached) {
            allCachedData.push(cached)
          }
        }

        const allInEquity = createAllInEquityChart(allCachedData, cachedLuckScore)

        setState(prev => ({
          ...prev,
          allInEquity,
          isComputing: false,
          progress: { message: 'Complete', percentage: 100 },
        }))
      } catch (error) {
        console.error('Chart generation failed:', error)
        lastComputedRef.current = new Set() // Allow retry on next render
        setState(prev => ({
          ...prev,
          isComputing: false,
          progress: { message: 'Error generating charts', percentage: 0 },
        }))
      }
    }

    compute()

    return () => {
      computeIdRef.current++ // Invalidate this computation
    }
  }, [handHistories])

  if (handHistories.length === 0) {
    return (
      <div className="no-data">
        <p>No hand history data loaded</p>
      </div>
    )
  }

  const setSubTab = (tab: SubTab) => setState(prev => ({ ...prev, activeSubTab: tab }))

  return (
    <div className="charts-container">
      {state.isComputing && (
        <div className="chart-loading">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${state.progress.percentage}%` }}
            />
          </div>
          <p className="progress-message">{state.progress.message}</p>
        </div>
      )}

      {/* Sub Tabs Navigation matching GGNetwork */}
      <nav className="inner-tabs">
        <button className={`inner-tab ${state.activeSubTab === 'historico' ? 'active' : ''}`} onClick={() => setSubTab('historico')}>Histórico de Jogo</button>
        <button className={`inner-tab ${state.activeSubTab === 'ev' ? 'active' : ''}`} onClick={() => setSubTab('ev')}>Gráfico de EV</button>
        <button className={`inner-tab ${state.activeSubTab === 'holecards' ? 'active' : ''}`} onClick={() => setSubTab('holecards')}>Hole cards</button>
        <button className={`inner-tab ${state.activeSubTab === 'posicao' ? 'active' : ''}`} onClick={() => setSubTab('posicao')}>Posição</button>
      </nav>

      {/* Tab Content */}
      <div className="sub-tab-content">
        {state.activeSubTab === 'historico' && (
          <section className="chart-section no-bg">
            <HistoricoJogo handHistories={handHistories} tournaments={tournaments} />
          </section>
        )}

        {state.activeSubTab === 'ev' && state.allInEquity && (
          <section className="chart-section">
            <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', color: '#94a3b8' }}>
              <h4 style={{ color: '#e2e8f0', marginTop: 0, marginBottom: '0.75rem', fontSize: '1.1rem' }}>Sorte ou Azar? Entenda seus All-ins (Gráfico de EV)</h4>
              <p style={{ margin: '0 0 0.5rem 0', lineHeight: 1.5, fontSize: '0.95rem' }}>
                No poker, quando você aposta todas as suas fichas (All-in), a matemática te dá uma porcentagem de chance exata de vencer aquela mão. Este gráfico analisa todas as vezes que você foi All-in para te dizer se você está "dando sorte" ou não!
              </p>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.2rem', lineHeight: 1.6, fontSize: '0.95rem' }}>
                <li><span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>Gráfico de Cima (Quantidade):</span> Mostra quantas vezes você foi All-in. Barras mais à direita significam que você era o favorito (boas chances). As cores mostram se você <span style={{ color: '#4ade80' }}>ganhou (Verde)</span>, <span style={{ color: '#fbbf24' }}>empatou (Amarelo)</span> ou <span style={{ color: '#ef4444' }}>perdeu (Vermelho)</span>.</li>
                <li><span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>Gráfico de Baixo (Taxa de Vitória):</span> Aqui é onde você descobre a verdade! A <strong>linha tracejada</strong> que sobe na diagonal representa a "justiça matemática" perfeita.</li>
              </ul>
              <p style={{ margin: '0.5rem 0 0 0', lineHeight: 1.5, fontSize: '0.95rem' }}>
                <em>Dica de Leitura:</em> Se no gráfico de baixo as barras verdes <strong style={{ color: '#4ade80' }}>ultrapassam</strong> a linha tracejada, você teve sorte (ganhou mais vezes do que deveria). Se elas ficam <strong style={{ color: '#ef4444' }}>abaixo</strong> da linha tracejada, você deu azar e a matemática estava contra você no curto prazo!
              </p>
            </div>
            <Plot
              data={state.allInEquity.traces}
              layout={{ ...state.allInEquity.layout, autosize: true }}
              useResizeHandler
              style={{ width: '100%', height: '700px' }}
              config={{ responsive: true }}
            />
          </section>
        )}

        {state.activeSubTab === 'holecards' && (
          <section className="chart-section">
            <HoleCardsGrid handHistories={handHistories} />
          </section>
        )}

        {state.activeSubTab === 'posicao' && state.posicaoStats && (
          <section className="chart-section no-bg">
            <PosicaoTable stats={state.posicaoStats} totalHands={handHistories.length} />
          </section>
        )}
      </div>
    </div>
  )
})
