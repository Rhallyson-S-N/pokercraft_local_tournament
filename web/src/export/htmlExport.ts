/**
 * HTML export utility for generating standalone chart files.
 * Supports both Plotly charts and custom HTML sections.
 */

import type { Data, Layout } from 'plotly.js-dist-min'
import type { HandHistory } from '../types'
import type { PositionStat } from '../visualization/handHistory/stats'
import {
  getHandHistoryNetProfit,
  getHandHistoryOffsetFromButton,
} from '../types'

export interface ExportChart {
  name: string
  traces: Data[]
  layout: Partial<Layout>
}

/** Custom HTML section for non-Plotly content */
export interface ExportHTMLSection {
  name: string
  html: string
}

const PLOTLY_CDN = 'https://cdn.plot.ly/plotly-3.3.1.min.js'

const THEME_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background-color: #050505;
    background-image: 
      radial-gradient(at 0% 0%, rgba(30, 20, 60, 0.8) 0, transparent 40%),
      radial-gradient(at 100% 0%, rgba(20, 40, 60, 0.8) 0, transparent 40%),
      radial-gradient(at 50% 100%, rgba(40, 20, 50, 0.6) 0, transparent 50%);
    background-attachment: fixed;
    color: rgba(255, 255, 255, 0.9);
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 3rem 2rem;
    min-height: 100vh;
  }
  .export-header {
    text-align: center;
    margin-bottom: 3rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  .export-header h1 { 
    font-size: 2.5rem; 
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #a78bfa 0%, #3b82f6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 700;
  }
  .export-header .meta { color: #94a3b8; font-size: 0.9rem; font-weight: 300; }
  .section-title {
    font-size: 1.5rem;
    color: #f8fafc;
    margin: 3rem 0 1.5rem 0;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-weight: 600;
  }
  .chart-container {
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 24px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    overflow: hidden;
    box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
  }
  .js-plotly-plot .plotly .modebar {
    background: transparent !important;
  }

  /* Hole Cards Grid export styles */
  .export-holecards { margin-bottom: 2rem; }
  .export-hc-grid {
    display: grid;
    grid-template-columns: repeat(13, 1fr);
    gap: 2px;
    max-width: 1100px;
    margin: 0 auto;
  }
  .export-hc-cell {
    aspect-ratio: 1.3;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 2px;
    padding: 2px;
  }
  .export-hc-cell.empty { background: rgba(30,30,30,0.3); }
  .export-hc-cell .hand { font-size: 0.78rem; font-weight: 700; color: #f0f0e8; }
  .export-hc-cell .pval { font-size: 0.65rem; font-weight: 600; }
  .export-hc-footer { text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 0.75rem 0; }
  .export-hc-legend {
    display: flex; gap: 1.5rem; justify-content: center;
    padding: 0.75rem 0; margin-bottom: 1rem; color: #b0b0a8; font-size: 0.85rem;
  }
  .export-hc-legend .sw {
    display: inline-block; width: 14px; height: 14px; border-radius: 3px;
    vertical-align: middle; margin-right: 0.4rem; border: 1px solid rgba(255,255,255,0.1);
  }

  /* Position Table export styles */
  .export-posicao { margin-bottom: 2rem; }
  .export-pos-table {
    width: 100%; border-collapse: collapse; text-align: center; margin: 0 auto;
    max-width: 900px;
  }
  .export-pos-table th {
    padding: 0.75rem 1rem; color: #94a3b8; font-weight: 500; font-size: 0.9rem;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.2);
  }
  .export-pos-table td {
    padding: 0.75rem 1rem; color: #e2e8f0; font-size: 0.95rem;
    border-bottom: 1px solid rgba(255,255,255,0.03);
  }
  .export-pos-table tr:hover td { background: rgba(255,255,255,0.02); }
  .pct-pos { color: #4ade80; font-weight: 600; }
  .pct-neg { color: #f87171; font-weight: 600; }
`

// ============================================================================
// Card grid helpers (duplicated from HoleCardsGrid for standalone export)
// ============================================================================

const CARD_NUMBERS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
const CARD_NUMBER_INDEX = new Map<string, number>(CARD_NUMBERS.map((c, i) => [c, i]))

function getCellLabel(row: number, col: number): string {
  const r = CARD_NUMBERS[row]
  const c = CARD_NUMBERS[col]
  if (row === col) return `${r}${c}`
  if (row < col) return `${r}${c}s`
  return `${c}${r}o`
}

function getHandInfo(card1: string, card2: string): { row: number; col: number } {
  const idx1 = CARD_NUMBER_INDEX.get(card1[0]) ?? 0
  const idx2 = CARD_NUMBER_INDEX.get(card2[0]) ?? 0
  const isSuited = card1[1] === card2[1]
  const big = Math.min(idx1, idx2)
  const small = Math.max(idx1, idx2)
  if (big === small) return { row: big, col: big }
  if (isSuited) return { row: big, col: small }
  return { row: small, col: big }
}

function getCellColor(profit: number, count: number): string {
  if (count === 0) return 'transparent'
  if (Math.abs(profit) < 0.005) return '#6b6540'
  if (profit > 0) {
    const t = Math.min(Math.abs(profit) / 1.5, 1)
    return `rgb(${Math.round(50 - t * 20)},${Math.round(95 + t * 50)},${Math.round(50 - t * 20)})`
  }
  const t = Math.min(Math.abs(profit) / 1.5, 1)
  return `rgb(${Math.round(150 + t * 40)},${Math.round(55 - t * 25)},${Math.round(50 - t * 20)})`
}

function getProfitColor(profit: number): string {
  if (Math.abs(profit) < 0.005) return '#d4c87a'
  return profit > 0 ? '#c8e6a0' : '#f5c0c0'
}

function formatBB(v: number): string {
  if (Math.abs(v) < 0.005) return '0BB'
  return `${v > 0 ? '' : '-'}${Math.abs(v).toFixed(2)}BB`
}

// ============================================================================
// Generators
// ============================================================================

/** Generate the Hole Cards 13×13 grid as standalone HTML */
export function generateHoleCardsHTML(handHistories: HandHistory[]): ExportHTMLSection {
  interface Cell { hand: string; profit: number; count: number }

  const mat: Cell[][] = Array.from({ length: 13 }, (_, r) =>
    Array.from({ length: 13 }, (_, c) => ({ hand: getCellLabel(r, c), profit: 0, count: 0 }))
  )

  let withCards = 0
  for (const hh of handHistories) {
    const cards = hh.knownCards.get('Hero')
    if (!cards) continue
    withCards++
    const { row, col } = getHandInfo(cards[0], cards[1])
    const bb = hh.bb > 0 ? hh.bb : 1
    mat[row][col].profit += getHandHistoryNetProfit(hh, 'Hero') / bb
    mat[row][col].count++
  }

  let cells = ''
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      const cell = mat[r][c]
      const hasData = cell.count > 0
      const bg = getCellColor(cell.profit, cell.count)
      const cls = hasData ? '' : ' empty'
      const profitHtml = hasData
        ? `<span class="pval" style="color:${getProfitColor(cell.profit)}">${formatBB(cell.profit)}</span>`
        : ''
      cells += `<div class="export-hc-cell${cls}" style="background:${bg}"><span class="hand">${cell.hand}</span>${profitHtml}</div>\n`
    }
  }

  const html = `
    <div class="export-holecards">
      <div class="export-hc-legend">
        <span><span class="sw" style="background:rgb(55,130,55)"></span>Dinheiro ganho</span>
        <span><span class="sw" style="background:rgba(180,170,140,0.55)"></span>Break-even</span>
        <span><span class="sw" style="background:rgb(170,50,50)"></span>Dinheiro perdido</span>
        <span><span class="sw" style="background:rgba(40,40,40,0.6);border:1px dashed rgba(255,255,255,0.15)"></span>Nenhum</span>
      </div>
      <div class="export-hc-grid">${cells}</div>
      <div class="export-hc-footer">${withCards} de ${handHistories.length} mãos</div>
    </div>`

  return { name: 'Hole Cards', html }
}

/** Generate Position stats as an HTML table */
export function generatePositionHTML(stats: Record<string, PositionStat>, totalHands: number): ExportHTMLSection {
  const positions = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']

  let totalProfit = 0, totalInvested = 0, totalFlop = 0, totalShowdown = 0, totalH = 0
  for (const pos of positions) {
    const s = stats[pos]
    if (!s) continue
    totalProfit += s.profit
    totalInvested += s.chipsInvested
    totalFlop += s.sawFlop
    totalShowdown += s.sawShowdown
    totalH += s.hands
  }

  const overallPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0
  const overallFlop = totalH > 0 ? (totalFlop / totalH) * 100 : 0
  const overallSD = totalH > 0 ? (totalShowdown / totalH) * 100 : 0

  const fmtPct = (v: number) => {
    const s = v >= 0 ? '+' : ''
    const cls = v >= 0 ? 'pct-pos' : 'pct-neg'
    return `<span class="${cls}">${s}${v.toFixed(2)}%</span>`
  }

  let rows = ''
  for (const pos of positions) {
    const s = stats[pos]
    if (!s) continue
    const pct = s.chipsInvested > 0 ? (s.profit / s.chipsInvested) * 100 : 0
    const flop = s.hands > 0 ? (s.sawFlop / s.hands) * 100 : 0
    rows += `<tr>
      <td><strong>${pos}</strong></td>
      <td>${fmtPct(pct)}</td>
      <td>${s.hands}</td>
      <td>${flop.toFixed(2)}%</td>
      <td>${s.sawShowdown}</td>
    </tr>\n`
  }

  const html = `
    <div class="export-posicao">
      <div style="text-align:center;margin-bottom:1.5rem;color:#cbd5e1;font-size:0.95rem;">
        Ganhos/perdas: ${fmtPct(overallPct)} &nbsp;|&nbsp; Flop: <strong>${overallFlop.toFixed(2)}%</strong> &nbsp;|&nbsp; Showdown: <strong>${overallSD.toFixed(2)}%</strong>
      </div>
      <table class="export-pos-table">
        <thead><tr>
          <th>Posição</th><th>Ganhos/perdas</th><th>Mãos</th><th>Flop %</th><th>Showdown</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="export-hc-footer">${totalH} de ${totalHands} mãos</div>
    </div>`

  return { name: 'Posição', html }
}

// ============================================================================
// Core export functions
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildChartDivs(charts: ExportChart[], prefix: string): string {
  return charts
    .map(
      (_, i) => `<div class="chart-container"><div id="${prefix}-${i}" style="width:100%;"></div></div>`
    )
    .join('\n      ')
}

/** Override axis colors for light background readability */
function patchAxesForLightTheme(layout: Partial<Layout>): Record<string, unknown> {
  const src = layout as Record<string, unknown>
  const patched: Record<string, unknown> = { ...src }
  const axisOverrides = { gridcolor: '#ddd', zerolinecolor: '#bbb', linecolor: '#ccc' }

  for (const key of Object.keys(src)) {
    if (/^[xy]axis\d*$/.test(key) && typeof src[key] === 'object' && src[key] !== null) {
      patched[key] = { ...(src[key] as object), ...axisOverrides }
    }
  }
  return patched
}

function buildPlotCalls(charts: ExportChart[], prefix: string): string {
  return charts
    .map((chart, i) => {
      const divId = `${prefix}-${i}`
      const layout: Record<string, unknown> = {
        ...patchAxesForLightTheme(chart.layout),
        autosize: true,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { ...((chart.layout as Record<string, unknown>).font as object), color: '#e2e8f0' },
      }
      return `Plotly.newPlot(
        ${JSON.stringify(divId)},
        ${JSON.stringify(chart.traces)},
        ${JSON.stringify(layout)},
        {responsive: true}
      );`
    })
    .join('\n      ')
}

export function generateExportHTML(
  tournamentCharts: ExportChart[],
  handHistoryCharts: ExportChart[],
  htmlSections: ExportHTMLSection[] = []
): string {
  const timestamp = new Date().toLocaleString()
  const appVersion = __APP_VERSION__
  const gitHash = __GIT_HASH__
  const hashSuffix = gitHash && gitHash !== 'unknown' ? ` (${escapeHtml(gitHash)})` : ''

  const hasTournament = tournamentCharts.length > 0
  const hasHandHistory = handHistoryCharts.length > 0
  const hasHTMLSections = htmlSections.length > 0

  const htmlSectionsMarkup = htmlSections
    .map(s => `<h2 class="section-title">${escapeHtml(s.name)}</h2>\n<div class="chart-container">${s.html}</div>`)
    .join('\n      ')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pokercraft Local - Exported Charts</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="${escapeHtml(PLOTLY_CDN)}"><\/script>
  <style>${THEME_CSS}</style>
</head>
<body>
  <div class="export-header">
    <h1>Pokercraft Local</h1>
    <div class="meta">Exported on ${escapeHtml(timestamp)} &middot; v${escapeHtml(appVersion)}${hashSuffix}</div>
  </div>
  ${
    hasTournament
      ? `<h2 class="section-title">Tournament Summary</h2>
      ${buildChartDivs(tournamentCharts, 'tournament')}`
      : ''
  }
  ${
    hasHandHistory
      ? `<h2 class="section-title">Hand History</h2>
      ${buildChartDivs(handHistoryCharts, 'hand')}`
      : ''
  }
  ${hasHTMLSections ? htmlSectionsMarkup : ''}
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      ${hasTournament ? buildPlotCalls(tournamentCharts, 'tournament') : ''}
      ${hasHandHistory ? buildPlotCalls(handHistoryCharts, 'hand') : ''}
    });
  <\/script>
</body>
</html>`
}

export function downloadHTML(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
