import React, { useState } from 'react';

interface GhostCreatorProps {
  onCreateGhost: (name: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}

export const GhostCreator: React.FC<GhostCreatorProps> = ({
  onCreateGhost,
  loading,
  error,
  successMessage
}) => {
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

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

  return (
    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', padding: '20px 0' }}>
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
    </div>
  );
};
