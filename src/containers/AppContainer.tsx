import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';
import { Navbar } from '../components/common/Navbar';
import { WhitelistManager } from '../components/admin/WhitelistManager';
import type { WhitelistEntry } from '../types';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, IS_MOCK_ENV } from '../services/firebase';

type GuestView = 'login' | 'register' | 'forgot';
type MemberView = 'prode' | 'leaderboard' | 'whitelist' | 'profile';

// Mock inicial de correos permitidos para desarrollo local
const INITIAL_MOCK_WHITELIST: WhitelistEntry[] = [
  { email: 'admin@teamprode.com', addedBy: 'system', createdAt: Date.now() - 86400000 },
  { email: 'participante@teamprode.com', addedBy: 'system', createdAt: Date.now() - 3600000 }
];

export const AppContainer: React.FC = () => {
  const { user, loading, error, login, register, logout, resetPassword, clearError } = useAuth();
  
  // Ruteador SPA básico y ultra-resiliente
  const [guestView, setGuestView] = useState<GuestView>('login');
  const [memberView, setMemberView] = useState<MemberView>('prode');

  // Estados específicos para la Whitelist
  const [whitelistEntries, setWhitelistEntries] = useState<WhitelistEntry[]>([]);
  const [whitelistLoading, setWhitelistLoading] = useState(false);
  const [whitelistError, setWhitelistError] = useState<string | null>(null);
  const [whitelistSuccess, setWhitelistSuccess] = useState<string | null>(null);

  // Escuchar a la Whitelist en tiempo real (si es Admin y no es Mock)
  useEffect(() => {
    if (user?.role !== 'admin') return;

    if (IS_MOCK_ENV) {
      setWhitelistEntries(INITIAL_MOCK_WHITELIST);
      return;
    }

    setWhitelistLoading(true);
    const q = query(collection(db, 'whitelist'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries: WhitelistEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        entries.push({
          email: docSnap.id,
          addedBy: data.addedBy || 'admin',
          createdAt: data.createdAt?.toMillis() || Date.now()
        });
      });
      setWhitelistEntries(entries);
      setWhitelistLoading(false);
    }, (err) => {
      console.error('Error cargando whitelist:', err);
      setWhitelistError('Error de permisos al leer la Whitelist.');
      setWhitelistLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Limpiar alertas globales al cambiar de pantalla
  const handleNavigateGuest = (view: GuestView) => {
    clearError();
    setGuestView(view);
  };

  const handleNavigateMember = (view: MemberView) => {
    setWhitelistError(null);
    setWhitelistSuccess(null);
    setMemberView(view);
  };

  // Acción: Agregar Email a la Whitelist
  const handleAddEmail = async (emailToAdd: string) => {
    setWhitelistLoading(true);
    setWhitelistError(null);
    setWhitelistSuccess(null);

    const emailSanitized = emailToAdd.trim().toLowerCase();

    if (IS_MOCK_ENV) {
      if (whitelistEntries.some(e => e.email === emailSanitized)) {
        setWhitelistError('Este correo electrónico ya está en la whitelist.');
        setWhitelistLoading(false);
        return;
      }
      const newMockEntry: WhitelistEntry = {
        email: emailSanitized,
        addedBy: user?.displayName || 'Admin',
        createdAt: Date.now()
      };
      setWhitelistEntries([newMockEntry, ...whitelistEntries]);
      setWhitelistSuccess(`¡Correo ${emailSanitized} autorizado exitosamente (Mock)!`);
      setWhitelistLoading(false);
      return;
    }

    try {
      const docRef = doc(db, 'whitelist', emailSanitized);
      await setDoc(docRef, {
        addedBy: user?.uid || 'admin',
        createdAt: serverTimestamp(),
        role: 'user' // Por defecto registran como usuario general
      });
      setWhitelistSuccess(`¡Correo ${emailSanitized} autorizado exitosamente!`);
    } catch (err: any) {
      console.error(err);
      setWhitelistError('No se pudo agregar el correo. Verifica las reglas de Firestore.');
    } finally {
      setWhitelistLoading(false);
    }
  };

  // Acción: Remover Email de la Whitelist
  const handleRemoveEmail = async (emailToRemove: string) => {
    setWhitelistLoading(true);
    setWhitelistError(null);
    setWhitelistSuccess(null);

    if (IS_MOCK_ENV) {
      setWhitelistEntries(whitelistEntries.filter(e => e.email !== emailToRemove));
      setWhitelistSuccess(`¡Autorización para ${emailToRemove} removida (Mock)!`);
      setWhitelistLoading(false);
      return;
    }

    try {
      await deleteDoc(doc(db, 'whitelist', emailToRemove));
      setWhitelistSuccess(`¡Autorización para ${emailToRemove} removida exitosamente!`);
    } catch (err) {
      console.error(err);
      setWhitelistError('No se pudo quitar la autorización. Verifica tus privilegios.');
    } finally {
      setWhitelistLoading(false);
    }
  };

  // 1. Pantalla de Carga Shimmer Premium
  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '20px' }}>
        <div style={{ fontSize: '3rem', animation: 'pulse 1.5s infinite ease-in-out' }}>🏆</div>
        <div style={{ width: '200px', height: '4px', backgroundColor: 'var(--bg-overlay)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
          <div className="skeleton" style={{ width: '100%', height: '100%' }}></div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Cargando tu Estadio...
        </p>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // 2. Ruteador para Invitados (No Autenticados)
  if (!user) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', padding: '40px 20px', backgroundColor: 'var(--bg-main)' }}>
        {guestView === 'login' && (
          <LoginForm 
            onSubmit={login}
            onNavigateToRegister={() => handleNavigateGuest('register')}
            onNavigateToForgot={() => handleNavigateGuest('forgot')}
            loading={loading}
            error={error}
          />
        )}
        {guestView === 'register' && (
          <RegisterForm 
            onSubmit={register}
            onNavigateToLogin={() => handleNavigateGuest('login')}
            loading={loading}
            error={error}
          />
        )}
        {guestView === 'forgot' && (
          <ForgotPasswordForm 
            onSubmit={resetPassword}
            onNavigateToLogin={() => handleNavigateGuest('login')}
            loading={loading}
            error={error}
          />
        )}
      </div>
    );
  }

  // 3. Ruteador para Miembros (Autenticados)
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)' }}>
      <Navbar 
        user={user} 
        activePage={memberView}
        onNavigate={(page) => handleNavigateMember(page as MemberView)}
        onLogout={logout}
      />

      <main className="container" style={{ flex: 1, padding: '40px 20px' }}>
        {memberView === 'prode' && (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <span style={{ fontSize: '3.5rem' }}>⚽</span>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '20px', marginBottom: '10px' }}>Mi Prode Mundialista</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 25px', lineHeight: 1.6 }}>
              Acá vas a poder llenar tus predicciones gol a gol para toda la fase de grupos del mundial. 
              ¡Próximamente disponible en la Etapa 4!
            </p>
            <div style={{ display: 'inline-flex', padding: '12px 24px', backgroundColor: 'var(--bg-overlay)', border: '1px dashed var(--accent-gold)', borderRadius: '8px', color: 'var(--accent-gold)', fontWeight: 600 }}>
              Próximo paso del Roadmap de Implementación 📅
            </div>
          </div>
        )}

        {memberView === 'leaderboard' && (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <span style={{ fontSize: '3.5rem' }}>📊</span>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '20px', marginBottom: '10px' }}>Tabla Social y Rankings</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 25px', lineHeight: 1.6 }}>
              Seguí las puntuaciones de tus amigos y rivales en tiempo real. 
              ¡Estadísticas y rankings globales disponibles en la Etapa 5!
            </p>
            <div style={{ display: 'inline-flex', padding: '12px 24px', backgroundColor: 'var(--bg-overlay)', border: '1px dashed var(--accent-gold)', borderRadius: '8px', color: 'var(--accent-gold)', fontWeight: 600 }}>
              Planificado para la Etapa 5 🚀
            </div>
          </div>
        )}

        {memberView === 'whitelist' && user.role === 'admin' && (
          <WhitelistManager 
            entries={whitelistEntries}
            onAddEmail={handleAddEmail}
            onRemoveEmail={handleRemoveEmail}
            loading={whitelistLoading}
            error={whitelistError}
            successMessage={whitelistSuccess}
          />
        )}

        {memberView === 'profile' && (
          <div className="glass-panel" style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <img 
                src={user.photoURL} 
                alt={user.displayName} 
                style={{ width: '100px', height: '100px', borderRadius: '50%', border: '3px solid var(--accent-gold)', objectFit: 'cover', marginBottom: '15px' }} 
              />
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{user.displayName}</h2>
              <span style={{ display: 'inline-block', backgroundColor: 'var(--bg-overlay)', border: '1px solid var(--border-light)', padding: '4px 12px', borderRadius: '50px', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                Rol: {user.role}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--bg-overlay)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Correo Electrónico:</span>
                <span style={{ fontWeight: 600 }}>{user.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--bg-overlay)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Puntos Acumulados:</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>{user.points} pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--bg-overlay)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Prode Completado:</span>
                <span style={{ fontWeight: 600, color: user.completedProde ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {user.completedProde ? '✅ Sí (Listo)' : '❌ Pendiente'}
                </span>
              </div>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '30px' }}>
              * La edición de perfil y carga de fotos estarán disponibles en la Etapa 6.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
