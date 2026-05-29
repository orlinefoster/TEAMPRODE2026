import React, { useState, useEffect } from 'react';
import type { Match, Prediction } from '../../types';

interface ProdeFormProps {
  matches: Match[];
  predictions: Prediction[];
  onSavePrediction: (matchId: string, homePrediction: number, awayPrediction: number) => Promise<void>;
  savingMatchId: string | null;
  savedMatchId: string | null;
}

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'Eliminatorias'];

export const ProdeForm: React.FC<ProdeFormProps> = ({
  matches,
  predictions,
  onSavePrediction,
  savingMatchId,
  savedMatchId
}) => {
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [inputStates, setInputStates] = useState<Record<string, { home: string; away: string }>>({});

  // Sincronizar predicciones existentes en el estado local de los inputs
  useEffect(() => {
    const states: Record<string, { home: string; away: string }> = {};
    matches.forEach((match) => {
      const pred = predictions.find((p) => p.matchId === match.matchId);
      states[match.matchId] = {
        home: pred !== undefined ? String(pred.homePrediction) : '',
        away: pred !== undefined ? String(pred.awayPrediction) : ''
      };
    });
    setInputStates(states);
  }, [matches, predictions]);

  const handleInputChange = (matchId: string, side: 'home' | 'away', value: string) => {
    setInputStates((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side]: value
      }
    }));
  };

  const handleBlur = async (matchId: string) => {
    const state = inputStates[matchId];
    if (!state) return;

    const homeVal = parseInt(state.home, 10);
    const awayVal = parseInt(state.away, 10);

    // Solo guardar si ambos campos tienen valores numéricos válidos
    if (isNaN(homeVal) || isNaN(awayVal) || homeVal < 0 || awayVal < 0) {
      return;
    }

    // Buscar si ya existía una predicción idéntica guardada
    const existing = predictions.find(p => p.matchId === matchId);
    if (existing && existing.homePrediction === homeVal && existing.awayPrediction === awayVal) {
      return; // No re-guardar si no cambió
    }

    await onSavePrediction(matchId, homeVal, awayVal);
  };

  const groupMatches = matches.filter((m) => {
    if (selectedGroup === 'Eliminatorias') {
      return m.phase && m.phase !== 'Fase de grupos';
    }
    return m.group === selectedGroup && m.phase === 'Fase de grupos';
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      {/* Pestañas de Grupos */}
      <div className="glass-panel" style={{ padding: '15px 20px', overflowX: 'auto', display: 'flex', gap: '8px' }}>
        {GROUPS.map((g) => {
          // Contar cuántos partidos de este grupo ya predijo el usuario
          const groupMatchIds = matches.filter(m => {
            if (g === 'Eliminatorias') {
              return m.phase && m.phase !== 'Fase de grupos';
            }
            return m.group === g && m.phase === 'Fase de grupos';
          }).map(m => m.matchId);
          
          const predictedInGroup = predictions.filter(p => groupMatchIds.includes(p.matchId)).length;
          const isGroupCompleted = groupMatchIds.length > 0 && predictedInGroup >= groupMatchIds.length;

          return (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className="btn"
              style={{
                padding: '8px 16px',
                fontSize: '0.9rem',
                borderRadius: '8px',
                backgroundColor: selectedGroup === g ? 'var(--accent-gold)' : 'var(--bg-overlay)',
                color: selectedGroup === g ? 'var(--text-dark)' : 'var(--text-main)',
                border: '1px solid',
                borderColor: selectedGroup === g ? 'var(--accent-gold)' : 'var(--border-light)',
                whiteSpace: 'nowrap',
                position: 'relative'
              }}
            >
              {g === 'Eliminatorias' ? g : `Grupo ${g}`}
              {isGroupCompleted && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  backgroundColor: 'var(--accent-green)',
                  color: 'var(--text-main)',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lista de Partidos del Grupo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {groupMatches.map((match) => {
          const matchDate = new Date(match.date);
          const state = inputStates[match.matchId] || { home: '', away: '' };
          const pred = predictions.find((p) => p.matchId === match.matchId);

          return (
            <div
              key={match.matchId}
              className="premium-card"
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                gap: '20px',
                flexWrap: 'wrap'
              }}
            >
              {/* Información del Partido */}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: '150px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {matchDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {matchDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} HS
                </span>
                {match.stadium && match.city && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    📍 {match.stadium}, {match.city}
                  </span>
                )}
                {match.status === 'played' && (
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    Resultado real: <strong>{match.homeScore} - {match.awayScore}</strong>
                  </span>
                )}
              </div>

              {/* Controles de Pronóstico */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                flex: 1,
                justifyContent: 'center',
                minWidth: '320px'
              }}>
                {/* Equipo Local */}
                <div style={{ flex: 2, textAlign: 'right', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                  <span>{match.homeTeam}</span>
                  <span>🏳️</span>
                </div>

                {/* Inputs de Predicción */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    style={{
                      width: '50px',
                      height: '42px',
                      textAlign: 'center',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      padding: 0,
                      backgroundColor: match.status === 'played' ? 'var(--border-light)' : 'var(--bg-overlay)'
                    }}
                    placeholder="-"
                    value={state.home}
                    onChange={(e) => handleInputChange(match.matchId, 'home', e.target.value)}
                    onBlur={() => handleBlur(match.matchId)}
                    disabled={match.status === 'played' || savingMatchId === match.matchId}
                  />

                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>:</span>

                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    style={{
                      width: '50px',
                      height: '42px',
                      textAlign: 'center',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      padding: 0,
                      backgroundColor: match.status === 'played' ? 'var(--border-light)' : 'var(--bg-overlay)'
                    }}
                    placeholder="-"
                    value={state.away}
                    onChange={(e) => handleInputChange(match.matchId, 'away', e.target.value)}
                    onBlur={() => handleBlur(match.matchId)}
                    disabled={match.status === 'played' || savingMatchId === match.matchId}
                  />
                </div>

                {/* Equipo Visitante */}
                <div style={{ flex: 2, textAlign: 'left', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                  <span>🏳️</span>
                  <span>{match.awayTeam}</span>
                </div>
              </div>

              {/* Status de Guardado / Aciertos */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '100px' }}>
                {savingMatchId === match.matchId && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>💾 Guardando...</span>
                )}
                {savedMatchId === match.matchId && savingMatchId !== match.matchId && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 600 }}>✅ Guardado</span>
                )}
                
                {match.status === 'played' && pred && pred.pointsEarned !== undefined && (
                  <div style={{
                    backgroundColor: 
                      pred.pointsEarned === 3 
                        ? 'RGBA(16, 185, 129, 0.15)' 
                        : pred.pointsEarned === 1 
                        ? 'RGBA(212, 163, 89, 0.15)' 
                        : 'RGBA(239, 68, 68, 0.05)',
                    border: '1px solid',
                    borderColor:
                      pred.pointsEarned === 3 
                        ? 'var(--accent-green)' 
                        : pred.pointsEarned === 1 
                        ? 'var(--accent-gold)' 
                        : 'var(--border-light)',
                    color: 
                      pred.pointsEarned === 3 
                        ? 'var(--accent-green)' 
                        : pred.pointsEarned === 1 
                        ? 'var(--accent-gold)' 
                        : 'var(--text-muted)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.8rem'
                  }}>
                    {pred.pointsEarned === 3 ? 'Exacto (+3)' : pred.pointsEarned === 1 ? 'Acierto (+1)' : '0 pts'}
                  </div>
                )}

                {match.status === 'played' && !pred && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-error)' }}>Sin pronóstico</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
