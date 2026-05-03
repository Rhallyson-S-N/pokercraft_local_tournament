/**
 * Tournament summary charts container with async loading
 */

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import Plot from 'react-plotly.js'
import type { Data, Layout } from 'plotly.js-dist-min'
import type { TournamentSummary } from '../types'
import type { BankrollWorkerResult } from '../workers/analysisWorker'
import type { ExportChart } from '../export/htmlExport'
import { yieldToBrowser } from '../utils'

interface ChartData {
  traces: Data[]
  layout: Partial<Layout>
}

interface TournamentChartsProps {
  tournaments: TournamentSummary[]
  bankrollResults: BankrollWorkerResult[]
}

interface ChartsState {
  historical: ChartData | null
  rre: ChartData | null
  bankroll: ChartData | null
  prizePies: ChartData | null
  rrByRank: ChartData | null
  isComputing: boolean
  progress: { message: string; percentage: number }
}

export interface TournamentChartsRef {
  getChartData: () => ExportChart[]
}

export const TournamentCharts = forwardRef<TournamentChartsRef, TournamentChartsProps>(
  function TournamentCharts({ tournaments, bankrollResults }, ref) {
  const [state, setState] = useState<ChartsState>({
    historical: null,
    rre: null,
    bankroll: null,
    prizePies: null,
    rrByRank: null,
    isComputing: false,
    progress: { message: '', percentage: 0 },
  })

  const abortRef = useRef(false)
  const lastTournamentCountRef = useRef(0)
  const lastBankrollCountRef = useRef(0)

  useImperativeHandle(ref, () => ({
    getChartData() {
      const charts: ExportChart[] = []
      if (state.historical) charts.push({ name: 'Historical Performance', ...state.historical })
      if (state.rre) charts.push({ name: 'RRE Distribution', ...state.rre })
      if (state.bankroll) charts.push({ name: 'Bankroll Analysis', ...state.bankroll })
      if (state.prizePies) charts.push({ name: 'Prize Distribution', ...state.prizePies })
      if (state.rrByRank) charts.push({ name: 'RR by Rank', ...state.rrByRank })
      return charts
    },
  }))

  useEffect(() => {
    if (tournaments.length === 0) return

    // Skip if data hasn't changed (same counts means no new unique data was added)
    if (
      tournaments.length === lastTournamentCountRef.current &&
      bankrollResults.length === lastBankrollCountRef.current
    ) {
      return
    }

    abortRef.current = false

    const compute = async () => {
      setState(prev => ({
        ...prev,
        isComputing: true,
        progress: { message: 'Loading chart modules...', percentage: 5 },
      }))

      await yieldToBrowser()

      try {
        const {
          getHistoricalPerformanceData,
          getRREHeatmapData,
          getPrizePiesData,
          getRRByRankData,
          getBankrollAnalysisData,
        } = await import('../visualization')

        if (abortRef.current) return

        // Historical Performance
        setState(prev => ({
          ...prev,
          progress: { message: 'Generating historical performance...', percentage: 15 },
        }))
        await yieldToBrowser()

        const historical = getHistoricalPerformanceData(tournaments)
        if (abortRef.current) return

        setState(prev => ({ ...prev, historical }))
        await yieldToBrowser()

        // RRE Heatmap
        setState(prev => ({
          ...prev,
          progress: { message: 'Generating RRE heatmap...', percentage: 30 },
        }))
        await yieldToBrowser()

        const rre = getRREHeatmapData(tournaments)
        if (abortRef.current) return

        setState(prev => ({ ...prev, rre }))
        await yieldToBrowser()

        // Prize Pies
        setState(prev => ({
          ...prev,
          progress: { message: 'Generating prize distribution...', percentage: 50 },
        }))
        await yieldToBrowser()

        const prizePies = getPrizePiesData(tournaments)
        if (abortRef.current) return

        setState(prev => ({ ...prev, prizePies }))
        await yieldToBrowser()

        // RR by Rank
        setState(prev => ({
          ...prev,
          progress: { message: 'Generating RR by rank...', percentage: 70 },
        }))
        await yieldToBrowser()

        const rrByRank = getRRByRankData(tournaments)
        if (abortRef.current) return

        setState(prev => ({ ...prev, rrByRank }))
        await yieldToBrowser()

        // Bankroll Analysis (if available)
        if (bankrollResults.length > 0) {
          setState(prev => ({
            ...prev,
            progress: { message: 'Generating bankroll analysis...', percentage: 85 },
          }))
          await yieldToBrowser()

          const bankroll = getBankrollAnalysisData(bankrollResults)
          if (abortRef.current) return

          setState(prev => ({ ...prev, bankroll }))
        }

        // Update refs
        lastTournamentCountRef.current = tournaments.length
        lastBankrollCountRef.current = bankrollResults.length

        setState(prev => ({
          ...prev,
          isComputing: false,
          progress: { message: 'Complete', percentage: 100 },
        }))
      } catch (error) {
        console.error('Chart generation failed:', error)
        setState(prev => ({
          ...prev,
          isComputing: false,
          progress: { message: 'Error generating charts', percentage: 0 },
        }))
      }
    }

    compute()

    return () => {
      abortRef.current = true
    }
  }, [tournaments, bankrollResults])

  if (tournaments.length === 0) {
    return (
      <div className="no-data">
        <p>No tournament data loaded</p>
      </div>
    )
  }

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

      {state.historical && (
        <section className="chart-section" style={{ marginBottom: '3rem' }}>
          <Plot
            data={state.historical.traces}
            layout={{ ...state.historical.layout, autosize: true }}
            useResizeHandler
            style={{ width: '100%', height: state.historical.layout.height }}
            config={{ responsive: true }}
          />
          <div className="chart-description" style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '1rem', padding: '0 1rem', textAlign: 'center', maxWidth: '800px', margin: '1rem auto 0' }}>
            <strong>Entendendo o Gráfico:</strong> Acompanhe a evolução do seu lucro ao longo do tempo. O <em>Max Drawdown</em> mostra a sua maior queda de lucros (swing negativo). A <em>Taxa de Lucro (ITM)</em> indica a frequência com que você entra na zona de premiação. Observe a correlação entre seus ganhos e o <em>Buy-in Médio</em> que você joga.
          </div>
        </section>
      )}

      {state.rre && (
        <section className="chart-section" style={{ marginBottom: '3rem' }}>
          <Plot
            data={state.rre.traces}
            layout={{ ...state.rre.layout, autosize: true }}
            useResizeHandler
            style={{ width: '100%', height: state.rre.layout.height }}
            config={{ responsive: true }}
          />
          <div className="chart-description" style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '1rem', padding: '0 1rem', textAlign: 'center', maxWidth: '800px', margin: '1rem auto 0' }}>
            <strong>Entendendo o Gráfico:</strong> RRE (Retorno Relativo) mede a eficiência do seu lucro em relação à inscrição do torneio. Quanto mais vermelho, mais lucrativo você é naquele cenário. Este mapa de calor ajuda a identificar quais valores de Buy-in, tamanho de fields (Entradas) e horários do dia trazem o melhor desempenho para o seu jogo.
          </div>
        </section>
      )}

      {state.bankroll && (
        <section className="chart-section" style={{ marginBottom: '3rem' }}>
          <Plot
            data={state.bankroll.traces}
            layout={{ ...state.bankroll.layout, autosize: true }}
            useResizeHandler
            style={{ width: '100%', height: state.bankroll.layout.height }}
            config={{ responsive: true }}
          />
          <div className="chart-description" style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '1rem', padding: '0 1rem', textAlign: 'center', maxWidth: '800px', margin: '1rem auto 0' }}>
            <strong>Entendendo o Gráfico:</strong> Simula o Risco de Quebra (falência) com base no seu histórico real usando o Método Monte Carlo. Para cada tamanho de banca (em número de Buy-ins), a barra vermelha mostra sua chance matemática de perder tudo. Um gerenciamento profissional exige manter a barra de "Risco de Quebra" o mais próximo possível de zero.
          </div>
        </section>
      )}

      {state.prizePies && (
        <section className="chart-section" style={{ marginBottom: '3rem' }}>
          <Plot
            data={state.prizePies.traces}
            layout={{ ...state.prizePies.layout, autosize: true }}
            useResizeHandler
            style={{ width: '100%', height: state.prizePies.layout.height }}
            config={{ responsive: true }}
          />
          <div className="chart-description" style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '1rem', padding: '0 1rem', textAlign: 'center', maxWidth: '800px', margin: '1rem auto 0' }}>
            <strong>Entendendo o Gráfico:</strong> Mostra a origem de todo o dinheiro que você ganhou. O gráfico da esquerda destaca quais torneios específicos trouxeram a maior parte do seu retorno financeiro. O da direita divide seus ganhos pelos dias da semana, ajudando a identificar em quais dias você costuma performar melhor.
          </div>
        </section>
      )}

      {state.rrByRank && (
        <section className="chart-section" style={{ marginBottom: '3rem' }}>
          <Plot
            data={state.rrByRank.traces}
            layout={{ ...state.rrByRank.layout, autosize: true }}
            useResizeHandler
            style={{ width: '100%', height: state.rrByRank.layout.height }}
            config={{ responsive: true }}
          />
          <div className="chart-description" style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '1rem', padding: '0 1rem', textAlign: 'center', maxWidth: '800px', margin: '1rem auto 0' }}>
            <strong>Entendendo o Gráfico:</strong> Analisa a sua capacidade de transformar "chegar longe" (Percentil de Classificação) em dinheiro (RR). A linha tracejada verde indica onde os prêmios começam (ITM). A linha de tendência contínua mostra se as suas retas finais estão gerando grandes multiplicações de prêmio, habilidade fundamental para jogadores lucrativos a longo prazo.
          </div>
        </section>
      )}
    </div>
  )
})
