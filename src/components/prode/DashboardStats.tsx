import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts';
import type { UserProfile, Match, Prediction } from '../../types';
import { calculatePoints } from '../../services/scoringEngine';

interface DashboardStatsProps {
  users: UserProfile[];
  matches?: Match[];
  predictions?: Prediction[];
  includeGhosts?: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  users, 
  matches = [], 
  predictions = [], 
  includeGhosts = false 
}) => {
  const stats = useMemo(() => {
    // 1. Filtrar opcionalmente los participantes fantasmas
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

    // 2. Gráfico de Dona: Distribución de Aciertos
    const pieData = [
      { name: 'Aciertos Exactos (3 pts)', value: totalExact },
      { name: 'Aciertos Tendencia (1 pt)', value: totalOutcome }
    ];

    // 3. Histograma: Distribución de Puntos
    const pointRanges = [
      { name: '0-10 pts', Cantidad: 0 },
      { name: '11-20 pts', Cantidad: 0 },
      { name: '21-30 pts', Cantidad: 0 },
      { name: '31-40 pts', Cantidad: 0 },
      { name: '41+ pts', Cantidad: 0 }
    ];

    filteredUsers.forEach(u => {
      const pts = u.points || 0;
      if (pts <= 10) pointRanges[0].Cantidad++;
      else if (pts <= 20) pointRanges[1].Cantidad++;
      else if (pts <= 30) pointRanges[2].Cantidad++;
      else if (pts <= 40) pointRanges[3].Cantidad++;
      else pointRanges[4].Cantidad++;
    });

    // 4. Progreso Histórico (Línea de Tiempo LineChart)
    // Ordenar partidos jugados de forma cronológica
    const playedMatches = [...matches]
      .filter(m => m.status === 'played' && m.homeScore !== undefined && m.awayScore !== undefined)
      .sort((a, b) => a.date - b.date);

    // Obtener el Top 5 actual para graficar su progreso
    const top5Users = [...filteredUsers]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 5);

    const timelineData: any[] = [];
    
    if (playedMatches.length > 0 && top5Users.length > 0) {
      // Inicializar acumuladores de puntos por usuario
      const userPointsAccumulator: Record<string, number> = {};
      top5Users.forEach(u => {
        userPointsAccumulator[u.uid] = 0;
      });

      // Calcular puntos acumulados partido por partido
      playedMatches.forEach((match, index) => {
        const dataPoint: any = {
          name: `P${index + 1}`,
          label: `${match.homeTeam} vs ${match.awayTeam}`
        };

        top5Users.forEach(user => {
          // Buscar predicción del usuario para este partido específico
          const pred = predictions.find(p => p.userId === user.uid && p.matchId === match.matchId);
          if (pred && match.homeScore !== undefined && match.awayScore !== undefined) {
            const res = calculatePoints(pred.homePrediction, pred.awayPrediction, match.homeScore, match.awayScore);
            userPointsAccumulator[user.uid] += res.points;
          }
          // Limpiar nombre quitando emoji y recortar a primer nombre para legibilidad
          const cleanName = user.displayName.replace(/^👻\s+/, '');
          dataPoint[cleanName] = userPointsAccumulator[user.uid];
        });

        timelineData.push(dataPoint);
      });
    }

    return { 
      totalPoints, 
      totalExact, 
      totalOutcome, 
      activeUsers: activeUsersCount, 
      avgPoints, 
      pieData, 
      pointRanges,
      timelineData,
      top5Users,
      playedMatchesCount: playedMatches.length
    };
  }, [users, matches, predictions, includeGhosts]);

  const COLORS = ['#D4A359', '#63B3ED'];
  // Colores Premium para las líneas de progresión del Top 5
  const LINE_COLORS = ['#D4A359', '#63B3ED', '#48BB78', '#F56565', '#ED64A6'];

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

      {/* Fila de Gráficos: Distribución y Frecuencias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Gráfico 1: Torta de Aciertos */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '20px', textAlign: 'center' }}>
            Distribución de Aciertos
          </h3>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
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
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'var(--text-muted)', fontSize: '0.82rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Histograma de Distribución de Puntos */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '20px', textAlign: 'center' }}>
            Distribución de Puntajes (Rango)
          </h3>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.pointRanges} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: '0.8rem' }} />
                <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: '0.8rem' }} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'var(--bg-overlay)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', borderRadius: '8px', color: 'var(--text-main)' }} 
                />
                <Bar dataKey="Cantidad" fill="#63B3ED" radius={[4, 4, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Fila del Gráfico Lineal de Carrera Histórica (Top 5) */}
      <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px', textAlign: 'center' }}>
          📈 Carrera por el Liderazgo (Evolución Temporal del Top 5)
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '20px', textAlign: 'center' }}>
          Progreso acumulativo de puntos de los 5 mejores participantes a lo largo de los partidos jugados.
        </p>

        {stats.playedMatchesCount === 0 || stats.timelineData.length === 0 ? (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            border: '1px dashed var(--border-light)', 
            borderRadius: '8px',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            padding: '40px'
          }}>
            🏃‍♂️ La carrera comenzará cuando se cargue el resultado oficial del primer partido.
          </div>
        ) : (
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.timelineData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.3} />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: '0.8rem' }} />
                <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: '0.8rem' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.85rem' }} 
                  labelFormatter={(name, items) => {
                    const item = items[0]?.payload;
                    return item ? `Fecha: ${item.label}` : name;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.82rem', marginTop: '10px' }} />
                
                {stats.top5Users.map((user, idx) => {
                  const cleanName = user.displayName.replace(/^👻\s+/, '');
                  return (
                    <Line 
                      key={user.uid}
                      type="monotone"
                      dataKey={cleanName}
                      stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                      dot={{ r: 3 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Mini Tabla de Posiciones Integrada */}
      <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '15px' }}>
          🏆 Tabla de Posiciones Rápida
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="participants-table" style={{ width: '100%', minWidth: '400px' }}>
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>Pos</th>
                <th>Nombre</th>
                <th style={{ textAlign: 'center' }}>Exactos</th>
                <th style={{ textAlign: 'center' }}>Tendencias</th>
                <th style={{ textAlign: 'right' }}>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {stats.top5Users.map((u, index) => (
                <tr key={u.uid} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: index < 3 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                    #{index + 1}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img 
                        src={u.photoURL} 
                        alt="" 
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border-light)' }} 
                      />
                      <span style={{ fontWeight: 600 }}>{u.displayName}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 500 }}>{u.exactMatchesCount || 0}</td>
                  <td style={{ textAlign: 'center', fontWeight: 500 }}>{u.outcomeMatchesCount || 0}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-gold)' }}>{u.points || 0} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
