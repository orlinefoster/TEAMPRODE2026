import React, { useState } from 'react';
import type { Match } from '../../types';

interface MatchScoreModalProps {
  match: Match;
  onClose: () => void;
  onSaveResult: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
  loading: boolean;
}

export const MatchScoreModal: React.FC<MatchScoreModalProps> = ({
  match,
  onClose,
  onSaveResult,
  loading
}) => {
  const [homeScore, setHomeScore] = useState<string>(
    match.homeScore !== undefined ? String(match.homeScore) : ''
  );
  const [awayScore, setAwayScore] = useState<string>(
    match.awayScore !== undefined ? String(match.awayScore) : ''
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const hScore = parseInt(homeScore, 10);
    const aScore = parseInt(awayScore, 10);

    if (isNaN(hScore) || isNaN(aScore) || hScore < 0 || aScore < 0) {
      setLocalError('Por favor, ingresá marcadores numéricos válidos (0 o más).');
      return;
    }

    try {
      await onSaveResult(match.matchId, hScore, aScore);
      onClose();
    } catch (err) {
      setLocalError('No se pudo guardar el resultado. Reintentá.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'RGBA(0, 0, 0, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div 
        className="glass-panel" 
        style={{ 
          maxWidth: '450px', 
          width: '100%', 
          padding: '30px', 
          boxShadow: 'var(--shadow-md)',
          animation: 'modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Cargar Resultado Real
          </h3>
          <button 
            onClick={onClose} 
            style={{ fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div style={{ 
          textAlign: 'center', 
          backgroundColor: 'RGBA(212, 163, 89, 0.08)', 
          border: '1px solid var(--accent-gold)', 
          padding: '10px 14px', 
          borderRadius: '8px', 
          fontSize: '0.8rem',
          color: 'var(--accent-gold)',
          fontWeight: 700,
          marginBottom: '20px',
          textTransform: 'uppercase',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span>📢 REGISTRO DE RESULTADOS OFICIALES</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {match.phase === 'Fase de grupos' ? `Grupo ${match.group} • Fase de Grupos` : `${match.phase}`}
          </span>
        </div>

        {localError && (
          <div style={{ 
            backgroundColor: 'RGBA(239, 68, 68, 0.1)', 
            border: '1px solid var(--accent-error)', 
            color: 'var(--text-main)', 
            padding: '10px 14px', 
            borderRadius: '6px', 
            fontSize: '0.875rem', 
            marginBottom: '20px'
          }}>
            ⚠️ {localError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Marcador */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
            {/* Local */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '2.5rem' }}>🏳️</span>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', textAlign: 'center', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                {match.homeTeam}
              </span>
              <input
                type="number"
                min="0"
                className="form-input"
                style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 800, height: '55px' }}
                placeholder="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-muted)', paddingTop: '50px' }}>
              -
            </div>

            {/* Visitante */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '2.5rem' }}>🏳️</span>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', textAlign: 'center', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                {match.awayTeam}
              </span>
              <input
                type="number"
                min="0"
                className="form-input"
                style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 800, height: '55px' }}
                placeholder="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Confirmar Marcador'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalSlideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
