import React, { useState } from 'react';
import type { UserProfile } from '../../types';
import { computeLeaderboard } from '../../services/scoringEngine';

interface LeaderboardProps {
  users: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  users,
  onSelectUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Calcular ranking oficial ordenado
  const rankedUsers = computeLeaderboard(users);

  // Filtrar por término de búsqueda
  const filteredRankings = rankedUsers.filter((u) =>
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', padding: '10px 0' }}>
      <div className="glass-panel" style={{ padding: '30px', marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Ranking General del Torneo
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>
              Seguí las posiciones en tiempo real. Se premia exactitud y regularidad.
            </p>
          </div>

          {/* Buscador */}
          <input
            type="text"
            className="form-input"
            style={{ width: '220px', height: '38px', padding: '0 12px', fontSize: '0.85rem' }}
            placeholder="🔍 Buscar participante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tabla de Rankings */}
        {filteredRankings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            No se encontraron participantes que coincidan con la búsqueda.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', width: '70px', textAlign: 'center' }}>Pos</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Participante</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center' }}>Exactos (3)</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center' }}>Resultados (1)</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center' }}>Prode</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'right' }}>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {filteredRankings.map((u) => {
                  // Determinar si corresponde medallas del podio
                  let positionRender;
                  if (u.position === 1) {
                    positionRender = <span style={{ fontSize: '1.4rem' }}>🏆</span>;
                  } else if (u.position === 2) {
                    positionRender = <span style={{ fontSize: '1.4rem' }}>🥈</span>;
                  } else if (u.position === 3) {
                    positionRender = <span style={{ fontSize: '1.4rem' }}>🥉</span>;
                  } else {
                    positionRender = <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{u.position}</span>;
                  }

                  return (
                    <tr
                      key={u.uid}
                      onClick={() => onSelectUser(u as any)}
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      className="leaderboard-row"
                    >
                      {/* Posición */}
                      <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                        {positionRender}
                      </td>

                      {/* Usuario */}
                      <td style={{ padding: '14px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={u.photoURL}
                            alt=""
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              border: u.position && u.position <= 3 ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)'
                            }}
                          />
                          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: u.position && u.position === 1 ? 'var(--accent-gold)' : 'var(--text-main)' }}>
                            {u.displayName}
                          </span>
                        </div>
                      </td>

                      {/* Aciertos Exactos */}
                      <td style={{ padding: '14px 8px', textAlign: 'center', fontWeight: 600 }}>
                        <span style={{
                          backgroundColor: u.exactMatchesCount > 0 ? 'RGBA(16, 185, 129, 0.08)' : 'transparent',
                          color: u.exactMatchesCount > 0 ? 'var(--accent-green)' : 'var(--text-muted)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.85rem'
                        }}>
                          {u.exactMatchesCount}
                        </span>
                      </td>

                      {/* Aciertos Ganador */}
                      <td style={{ padding: '14px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {u.outcomeMatchesCount}
                      </td>

                      {/* Completitud */}
                      <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                        <span style={{
                          color: u.completedProde ? 'var(--accent-green)' : 'var(--text-muted)',
                          fontSize: '0.85rem'
                        }}>
                          {u.completedProde ? '✓ Completo' : '• Pendiente'}
                        </span>
                      </td>

                      {/* Puntos */}
                      <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-gold)', fontSize: '1.1rem' }}>
                        {u.points} pts
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .leaderboard-row:hover {
          background-color: var(--bg-overlay);
        }
      `}</style>
    </div>
  );
};
