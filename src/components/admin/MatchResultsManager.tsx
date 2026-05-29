import React, { useState, useEffect } from 'react';
import type { Match } from '../../types';

interface MatchResultsManagerProps {
  matches: Match[];
  onSaveResult: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
  loading: boolean;
}

export const MatchResultsManager: React.FC<MatchResultsManagerProps> = ({
  matches,
  onSaveResult,
  loading
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [homeScore, setHomeScore] = useState<number | ''>('');
  const [awayScore, setAwayScore] = useState<number | ''>('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  // Dividir partidos
  const pendingMatches = matches.filter((m) => m.status === 'pending');
  const playedMatches = matches.filter((m) => m.status === 'played');

  useEffect(() => {
    if (selectedMatch) {
      setHomeScore(selectedMatch.homeScore !== undefined ? selectedMatch.homeScore : '');
      setAwayScore(selectedMatch.awayScore !== undefined ? selectedMatch.awayScore : '');
    } else {
      setHomeScore('');
      setAwayScore('');
    }
    setLocalError(null);
    setLocalSuccess(null);
  }, [selectedMatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);

    if (!selectedMatch) return;

    if (homeScore === '' || awayScore === '') {
      setLocalError('Por favor, ingresá los goles de ambos equipos.');
      return;
    }

    const homeGoles = Number(homeScore);
    const awayGoles = Number(awayScore);

    if (homeGoles < 0 || awayGoles < 0) {
      setLocalError('La cantidad de goles no puede ser negativa.');
      return;
    }

    try {
      await onSaveResult(selectedMatch.matchId, homeGoles, awayGoles);
      setLocalSuccess(`¡Resultado cargado con éxito! Marcador: ${selectedMatch.homeTeam} ${homeGoles} - ${awayGoles} ${selectedMatch.awayTeam}`);
      setSelectedMatch(null); // Resetear
    } catch (err) {
      setLocalError('Ocurrió un error al intentar salvar el resultado. Por favor, reintentá.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '20px 0' }}>
      
      {/* Sección del Formulario superior para Cargar / Modificar */}
      {selectedMatch ? (
        <div className="glass-panel animate-fade-in" style={{ padding: '30px', border: '1px solid var(--border-active)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
            ⚽ {selectedMatch.status === 'played' ? 'Corregir Resultado' : 'Cargar Resultado Oficial'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '25px' }}>
            Ingresá el marcador final para **{selectedMatch.homeTeam} vs {selectedMatch.awayTeam}** ({selectedMatch.phase || 'Fase de grupos'} - {selectedMatch.group.startsWith('Llave') ? selectedMatch.group : `Grupo ${selectedMatch.group}`}). 
            Al guardar, se recalcularán masivamente todos los prodes y la tabla de posiciones en tiempo real.
          </p>

          {localError && (
            <div style={{ 
              backgroundColor: 'RGBA(239, 68, 68, 0.1)', 
              border: '1px solid var(--accent-error)', 
              color: 'var(--text-main)', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              fontSize: '0.9rem', 
              marginBottom: '20px'
            }}>
              ⚠️ {localError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '30px',
              padding: '20px 0',
              flexWrap: 'wrap'
            }}>
              {/* Equipo Local */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '150px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', textAlign: 'center' }}>
                  {selectedMatch.homeTeam}
                </span>
                <input 
                  type="number"
                  min="0"
                  max="20"
                  className="form-input"
                  style={{ 
                    width: '70px', 
                    fontSize: '1.5rem', 
                    textAlign: 'center', 
                    fontWeight: 700, 
                    height: '50px',
                    borderColor: 'var(--border-active)'
                  }}
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={loading}
                  required
                />
              </div>

              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-muted)' }}>:</span>

              {/* Equipo Visitante */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '150px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', textAlign: 'center' }}>
                  {selectedMatch.awayTeam}
                </span>
                <input 
                  type="number"
                  min="0"
                  max="20"
                  className="form-input"
                  style={{ 
                    width: '70px', 
                    fontSize: '1.5rem', 
                    textAlign: 'center', 
                    fontWeight: 700, 
                    height: '50px',
                    borderColor: 'var(--border-active)'
                  }}
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, height: '48px', fontWeight: 700 }}
                disabled={loading}
              >
                {loading ? 'Procesando Recálculo...' : 'Registrar Resultado y Recalcular Puntos'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setSelectedMatch(null)}
                style={{ 
                  padding: '0 20px', 
                  height: '48px', 
                  backgroundColor: 'var(--bg-overlay)', 
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-main)',
                  fontWeight: 600
                }}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '25px', textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem', marginBottom: '10px', display: 'block' }}>⚽</span>
          <h3 style={{ color: 'var(--text-main)', fontWeight: 700, margin: '0 0 8px 0' }}>
            Gestión de Marcadores Oficiales
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto' }}>
            Selecciona un partido del listado inferior para cargar su marcador final o modificar un resultado ya ingresado.
          </p>
        </div>
      )}

      {localSuccess && (
        <div style={{ 
          backgroundColor: 'RGBA(16, 185, 129, 0.1)', 
          border: '1px solid var(--accent-green)', 
          color: 'var(--text-main)', 
          padding: '12px 16px', 
          borderRadius: '8px', 
          fontSize: '0.9rem', 
          maxWidth: '800px',
          width: '100%',
          margin: '0 auto'
        }}>
          ✅ {localSuccess}
        </div>
      )}

      {/* Listados de Partidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        
        {/* Partidos Pendientes */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '15px' }}>
            ⏳ Partidos Pendientes ({pendingMatches.length})
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '500px', paddingRight: '5px' }}>
            {pendingMatches.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>
                No quedan partidos pendientes por jugar.
              </p>
            ) : (
              pendingMatches.map((match) => {
                const dateStr = new Date(match.date).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div 
                    key={match.matchId}
                    className="glass-panel"
                    style={{ 
                      padding: '15px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-overlay)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                          {match.phase ? match.phase.toUpperCase() : 'FASE DE GRUPOS'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {match.group.startsWith('Llave') ? match.group : `GRUPO ${match.group}`}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          • {dateStr}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                        {match.homeTeam} vs {match.awayTeam}
                      </div>
                      {match.stadium && match.city && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          📍 {match.stadium} ({match.city})
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedMatch(match)}
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', height: 'auto', alignSelf: 'center' }}
                      disabled={loading}
                    >
                      Cargar
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Partidos Jugados */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '15px' }}>
            ⚽ Partidos Jugados ({playedMatches.length})
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '500px', paddingRight: '5px' }}>
            {playedMatches.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>
                Aún no hay partidos jugados.
              </p>
            ) : (
              playedMatches.map((match) => {
                const dateStr = new Date(match.date).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div 
                    key={match.matchId}
                    className="glass-panel"
                    style={{ 
                      padding: '15px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-overlay)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                          {match.phase ? match.phase.toUpperCase() : 'FASE DE GRUPOS'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {match.group.startsWith('Llave') ? match.group : `GRUPO ${match.group}`}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          • {dateStr}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                        {match.homeTeam}{' '}
                        <span style={{ color: 'var(--accent-gold)', fontWeight: 800 }}>
                          {match.homeScore} - {match.awayScore}
                        </span>{' '}
                        {match.awayTeam}
                      </div>
                      {match.stadium && match.city && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          📍 {match.stadium} ({match.city})
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedMatch(match)}
                      className="btn"
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '0.8rem', 
                        borderRadius: '6px', 
                        height: 'auto',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                        alignSelf: 'center'
                      }}
                      disabled={loading}
                    >
                      Corregir
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
