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

  // Carga de archivo local con compresión y Base64 fallback para Mock
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setLocalError('El archivo seleccionado debe ser una imagen.');
      return;
    }

    // Validar tamaño máximo (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setLocalError('La imagen es demasiado grande. El límite es de 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar localmente usando HTML5 Canvas para optimizar carga
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Exportar en formato JPEG comprimido
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPhotoURL(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
            
            {/* Carga de Archivo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <label 
                className="btn btn-secondary" 
                style={{ fontSize: '0.8rem', padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}
              >
                📁 Subir Foto Personal
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Formatos: JPG, PNG • Max: 2MB (Optimizada localmente)
              </span>
            </div>

            {/* Avatares Rápidos */}
            <div style={{ width: '100%', borderTop: '1px solid var(--border-light)', paddingTop: '15px', marginTop: '5px' }}>
              <span className="form-label" style={{ fontSize: '0.75rem', display: 'block', textAlign: 'center', marginBottom: '10px' }}>
                O elegí un avatar rápido:
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
