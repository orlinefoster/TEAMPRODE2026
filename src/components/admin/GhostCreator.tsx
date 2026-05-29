import React, { useState } from 'react';
import type { UserProfile } from '../../types';

interface GhostCreatorProps {
  ghosts: UserProfile[];
  onCreateGhost: (name: string) => Promise<void>;
  onEditGhost: (ghostUid: string, newName: string) => Promise<void>;
  onDeleteGhost: (ghostUid: string) => Promise<void>;
  onClearGhostsPredictions?: () => Promise<void>;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}

export const GhostCreator: React.FC<GhostCreatorProps> = ({
  ghosts,
  onCreateGhost,
  onEditGhost,
  onDeleteGhost,
  onClearGhostsPredictions,
  loading,
  error,
  successMessage
}) => {
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Estados para la edición inline
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const nameTrimmed = name.trim();
    if (!nameTrimmed) {
      setLocalError('Por favor, ingresá un nombre para el participante de prueba.');
      return;
    }

    try {
      await onCreateGhost(nameTrimmed);
      setName('');
    } catch (err) {
      // El error global es manejado por el contenedor
    }
  };

  const handleStartEdit = (ghost: UserProfile) => {
    setEditingUid(ghost.uid);
    // Remover el emoji de fantasma "👻 " del input para que editen solo el texto limpio
    const cleanName = ghost.displayName.replace(/^👻\s+/, '');
    setEditingName(cleanName);
  };

  const handleCancelEdit = () => {
    setEditingUid(null);
    setEditingName('');
  };

  const handleSaveEdit = async (uid: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      alert('El nombre no puede estar vacío.');
      return;
    }
    try {
      await onEditGhost(uid, trimmed);
      setEditingUid(null);
      setEditingName('');
    } catch (err) {
      alert('Error al renombrar el participante fantasma.');
    }
  };

  const handleDeleteClick = async (ghost: UserProfile) => {
    if (window.confirm(`🚨 ADVERTENCIA: ¿Estás completamente seguro de que querés ELIMINAR a "${ghost.displayName}" y borrar todas sus predicciones asociadas de forma irreversible?`)) {
      try {
        await onDeleteGhost(ghost.uid);
      } catch (err) {
        alert('Error al eliminar el participante fantasma.');
      }
    }
  };

  return (
    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Creador de Fantasmas */}
      <div className="glass-panel" style={{ padding: '30px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
          Crear Participante Fantasma
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '25px', lineHeight: 1.5 }}>
          Los participantes fantasmas son cuentas de prueba privadas que sirvan para simular escenarios. 
          <strong> Solo los administradores pueden verlos</strong> en las tablas de posiciones y rankings.
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '250px', marginBottom: 0 }}>
            <label className="form-label">Nombre del Participante Fantasma</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ej: Messi Simulado"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ height: '48px', padding: '0 25px' }}
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear Fantasma 👻'}
          </button>
        </form>
      </div>

      {/* Listado y Gestión de Fantasmas Existentes */}
      <div className="glass-panel" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '15px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            👥 Administrar Participantes Fantasmas ({ghosts.length})
          </h3>
          {ghosts.length > 0 && onClearGhostsPredictions && (
            <button
              onClick={async () => {
                if (window.confirm('¿Estás seguro de que querés LIMPIAR por completo todas las predicciones de TODOS los fantasmas? Sus pronósticos y puntos se restablecerán a 0.')) {
                  await onClearGhostsPredictions();
                }
              }}
              className="btn"
              style={{
                fontSize: '0.8rem',
                padding: '6px 12px',
                backgroundColor: 'RGBA(239, 68, 68, 0.08)',
                border: '1px solid var(--accent-error)',
                color: 'var(--accent-error)',
                fontWeight: 700,
                borderRadius: '6px',
                height: '34px'
              }}
              disabled={loading}
            >
              🧹 Limpiar Predicciones de Fantasmas
            </button>
          )}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
          Modificá el nombre o eliminá definitivamente los perfiles de prueba de la base de datos.
        </p>

        {ghosts.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '30px', 
            border: '1px dashed var(--border-light)', 
            borderRadius: '8px',
            color: 'var(--text-muted)',
            fontSize: '0.9rem'
          }}>
            Aún no se crearon participantes fantasmas.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ghosts.map((ghost) => {
              const isEditing = editingUid === ghost.uid;

              return (
                <div 
                  key={ghost.uid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    backgroundColor: 'var(--bg-overlay)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    gap: '15px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '220px' }}>
                    <img 
                      src={ghost.photoURL} 
                      alt="" 
                      style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--border-light)' }} 
                    />
                    
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                        <span style={{ fontSize: '1.1rem' }}>👻</span>
                        <input 
                          type="text"
                          className="form-input"
                          style={{ height: '36px', padding: '0 10px', fontSize: '0.9rem', marginBottom: 0 }}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          placeholder="Nombre limpio"
                          required
                        />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                          {ghost.displayName}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ID: {ghost.uid} • {ghost.completedProde ? '✅ Completó' : '🔲 Pendiente'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(ghost.uid)}
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', height: '34px' }}
                          disabled={loading}
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', height: '34px' }}
                          disabled={loading}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(ghost)}
                          className="btn"
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '0.8rem', 
                            height: '34px', 
                            backgroundColor: 'var(--bg-card)', 
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-main)',
                            fontWeight: 600
                          }}
                          disabled={loading}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDeleteClick(ghost)}
                          className="btn"
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '0.8rem', 
                            height: '34px', 
                            backgroundColor: 'RGBA(239, 68, 68, 0.08)', 
                            border: '1px solid var(--accent-error)',
                            color: 'var(--accent-error)',
                            fontWeight: 600
                          }}
                          disabled={loading}
                        >
                          🗑️ Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
