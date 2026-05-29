import React, { useState } from 'react';
import type { Match } from '../../types';

interface MatchListProps {
  matches: Match[];
  isAdmin: boolean;
  onEditMatch?: (match: Match) => void;
}

const GROUPS = ['Todos', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const MatchList: React.FC<MatchListProps> = ({
  matches,
  isAdmin,
  onEditMatch
}) => {
  const [selectedGroup, setSelectedGroup] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'played'>('all');

  // Filtrado de partidos
  const filteredMatches = matches.filter((match) => {
    const matchesGroup = selectedGroup === 'Todos' || match.group === selectedGroup;
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'pending' && match.status === 'pending') ||
      (selectedStatus === 'played' && match.status === 'played');
    return matchesGroup && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      {/* Barra de Filtros */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {/* Filtro por Grupo */}
        <div>
          <span className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem' }}>Filtrar por Grupo:</span>
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
                  whiteSpace: 'nowrap'
                }}
              >
                {group === 'Todos' ? group : `Grupo ${group}`}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro por Estado */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setSelectedStatus('all')}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              borderRadius: '6px',
              backgroundColor: selectedStatus === 'all' ? 'var(--border-light)' : 'transparent',
              borderColor: selectedStatus === 'all' ? 'var(--border-active)' : 'var(--border-light)',
              borderWidth: '1px',
              borderStyle: 'solid',
              color: selectedStatus === 'all' ? 'var(--accent-gold)' : 'var(--text-muted)'
            }}
          >
            Todos los Partidos
          </button>
          <button
            onClick={() => setSelectedStatus('pending')}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              borderRadius: '6px',
              backgroundColor: selectedStatus === 'pending' ? 'var(--border-light)' : 'transparent',
              borderColor: selectedStatus === 'pending' ? 'var(--border-active)' : 'var(--border-light)',
              borderWidth: '1px',
              borderStyle: 'solid',
              color: selectedStatus === 'pending' ? 'var(--accent-gold)' : 'var(--text-muted)'
            }}
          >
            Pendientes
          </button>
          <button
            onClick={() => setSelectedStatus('played')}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              borderRadius: '6px',
              backgroundColor: selectedStatus === 'played' ? 'var(--border-light)' : 'transparent',
              borderColor: selectedStatus === 'played' ? 'var(--border-active)' : 'var(--border-light)',
              borderWidth: '1px',
              borderStyle: 'solid',
              color: selectedStatus === 'played' ? 'var(--accent-gold)' : 'var(--text-muted)'
            }}
          >
            Jugados
          </button>
        </div>
      </div>

      {/* Lista de Partidos */}
      {filteredMatches.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No hay partidos cargados que coincidan con estos filtros.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {filteredMatches.map((match) => {
            const matchDate = new Date(match.date);
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
                  flexWrap: 'wrap'
                }}
              >
                {/* Meta Info (Fecha y Grupo) */}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: '130px' }}>
                  <span style={{ 
                    display: 'inline-block',
                    backgroundColor: 'var(--bg-overlay)',
                    border: '1px solid var(--border-light)',
                    color: match.phase && match.phase !== 'Fase de grupos' ? 'var(--accent-blue)' : 'var(--accent-gold)',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    width: 'fit-content',
                    marginBottom: '6px',
                    textTransform: 'uppercase'
                  }}>
                    {match.phase && match.phase !== 'Fase de grupos' ? match.phase : `Grupo ${match.group}`}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {matchDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {matchDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} HS
                  </span>
                  {match.stadium && match.city && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      📍 {match.stadium}, {match.city}
                    </span>
                  )}
                </div>

                {/* Marcador Central / Rivales */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '20px', 
                  flex: 1, 
                  justifyContent: 'center',
                  minWidth: '280px'
                }}>
                  {/* Local */}
                  <div style={{ flex: 1, textAlign: 'right', fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                    <span>{match.homeTeam}</span>
                    <span style={{ fontSize: '1.2rem' }}>🏳️</span>
                  </div>

                  {/* Marcador Real */}
                  <div style={{ 
                    backgroundColor: 'var(--bg-overlay)', 
                    border: '1px solid var(--border-light)',
                    padding: '6px 16px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    minWidth: '90px',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.25rem'
                  }}>
                    {match.status === 'played' ? (
                      <>
                        <span style={{ color: 'var(--text-main)' }}>{match.homeScore}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>-</span>
                        <span style={{ color: 'var(--text-main)' }}>{match.awayScore}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>VS</span>
                    )}
                  </div>

                  {/* Visitante */}
                  <div style={{ flex: 1, textAlign: 'left', fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🏳️</span>
                    <span>{match.awayTeam}</span>
                  </div>
                </div>

                {/* Acciones de Administrador */}
                {isAdmin && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '120px' }}>
                    <button
                      onClick={() => onEditMatch?.(match)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600, borderColor: 'var(--accent-gold)' }}
                    >
                      {match.status === 'played' ? 'Editar Resultado' : 'Cargar Resultado'}
                    </button>
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
