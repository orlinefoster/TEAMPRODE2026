import React, { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, pass: string) => Promise<void>;
  onNavigateToRegister: () => void;
  onNavigateToForgot: () => void;
  loading: boolean;
  error: string | null;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onNavigateToRegister,
  onNavigateToForgot,
  loading,
  error
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password.trim()) {
      setLocalError('Por favor, completa todos los campos.');
      return;
    }

    try {
      await onSubmit(email.trim(), password);
    } catch (err) {
      // El error global es manejado por el contexto
    }
  };

  return (
    <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '40px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
            Iniciar Sesión
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Ingresá a la plataforma privada del torneo
          </p>
        </div>

        {(error || localError) && (
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
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', width: '100%' }}>
              <label className="form-label">Contraseña</label>
              <button 
                type="button" 
                onClick={onNavigateToForgot}
                style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', cursor: 'pointer', marginLeft: 'auto' }}
                disabled={loading}
              >
                ¿La olvidaste?
              </button>
            </div>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Entrar al Prode'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            ¿Estás en la lista privada pero no tenés cuenta?{' '}
            <button 
              type="button" 
              onClick={onNavigateToRegister}
              style={{ color: 'var(--accent-gold)', fontWeight: 600, cursor: 'pointer' }}
              disabled={loading}
            >
              Registrate
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
