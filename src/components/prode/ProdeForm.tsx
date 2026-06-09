import React, { useState, useEffect } from 'react';
import type { Match, Prediction, UserProfile } from '../../types';

interface ProdeFormProps {
  matches: Match[];
  predictions: Prediction[];
  onSavePrediction: (matchId: string, homePrediction: number, awayPrediction: number) => Promise<void>;
  onClearPrediction?: (matchId: string) => Promise<void>;
  savingMatchId: string | null;
  user: UserProfile | null;
  onSealProde?: () => Promise<void>;
  tournamentModality?: 'exact' | 'simple';
  onSaveSimplePrediction?: (matchId: string, outcome: 'home' | 'away' | 'draw') => Promise<void>;
  isTournamentParticipantCompleted?: boolean;
}

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const ProdeForm: React.FC<ProdeFormProps> = ({
  matches,
  predictions,
  onSavePrediction,
  onClearPrediction,
  savingMatchId,
  user,
  onSealProde,
  tournamentModality = 'exact',
  onSaveSimplePrediction,
  isTournamentParticipantCompleted
}) => {
  const [viewType, setViewType] = useState<'group' | 'date'>('group');
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [inputStates, setInputStates] = useState<Record<string, { home: string; away: string }>>({});
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [sealingLoading, setSealingLoading] = useState(false);

  // Filtrar solo los partidos de la Fase de grupos para el prode (primeros 72 partidos)
  const groupStageMatches = matches.filter(m => m.phase === 'Fase de grupos');

  // Sincronizar predicciones existentes en el estado local de los inputs
  useEffect(() => {
    const states: Record<string, { home: string; away: string }> = {};
    groupStageMatches.forEach((match) => {
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

  const getFormattedDateKey = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  // Agrupamiento por fechas (exclusivo fase de grupos)
  const matchesByDate: Record<string, Match[]> = {};
  const dateKeys: string[] = [];

  if (viewType === 'date') {
    const sorted = [...groupStageMatches].sort((a, b) => a.date - b.date);
    sorted.forEach((m) => {
      const key = getFormattedDateKey(m.date);
      if (!matchesByDate[key]) {
        matchesByDate[key] = [];
        dateKeys.push(key);
      }
      matchesByDate[key].push(m);
    });
  }

  // Auto-expandir las primeras fechas por defecto
  useEffect(() => {
    if (viewType === 'date' && dateKeys.length > 0) {
      const initial: Record<string, boolean> = {};
      dateKeys.slice(0, 3).forEach(key => {
        initial[key] = true;
      });
      setExpandedDates(prev => ({
        ...initial,
        ...prev
      }));
    }
  }, [viewType]);

  const toggleDate = (dateKey: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  const groupMatches = groupStageMatches.filter((m) => {
    return m.group === selectedGroup && m.phase === 'Fase de grupos';
  });

  const totalMatchesCount = groupStageMatches.length;
  // Solo contar predicciones de partidos que pertenezcan a la fase de grupos y tengan valor según modalidad
  const predictedCount = predictions.filter(p => {
    const isStageMatch = groupStageMatches.some(m => m.matchId === p.matchId);
    if (!isStageMatch) return false;
    return tournamentModality === 'simple' 
      ? p.predictionOutcome !== undefined 
      : (p.homePrediction !== undefined && p.awayPrediction !== undefined);
  }).length;
  const isAllPredicted = totalMatchesCount > 0 && predictedCount >= totalMatchesCount;

  const handleSealClick = async () => {
    if (!acceptTerms || !onSealProde) return;
    setSealingLoading(true);
    try {
      await onSealProde();
    } catch (err) {
      console.error(err);
    } finally {
      setSealingLoading(false);
    }
  };

  // Renderizador de tarjeta de partido individual
  const renderMatchCard = (match: Match) => {
    const matchDate = new Date(match.date);
    const state = inputStates[match.matchId] || { home: '', away: '' };
    const pred = predictions.find((p) => p.matchId === match.matchId);
    const isLocked = match.status === 'played' || (isTournamentParticipantCompleted !== undefined ? isTournamentParticipantCompleted === true : user?.completedProde === true);

    return (
      <div
        key={match.matchId}
        className="premium-card"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          gap: '20px',
          flexWrap: 'wrap',
          border: isLocked ? '1px solid RGBA(255,255,255,0.05)' : '1px solid RGBA(255,255,255,0.1)'
        }}
      >
        {/* Información del Partido */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '220px', flexShrink: 0 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {matchDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {matchDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} HS
          </span>
          {match.stadium && match.city && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px', whiteSpace: 'normal', lineHeight: 1.3 }}>
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
        {tournamentModality === 'simple' ? (
          <div style={{
            display: 'flex',
            gap: '10px',
            flex: 1,
            minWidth: '280px',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* Botón Local */}
            <button
              disabled={isLocked || savingMatchId === match.matchId}
              onClick={async () => onSaveSimplePrediction && await onSaveSimplePrediction(match.matchId, 'home')}
              className="btn"
              title={`Ganador: ${match.homeTeam}`}
              style={{
                flex: 1,
                padding: '10px 15px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                transition: 'all 0.25s ease',
                backgroundColor: pred?.predictionOutcome === 'home'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : pred?.predictionOutcome
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'var(--bg-overlay)',
                border: pred?.predictionOutcome === 'home'
                  ? '2px solid var(--accent-green)'
                  : pred?.predictionOutcome
                  ? '1px solid rgba(239, 68, 68, 0.3)'
                  : '1px solid var(--border-light)',
                color: pred?.predictionOutcome === 'home'
                  ? 'var(--accent-green)'
                  : pred?.predictionOutcome
                  ? 'var(--accent-error)'
                  : 'var(--text-main)',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                height: '42px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {match.homeTeam}
            </button>

            {/* Botón Empate */}
            <button
              disabled={isLocked || savingMatchId === match.matchId}
              onClick={async () => onSaveSimplePrediction && await onSaveSimplePrediction(match.matchId, 'draw')}
              className="btn"
              title="Empate"
              style={{
                flex: 1,
                padding: '10px 15px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                transition: 'all 0.25s ease',
                backgroundColor: pred?.predictionOutcome === 'draw'
                  ? 'rgba(212, 163, 89, 0.2)'
                  : pred?.predictionOutcome
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'var(--bg-overlay)',
                border: pred?.predictionOutcome === 'draw'
                  ? '2px solid var(--accent-gold)'
                  : pred?.predictionOutcome
                  ? '1px solid rgba(239, 68, 68, 0.3)'
                  : '1px solid var(--border-light)',
                color: pred?.predictionOutcome === 'draw'
                  ? 'var(--accent-gold)'
                  : pred?.predictionOutcome
                  ? 'var(--accent-error)'
                  : 'var(--text-main)',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                height: '42px'
              }}
            >
              Empate
            </button>

            {/* Botón Visitante */}
            <button
              disabled={isLocked || savingMatchId === match.matchId}
              onClick={async () => onSaveSimplePrediction && await onSaveSimplePrediction(match.matchId, 'away')}
              className="btn"
              title={`Ganador: ${match.awayTeam}`}
              style={{
                flex: 1,
                padding: '10px 15px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                transition: 'all 0.25s ease',
                backgroundColor: pred?.predictionOutcome === 'away'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : pred?.predictionOutcome
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'var(--bg-overlay)',
                border: pred?.predictionOutcome === 'away'
                  ? '2px solid var(--accent-green)'
                  : pred?.predictionOutcome
                  ? '1px solid rgba(239, 68, 68, 0.3)'
                  : '1px solid var(--border-light)',
                color: pred?.predictionOutcome === 'away'
                  ? 'var(--accent-green)'
                  : pred?.predictionOutcome
                  ? 'var(--accent-error)'
                  : 'var(--text-main)',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                height: '42px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {match.awayTeam}
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '15px',
            flex: 1,
            minWidth: '280px'
          }}>
            {/* Equipo Local */}
            <div style={{ textAlign: 'right', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
              <span style={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                maxWidth: '220px' 
              }} title={match.homeTeam}>
                {match.homeTeam}
              </span>
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
                  backgroundColor: isLocked ? 'var(--border-light)' : 'var(--bg-overlay)'
                }}
                placeholder="-"
                value={state.home}
                onChange={(e) => handleInputChange(match.matchId, 'home', e.target.value)}
                onBlur={() => handleBlur(match.matchId)}
                disabled={isLocked || savingMatchId === match.matchId}
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
                  backgroundColor: isLocked ? 'var(--border-light)' : 'var(--bg-overlay)'
                }}
                placeholder="-"
                value={state.away}
                onChange={(e) => handleInputChange(match.matchId, 'away', e.target.value)}
                onBlur={() => handleBlur(match.matchId)}
                disabled={isLocked || savingMatchId === match.matchId}
              />
            </div>

            <div style={{ textAlign: 'left', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
              <span style={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                maxWidth: '220px' 
              }} title={match.awayTeam}>
                {match.awayTeam}
              </span>
            </div>
          </div>
        )}

        {/* Status de Guardado / Aciertos */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '130px', flexShrink: 0 }}>
          {savingMatchId === match.matchId && (
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>💾 Guardando...</span>
          )}
          {pred && (pred.predictionOutcome !== undefined || pred.homePrediction !== undefined) && savingMatchId !== match.matchId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600 }}>✅ Guardado</span>
              {!isLocked && (
                <button
                  onClick={async () => {
                    if (onClearPrediction) {
                      await onClearPrediction(match.matchId);
                      setInputStates(prev => {
                        const next = { ...prev };
                        delete next[match.matchId];
                        return next;
                      });
                    }
                  }}
                  title="Borrar pronóstico"
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  ✕
                </button>
              )}
            </div>
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
              {tournamentModality === 'simple'
                ? (pred.pointsEarned === 1 ? 'Acierto (+1)' : '0 pts')
                : (pred.pointsEarned === 3 ? 'Exacto (+3)' : pred.pointsEarned === 1 ? 'Acierto (+1)' : '0 pts')}
            </div>
          )}

          {match.status === 'played' && !pred && (
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-error)' }}>Sin pronóstico</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* Banner de Sellar Prode */}
      {isAllPredicted && !(isTournamentParticipantCompleted !== undefined ? isTournamentParticipantCompleted : user?.completedProde) && (
        <div className="glass-panel animate-fade-in" style={{
          padding: '25px',
          border: '2px solid var(--accent-gold)',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          backgroundColor: 'RGBA(212, 163, 89, 0.05)',
          borderRadius: '12px'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔒 ¡Prode 100% Completado! Hora de Sellar tus Predicciones
          </h3>
          <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            Felicitaciones, completaste los 72 pronósticos de la Fase de grupos del torneo. Para validar tu participación, debés sellar tu prode. Una vez sellado, **no podrás realizar modificaciones a tus predicciones nunca más**.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-main)' }}>
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span>Comprendo que al sellar mi prode ya no podré alterar ninguna de mis predicciones.</span>
          </label>
          <button
            onClick={handleSealClick}
            className="btn btn-primary"
            style={{
              height: '45px',
              fontWeight: 700,
              backgroundColor: acceptTerms ? 'var(--accent-gold)' : 'var(--bg-overlay)',
              color: acceptTerms ? 'var(--text-dark)' : 'var(--text-muted)',
              border: acceptTerms ? 'none' : '1px solid var(--border-light)',
              cursor: acceptTerms ? 'pointer' : 'not-allowed',
              alignSelf: 'flex-start',
              padding: '0 25px',
              borderRadius: '8px'
            }}
            disabled={!acceptTerms || sealingLoading}
          >
            {sealingLoading ? 'Sellando...' : '🔒 Sellar mi Prode Definitivamente'}
          </button>
        </div>
      )}

      {(isTournamentParticipantCompleted !== undefined ? isTournamentParticipantCompleted : user?.completedProde) && (
        <div className="glass-panel" style={{
          padding: '15px 25px',
          border: '1px solid var(--accent-green)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'RGBA(16, 185, 129, 0.05)',
          borderRadius: '12px'
        }}>
          <span style={{ fontSize: '1.5rem' }}>🔒</span>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-green)', margin: '0 0 2px 0' }}>
              Prode Sellado y Confirmado
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              Tus predicciones están guardadas de forma segura y bloqueadas contra modificaciones. ¡Mucha suerte en el torneo!
            </p>
          </div>
        </div>
      )}

      {/* Selector de Modo de Visualización */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Progreso total: <strong>{predictedCount} de {totalMatchesCount}</strong> partidos pronosticados
        </span>
        <div className="glass-panel" style={{ padding: '4px', display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setViewType('group')}
            className="btn"
            style={{
              padding: '6px 12px',
              fontSize: '0.8rem',
              borderRadius: '6px',
              backgroundColor: viewType === 'group' ? 'var(--border-light)' : 'transparent',
              color: viewType === 'group' ? 'var(--accent-gold)' : 'var(--text-muted)',
              fontWeight: 600
            }}
          >
            📂 Por Grupo
          </button>
          <button
            onClick={() => setViewType('date')}
            className="btn"
            style={{
              padding: '6px 12px',
              fontSize: '0.8rem',
              borderRadius: '6px',
              backgroundColor: viewType === 'date' ? 'var(--border-light)' : 'transparent',
              color: viewType === 'date' ? 'var(--accent-gold)' : 'var(--text-muted)',
              fontWeight: 600
            }}
          >
            📅 Por Fecha
          </button>
        </div>
      </div>

      {/* Vista de Grupos */}
      {viewType === 'group' && (
        <>
          <div className="hide-scrollbar" style={{ 
            overflowX: 'auto', 
            display: 'flex', 
            gap: '8px', 
            padding: '4px 0 16px 0',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>
            {GROUPS.map((g) => {
              // Contar cuántos partidos de este grupo ya predijo el usuario
              const groupMatchIds = groupStageMatches.filter(m => {
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
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    backgroundColor: selectedGroup === g ? 'var(--accent-gold)' : 'var(--bg-overlay)',
                    color: selectedGroup === g ? 'var(--text-dark)' : 'var(--text-main)',
                    border: '1px solid',
                    borderColor: selectedGroup === g ? 'var(--accent-gold)' : 'var(--border-light)',
                    whiteSpace: 'nowrap',
                    position: 'relative',
                    boxShadow: selectedGroup === g ? '0 4px 12px RGBA(212, 163, 89, 0.2)' : 'none',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  Grupo {g}
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
            {groupMatches.map((match) => renderMatchCard(match))}
          </div>
        </>
      )}

      {/* Vista de Fechas */}
      {viewType === 'date' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {dateKeys.map((dateKey) => {
            const dateMatches = matchesByDate[dateKey];
            const isExpanded = expandedDates[dateKey] || false;

            // Contar pronosticados en esta fecha
            const dateMatchIds = dateMatches.map(m => m.matchId);
            const predictedInDate = predictions.filter(p => dateMatchIds.includes(p.matchId)).length;
            const isDateCompleted = predictedInDate >= dateMatches.length;

            return (
              <div key={dateKey} className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                {/* Cabecera de la Fecha */}
                <div
                  onClick={() => toggleDate(dateKey)}
                  style={{
                    padding: '18px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-overlay)',
                    borderBottom: isExpanded ? '1px solid var(--border-light)' : 'none',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'capitalize' }}>
                      📅 {dateKey}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      backgroundColor: isDateCompleted ? 'RGBA(16, 185, 129, 0.15)' : 'var(--border-light)',
                      color: isDateCompleted ? 'var(--accent-green)' : 'var(--text-muted)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 600
                    }}>
                      {predictedInDate} / {dateMatches.length} Pronosticados
                    </span>
                  </div>
                  <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>

                {/* Partidos de la Fecha */}
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', padding: '15px', gap: '12px' }}>
                    {dateMatches.map((match) => renderMatchCard(match))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
