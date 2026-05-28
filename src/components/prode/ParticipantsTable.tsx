import React from 'react';
import type { UserProfile, Match, Prediction } from '../../types';

interface ParticipantsTableProps {
  users: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  selectedUser: UserProfile | null;
  selectedUserPredictions: Prediction[];
  matches: Match[];
  onClosePredictionsPanel: () => void;
}

export const ParticipantsTable: React.FC<ParticipantsTableProps> = ({
  users,
  onSelectUser,
  selectedUser,
  selectedUserPredictions,
  matches,
  onClosePredictionsPanel
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 1fr' : '1fr', gap: '25px', alignItems: 'start', transition: 'grid-template-columns 0.3s' }}>
        
        {/* Tabla de Participantes */}
        <div className="glass-panel" style={{ padding: '25px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '15px' }}>
            Control de Participantes
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Usuario</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center' }}>Prode</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center' }}>Puntos</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'right' }}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr 
                    key={u.uid} 
                    style={{ 
                      borderBottom: '1px solid var(--border-light)', 
                      backgroundColor: selectedUser?.uid === u.uid ? 'var(--bg-overlay)' : 'transparent',
                      transition: 'background-color 0.2s' 
                    }}
                  >
                    <td style={{ padding: '14px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img 
                          src={u.photoURL} 
                          alt="" 
                          style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-light)' }} 
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{u.displayName}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: u.completedProde ? 'RGBA(16, 185, 129, 0.15)' : 'RGBA(239, 68, 68, 0.05)',
                        color: u.completedProde ? 'var(--accent-green)' : 'var(--text-muted)',
                        padding: '4px 10px',
                        borderRadius: '50px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: u.completedProde ? 'var(--accent-green)' : 'var(--border-light)'
                      }}>
                        {u.completedProde ? '✅ Completado' : '⏳ Pendiente'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--accent-gold)' }}>
                      {u.points} pts
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                      <button 
                        onClick={() => onSelectUser(u)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Ver Prode
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalle de Prode de un Participante */}
        {selectedUser && (
          <div className="glass-panel" style={{ padding: '25px', animation: 'slideRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                  src={selectedUser.photoURL} 
                  alt="" 
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--accent-gold)' }} 
                />
                <div>
                  <h4 style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    Prode de {selectedUser.displayName}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Total: {selectedUser.points} puntos acumulados
                  </span>
                </div>
              </div>
              <button 
                onClick={onClosePredictionsPanel}
                style={{ fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)', background: 'none', border: 'none' }}
              >
                ×
              </button>
            </div>

            {selectedUserPredictions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '30px 0' }}>
                Este participante no ha cargado ninguna predicción todavía.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto', paddingRight: '5px' }}>
                {matches.map((match) => {
                  const pred = selectedUserPredictions.find(p => p.matchId === match.matchId);
                  
                  return (
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
                        fontSize: '0.85rem'
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)', minWidth: '40px' }}>
                        Gr. {match.group}
                      </span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' }}>
                        <span>{match.homeTeam}</span>
                        <span style={{
                          backgroundColor: 'var(--bg-card)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          color: match.status === 'played' ? 'var(--text-muted)' : 'var(--text-main)',
                          border: '1px solid var(--border-light)'
                        }}>
                          {pred ? `${pred.homePrediction} - ${pred.awayPrediction}` : 's/p'}
                        </span>
                        <span>{match.awayTeam}</span>
                      </div>

                      {match.status === 'played' && pred && pred.pointsEarned !== undefined && (
                        <span style={{ 
                          fontWeight: 700, 
                          color: pred.pointsEarned === 3 ? 'var(--accent-green)' : pred.pointsEarned === 1 ? 'var(--accent-gold)' : 'var(--text-muted)',
                          minWidth: '55px',
                          textAlign: 'right'
                        }}>
                          {pred.pointsEarned === 3 ? '+3 pts' : pred.pointsEarned === 1 ? '+1 pt' : '0 pts'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
      
      <style>{`
        @keyframes slideRight {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
