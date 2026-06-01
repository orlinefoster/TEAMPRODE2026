import React, { useState } from 'react';
import type { Match } from '../../types';

interface MatchListProps {
  matches: Match[];
  isAdmin: boolean;
  onEditMatch?: (match: Match) => void;
}

const GROUPS = ['Todos', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const WEEKS = [
  { label: 'Semana 1: 11 - 17 Jun', start: new Date(2026, 5, 11), end: new Date(2026, 5, 17) },
  { label: 'Semana 2: 18 - 24 Jun', start: new Date(2026, 5, 18), end: new Date(2026, 5, 24) },
  { label: 'Semana 3: 25 Jun - 01 Jul', start: new Date(2026, 5, 25), end: new Date(2026, 6, 1) },
  { label: 'Semana 4: 02 - 08 Jul', start: new Date(2026, 6, 2), end: new Date(2026, 6, 8) },
  { label: 'Semana 5: 09 - 15 Jul', start: new Date(2026, 6, 9), end: new Date(2026, 6, 15) },
  { label: 'Semana 6: 16 - 19 Jul', start: new Date(2026, 6, 16), end: new Date(2026, 6, 19) }
];

const TIME_SLOTS = [
  { label: '13:00', hour: 13 },
  { label: '14:00', hour: 14 },
  { label: '15:00', hour: 15 },
  { label: '16:00', hour: 16 },
  { label: '17:00', hour: 17 },
  { label: '18:00', hour: 18 },
  { label: '19:00', hour: 19 },
  { label: '20:00', hour: 20 },
  { label: '21:00', hour: 21 },
  { label: '22:00', hour: 22 }
];

export const MatchList: React.FC<MatchListProps> = ({
  matches,
  isAdmin,
  onEditMatch
}) => {
  const [selectedGroup, setSelectedGroup] = useState('Todos');
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [activeMonth, setActiveMonth] = useState<5 | 6>(5); // 5 = Junio, 6 = Julio (2026)
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 a 5

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

  const getDaysInSelectedWeek = (weekIndex: number) => {
    const week = WEEKS[weekIndex];
    const days: Date[] = [];
    const current = new Date(week.start);
    while (current <= week.end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const weekDaysList = getDaysInSelectedWeek(selectedWeek);

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

  const getMatchesForDayAndHour = (date: Date, hour: number) => {
    return matches.filter((m) => {
      const matchDate = new Date(m.date);
      return (
        matchDate.getDate() === date.getDate() &&
        matchDate.getMonth() === date.getMonth() &&
        matchDate.getFullYear() === date.getFullYear() &&
        matchDate.getHours() === hour
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* Barra de Filtros y Configuración de Vista */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Selector de Modo de Vista */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              📅 Calendario del Torneo
            </h3>
          </div>

          <div className="glass-panel" style={{ padding: '4px', display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setViewMode('monthly')}
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                backgroundColor: viewMode === 'monthly' ? 'var(--border-light)' : 'transparent',
                color: viewMode === 'monthly' ? 'var(--accent-gold)' : 'var(--text-muted)',
                fontWeight: 600
              }}
            >
              📅 Vista Mensual
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                backgroundColor: viewMode === 'weekly' ? 'var(--border-light)' : 'transparent',
                color: viewMode === 'weekly' ? 'var(--accent-gold)' : 'var(--text-muted)',
                fontWeight: 600
              }}
            >
              🕒 Vista Semanal
            </button>
          </div>
        </div>

        {/* Destacador por Grupo */}
        <div>
          <span className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Destacar partidos por Grupo:
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

        {/* selectores específicos de fecha/semana según modo */}
        {viewMode === 'monthly' ? (
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
              Junio 2026
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
              Julio 2026
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '10px' }}>Seleccionar Semana:</span>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px', flex: 1 }}>
              {WEEKS.map((week, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedWeek(idx)}
                  className="btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    borderRadius: '6px',
                    backgroundColor: selectedWeek === idx ? 'var(--border-light)' : 'var(--bg-overlay)',
                    color: selectedWeek === idx ? 'var(--accent-gold)' : 'var(--text-muted)',
                    border: '1px solid var(--border-light)',
                    whiteSpace: 'nowrap',
                    fontWeight: 600
                  }}
                >
                  {week.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Renderizado Condicional: Vista Mensual */}
      {viewMode === 'monthly' && (
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 5px 0' }}>
            🏆 Fixture Mensual: {activeMonth === 5 ? 'Junio 2026' : 'Julio 2026'}
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '900px' }}>
              
              {/* Cabecera de Días */}
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

              {/* Grilla mensual */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)', 
                gap: '10px'
              }}>
                {daysGrid.map((dayData, idx) => {
                  if (!dayData) {
                    return <div key={`empty-${idx}`} style={{ minHeight: '140px', backgroundColor: 'transparent' }} />;
                  }

                  const dayMatches = getMatchesForDate(dayData.date);

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
                      <div style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 700, 
                        color: dayMatches.length > 0 ? 'var(--accent-gold)' : 'var(--text-muted)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>{dayData.day}</span>
                        {dayMatches.length > 0 && (
                          <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--border-light)', padding: '1px 5px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                            {dayMatches.length} partidos
                          </span>
                        )}
                      </div>

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
                                gap: '2px'
                              }}
                            >
                              <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                <strong>{match.homeTeam}</strong> vs <strong>{match.awayTeam}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: isHighlighted ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                                <span>🕒 {matchDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} HS</span>
                                <span>{isEliminatoria ? '🏆 Llave' : `G${match.group}`}</span>
                              </div>
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
      )}

      {/* Renderizado Condicional: Vista Semanal Timeline / Solapados */}
      {viewMode === 'weekly' && (
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 5px 0' }}>
            📊 Horarios y Solapamientos Semanales: {WEEKS[selectedWeek].label}
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '950px' }}>
              
              {/* Grilla Semanal: Cabecera con Fechas de las columnas */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '100px repeat(7, 1fr)', 
                textAlign: 'center', 
                fontWeight: 700, 
                fontSize: '0.85rem',
                marginBottom: '15px',
                borderBottom: '1px solid var(--border-light)',
                paddingBottom: '10px'
              }}>
                <div style={{ color: 'var(--text-muted)', textAlign: 'left', paddingLeft: '10px' }}>Horario</div>
                {weekDaysList.map((dayDate) => {
                  const weekdayName = WEEKDAYS[dayDate.getDay()];
                  const dayNum = dayDate.getDate();
                  const monthName = dayDate.toLocaleDateString('es-AR', { month: 'short' });

                  return (
                    <div key={dayDate.toISOString()} style={{ color: 'var(--text-main)' }}>
                      <div>{weekdayName}</div>
                      <div style={{ fontSize: '1.05rem', color: 'var(--accent-gold)', marginTop: '2px' }}>{dayNum} {monthName}</div>
                    </div>
                  );
                })}
              </div>

              {/* Filas de Slots de Horario (Línea de tiempo vertical) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {TIME_SLOTS.map((slot) => (
                  <div 
                    key={slot.hour}
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '100px repeat(7, 1fr)', 
                      alignItems: 'stretch',
                      minHeight: '80px',
                      borderBottom: '1px dashed var(--border-light)',
                      paddingBottom: '8px'
                    }}
                  >
                    {/* Indicador de hora a la izquierda */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      fontSize: '0.85rem', 
                      fontWeight: 700, 
                      color: 'var(--text-muted)',
                      paddingLeft: '10px'
                    }}>
                      🕒 {slot.label}
                    </div>

                    {/* Columnas para cada día de la semana */}
                    {weekDaysList.map((dayDate) => {
                      const slotMatches = getMatchesForDayAndHour(dayDate, slot.hour);
                      const isOverlap = slotMatches.length > 1;

                      return (
                        <div 
                          key={`${dayDate.toISOString()}-${slot.hour}`}
                          style={{ 
                            padding: '0 5px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            justifyContent: 'center',
                            backgroundColor: isOverlap ? 'RGBA(239, 68, 68, 0.02)' : 'transparent',
                            borderRadius: '4px',
                            transition: 'background 0.3s ease'
                          }}
                        >
                          {isOverlap && (
                            <div style={{ 
                              fontSize: '0.55rem', 
                              backgroundColor: 'var(--accent-error)', 
                              color: '#fff', 
                              padding: '1px 4px', 
                              borderRadius: '3px', 
                              fontWeight: 800,
                              width: 'fit-content',
                              alignSelf: 'center',
                              marginBottom: '2px',
                              letterSpacing: '0.05em'
                            }}>
                              🚨 SOLAPADO ({slotMatches.length})
                            </div>
                          )}

                          {slotMatches.map((match) => {
                            const isHighlighted = selectedGroup === 'Todos' || match.group === selectedGroup;
                            const isEliminatoria = match.phase && match.phase !== 'Fase de grupos';
                            
                            return (
                              <div
                                key={match.matchId}
                                onClick={() => isAdmin && onEditMatch?.(match)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  backgroundColor: isHighlighted ? 'var(--bg-card)' : 'RGBA(255,255,255,0.01)',
                                  border: isHighlighted 
                                    ? (isEliminatoria ? '1px solid var(--accent-blue)' : '1px solid var(--accent-gold)') 
                                    : '1px solid var(--border-light)',
                                  color: isHighlighted ? 'var(--text-main)' : 'var(--text-muted)',
                                  opacity: isHighlighted ? 1 : 0.3,
                                  filter: isHighlighted ? 'none' : 'grayscale(100%)',
                                  transition: 'all 0.3s ease',
                                  cursor: isAdmin ? 'pointer' : 'default',
                                  boxShadow: isHighlighted ? 'var(--shadow-sm)' : 'none',
                                  textAlign: 'center'
                                }}
                                title={`${match.homeTeam} vs ${match.awayTeam} (${match.stadium || ''})`}
                              >
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {match.homeTeam}
                                </div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: '1px 0' }}>vs</div>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {match.awayTeam}
                                </div>
                                <div style={{ 
                                  fontSize: '0.58rem', 
                                  color: isHighlighted 
                                    ? (isEliminatoria ? 'var(--accent-blue)' : 'var(--accent-gold)') 
                                    : 'var(--text-muted)',
                                  marginTop: '3px',
                                  fontWeight: 700
                                }}>
                                  {isEliminatoria ? '🏆 Llave' : `G${match.group}`}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
