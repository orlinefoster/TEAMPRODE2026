import React, { useState } from 'react';

interface RegisterFormProps {
  onSubmit: (email: string, pass: string, name: string) => Promise<void>;
  onNavigateToLogin: () => void;
  loading: boolean;
  error: string | null;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onNavigateToLogin,
  loading,
  error
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setLocalError('Por favor, completa todos los campos.');
      return;
    }

    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }

    try {
      await onSubmit(email.trim(), password, name.trim());
    } catch (err) {
      // El error global es manejado por el contexto
    }
  };

  return (
    <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '40px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
            Registrarse
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Acceso privado • Solo para correos autorizados
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
            <label className="form-label">Nombre Completo</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Diego Maradona"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

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
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              * Debe coincidir exactamente con el correo autorizado por el administrador.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirmar Contraseña</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="Repetí la contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Validando Correo...' : 'Crear mi Cuenta'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            ¿Ya tenés una cuenta?{' '}
            <button 
              type="button" 
              onClick={onNavigateToLogin}
              style={{ color: 'var(--accent-gold)', fontWeight: 600, cursor: 'pointer' }}
              disabled={loading}
            >
              Ingresá
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
