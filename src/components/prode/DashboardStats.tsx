import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import type { UserProfile } from '../../types';

interface DashboardStatsProps {
  users: UserProfile[];
  includeGhosts?: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ users, includeGhosts = false }) => {
  const stats = useMemo(() => {
    // Filtrar opcionalmente los participantes fantasmas
    const filteredUsers = includeGhosts ? users : users.filter(u => !u.isGhost);

    let totalPoints = 0;
    let totalExact = 0;
    let totalOutcome = 0;

    filteredUsers.forEach(u => {
      totalPoints += u.points || 0;
      totalExact += u.exactMatchesCount || 0;
      totalOutcome += u.outcomeMatchesCount || 0;
    });

    const activeUsersCount = filteredUsers.length;
    const avgPoints = activeUsersCount > 0 ? (totalPoints / activeUsersCount).toFixed(1) : '0.0';

    // Para el gráfico de Dona
    const pieData = [
      { name: 'Aciertos Exactos (3 pts)', value: totalExact },
      { name: 'Aciertos Tendencia (1 pt)', value: totalOutcome }
    ];

    // Para el gráfico de barras (Top 5)
    const topUsers = [...filteredUsers]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 5)
      .map(u => ({
        name: u.displayName.replace(/^👻\s+/, '').split(' ')[0], // Remover emoji de fantasma y recortar a primer nombre
        Puntos: u.points || 0
      }));

    return { totalPoints, totalExact, totalOutcome, activeUsers: activeUsersCount, avgPoints, pieData, topUsers };
  }, [users, includeGhosts]);

  const COLORS = ['#D4A359', '#63B3ED']; // Dorado (Exactos) y Azul claro (Tendencias)

  if (users.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--text-main)' }}>Aún no hay participantes en el torneo.</h3>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* KPIs Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem', marginBottom: '10px' }}>👥</span>
          <h4 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 5px 0' }}>
            {stats.activeUsers}
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>
            Participantes Activos
          </p>
        </div>
        
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎯</span>
          <h4 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-gold)', margin: '0 0 5px 0' }}>
            {stats.avgPoints}
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>
            Promedio de Puntos
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⚽</span>
          <h4 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#63B3ED', margin: '0 0 5px 0' }}>
            {stats.totalExact + stats.totalOutcome}
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>
            Total de Aciertos Globales
          </p>
        </div>
      </div>

      {/* Gráficos Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        
        {/* Pie Chart: Distribución de Aciertos */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '20px', textAlign: 'center' }}>
            Distribución de Aciertos
          </h3>
          <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', borderRadius: '8px', color: 'var(--text-main)' }} 
                  itemStyle={{ color: 'var(--text-main)' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'var(--text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Top 5 Jugadores */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '20px', textAlign: 'center' }}>
            Top 5 Mejores Pronosticadores
          </h3>
          <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={stats.topUsers} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} />
                <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} />
                <Tooltip 
                  cursor={{ fill: 'var(--bg-overlay)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', borderRadius: '8px', color: 'var(--text-main)' }} 
                />
                <Bar dataKey="Puntos" fill="var(--accent-gold)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
