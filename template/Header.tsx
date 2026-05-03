/**
 * Application header component — Poker Casino Theme
 */

interface HeaderProps {
  wasmVersion: string
  onExport?: () => void
}

export function Header({ wasmVersion, onExport }: HeaderProps) {
  const appVersion = __APP_VERSION__
  const gitHash = __GIT_HASH__

  return (
    <header className="header">
      <div className="header-content">
        {/* Poker Emblem SVG */}
        <svg className="header-emblem" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="26" cy="26" r="25" stroke="#c9a84c" strokeWidth="1.5" fill="none" opacity="0.65"/>
          <circle cx="26" cy="26" r="20" stroke="#c9a84c" strokeWidth="0.5" fill="none" opacity="0.3"/>
          {/* Spade */}
          <path
            d="M26 9 C26 9 17 18 17 23 C17 26.8 19.8 28.5 22.5 28 C20 30.5 18 33 16 35 L36 35 C34 33 32 30.5 29.5 28 C32.2 28.5 35 26.8 35 23 C35 18 26 9 26 9Z"
            fill="#c9a84c"
            opacity="0.9"
          />
          <path d="M26 35 L28.2 40 L26 44.5 L23.8 40 Z" fill="#c9a84c" opacity="0.45"/>
        </svg>

        <div className="header-text">
          <h1>Pokercraft Local</h1>
          <span className="subtitle">Poker Analytics Dashboard</span>
        </div>
      </div>

      <div className="header-links">
        <button
          className="export-button"
          onClick={onExport}
          disabled={!onExport}
          title={onExport ? 'Export all charts as HTML' : 'Load data to enable export'}
        >
          ✦ Export HTML
        </button>
        <a
          href="https://github.com/Rhallyson-S-N/pokercraft_local_tournament"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
        >
          GitHub ↗
        </a>
        <span className="version">
          v{appVersion}
          {gitHash && gitHash !== 'unknown' && ` (${gitHash})`}
          {wasmVersion && ` · WASM v${wasmVersion}`}
        </span>
      </div>
    </header>
  )
}
