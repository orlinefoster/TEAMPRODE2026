import React, { useState, useEffect } from 'react';
import type { Match } from '../../types';

interface MatchSchedulerProps {
  matches: Match[];
  onScheduleMatch: (matchData: {
    group: string;
    homeTeam: string;
    awayTeam: string;
    date: number;
    stadium: string;
    city: string;
    phase?: string;
  }) => Promise<void>;
  onUpdateMatchMetadata: (
    matchId: string,
    matchData: {
      group: string;
      homeTeam: string;
      awayTeam: string;
      date: number;
      stadium: string;
      city: string;
      phase?: string;
    }
  ) => Promise<void>;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}


const PHASES = [
  'Fase de grupos',
  'Dieciseisavos de final',
  'Octavos de final',
  'Cuartos de final',
  'Semifinales',
  'Tercer puesto',
  'Final'
];

export const MatchScheduler: React.FC<MatchSchedulerProps> = ({
  matches,
  onScheduleMatch,
  onUpdateMatchMetadata,
  loading,
  error,
  successMessage
}) => {
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  
  const [group, setGroup] = useState('A');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [stadium, setStadium] = useState('');
  const [city, setCity] = useState('');
  const [phase, setPhase] = useState('Fase de grupos');
  const [dateTime, setDateTime] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Cuando cambia el partido a editar, cargamos sus datos en el formulario
  useEffect(() => {
    if (editingMatch) {
      setGroup(editingMatch.group);
      setHomeTeam(editingMatch.homeTeam);
      setAwayTeam(editingMatch.awayTeam);
      setStadium(editingMatch.stadium || '');
      setCity(editingMatch.city || '');
      setPhase(editingMatch.phase || 'Fase de grupos');
      
      // Formatear timestamp a YYYY-MM-DDThh:mm para input datetime-local
      const dateObj = new Date(editingMatch.date);
      const tzOffset = dateObj.getTimezoneOffset() * 60000; // offset in milliseconds
      const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
      setDateTime(localISOTime);
    } else {
      setGroup('A');
      setHomeTeam('');
      setAwayTeam('');
      setStadium('');
      setCity('');
      setPhase('Fase de grupos');
      setDateTime('');
    }
    setLocalError(null);
  }, [editingMatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const homeTrim = homeTeam.trim();
    const awayTrim = awayTeam.trim();
    const stadiumTrim = stadium.trim();
    const cityTrim = city.trim();
    const phaseTrim = phase.trim();

    if (!homeTrim || !awayTrim) {
      setLocalError('Por favor, ingresá los nombres de ambos equipos.');
      return;
    }

    if (homeTrim.toLowerCase() === awayTrim.toLowerCase()) {
      setLocalError('Un equipo no puede jugar contra sí mismo.');
      return;
    }

    if (!stadiumTrim || !cityTrim) {
      setLocalError('Por favor, completa el estadio y la ciudad de juego.');
      return;
    }

    if (!dateTime) {
      setLocalError('Por favor, selecciona una fecha y hora para el partido.');
      return;
    }

    const timestamp = Date.parse(dateTime);
    if (isNaN(timestamp)) {
      setLocalError('La fecha seleccionada no es válida.');
      return;
    }

    try {
      if (editingMatch) {
        await onUpdateMatchMetadata(editingMatch.matchId, {
          group,
          homeTeam: homeTrim,
          awayTeam: awayTrim,
          date: timestamp,
          stadium: stadiumTrim,
          city: cityTrim,
          phase: phaseTrim
        });
        setEditingMatch(null); // Salir del modo edición
      } else {
        await onScheduleMatch({
          group,
          homeTeam: homeTrim,
          awayTeam: awayTrim,
          date: timestamp,
          stadium: stadiumTrim,
          city: cityTrim,
          phase: phaseTrim
        });
        setHomeTeam('');
        setAwayTeam('');
        setStadium('');
        setCity('');
        setPhase('Fase de grupos');
        setDateTime('');
      }
    } catch (err) {
      // El error global es manejado por el contenedor
    }
  };

  const handleCancelEdit = () => {
    setEditingMatch(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '20px 0' }}>
      
      {/* Formulario de Alta o Edición */}
      <div className="glass-panel" style={{ padding: '30px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
          {editingMatch ? '📝 Editar Detalles del Partido' : '🌱 Agendar Nuevo Partido Oficial'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '25px', lineHeight: 1.5 }}>
          {editingMatch 
            ? 'Modifica los nombres de los equipos, el grupo correspondiente, el estadio, la sede o la fecha/hora de juego.' 
            : 'Carga un nuevo partido para la fase de grupos del Mundial 2026. El partido se listará de inmediato en el fixture de todos los participantes.'}
        </p>

        {(error || localError) && (
          <div style={{ 
            backgroundColor: 'RGBA(239, 68, 68, 0.1)', 
            border: '1px solid var(--accent-error)', 
            color: 'var(--text-main)', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            fontSize: '0.9rem', 
            marginBottom: '20px'
          }}>
            ⚠️ {localError || error}
          </div>
        )}

        {successMessage && (
          <div style={{ 
            backgroundColor: 'RGBA(16, 185, 129, 0.1)', 
            border: '1px solid var(--accent-green)', 
            color: 'var(--text-main)', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            fontSize: '0.9rem', 
            marginBottom: '20px'
          }}>
            ✅ {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
            {/* Fase */}
            <div className="form-group">
              <label className="form-label">Fase</label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="form-input"
                style={{ height: '48px', backgroundColor: 'var(--bg-overlay)' }}
                disabled={loading}
              >
                {PHASES.map((p) => (
                  <option key={p} value={p} style={{ backgroundColor: 'var(--bg-card)' }}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Grupo */}
            <div className="form-group">
              <label className="form-label">Grupo / Llave</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: A, Llave 73"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Fecha y Hora */}
            <div className="form-group">
              <label className="form-label">Fecha y Hora (Local)</label>
              <input
                type="datetime-local"
                className="form-input"
                style={{ height: '48px' }}
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {/* Equipo Local */}
            <div className="form-group">
              <label className="form-label">Equipo Local</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Argentina"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Equipo Visitante */}
            <div className="form-group">
              <label className="form-label">Equipo Visitante</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Francia"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {/* Estadio */}
            <div className="form-group">
              <label className="form-label">Estadio</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Estadio Ciudad de México"
                value={stadium}
                onChange={(e) => setStadium(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Ciudad */}
            <div className="form-group">
              <label className="form-label">Ciudad / Sede</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Ciudad de México"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, height: '48px', fontWeight: 700 }}
              disabled={loading}
            >
              {loading 
                ? 'Procesando...' 
                : editingMatch 
                  ? 'Guardar Cambios' 
                  : 'Registrar Partido en el Fixture'}
            </button>
            {editingMatch && (
              <button
                type="button"
                className="btn"
                onClick={handleCancelEdit}
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
                Cancelar Edición
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Catálogo de Partidos Agendados */}
      <div className="glass-panel" style={{ padding: '30px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '20px' }}>
          📋 Calendario y Catálogo de Partidos ({matches.length})
        </h3>
        
        {matches.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
            No hay partidos registrados en el fixture oficial.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px 10px' }}>ID</th>
                  <th style={{ padding: '12px 10px' }}>Fase / Grupo</th>
                  <th style={{ padding: '12px 10px' }}>Partido / Marcador</th>
                  <th style={{ padding: '12px 10px' }}>Sede y Estadio</th>
                  <th style={{ padding: '12px 10px' }}>Fecha y Hora</th>
                  <th style={{ padding: '12px 10px' }}>Estado</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => {
                  const localDate = new Date(match.date).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const isMatchEditing = editingMatch?.matchId === match.matchId;

                  return (
                    <tr 
                      key={match.matchId} 
                      style={{ 
                        borderBottom: '1px solid var(--border-light)',
                        backgroundColor: isMatchEditing ? 'RGBA(212, 163, 89, 0.05)' : 'transparent',
                        fontSize: '0.9rem',
                        color: 'var(--text-main)'
                      }}
                    >
                      <td style={{ padding: '14px 10px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {match.matchId}
                      </td>
                      <td style={{ padding: '14px 10px', fontWeight: 600 }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)' }}>{match.phase || 'Fase de grupos'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {match.group.startsWith('Llave') ? match.group : `Grupo ${match.group}`}
                        </div>
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <span style={{ fontWeight: 500 }}>{match.homeTeam}</span>
                        <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>vs</span>
                        <span style={{ fontWeight: 500 }}>{match.awayTeam}</span>
                        {match.status === 'played' && (
                          <span style={{ 
                            marginLeft: '10px', 
                            fontSize: '0.8rem', 
                            backgroundColor: 'var(--border-light)', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            fontWeight: 700,
                            color: 'var(--accent-gold)'
                          }}>
                            {match.homeScore} - {match.awayScore}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 10px', fontSize: '0.85rem' }}>
                        {match.stadium && match.city ? (
                          <span>
                            📍 {match.stadium} <span style={{ color: 'var(--text-muted)' }}>({match.city})</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin sede asignada</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 10px', color: 'var(--text-muted)' }}>
                        {localDate}
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        {match.status === 'played' ? (
                          <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                            ⚽ Jugado
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>
                            ⏳ Pendiente
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setEditingMatch(match)}
                          className="btn"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            backgroundColor: isMatchEditing ? 'var(--accent-gold)' : 'var(--bg-overlay)',
                            color: isMatchEditing ? 'var(--text-dark)' : 'var(--accent-gold)',
                            fontWeight: 700,
                            border: '1px solid var(--border-light)',
                            cursor: 'pointer'
                          }}
                          disabled={loading}
                        >
                          ✏️ Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
