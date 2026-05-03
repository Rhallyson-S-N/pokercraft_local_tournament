import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

// Components
import {
  Header,
  FileUploader,
  ChartTabs,
  type ChartTab,
  TournamentCharts,
  type TournamentChartsRef,
  HandHistoryCharts,
  type HandHistoryChartsRef,
} from './components'

// Hooks
import { useAnalysisWorker } from './hooks/useAnalysisWorker'

// Export
import { generateExportHTML, downloadHTML } from './export/htmlExport'

function App() {
  const [activeTab, setActiveTab] = useState<ChartTab>('tournament')
  const [wasmVersion, setWasmVersion] = useState('')
  const prevTournamentCountRef = useRef(0)
  const tournamentChartsRef = useRef<TournamentChartsRef>(null)
  const handHistoryChartsRef = useRef<HandHistoryChartsRef>(null)

  const {
    isLoading,
    progress,
    tournaments,
    handHistories,
    bankrollResults,
    errors,
    parseFiles,
    runAnalysis,
  } = useAnalysisWorker()

  // Load WASM version on mount
  useEffect(() => {
    import('./wasm/pokercraft_wasm').then(async (wasm) => {
      await wasm.default()
      setWasmVersion(wasm.version())
    }).catch(() => {
      // WASM load failed
    })
  }, [])

  // Auto-run analysis when new tournament data is added
  // (Hand history analysis is handled independently by HandHistoryCharts)
  useEffect(() => {
    const hasTournamentChanges = tournaments.length !== prevTournamentCountRef.current

    if (hasTournamentChanges && !isLoading && tournaments.length > 0) {
      prevTournamentCountRef.current = tournaments.length
      runAnalysis()
    }
  }, [tournaments.length, isLoading, runAnalysis])

  const handleExport = useCallback(() => {
    const tournamentCharts = tournamentChartsRef.current?.getChartData() ?? []
    const handHistoryCharts = handHistoryChartsRef.current?.getChartData() ?? []
    const htmlSections = handHistoryChartsRef.current?.getHTMLSections() ?? []
    if (tournamentCharts.length === 0 && handHistoryCharts.length === 0 && htmlSections.length === 0) return
    const html = generateExportHTML(tournamentCharts, handHistoryCharts, htmlSections)
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadHTML(html, `pokercraft-export-${timestamp}.html`)
  }, [])

  // Auto-switch tab when data changes
  useEffect(() => {
    if (tournaments.length === 0 && handHistories.length > 0) {
      setActiveTab('handHistory')
    } else if (tournaments.length > 0 && handHistories.length === 0) {
      setActiveTab('tournament')
    }
  }, [tournaments.length, handHistories.length])

  return (
    <div className="app">
      <Header
        wasmVersion={wasmVersion}
        onExport={tournaments.length > 0 || handHistories.length > 0 ? handleExport : undefined}
      />

      <div className="gold-divider">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2 L12 8 L18 8 L13.5 12 L15.5 18 L10 14.5 L4.5 18 L6.5 12 L2 8 L8 8 Z" fill="#c9a84c" opacity="0.7"/>
        </svg>
      </div>

      <FileUploader
        onFilesSelected={parseFiles}
        isLoading={isLoading}
        progress={progress}
        tournamentCount={tournaments.length}
        handHistoryCount={handHistories.length}
      />

      {errors.length > 0 && (
        <div className="errors">
          <h3>Errors:</h3>
          <ul>
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <ChartTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tournamentCount={tournaments.length}
        handHistoryCount={handHistories.length}
      />

      {/* Keep both chart trees mounted (display:none) instead of conditional rendering
          to preserve computation state and progress bars across tab switches.
          Tradeoff: higher memory usage from persistent Plotly DOM nodes. */}
      <div style={{ display: activeTab === 'tournament' ? 'block' : 'none' }}>
        <TournamentCharts
          ref={tournamentChartsRef}
          tournaments={tournaments}
          bankrollResults={bankrollResults}
        />
      </div>

      <div style={{ display: activeTab === 'handHistory' ? 'block' : 'none' }}>
        <HandHistoryCharts ref={handHistoryChartsRef} handHistories={handHistories} tournaments={tournaments} />
      </div>
    </div>
  )
}

export default App
