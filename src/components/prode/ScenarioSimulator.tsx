import React, { useState, useEffect } from 'react';
import type { Match, Prediction, UserProfile, LeaderboardUser } from '../../types';
import { calculatePoints, computeLeaderboard } from '../../services/scoringEngine';

interface ScenarioSimulatorProps {
  matches: Match[];
  allPredictions: Prediction[];
  users: UserProfile[];
  onRandomizeAllGhosts?: () => Promise<void>;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  matches,
  allPredictions,
  users,
  onRandomizeAllGhosts
}) => {
  const [isActive, setIsActive] = useState(false);
  const [simulatedMatches, setSimulatedMatches] = useState<Match[]>([]);
  const [simulatedLeaderboard, setSimulatedLeaderboard] = useState<LeaderboardUser[]>([]);
  const [realLeaderboard, setRealLeaderboard] = useState<LeaderboardUser[]>([]);

  // Calcular ranking real inicial para poder contrastar cambios posicionales
  useEffect(() => {
    const real = computeLeaderboard(users);
    setRealLeaderboard(real);
  }, [users]);

  // Inicializar estado del simulador con los partidos reales al activar
  useEffect(() => {
    if (isActive) {
      setSimulatedMatches(JSON.parse(JSON.stringify(matches))); // Clonar profundo
    } else {
      setSimulatedMatches([]);
      setSimulatedLeaderboard([]);
    }
  }, [isActive, matches]);

  // Recalcular el ranking simulado cada vez que cambien los partidos simulados
  useEffect(() => {
    if (!isActive || simulatedMatches.length === 0) return;

    // 1. Recalcular los puntos de cada usuario bajo el escenario hipotético
    const simulatedUsers: UserProfile[] = users.map((user) => {
      const userPreds = allPredictions.filter(p => p.userId === user.uid);
      let totalPoints = 0;
      let exactCount = 0;
      let outcomeCount = 0;

      userPreds.forEach((pred) => {
        // Encontrar el partido simulado correspondiente
        const simMatch = simulatedMatches.find(m => m.matchId === pred.matchId);
        
        // Si el partido simulado tiene marcador (real o ficticio), calculamos puntos
        if (simMatch && simMatch.status === 'played' && simMatch.homeScore !== undefined && simMatch.awayScore !== undefined) {
          const res = calculatePoints(
            pred.homePrediction, 
            pred.awayPrediction, 
            simMatch.homeScore, 
            simMatch.awayScore
          );
          totalPoints += res.points;
          if (res.points === 3) exactCount++;
          if (res.points === 1) outcomeCount++;
        }
      });

      return {
        ...user,
        points: totalPoints,
        exactMatchesCount: exactCount,
        outcomeMatchesCount: outcomeCount
      };
    });

    // 2. Ordenar y computar el leaderboard simulado
    const leaderboard = computeLeaderboard(simulatedUsers);
    setSimulatedLeaderboard(leaderboard);
  }, [isActive, simulatedMatches, allPredictions, users]);

  // Acción: Aleatorizar resultados de partidos pendientes
  const handleRandomize = () => {
    setSimulatedMatches((prevMatches) => {
      return prevMatches.map((match) => {
        if (match.status === 'pending') {
          const homeScore = Math.floor(Math.random() * 5); // 0 a 4 goles
          const awayScore = Math.floor(Math.random() * 5);
          return {
            ...match,
            status: 'played',
            homeScore,
            awayScore
          };
        }
        return match;
      });
    });
  };

  // Cambiar manualmente el marcador simulado de un partido
  const handleScoreChange = (matchId: string, side: 'home' | 'away', val: string) => {
    const score = parseInt(val, 10);
    if (isNaN(score) || score < 0) return;

    setSimulatedMatches((prevMatches) => {
      return prevMatches.map((match) => {
        if (match.matchId === matchId) {
          return {
            ...match,
            status: 'played',
            [side === 'home' ? 'homeScore' : 'awayScore']: score
          };
        }
        return match;
      });
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Botón de Activación & Alerta */}
      <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', border: isActive ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Simulador del Modo Escenario
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>
              Proyectá resultados de los partidos futuros y descubrí cómo afectaría la tabla del torneo.
            </p>
          </div>
          <button
            onClick={() => setIsActive(!isActive)}
            className="btn"
            style={{
              backgroundColor: isActive ? 'var(--accent-gold)' : 'var(--bg-overlay)',
              color: isActive ? 'var(--text-dark)' : 'var(--text-main)',
              border: '1px solid var(--border-light)',
              height: '45px',
              padding: '0 25px',
              borderRadius: '8px'
            }}
          >
            {isActive ? '🔴 Desactivar Simulador' : '🏆 Activar Simulador'}
          </button>
        </div>

        {isActive && (
          <div style={{
            backgroundColor: 'RGBA(212, 163, 89, 0.1)',
            border: '1px solid var(--accent-gold)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.5rem' }}>⚙️</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                El simulador está activo. Los cambios que digites acá son privados y no afectan a la base de datos de producción.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleRandomize}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', padding: '6px 14px', height: 'auto' }}
              >
                🎲 Aleatorizar Resultados Pendientes
              </button>
              {onRandomizeAllGhosts && (
                <button
                  onClick={async () => {
                    if (window.confirm('¿Estás seguro de que querés aleatorizar las predicciones de la FASE DE GRUPOS para TODOS los fantasmas de forma irreversible?')) {
                      await onRandomizeAllGhosts();
                    }
                  }}
                  className="btn"
                  style={{ 
                    fontSize: '0.85rem', 
                    padding: '6px 14px', 
                    height: 'auto', 
                    backgroundColor: 'RGBA(212, 163, 89, 0.1)', 
                    border: '1px solid var(--accent-gold)',
                    color: 'var(--accent-gold)',
                    fontWeight: 700
                  }}
                >
                  👻 Aleatorizar Fantasmas (Fase de Grupos)
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {isActive && simulatedMatches.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '25px', alignItems: 'start' }}>
          
          {/* Columna Izquierda: Listado de Partidos del Simulador */}
          <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px', marginBottom: '10px' }}>
              Marcadores del Escenario Ficticio
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
              {simulatedMatches.map((match) => (
                <div 
                  key={match.matchId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 15px',
                    backgroundColor: 'var(--bg-overlay)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--accent-gold)', minWidth: '60px' }}>
                    Gr. {match.group}
                  </span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'center' }}>
                    <span style={{ fontWeight: 500 }}>{match.homeTeam}</span>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      style={{ width: '40px', height: '32px', textAlign: 'center', padding: 0 }}
                      value={match.homeScore !== undefined ? match.homeScore : ''}
                      onChange={(e) => handleScoreChange(match.matchId, 'home', e.target.value)}
                      placeholder="-"
                    />
                    <span style={{ color: 'var(--text-muted)' }}>:</span>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      style={{ width: '40px', height: '32px', textAlign: 'center', padding: 0 }}
                      value={match.awayScore !== undefined ? match.awayScore : ''}
                      onChange={(e) => handleScoreChange(match.matchId, 'away', e.target.value)}
                      placeholder="-"
                    />
                    <span style={{ fontWeight: 500 }}>{match.awayTeam}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Columna Derecha: Leaderboard Simulado */}
          <div className="glass-panel" style={{ padding: '25px' }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px', marginBottom: '15px' }}>
              Tabla Posiciones Proyectada
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {simulatedLeaderboard.map((simUser, idx) => {
                // Encontrar la posición real del usuario para calcular el cambio
                const realUser = realLeaderboard.find(u => u.uid === simUser.uid);
                const realPos = realUser?.position || (idx + 1);
                const posChange = realPos - (idx + 1);

                return (
                  <div 
                    key={simUser.uid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, color: idx < 3 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                        {idx + 1}
                      </span>
                      <img 
                        src={simUser.photoURL} 
                        alt="" 
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border-light)' }} 
                      />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {simUser.displayName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '0.9rem' }}>
                        {simUser.points} pts
                      </span>
                      
                      {/* Badge de Cambio de Posición */}
                      {posChange > 0 && (
                        <span style={{ color: 'var(--accent-green)', fontWeight: 800, fontSize: '0.8rem' }}>
                          ▲{posChange}
                        </span>
                      )}
                      {posChange < 0 && (
                        <span style={{ color: 'var(--accent-error)', fontWeight: 800, fontSize: '0.8rem' }}>
                          ▼{Math.abs(posChange)}
                        </span>
                      )}
                      {posChange === 0 && (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.8rem' }}>
                          •
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
