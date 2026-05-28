import React, { useState } from 'react';

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>;
  onNavigateToLogin: () => void;
  loading: boolean;
  error: string | null;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSubmit,
  onNavigateToLogin,
  loading,
  error
}) => {
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSent(false);

    if (!email.trim()) {
      setLocalError('Por favor, ingresá tu correo electrónico.');
      return;
    }

    try {
      await onSubmit(email.trim());
      setIsSent(true);
    } catch (err) {
      // El error global es manejado por el contexto
    }
  };

  return (
    <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '40px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
            Recuperar Contraseña
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Te enviaremos un correo para restablecer tu clave
          </p>
        </div>

        {isSent && (
          <div style={{ 
            backgroundColor: 'RGBA(16, 185, 129, 0.1)', 
            border: '1px solid var(--accent-green)', 
            color: 'var(--text-main)', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            fontSize: '0.9rem', 
            marginBottom: '20px',
            lineHeight: 1.4
          }}>
            ✅ ¡Correo enviado! Revisá tu bandeja de entrada (y la carpeta de spam o correo no deseado).
          </div>
        )}

        {(error || localError) && !isSent && (
          <div style={{ 
            backgroundColor: 'RGBA(239, 68, 68, 0.1)', 
            border: '1px solid var(--accent-error)', 
            color: 'var(--text-main)', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            fontSize: '0.9rem', 
            marginBottom: '20px',
            lineHeight: 1.4
          }}>
            ⚠️ {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="nombre@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || isSent}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
            disabled={loading || isSent}
          >
            {loading ? 'Enviando...' : 'Enviar Correo de Recuperación'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
          <button 
            type="button" 
            onClick={onNavigateToLogin}
            style={{ color: 'var(--accent-gold)', fontWeight: 600, cursor: 'pointer' }}
            disabled={loading}
          >
            Volver al Inicio de Sesión
          </button>
        </div>
      </div>
    </div>
  );
};
