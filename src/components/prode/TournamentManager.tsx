import React, { useState } from 'react';
import type { Tournament, TournamentParticipant, UserProfile } from '../../types';

interface TournamentManagerProps {
  user: UserProfile;
  tournaments: Tournament[];
  activeTournament: Tournament | null;
  onSelectTournament: (tournamentId: string | null) => void;
  onCreateTournament: (name: string, modality: 'exact' | 'simple') => Promise<void>;
  onInviteUser: (email: string) => Promise<void>;
  onRemoveUser: (userId: string, email: string) => Promise<void>;
  onUpdateTournament: (newName: string, newModality?: 'exact' | 'simple') => Promise<void>;
  onDeleteTournament: () => Promise<void>;
  participants: TournamentParticipant[];
}

export const TournamentManager: React.FC<TournamentManagerProps> = ({
  user,
  tournaments,
  activeTournament,
  onSelectTournament,
  onCreateTournament,
  onInviteUser,
  onRemoveUser,
  onUpdateTournament,
  onDeleteTournament,
  participants
}) => {
  // Estado para creación de torneos
  const [newTourneyName, setNewTourneyName] = useState('');
  const [modality, setModality] = useState<'exact' | 'simple'>('exact');
  const [creating, setCreating] = useState(false);

  // Estado para invitaciones
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Estado para edición del nombre y modalidad del torneo
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempModality, setTempModality] = useState<'exact' | 'simple'>('exact');
  const [updatingName, setUpdatingName] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTourneyName.trim()) return;
    setCreating(true);
    try {
      await onCreateTournament(newTourneyName.trim(), modality);
      setNewTourneyName('');
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeTournament) return;
    setInviting(true);
    try {
      await onInviteUser(inviteEmail.trim().toLowerCase());
      setInviteEmail('');
    } catch (err) {
      console.error(err);
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateTournament = async () => {
    if (!tempName.trim() || !activeTournament) return;
    setUpdatingName(true);
    try {
      await onUpdateTournament(tempName.trim(), tempModality);
      setEditingName(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingName(false);
    }
  };

  const handleDelete = async () => {
    if (!activeTournament) return;
    const confirmMsg = `¿Estás seguro de que querés ELIMINAR el torneo "${activeTournament.name}"? Esta acción borrará todas las predicciones y perfiles de los participantes y no se puede deshacer.`;
    if (window.confirm(confirmMsg)) {
      await onDeleteTournament();
    }
  };

  const isReferee = activeTournament && (activeTournament.refereeId === user.uid || user.role === 'admin');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px', alignItems: 'start' }}>
      
      {/* Columna Izquierda: Mis Torneos & Crear Torneo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* Panel de Selección */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '15px' }}>
            🏆 Seleccionar Torneo
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Torneo Global */}
            <button
              onClick={() => onSelectTournament(null)}
              className="btn"
              style={{
                width: '100%',
                padding: '12px 15px',
                textAlign: 'left',
                borderRadius: '8px',
                backgroundColor: activeTournament === null ? 'var(--border-light)' : 'var(--bg-overlay)',
                color: activeTournament === null ? 'var(--accent-gold)' : 'var(--text-main)',
                border: activeTournament === null ? '1px solid var(--border-active)' : '1px solid var(--border-light)',
                fontWeight: activeTournament === null ? 700 : 500,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
            >
              <span>🌍 Prode Mundial 2026 (Global)</span>
              {activeTournament === null && <span style={{ fontSize: '0.8rem' }}>• Activo</span>}
            </button>

            {/* Torneos Personalizados */}
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTournament(t.id)}
                className="btn"
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  textAlign: 'left',
                  borderRadius: '8px',
                  backgroundColor: activeTournament?.id === t.id ? 'var(--border-light)' : 'var(--bg-overlay)',
                  color: activeTournament?.id === t.id ? 'var(--accent-gold)' : 'var(--text-main)',
                  border: activeTournament?.id === t.id ? '1px solid var(--border-active)' : '1px solid var(--border-light)',
                  fontWeight: activeTournament?.id === t.id ? 700 : 500,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>🏆 {t.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {t.modality === 'simple' ? 'Ganador/Empate' : 'Marcador Exacto'}
                  </span>
                </div>
                {activeTournament?.id === t.id && <span style={{ fontSize: '0.8rem' }}>• Activo</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Panel de Creación */}
        {(user.role === 'admin' || user.role === 'referee') && (
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '15px' }}>
              ➕ Crear Nuevo Torneo
            </h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nombre del Torneo</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Los Pibes de la Facu"
                  value={newTourneyName}
                  onChange={(e) => setNewTourneyName(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sistema de Puntos</label>
                <select
                  className="form-input"
                  value={modality}
                  onChange={(e) => setModality(e.target.value as 'exact' | 'simple')}
                  style={{ width: '100%', height: '42px', padding: '0 10px', backgroundColor: 'var(--bg-overlay)', color: 'var(--text-main)', border: '1px solid var(--border-light)', borderRadius: '6px' }}
                >
                  <option value="exact">Marcador Exacto (Exacto = 3, Ganador = 1)</option>
                  <option value="simple">Ganador o Empate Simple (Acierto = 1, Desacierto = 0)</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating || !newTourneyName.trim()}
                style={{ width: '100%', height: '42px', fontWeight: 700 }}
              >
                {creating ? 'Creando...' : 'Crear Torneo'}
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Columna Derecha: Detalle de Torneo, Integrantes & Moderación */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {activeTournament ? (
          <>
            {/* Header del Torneo */}
            <div className="glass-panel" style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {editingName ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '300px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        style={{ fontSize: '1.5rem', fontWeight: 800, padding: '5px 10px', height: '45px', width: '100%' }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sistema de Puntos:</label>
                      <select
                        className="form-input"
                        value={tempModality}
                        onChange={(e) => {
                          const val = e.target.value as 'exact' | 'simple';
                          if (activeTournament.modality === 'simple' && val === 'exact') {
                            alert('No se puede volver a Marcador Exacto desde Ganador/Empate Simple.');
                            return;
                          }
                          setTempModality(val);
                        }}
                        disabled={activeTournament.modality === 'simple'}
                        style={{ width: '100%', height: '42px', padding: '0 10px', backgroundColor: 'var(--bg-overlay)', color: 'var(--text-main)', border: '1px solid var(--border-light)', borderRadius: '6px' }}
                      >
                        <option value="exact">Marcador Exacto (Exacto = 3, Ganador = 1)</option>
                        <option value="simple">Ganador o Empate Simple (Acierto = 1, Desacierto = 0)</option>
                      </select>
                      {activeTournament.modality === 'exact' && tempModality === 'simple' && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', display: 'block', marginTop: '2px' }}>
                          ⚠️ Al simplificar la modalidad, se re-estructurarán de manera irreversible los pronósticos existentes a Ganador/Empate.
                        </span>
                      )}
                      {activeTournament.modality === 'simple' && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                          ℹ️ La modalidad simple es permanente y no se puede deshacer.
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                      <button onClick={handleUpdateTournament} className="btn btn-primary" disabled={updatingName} style={{ height: '40px', padding: '0 20px', fontWeight: 700 }}>
                        💾 Guardar Cambios
                      </button>
                      <button onClick={() => setEditingName(false)} className="btn" style={{ height: '40px', border: '1px solid var(--border-light)', padding: '0 15px' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      🏆 {activeTournament.name}
                    </h2>
                    {isReferee && (
                      <button
                        onClick={() => { 
                          setTempName(activeTournament.name); 
                          setTempModality(activeTournament.modality);
                          setEditingName(true); 
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
                        title="Editar torneo"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '15px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <span>
                    Modalidad: <strong>{activeTournament.modality === 'simple' ? 'Ganador/Empate Simple (1 pt)' : 'Marcador Exacto (3 pts / 1 pt)'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Árbitro: <strong>{isReferee && activeTournament.refereeId === user.uid ? 'Vos' : 'Moderador'}</strong>
                  </span>
                </div>
              </div>

              {isReferee && (
                <button
                  onClick={handleDelete}
                  className="btn"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                >
                  🗑️ Eliminar Torneo
                </button>
              )}
            </div>

            {/* Moderación (Árbitro) */}
            {isReferee && (
              <div className="glass-panel" style={{ padding: '25px', border: '1px solid var(--accent-gold)', backgroundColor: 'RGBA(212, 163, 89, 0.03)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📋 Panel del Árbitro
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.4 }}>
                  Como árbitro (moderador) de este torneo personalizado, podés invitar a participantes ingresando su dirección de correo electrónico. Los usuarios invitados verán el torneo en su panel y se unirán automáticamente.
                </p>

                <form onSubmit={handleInvite} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="correo@ejemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      style={{ width: '100%', height: '45px' }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={inviting || !inviteEmail.trim()}
                    style={{ height: '45px', padding: '0 25px', fontWeight: 700 }}
                  >
                    {inviting ? 'Invitando...' : '➕ Autorizar e Invitar'}
                  </button>
                </form>
              </div>
            )}

            {/* Lista de Integrantes */}
            <div className="glass-panel" style={{ padding: '25px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '20px' }}>
                👥 Participantes del Torneo ({participants.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {participants.map((p) => (
                  <div
                    key={p.uid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-overlay)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={p.photoURL}
                        alt={p.displayName}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--border-active)' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {p.displayName} {p.uid === activeTournament.refereeId && <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', marginLeft: '5px' }}>📢 Árbitro</span>}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.email}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                          {p.points} pts
                        </span>
                        <span style={{ fontSize: '0.72rem', color: p.completedProde ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                          {p.completedProde ? '🔒 Sellado' : '📝 Pendiente'}
                        </span>
                      </div>

                      {isReferee && p.uid !== activeTournament.refereeId && (
                        <button
                          onClick={async () => {
                            if (window.confirm(`¿Querés eliminar a ${p.displayName} de este torneo?`)) {
                              await onRemoveUser(p.uid, p.email);
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            padding: '4px'
                          }}
                          title="Remover del torneo"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Vista del Torneo Global */
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '3rem' }}>🌍</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Torneo Global Predeterminado
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '500px', lineHeight: 1.5, margin: 0 }}>
              Este es el torneo principal de la Copa Mundial 2026. Todos los participantes registrados compiten aquí de forma automática usando el sistema de puntos de Marcador Exacto (Exacto = 3 pts, Ganador/Empate = 1 pt).
            </p>
          </div>
        )}

      </div>

    </div>
  );
};
