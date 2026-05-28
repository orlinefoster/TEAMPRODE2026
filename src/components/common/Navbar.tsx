import React from 'react';
import type { UserProfile } from '../../types';


interface NavbarProps {
  user: UserProfile;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activePage,
  onNavigate,
  onLogout
}) => {
  return (
    <nav style={{ 
      backgroundColor: 'var(--bg-card)', 
      borderBottom: '1px solid var(--border-light)', 
      position: 'sticky', 
      top: 0, 
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div className="container" style={{ 
        height: '70px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between'
      }}>
        {/* Logo */}
        <div 
          onClick={() => onNavigate('prode')} 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: '1.5rem' }}>🏆</span>
          <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            TEAM<span style={{ color: 'var(--accent-gold)' }}>PRODE</span>
          </span>
        </div>

        {/* Links de Navegación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            onClick={() => onNavigate('prode')} 
            style={{ 
              fontWeight: 600, 
              fontSize: '0.95rem',
              color: activePage === 'prode' ? 'var(--accent-gold)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '6px',
              transition: 'color 0.2s',
              backgroundColor: activePage === 'prode' ? 'var(--bg-overlay)' : 'transparent'
            }}
          >
            Mi Prode
          </button>
          
          <button 
            onClick={() => onNavigate('leaderboard')} 
            style={{ 
              fontWeight: 600, 
              fontSize: '0.95rem',
              color: activePage === 'leaderboard' ? 'var(--accent-gold)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '6px',
              transition: 'color 0.2s',
              backgroundColor: activePage === 'leaderboard' ? 'var(--bg-overlay)' : 'transparent'
            }}
          >
            Tabla Social
          </button>

          {user.role === 'admin' && (
            <button 
              onClick={() => onNavigate('whitelist')} 
              style={{ 
                fontWeight: 600, 
                fontSize: '0.95rem',
                color: activePage === 'whitelist' ? 'var(--accent-gold)' : 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '6px',
                transition: 'color 0.2s',
                backgroundColor: activePage === 'whitelist' ? 'var(--bg-overlay)' : 'transparent'
              }}
            >
              Whitelist (Admin)
            </button>
          )}
        </div>

        {/* Usuario y Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div 
            onClick={() => onNavigate('profile')} 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <img 
              src={user.photoURL} 
              alt={user.displayName} 
              style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '50%', 
                border: '2px solid var(--border-light)',
                objectFit: 'cover'
              }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column' }} className="mobile-hide">
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                {user.displayName}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 500 }}>
                {user.points} pts
              </span>
            </div>
          </div>

          <button 
            onClick={onLogout} 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600 }}
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
};
