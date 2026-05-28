import { useState } from 'react';
import { IS_MOCK_ENV } from './services/firebase';

function App() {
  const [activeTab, setActiveTab] = useState<'welcome' | 'tech'>('welcome');

  return (
    <div className="container" style={{ padding: '60px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <header style={{ textAlign: 'center', marginBottom: '50px' }}>
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '10px', 
          backgroundColor: 'var(--bg-card)', 
          border: '1px solid var(--border-light)', 
          padding: '8px 16px', 
          borderRadius: '50px',
          marginBottom: '20px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)' }}></span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Fase de Grupos • Mundial 2026
          </span>
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '15px' }}>
          PRODE <span style={{ color: 'var(--accent-gold)' }}>MUNDIAL</span> 2026
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', maxWidth: '600px', margin: '0 auto' }}>
          Plataforma privada y exclusiva para la administración y predicción del torneo de fútbol más importante del mundo.
        </p>
      </header>

      <main style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', gap: '15px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px', marginBottom: '25px' }}>
            <button 
              className="btn" 
              style={{ 
                backgroundColor: activeTab === 'welcome' ? 'var(--border-light)' : 'transparent',
                borderColor: activeTab === 'welcome' ? 'var(--border-active)' : 'transparent',
                borderWidth: '1px',
                borderStyle: 'solid',
                color: activeTab === 'welcome' ? 'var(--accent-gold)' : 'var(--text-muted)'
              }}
              onClick={() => setActiveTab('welcome')}
            >
              Bienvenida
            </button>
            <button 
              className="btn" 
              style={{ 
                backgroundColor: activeTab === 'tech' ? 'var(--border-light)' : 'transparent',
                borderColor: activeTab === 'tech' ? 'var(--border-active)' : 'transparent',
                borderWidth: '1px',
                borderStyle: 'solid',
                color: activeTab === 'tech' ? 'var(--accent-gold)' : 'var(--text-muted)'
              }}
              onClick={() => setActiveTab('tech')}
            >
              Arquitectura SOLID
            </button>
          </div>

          {activeTab === 'welcome' ? (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '15px' }}>
                ¡Arrancamos el Proyecto! 🏆
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
                El espacio de trabajo en <code style={{ color: 'var(--accent-gold)', backgroundColor: 'var(--bg-overlay)', padding: '2px 6px', borderRadius: '4px' }}>/home/orline/Develops/TEAMPRODE2026</code> ya está totalmente configurado y conectado con Git. Inicializamos la base tecnológica con React + Vite + TypeScript.
              </p>

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '15px', 
                backgroundColor: 'var(--bg-overlay)', 
                border: '1px solid var(--border-light)', 
                padding: '16px', 
                borderRadius: '10px' 
              }}>
                <div style={{ fontSize: '2rem' }}>🔌</div>
                <div>
                  <h4 style={{ fontWeight: 600, marginBottom: '2px' }}>
                    Estado del Backend Firebase
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {IS_MOCK_ENV 
                      ? 'Corriendo en modo demostración local/mock (API Keys no cargadas todavía en .env).'
                      : '¡Conectado exitosamente con tu proyecto real de Firebase!'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '15px' }}>
                Patrones de Diseño Premium
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
                Cada vista de este Prode se estructurará siguiendo los estándares más altos de ingeniería web:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="premium-card" style={{ padding: '16px' }}>
                  <h4 style={{ color: 'var(--accent-gold)', marginBottom: '5px', fontWeight: 600 }}>Container Components</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Manejan los estados de Firestore, validaciones de reglas de negocio, loading y caches.
                  </p>
                </div>
                <div className="premium-card" style={{ padding: '16px' }}>
                  <h4 style={{ color: 'var(--accent-gold)', marginBottom: '5px', fontWeight: 600 }}>Presentational Components</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Puros, modulares y de estilo exquisito en CSS. Fáciles de testear y optimizados en HMR.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            📁 Ver Repositorio
          </a>
          <button 
            className="btn btn-primary"
            onClick={() => alert('¡El entorno está listo para el siguiente paso del Roadmap!')}
          >
            Siguiente Etapa →
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;

