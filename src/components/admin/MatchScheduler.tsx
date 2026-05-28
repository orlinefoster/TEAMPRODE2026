import React, { useState } from 'react';

interface MatchSchedulerProps {
  onScheduleMatch: (matchData: {
    group: string;
    homeTeam: string;
    awayTeam: string;
    date: number;
  }) => Promise<void>;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const MatchScheduler: React.FC<MatchSchedulerProps> = ({
  onScheduleMatch,
  loading,
  error,
  successMessage
}) => {
  const [group, setGroup] = useState('A');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const homeTrim = homeTeam.trim();
    const awayTrim = awayTeam.trim();

    if (!homeTrim || !awayTrim) {
      setLocalError('Por favor, ingresá los nombres de ambos equipos.');
      return;
    }

    if (homeTrim.toLowerCase() === awayTrim.toLowerCase()) {
      setLocalError('Un equipo no puede jugar contra sí mismo.');
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
      await onScheduleMatch({
        group,
        homeTeam: homeTrim,
        awayTeam: awayTrim,
        date: timestamp
      });
      // Limpiar formulario tras éxito
      setHomeTeam('');
      setAwayTeam('');
      setDateTime('');
    } catch (err) {
      // El error global es manejado por el contenedor
    }
  };

  return (
    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', padding: '20px 0' }}>
      <div className="glass-panel" style={{ padding: '30px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
          Agendar Nuevo Partido
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '25px', lineHeight: 1.5 }}>
          Carga un nuevo partido para la fase de grupos del Mundial 2026. 
          El partido aparecerá de inmediato en el calendario deportivo para que los participantes carguen sus prodes.
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {/* Grupo */}
            <div className="form-group">
              <label className="form-label">Grupo</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="form-input"
                style={{ height: '48px', backgroundColor: 'var(--bg-overlay)' }}
                disabled={loading}
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g} style={{ backgroundColor: 'var(--bg-card)' }}>
                    Grupo {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha y Hora */}
            <div className="form-group">
              <label className="form-label">Fecha y Hora</label>
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

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '10px', height: '48px' }}
            disabled={loading}
          >
            {loading ? 'Agendando partido...' : 'Registrar Partido en el Calendario'}
          </button>
        </form>
      </div>
    </div>
  );
};
