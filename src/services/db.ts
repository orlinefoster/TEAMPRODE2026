import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  query, 
  where,
  setDoc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db, IS_MOCK_ENV } from './firebase';
import type { Match, Prediction, UserProfile } from '../types';
import { calculatePoints } from './scoringEngine';

// Lista oficial sembrada de 24 partidos clásicos para la fase de grupos del Mundial 2026 (Grupos A al L)
export const SEED_MATCHES: Match[] = [
  // Grupo A
  { matchId: 'm1', group: 'A', homeTeam: 'Estados Unidos', awayTeam: 'Canadá', date: Date.parse('2026-06-11T18:00:00Z'), status: 'pending' },
  { matchId: 'm2', group: 'A', homeTeam: 'México', awayTeam: 'Italia', date: Date.parse('2026-06-12T20:00:00Z'), status: 'pending' },
  // Grupo B
  { matchId: 'm3', group: 'B', homeTeam: 'Argentina', awayTeam: 'Francia', date: Date.parse('2026-06-13T15:00:00Z'), status: 'pending' },
  { matchId: 'm4', group: 'B', homeTeam: 'Marruecos', awayTeam: 'Japón', date: Date.parse('2026-06-13T19:00:00Z'), status: 'pending' },
  // Grupo C
  { matchId: 'm5', group: 'C', homeTeam: 'Brasil', awayTeam: 'España', date: Date.parse('2026-06-14T16:00:00Z'), status: 'pending' },
  { matchId: 'm6', group: 'C', homeTeam: 'Inglaterra', awayTeam: 'Senegal', date: Date.parse('2026-06-14T20:00:00Z'), status: 'pending' },
  // Grupo D
  { matchId: 'm7', group: 'D', homeTeam: 'Uruguay', awayTeam: 'Alemania', date: Date.parse('2026-06-15T15:00:00Z'), status: 'pending' },
  { matchId: 'm8', group: 'D', homeTeam: 'Portugal', awayTeam: 'Corea del Sur', date: Date.parse('2026-06-15T19:00:00Z'), status: 'pending' },
  // Grupo E
  { matchId: 'm9', group: 'E', homeTeam: 'Bélgica', awayTeam: 'Colombia', date: Date.parse('2026-06-16T15:00:00Z'), status: 'pending' },
  { matchId: 'm10', group: 'E', homeTeam: 'Croacia', awayTeam: 'Nigeria', date: Date.parse('2026-06-16T19:00:00Z'), status: 'pending' },
  // Grupo F
  { matchId: 'm11', group: 'F', homeTeam: 'Países Bajos', awayTeam: 'Chile', date: Date.parse('2026-06-17T15:00:00Z'), status: 'pending' },
  { matchId: 'm12', group: 'F', homeTeam: 'Dinamarca', awayTeam: 'Egipto', date: Date.parse('2026-06-17T19:00:00Z'), status: 'pending' },
  // Grupo G
  { matchId: 'm13', group: 'G', homeTeam: 'Suiza', awayTeam: 'Arabia Saudita', date: Date.parse('2026-06-18T15:00:00Z'), status: 'pending' },
  { matchId: 'm14', group: 'G', homeTeam: 'Estados Unidos', awayTeam: 'Italia', date: Date.parse('2026-06-18T19:00:00Z'), status: 'pending' },
  // Grupo H
  { matchId: 'm15', group: 'H', homeTeam: 'Argentina', awayTeam: 'Japón', date: Date.parse('2026-06-19T15:00:00Z'), status: 'pending' },
  { matchId: 'm16', group: 'H', homeTeam: 'Brasil', awayTeam: 'Inglaterra', date: Date.parse('2026-06-19T19:00:00Z'), status: 'pending' },
  // Grupo I
  { matchId: 'm17', group: 'I', homeTeam: 'Uruguay', awayTeam: 'Portugal', date: Date.parse('2026-06-20T15:00:00Z'), status: 'pending' },
  { matchId: 'm18', group: 'I', homeTeam: 'Francia', awayTeam: 'Marruecos', date: Date.parse('2026-06-20T19:00:00Z'), status: 'pending' },
  // Grupo J
  { matchId: 'm19', group: 'J', homeTeam: 'España', awayTeam: 'Senegal', date: Date.parse('2026-06-21T15:00:00Z'), status: 'pending' },
  { matchId: 'm20', group: 'J', homeTeam: 'Alemania', awayTeam: 'Corea del Sur', date: Date.parse('2026-06-21T19:00:00Z'), status: 'pending' },
  // Grupo K
  { matchId: 'm21', group: 'K', homeTeam: 'Canadá', awayTeam: 'México', date: Date.parse('2026-06-22T15:00:00Z'), status: 'pending' },
  { matchId: 'm22', group: 'K', homeTeam: 'Bélgica', awayTeam: 'Croacia', date: Date.parse('2026-06-22T19:00:00Z'), status: 'pending' },
  // Grupo L
  { matchId: 'm23', group: 'L', homeTeam: 'Países Bajos', awayTeam: 'Dinamarca', date: Date.parse('2026-06-23T15:00:00Z'), status: 'pending' },
  { matchId: 'm24', group: 'L', homeTeam: 'Colombia', awayTeam: 'Chile', date: Date.parse('2026-06-23T19:00:00Z'), status: 'pending' }
];

/**
 * Siembra los partidos del mundial en Firestore si la colección está vacía.
 * Soporta entorno Mock con LocalStorage.
 */
export const seedWorldCupMatches = async (): Promise<void> => {
  if (IS_MOCK_ENV) {
    const existing = localStorage.getItem('prode_matches');
    if (!existing) {
      localStorage.setItem('prode_matches', JSON.stringify(SEED_MATCHES));
      console.log('🌱 Seeding: Partidos del mundial sembrados en LocalStorage (Mock).');
    }
    return;
  }

  try {
    const matchesColl = collection(db, 'matches');
    const snapshot = await getDocs(matchesColl);

    if (snapshot.empty) {
      console.log('🌱 Seeding: Poblando la colección de partidos del Mundial 2026 en Firestore...');
      const batch = writeBatch(db);

      SEED_MATCHES.forEach((match) => {
        const matchDocRef = doc(db, 'matches', match.matchId);
        batch.set(matchDocRef, match);
      });

      await batch.commit();
      console.log('🌱 Seeding: ¡Partidos sembrados exitosamente en Cloud Firestore!');
    }
  } catch (err) {
    console.error('Error al sembrar partidos:', err);
    throw err;
  }
};

/**
 * Recupera todos los partidos del mundial ordenados cronológicamente.
 */
export const getMatchesFromDB = async (): Promise<Match[]> => {
  if (IS_MOCK_ENV) {
    const matchesJson = localStorage.getItem('prode_matches');
    return matchesJson ? JSON.parse(matchesJson) : SEED_MATCHES;
  }

  const querySnapshot = await getDocs(collection(db, 'matches'));
  const matches: Match[] = [];
  querySnapshot.forEach((docSnap) => {
    matches.push(docSnap.data() as Match);
  });

  return matches.sort((a, b) => a.date - b.date);
};

/**
 * Actualiza el resultado real de un partido y recalcula los puntos de todas las predicciones de los usuarios.
 * ¡Esta es una transacción sumamente sólida e integral de backend en cliente!
 */
export const updateMatchResultInDB = async (
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<void> => {
  if (IS_MOCK_ENV) {
    // 1. Actualizar partido en LocalStorage
    const matchesJson = localStorage.getItem('prode_matches') || '[]';
    const matches: Match[] = JSON.parse(matchesJson);
    const matchIndex = matches.findIndex(m => m.matchId === matchId);
    if (matchIndex !== -1) {
      matches[matchIndex].status = 'played';
      matches[matchIndex].homeScore = homeScore;
      matches[matchIndex].awayScore = awayScore;
      localStorage.setItem('prode_matches', JSON.stringify(matches));
    }

    // 2. Cargar predicciones mock
    const predsJson = localStorage.getItem('prode_predictions') || '[]';
    const predictions: Prediction[] = JSON.parse(predsJson);

    // Actualizar predicciones para este partido
    predictions.forEach((pred) => {
      if (pred.matchId === matchId) {
        const res = calculatePoints(pred.homePrediction, pred.awayPrediction, homeScore, awayScore);
        pred.pointsEarned = res.points;
        pred.calculated = true;
      }
    });
    localStorage.setItem('prode_predictions', JSON.stringify(predictions));

    // 3. Recalcular perfiles de usuarios mock
    const usersJson = localStorage.getItem('prode_users') || '[]';
    const users: UserProfile[] = JSON.parse(usersJson);

    users.forEach((user) => {
      const userPreds = predictions.filter(p => p.userId === user.uid);
      let totalPoints = 0;
      let exactCount = 0;
      let outcomeCount = 0;

      userPreds.forEach((pred) => {
        if (pred.calculated && pred.pointsEarned !== undefined) {
          totalPoints += pred.pointsEarned;
          if (pred.pointsEarned === 3) exactCount++;
          if (pred.pointsEarned === 1) outcomeCount++;
        }
      });

      user.points = totalPoints;
      user.exactMatchesCount = exactCount;
      user.outcomeMatchesCount = outcomeCount;
    });

    localStorage.setItem('prode_users', JSON.stringify(users));
    console.log('🔄 Recalculation: Resultados y puntuaciones actualizados en LocalStorage (Mock).');
    return;
  }

  try {
    const batch = writeBatch(db);

    // 1. Actualizar el partido
    const matchDocRef = doc(db, 'matches', matchId);
    batch.update(matchDocRef, {
      status: 'played',
      homeScore,
      awayScore
    });

    // 2. Obtener todas las predicciones asociadas a este partido
    const predsQuery = query(collection(db, 'predictions'), where('matchId', '==', matchId));
    const predsSnapshot = await getDocs(predsQuery);

    const affectedUsers = new Set<string>();

    predsSnapshot.forEach((predDocSnap) => {
      const pred = predDocSnap.data() as Prediction;
      const res = calculatePoints(pred.homePrediction, pred.awayPrediction, homeScore, awayScore);
      
      const predDocRef = doc(db, 'predictions', predDocSnap.id);
      batch.update(predDocRef, {
        pointsEarned: res.points,
        calculated: true
      });

      affectedUsers.add(pred.userId);
    });

    // Ejecutar el primer batch (partidos y predicciones actualizadas)
    await batch.commit();

    // 3. Recalcular el perfil de cada usuario afectado
    const secondBatch = writeBatch(db);

    for (const userId of affectedUsers) {
      const userPredsQuery = query(collection(db, 'predictions'), where('userId', '==', userId));
      const userPredsSnapshot = await getDocs(userPredsQuery);

      let totalPoints = 0;
      let exactCount = 0;
      let outcomeCount = 0;

      userPredsSnapshot.forEach((predDocSnap) => {
        const pred = predDocSnap.data() as Prediction;
        if (pred.calculated && pred.pointsEarned !== undefined) {
          totalPoints += pred.pointsEarned;
          if (pred.pointsEarned === 3) exactCount++;
          if (pred.pointsEarned === 1) outcomeCount++;
        }
      });

      const userDocRef = doc(db, 'users', userId);
      secondBatch.update(userDocRef, {
        points: totalPoints,
        exactMatchesCount: exactCount,
        outcomeMatchesCount: outcomeCount
      });
    }

    await secondBatch.commit();
    console.log('🔄 Recalculation: Puntajes y estadísticas recalculados con éxito para todos los participantes.');
  } catch (err) {
    console.error('Error actualizando resultados y recalculando puntos:', err);
    throw err;
  }
};

/**
 * Agrega un nuevo partido agendado por el administrador a la base de datos.
 * Soporta entorno Mock con LocalStorage.
 */
export const addNewMatchToDB = async (matchData: {
  group: string;
  homeTeam: string;
  awayTeam: string;
  date: number;
}): Promise<void> => {
  const matchId = `m_${matchData.date}_${Math.floor(Math.random() * 1000)}`;
  const newMatch: Match = {
    matchId,
    group: matchData.group,
    homeTeam: matchData.homeTeam,
    awayTeam: matchData.awayTeam,
    date: matchData.date,
    status: 'pending'
  };

  if (IS_MOCK_ENV) {
    const matchesJson = localStorage.getItem('prode_matches') || '[]';
    const matches: Match[] = JSON.parse(matchesJson);
    matches.push(newMatch);
    localStorage.setItem('prode_matches', JSON.stringify(matches));
    console.log('🌱 Seed: Partido agendado y guardado en LocalStorage (Mock).');
    return;
  }

  try {
    const matchDocRef = doc(db, 'matches', matchId);
    await setDoc(matchDocRef, newMatch);
    console.log('🌱 DB: Partido agendado y registrado con éxito en Firestore.');
  } catch (err) {
    console.error('Error al agendar partido en Firestore:', err);
    throw err;
  }
};

/**
 * Recupera todas las predicciones de un usuario específico.
 * Soporta entorno Mock con LocalStorage.
 */
export const getUserPredictions = async (userId: string): Promise<Prediction[]> => {
  if (IS_MOCK_ENV) {
    const predsJson = localStorage.getItem('prode_predictions') || '[]';
    const predictions: Prediction[] = JSON.parse(predsJson);
    return predictions.filter((p) => p.userId === userId);
  }

  const q = query(collection(db, 'predictions'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const predictions: Prediction[] = [];
  snapshot.forEach((docSnap) => {
    predictions.push(docSnap.data() as Prediction);
  });
  return predictions;
};

/**
 * Guarda o actualiza una predicción individual.
 * Si el usuario completa el 100% de los partidos del calendario, actualiza completedProde a true.
 * Soporta entorno Mock con LocalStorage.
 */
export const saveUserPrediction = async (
  userId: string,
  matchId: string,
  homePrediction: number,
  awayPrediction: number
): Promise<void> => {
  const predictionId = `${userId}_${matchId}`;
  
  // 1. Validar si el partido ya empezó/jugó (bloqueado para predicciones)
  let isMatchPlayed = false;
  if (IS_MOCK_ENV) {
    const matches = await getMatchesFromDB();
    const match = matches.find(m => m.matchId === matchId);
    isMatchPlayed = match?.status === 'played';
  } else {
    const matchDoc = await getDoc(doc(db, 'matches', matchId));
    if (matchDoc.exists()) {
      isMatchPlayed = matchDoc.data().status === 'played';
    }
  }

  if (isMatchPlayed) {
    throw new Error('El partido ya se ha jugado. No se pueden modificar las predicciones.');
  }

  const newPrediction: Prediction = {
    predictionId,
    userId,
    matchId,
    homePrediction,
    awayPrediction,
    calculated: false
  };

  if (IS_MOCK_ENV) {
    const predsJson = localStorage.getItem('prode_predictions') || '[]';
    const predictions: Prediction[] = JSON.parse(predsJson);
    const index = predictions.findIndex(p => p.predictionId === predictionId);
    
    if (index !== -1) {
      predictions[index] = newPrediction;
    } else {
      predictions.push(newPrediction);
    }
    localStorage.setItem('prode_predictions', JSON.stringify(predictions));

    // Validar si completó todo el prode (comparando cantidad de predicciones del usuario vs partidos cargados)
    const userPreds = predictions.filter(p => p.userId === userId);
    const matches = await getMatchesFromDB();
    
    if (userPreds.length >= matches.length) {
      const usersJson = localStorage.getItem('prode_users') || '[]';
      const users: UserProfile[] = JSON.parse(usersJson);
      const userIndex = users.findIndex(u => u.uid === userId);
      if (userIndex !== -1) {
        users[userIndex].completedProde = true;
        localStorage.setItem('prode_users', JSON.stringify(users));
      }
    }
    return;
  }

  try {
    // Guardar la predicción
    const predDocRef = doc(db, 'predictions', predictionId);
    await setDoc(predDocRef, newPrediction);

    // Comprobar si completó el prode
    const matchesSnapshot = await getDocs(collection(db, 'matches'));
    const totalMatchesCount = matchesSnapshot.size;

    const userPredsQuery = query(collection(db, 'predictions'), where('userId', '==', userId));
    const userPredsSnapshot = await getDocs(userPredsQuery);
    const userPredictionsCount = userPredsSnapshot.size;

    if (userPredictionsCount >= totalMatchesCount) {
      await updateDoc(doc(db, 'users', userId), {
        completedProde: true
      });
    }
  } catch (err) {
    console.error('Error al guardar predicción:', err);
    throw err;
  }
};

/**
 * Obtiene el listado de participantes y si completaron el prode o no (tabla de control).
 * En Mock, recupera usuarios de LocalStorage.
 */
export const getAllParticipantsFromDB = async (): Promise<UserProfile[]> => {
  if (IS_MOCK_ENV) {
    const usersJson = localStorage.getItem('prode_users') || '[]';
    const usersList: UserProfile[] = JSON.parse(usersJson);
    return usersList;
  }

  const snapshot = await getDocs(collection(db, 'users'));
  const users: UserProfile[] = [];
  snapshot.forEach((docSnap) => {
    users.push(docSnap.data() as UserProfile);
  });
  return users;
};
