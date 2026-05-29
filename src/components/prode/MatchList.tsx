import React, { useState, useEffect } from 'react';
import type { Match } from '../../types';

interface MatchListProps {
  matches: Match[];
  isAdmin: boolean;
  onEditMatch?: (match: Match) => void;
}

const GROUPS = ['Todos', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const MatchList: React.FC<MatchListProps> = ({
  matches,
  isAdmin,
  onEditMatch
}) => {
  const [selectedGroup, setSelectedGroup] = useState('Todos');
  const [activeMonth, setActiveMonth] = useState<5 | 6>(5); // 5 = Junio, 6 = Julio (2026)

  // Obtener los días de la grilla mensual para Junio (5) o Julio (6) de 2026
  const getDaysInMonthGrid = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Domingo
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: ({ day: number; date: Date } | null)[] = [];
    
    // Rellenar con nulos para los días vacíos del principio de la semana
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    
    // Rellenar con los días reales del mes
    for (let d = 1; d <= totalDays; d++) {
      days.push({
        day: d,
        date: new Date(year, month, d)
      });
    }
    
    return days;
  };

  const daysGrid = getDaysInMonthGrid(2026, activeMonth);

  const getMatchesForDate = (date: Date) => {
    return matches.filter((m) => {
      const matchDate = new Date(m.date);
      return (
        matchDate.getDate() === date.getDate() &&
        matchDate.getMonth() === date.getMonth() &&
        matchDate.getFullYear() === date.getFullYear()
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* Barra de Filtros de Grupos */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <span className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Destacar partidos por Grupo (el resto se atenuará en gris):
          </span>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
            {GROUPS.map((group) => (
              <button
                key={group}
                onClick={() => setSelectedGroup(group)}
                className="btn"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  backgroundColor: selectedGroup === group ? 'var(--accent-gold)' : 'var(--bg-overlay)',
                  color: selectedGroup === group ? 'var(--text-dark)' : 'var(--text-main)',
                  border: '1px solid var(--border-light)',
                  whiteSpace: 'nowrap',
                  fontWeight: 600
                }}
              >
                {group === 'Todos' ? group : `Grupo ${group}`}
              </button>
            ))}
          </div>
        </div>

        {/* Selector de Mes */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '10px' }}>Seleccionar Mes:</span>
          <button
            onClick={() => setActiveMonth(5)}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              borderRadius: '6px',
              backgroundColor: activeMonth === 5 ? 'var(--border-light)' : 'transparent',
              borderColor: activeMonth === 5 ? 'var(--border-active)' : 'var(--border-light)',
              borderWidth: '1px',
              borderStyle: 'solid',
              color: activeMonth === 5 ? 'var(--accent-gold)' : 'var(--text-muted)',
              fontWeight: 600
            }}
          >
            📅 Junio 2026
          </button>
          <button
            onClick={() => setActiveMonth(6)}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              borderRadius: '6px',
              backgroundColor: activeMonth === 6 ? 'var(--border-light)' : 'transparent',
              borderColor: activeMonth === 6 ? 'var(--border-active)' : 'var(--border-light)',
              borderWidth: '1px',
              borderStyle: 'solid',
              color: activeMonth === 6 ? 'var(--accent-gold)' : 'var(--text-muted)',
              fontWeight: 600
            }}
          >
            📅 Julio 2026
          </button>
        </div>
      </div>

      {/* Vista de Calendario Mensual (Tabla Clásica) */}
      <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 5px 0' }}>
          🏆 Fixture Mensual: {activeMonth === 5 ? 'Junio 2026' : 'Julio 2026'}
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '900px' }}>
            
            {/* Cabecera de Días de la Semana */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, 1fr)', 
              textAlign: 'center', 
              fontWeight: 700, 
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              marginBottom: '10px',
              paddingBottom: '10px',
              borderBottom: '1px solid var(--border-light)'
            }}>
              {WEEKDAYS.map(day => (
                <div key={day} style={{ padding: '5px 0' }}>{day}</div>
              ))}
            </div>

            {/* Grilla de Días Mensuales */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, 1fr)', 
              gap: '10px'
            }}>
              {daysGrid.map((dayData, idx) => {
                if (!dayData) {
                  return (
                    <div 
                      key={`empty-${idx}`} 
                      style={{ 
                        minHeight: '140px', 
                        backgroundColor: 'transparent',
                        borderRadius: '8px'
                      }}
                    />
                  );
                }

                const dayMatches = getMatchesForDate(dayData.date);
                const hasMatches = dayMatches.length > 0;
                
                // Determinar si es hoy en el calendario mundial (ej. simulado)
                const isMatchDay = hasMatches;

                return (
                  <div 
                    key={`day-${dayData.day}`}
                    style={{ 
                      minHeight: '140px', 
                      backgroundColor: 'var(--bg-overlay)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      overflowY: 'auto'
                    }}
                  >
                    {/* Número del día */}
                    <div style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: 700, 
                      color: isMatchDay ? 'var(--accent-gold)' : 'var(--text-muted)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{dayData.day}</span>
                      {hasMatches && (
                        <span style={{ 
                          fontSize: '0.65rem', 
                          backgroundColor: 'var(--border-light)', 
                          padding: '1px 5px', 
                          borderRadius: '4px',
                          color: 'var(--text-muted)'
                        }}>
                          {dayMatches.length} partidos
                        </span>
                      )}
                    </div>

                    {/* Partidos programados en este día */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      {dayMatches.map((match) => {
                        const isHighlighted = selectedGroup === 'Todos' || match.group === selectedGroup;
                        const matchDate = new Date(match.date);
                        const isEliminatoria = match.phase && match.phase !== 'Fase de grupos';

                        return (
                          <div
                            key={match.matchId}
                            onClick={() => isAdmin && onEditMatch?.(match)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              backgroundColor: isHighlighted ? 'RGBA(212, 163, 89, 0.08)' : 'RGBA(255, 255, 255, 0.02)',
                              border: isHighlighted 
                                ? (isEliminatoria ? '1px solid var(--accent-blue)' : '1px solid var(--accent-gold)') 
                                : '1px solid var(--border-light)',
                              color: isHighlighted ? 'var(--text-main)' : 'var(--text-muted)',
                              opacity: isHighlighted ? 1 : 0.35,
                              filter: isHighlighted ? 'none' : 'grayscale(100%)',
                              transition: 'all 0.3s ease',
                              cursor: isAdmin ? 'pointer' : 'default',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              boxShadow: isHighlighted ? 'var(--shadow-sm)' : 'none'
                            }}
                            title={isAdmin ? `Click para editar resultado de ${match.homeTeam} vs ${match.awayTeam}` : undefined}
                          >
                            <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              <strong>{match.homeTeam}</strong> vs <strong>{match.awayTeam}</strong>
                            </div>
                            
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              fontSize: '0.62rem', 
                              color: isHighlighted 
                                ? (isEliminatoria ? 'var(--accent-blue)' : 'var(--accent-gold)') 
                                : 'var(--text-muted)' 
                            }}>
                              <span>
                                🕒 {matchDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} HS
                              </span>
                              <span>
                                {isEliminatoria ? '🏆 Llave' : `Grupo ${match.group}`}
                              </span>
                            </div>

                            {match.status === 'played' && (
                              <div style={{ 
                                marginTop: '2px',
                                fontSize: '0.68rem',
                                color: 'var(--accent-green)',
                                fontWeight: 700,
                                textAlign: 'center',
                                backgroundColor: 'RGBA(16, 185, 129, 0.08)',
                                padding: '1px 0',
                                borderRadius: '4px'
                              }}>
                                Score: {match.homeScore} - {match.awayScore}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};
