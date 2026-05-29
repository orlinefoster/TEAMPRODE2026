import React from 'react';

interface LoadingModalProps {
  isOpen?: boolean;
  message?: string;
  inline?: boolean;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  isOpen = true,
  message = 'Cargando tu Estadio...',
  inline = false
}) => {
  if (!isOpen) return null;

  if (inline) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <div className="spinner-circle-small" />
        {message && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{message}</span>}
        <style>{`
          .spinner-circle-small {
            width: 18px;
            height: 18px;
            border: 2px solid var(--border-light);
            border-top: 2px solid var(--accent-gold);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'RGBA(8, 10, 15, 0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      gap: '20px'
    }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '80px',
        height: '80px'
      }}>
        {/* Outer pulsating ring */}
        <div className="pulsating-ring" />
        {/* Inner spinning glow border */}
        <div className="spinner-circle" />
        {/* Centered trophy emoji */}
        <div style={{ fontSize: '2.2rem', zIndex: 2, transform: 'translateY(-2px)' }}>🏆</div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{
          color: 'var(--text-main)',
          fontSize: '1rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          margin: '0 0 4px 0'
        }}>
          {message}
        </p>
        <p style={{
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
          margin: 0
        }}>
          Por favor, no cierres esta ventana
        </p>
      </div>

      <style>{`
        .spinner-circle {
          position: absolute;
          width: 70px;
          height: 70px;
          border: 3px solid transparent;
          border-top: 3px solid var(--accent-gold);
          border-right: 3px solid var(--accent-gold);
          border-radius: 50%;
          animation: spin 1s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
        }
        .pulsating-ring {
          position: absolute;
          width: 80px;
          height: 80px;
          border: 2px solid var(--border-active);
          border-radius: 50%;
          animation: pulse-ring 1.8s cubic-bezier(0.24, 0, 0.38, 1) infinite;
          opacity: 0;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.7); opacity: 0; }
          50% { opacity: 0.3; }
          100% { transform: scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
