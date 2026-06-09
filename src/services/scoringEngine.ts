import type { LeaderboardUser, UserProfile } from '../types';


export interface ScoringResult {
  points: number;
  type: 'exact' | 'outcome' | 'none';
}

/**
 * Calcula los puntos ganados para una predicción específica contra un resultado real.
 * exact match: 3 pts
 * winner/draw outcome: 1 pt
 * no hit: 0 pts
 */
export const calculatePoints = (
  homePrediction: number,
  awayPrediction: number,
  homeActual: number,
  awayActual: number
): ScoringResult => {
  // Acierto Exacto (3 Puntos)
  if (homePrediction === homeActual && awayPrediction === awayActual) {
    return { points: 3, type: 'exact' };
  }

  // Acierto de Ganador o Empate (1 Punto)
  const predictionOutcome = Math.sign(homePrediction - awayPrediction);
  const actualOutcome = Math.sign(homeActual - awayActual);

  if (predictionOutcome === actualOutcome) {
    return { points: 1, type: 'outcome' };
  }

  // Sin acierto (0 Puntos)
  return { points: 0, type: 'none' };
};

/**
 * Calcula los puntos ganados para una predicción simple (ganador/empate) contra un resultado real.
 * acierto: 1 pt
 * desacierto: 0 pts
 */
export const calculatePointsSimple = (
  predictionOutcome: 'home' | 'away' | 'draw',
  homeActual: number,
  awayActual: number
): ScoringResult => {
  const actualOutcome = homeActual > awayActual ? 'home' : homeActual < awayActual ? 'away' : 'draw';

  if (predictionOutcome === actualOutcome) {
    return { points: 1, type: 'outcome' };
  }

  return { points: 0, type: 'none' };
};


/**
 * Calcula y genera la tabla de posiciones (Leaderboard) ordenando a los usuarios.
 * Ordena por:
 * 1. Puntos totales (descendente)
 * 2. Cantidad de aciertos exactos (descendente)
 * 3. Cantidad de aciertos resultado (descendente)
 * 4. Nombre de usuario (alfabético)
 */
export const computeLeaderboard = (
  users: UserProfile[]
): LeaderboardUser[] => {
  const sorted = [...users].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    if (b.exactMatchesCount !== a.exactMatchesCount) {
      return b.exactMatchesCount - a.exactMatchesCount;
    }
    if (b.outcomeMatchesCount !== a.outcomeMatchesCount) {
      return b.outcomeMatchesCount - a.outcomeMatchesCount;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  return sorted.map((user, index) => ({
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL,
    points: user.points,
    completedProde: user.completedProde,
    exactMatchesCount: user.exactMatchesCount,
    outcomeMatchesCount: user.outcomeMatchesCount,
    position: index + 1
  }));
};
