import React, { useState } from 'react';
import type { UserProfile } from '../../types';

interface UserProfileEditorProps {
  user: UserProfile;
  onUpdateProfile: (displayName: string, photoURL: string) => Promise<void>;
  onTriggerPasswordReset: () => Promise<void>;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}

const PRESET_AVATARS = [
  'Leo', 'Diego', 'Lio', 'Ronaldo', 'Neymar', 
  'Zlatan', 'Kylian', 'Luka', 'Karim', 'Pelé'
];

export const UserProfileEditor: React.FC<UserProfileEditorProps> = ({
  user,
  onUpdateProfile,
  onTriggerPasswordReset,
  loading,
  error,
  successMessage
}) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [photoURL, setPhotoURL] = useState(user.photoURL);
  const [localError, setLocalError] = useState<string | null>(null);

  const handlePresetSelect = (seed: string) => {
    setPhotoURL(`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const nameTrimmed = displayName.trim();
    if (!nameTrimmed) {
      setLocalError('Por favor, ingresá tu nombre completo.');
      return;
    }

    try {
      await onUpdateProfile(nameTrimmed, photoURL);
    } catch (err) {
      // El error global es manejado por el contenedor
    }
  };

  return (
    <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '40px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px', textAlign: 'center' }}>
          Mi Perfil de Participante
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '30px', textAlign: 'center' }}>
          Actualizá tu información personal, foto de perfil o restablecé tu clave.
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Avatar Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <img 
              src={photoURL} 
              alt={displayName} 
              style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%', 
                border: '3px solid var(--accent-gold)', 
                objectFit: 'cover',
                boxShadow: 'var(--shadow-md)'
              }} 
            />
            


            {/* Avatares Rápidos */}
            <div style={{ width: '100%', borderTop: '1px solid var(--border-light)', paddingTop: '15px', marginTop: '5px' }}>
              <span className="form-label" style={{ fontSize: '0.75rem', display: 'block', textAlign: 'center', marginBottom: '10px' }}>
                Elegí tu avatar favorito:
              </span>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', justifyContent: 'center' }}>
                {PRESET_AVATARS.map((seed) => {
                  const presetUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
                  return (
                    <img 
                      key={seed}
                      src={presetUrl}
                      onClick={() => handlePresetSelect(seed)}
                      alt=""
                      style={{ 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '50%', 
                        cursor: 'pointer', 
                        border: photoURL === presetUrl ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-overlay)'
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="form-group">
            <label className="form-label">Nombre Completo</label>
            <input 
              type="text" 
              className="form-input" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Correo Electrónico (No editable)</label>
            <input 
              type="email" 
              className="form-input" 
              value={user.email}
              disabled
              style={{ backgroundColor: 'var(--border-light)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', height: '48px' }}
            disabled={loading}
          >
            {loading ? 'Guardando cambios...' : 'Guardar Datos de Perfil'}
          </button>
        </form>

        {/* Seguridad / Restablecer Clave */}
        <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '30px', paddingTop: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Seguridad y Acceso</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            ¿Querés cambiar tu contraseña de acceso? Te enviaremos un correo de forma segura con un enlace para restablecerla de inmediato.
          </p>
          <button 
            type="button"
            onClick={onTriggerPasswordReset}
            className="btn btn-secondary"
            style={{ width: '100%', height: '42px', fontSize: '0.85rem', fontWeight: 600 }}
            disabled={loading}
          >
            Restablecer Contraseña por Correo
          </button>
        </div>
      </div>
    </div>
  );
};
