import React, { useState, useMemo } from 'react'
import { type TournamentSummary, getTournamentBuyIn } from '../types'
import { getTournamentTags } from '../utils/tournamentTags'

interface TournamentHistoryTableProps {
  tournaments: TournamentSummary[]
}

export const TournamentHistoryTable: React.FC<TournamentHistoryTableProps> = ({ tournaments }) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTournaments = useMemo(() => {
    return [...tournaments]
      .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  }, [tournaments, searchTerm])

  return (
    <div className="table-container" style={{ marginTop: '2rem' }}>
      <div style={{ 
        padding: '1.25rem 1.5rem', 
        borderBottom: '1px solid rgba(201, 168, 76, 0.15)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Histórico Completo
        </h3>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <input
            type="text"
            placeholder="Pesquisar torneio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(7, 26, 14, 0.6)',
              border: '1px solid rgba(201, 168, 76, 0.3)',
              borderRadius: '4px',
              padding: '0.5rem 1rem',
              color: 'var(--text-primary)',
              fontFamily: "'Crimson Pro', serif",
              fontSize: '0.9rem'
            }}
          />
          <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="sessions-table">
          <thead>
            <tr>
              <th>Torneio</th>
              <th>Data / Hora</th>
              <th>Posição</th>
              <th>Buy-in</th>
              <th style={{ textAlign: 'right' }}>Prêmio</th>
            </tr>
          </thead>
          <tbody>
            {filteredTournaments.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Nenhum torneio encontrado.
                </td>
              </tr>
            ) : (
              filteredTournaments.map(t => {
                const buyIn = getTournamentBuyIn(t) * t.myEntries
                const profit = t.myPrize - buyIn
                const tags = getTournamentTags(t.name)
                
                return (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{t.name}</div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {tags.map((tag, idx) => (
                          <span key={idx} className="tag" style={{
                            fontSize: '0.6rem',
                            padding: '1px 6px',
                            background: tag.type === 'format' ? 'rgba(201, 168, 76, 0.15)' : 
                                       tag.type === 'speed' ? 'rgba(224, 90, 78, 0.15)' : 
                                       'rgba(74, 144, 226, 0.15)',
                            color: tag.type === 'format' ? 'var(--gold)' : 
                                   tag.type === 'speed' ? '#fca5a5' : 
                                   '#93c5fd',
                            border: `1px solid ${tag.type === 'format' ? 'rgba(201, 168, 76, 0.3)' : 
                                                tag.type === 'speed' ? 'rgba(224, 90, 78, 0.3)' : 
                                                'rgba(74, 144, 226, 0.3)'}`
                          }}>
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        {new Date(t.startTime).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(t.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          width: '28px', height: '28px', 
                          borderRadius: '50%', 
                          background: t.myRank === 1 ? 'rgba(201, 168, 76, 0.25)' : 
                                     t.myRank === 2 ? 'rgba(180, 180, 180, 0.15)' :
                                     t.myRank === 3 ? 'rgba(180, 100, 50, 0.15)' :
                                     'rgba(255, 255, 255, 0.05)',
                          color: t.myRank === 1 ? 'var(--gold)' : 
                                 t.myRank === 2 ? '#d1d5db' :
                                 t.myRank === 3 ? '#fb923c' :
                                 'var(--text-muted)',
                          border: `1px solid ${t.myRank === 1 ? 'var(--gold)' : 
                                              t.myRank === 2 ? '#9ca3af' :
                                              t.myRank === 3 ? '#ea580c' :
                                              'rgba(255, 255, 255, 0.1)'}`,
                          fontFamily: "'Playfair Display', serif",
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}>
                          {t.myRank}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ {t.totalPlayers}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
                        ${buyIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      {t.myEntries > 1 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--gold)', opacity: 0.8 }}>
                          {t.myEntries} entradas
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className={profit >= 0 ? 'profit-pos' : 'profit-neg'} style={{ fontSize: '1rem' }}>
                        {profit >= 0 ? '+' : ''}${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Total: ${t.myPrize.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer" style={{ borderTop: '1px solid rgba(201, 168, 76, 0.15)' }}>
        Mostrando {filteredTournaments.length} de {tournaments.length} torneios
      </div>
    </div>
  )
}
