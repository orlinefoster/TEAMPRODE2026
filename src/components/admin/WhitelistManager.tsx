import React, { useState } from 'react';
import type { WhitelistEntry } from '../../types';


interface WhitelistManagerProps {
  entries: WhitelistEntry[];
  onAddEmail: (email: string) => Promise<void>;
  onRemoveEmail: (email: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}

export const WhitelistManager: React.FC<WhitelistManagerProps> = ({
  entries,
  onAddEmail,
  onRemoveEmail,
  loading,
  error,
  successMessage
}) => {
  const [newEmail, setNewEmail] = useState('');
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

    try {
      await onAddEmail(emailTrimmed);
      setNewEmail('');
    } catch (err) {
      // El error global es manejado por el contenedor
    }
  };

  return (
    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', padding: '20px 0' }}>
      <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
          Gestión de Whitelist (Acceso Privado)
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '25px', lineHeight: 1.5 }}>
          Solo los correos electrónicos agregados a esta lista podrán registrarse en la plataforma. 
          Como administrador, podés agregar o remover correos autorizados.
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
          Correos Autorizados ({entries.length})
        </h3>

        {entries.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
            No hay ningún correo registrado en la whitelist todavía.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Correo Electrónico</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Fecha de Alta</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.email} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '14px 8px', fontWeight: 500 }}>{entry.email}</td>
                    <td style={{ padding: '14px 8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                      <button 
                        onClick={() => {
                          if (confirm(`¿Seguro que querés quitar de la whitelist a: ${entry.email}?`)) {
                            onRemoveEmail(entry.email);
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
