import React, { useState } from 'react';
import type { WhitelistEntry, UserRole, Tournament } from '../../types';

interface WhitelistManagerProps {
  entries: WhitelistEntry[];
  onAddEmail: (email: string, role: UserRole, tournamentId: string | null) => Promise<void>;
  onRemoveEmail: (email: string, tournamentId: string | null) => Promise<void>;
  onMoveEmail?: (email: string, fromTournamentId: string | null, toTournamentId: string | null) => Promise<void>;
  onUpdateRole?: (email: string, newRole: UserRole) => Promise<void>;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  tournaments: Tournament[];
  selectedTournamentId: string | null;
  onTournamentChange: (id: string | null) => void;
}

export const WhitelistManager: React.FC<WhitelistManagerProps> = ({
  entries,
  onAddEmail,
  onRemoveEmail,
  onMoveEmail,
  onUpdateRole,
  loading,
  error,
  successMessage,
  tournaments,
  selectedTournamentId,
  onTournamentChange
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const emailTrimmed = newEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setLocalError('Por favor, ingresá un correo válido.');
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setLocalError('El formato de correo no es correcto.');
      return;
    }

    // Si es un torneo personalizado, el rol siempre es 'user' (participante)
    const roleToAssign = selectedTournamentId ? 'user' : selectedRole;

    try {
      await onAddEmail(emailTrimmed, roleToAssign, selectedTournamentId);
      setNewEmail('');
      setSelectedRole('user');
    } catch (err) {
      // El error global es manejado por el contenedor
    }
  };

  const getActiveTournamentName = () => {
    if (!selectedTournamentId) return 'Global (Mundial 2026)';
    const t = tournaments.find(x => x.id === selectedTournamentId);
    return t ? `Torneo "${t.name}"` : 'Torneo Personalizado';
  };

  return (
    <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '20px 0' }}>
      
      {/* Selector de Torneo de Destino */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '25px' }}>
        <label className="form-label" style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>
          🎯 Seleccionar Torneo para Gestionar Whitelist:
        </label>
        <select
          className="form-input"
          value={selectedTournamentId || ''}
          onChange={(e) => {
            onTournamentChange(e.target.value ? e.target.value : null);
          }}
          style={{ width: '100%', height: '42px', padding: '0 10px', backgroundColor: 'var(--bg-overlay)', color: 'var(--text-main)', border: '1px solid var(--border-light)', borderRadius: '6px' }}
        >
          <option value="">🌍 Whitelist Global (Todos los Torneos)</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              🏆 {t.name} ({t.modality === 'simple' ? 'Modalidad Simple' : 'Marcador Exacto'})
            </option>
          ))}
        </select>
      </div>

      <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
          Gestión de Whitelist - {getActiveTournamentName()}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '25px', lineHeight: 1.5 }}>
          {!selectedTournamentId 
            ? 'Solo los correos agregados a esta lista podrán registrarse en la plataforma principal de la app. Como administrador, podés agregar o remover correos autorizados.'
            : 'Solo los correos agregados a esta lista podrán participar en este torneo específico. Si el usuario ya está registrado, se lo unirá de manera automática.'
          }
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

        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '250px', marginBottom: 0 }}>
            <label className="form-label">Agregar Nuevo Correo Autorizado</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="autorizado@correo.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          
          {/* Ocultamos el rol si no es la whitelist global */}
          {!selectedTournamentId && (
            <div className="form-group" style={{ width: '180px', marginBottom: 0 }}>
              <label className="form-label">Rol Asignado</label>
              <select
                className="form-input"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                disabled={loading}
                style={{ width: '100%', height: '42px', padding: '0 10px', backgroundColor: 'var(--bg-overlay)', color: 'var(--text-main)', border: '1px solid var(--border-light)', borderRadius: '6px' }}
              >
                <option value="user">Usuario</option>
                <option value="referee">Árbitro</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ height: '45px', padding: '0 25px' }}
            disabled={loading}
          >
            {loading ? 'Agregando...' : 'Autorizar Email'}
          </button>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '30px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '15px' }}>
          Correos Autorizados en {getActiveTournamentName()} ({entries.length})
        </h3>

        {entries.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
            No hay ningún correo registrado en esta whitelist todavía.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Correo Electrónico</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Torneo</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Rol</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Fecha de Alta</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={`${entry.tournamentId || 'global'}_${entry.email}`} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '14px 8px', fontWeight: 500 }}>{entry.email}</td>
                    
                    <td style={{ padding: '14px 8px' }}>
                      <select
                        value={entry.tournamentId || ''}
                        onChange={(e) => {
                          const toId = e.target.value ? e.target.value : null;
                          if (onMoveEmail) {
                            const fromName = entry.tournamentId 
                              ? (tournaments.find(t => t.id === entry.tournamentId)?.name || 'Torneo') 
                              : 'Global';
                            const toName = toId 
                              ? (tournaments.find(t => t.id === toId)?.name || 'Torneo') 
                              : 'Global';
                            if (confirm(`¿Estás seguro de que querés mover el correo ${entry.email} desde "${fromName}" hacia "${toName}"?\n\nSi el usuario ya está registrado en la app, se moverá su participación y se borrarán sus pronósticos del torneo anterior.`)) {
                              onMoveEmail(entry.email, entry.tournamentId || null, toId);
                            }
                          }
                        }}
                        disabled={loading}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'var(--bg-overlay)',
                          color: 'var(--text-main)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          maxWidth: '180px'
                        }}
                      >
                        <option value="">🌍 Global (Mundial 2026)</option>
                        {tournaments.map((t) => (
                          <option key={t.id} value={t.id}>
                            🏆 {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    
                    <td style={{ padding: '14px 8px' }}>
                      <select
                        value={entry.role || 'user'}
                        onChange={(e) => {
                          const newRole = e.target.value as UserRole;
                          if (onUpdateRole) {
                            if (confirm(`¿Estás seguro de cambiar el rol de ${entry.email} a "${newRole === 'admin' ? 'Administrador' : newRole === 'referee' ? 'Árbitro' : 'Usuario'}"?\n\nSi el usuario ya está registrado en la app, su rol se actualizará de inmediato.`)) {
                              onUpdateRole(entry.email, newRole);
                            }
                          }
                        }}
                        disabled={loading}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'var(--bg-overlay)',
                          color: entry.role === 'admin' ? 'var(--accent-gold)' : entry.role === 'referee' ? '#3b82f6' : 'var(--text-main)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: entry.role === 'admin' || entry.role === 'referee' ? 700 : 500,
                          cursor: 'pointer',
                          width: '130px'
                        }}
                      >
                        <option value="user">Usuario</option>
                        <option value="referee">Árbitro</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>

                    <td style={{ padding: '14px 8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                      <button 
                        onClick={() => {
                          if (confirm(`¿Seguro que querés quitar de la whitelist a: ${entry.email}?`)) {
                            onRemoveEmail(entry.email, entry.tournamentId || null);
                          }
                        }}
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                        disabled={loading}
                      >
                        Quitar Autorización
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
