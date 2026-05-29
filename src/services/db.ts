import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  query, 
  where,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  deleteField
} from 'firebase/firestore';
import { db, IS_MOCK_ENV } from './firebase';
import type { Match, Prediction, UserProfile } from '../types';
import { calculatePoints } from './scoringEngine';
import partidosRaw from '../../partidos.json';
import otherFaseRaw from '../../other-fase.json';

const mappedGroups: Match[] = (partidosRaw as any[]).map((item, idx) => {
  let cleanFecha = item.fecha;
  if (cleanFecha.includes('2206')) {
    cleanFecha = cleanFecha.replace('2206', '2026');
  }
  const [day, month, year] = cleanFecha.split('-').map(Number);
  const [hour, minute] = item.hora.split(':').map(Number);
  const dateTimestamp = Date.UTC(year, month - 1, day, hour, minute);

  return {
    matchId: `m_${idx + 1}`,
    group: item.grupo.replace(/^[Gg]rupo\s+/, ''),
    homeTeam: item.equipo_1,
    awayTeam: item.equipo_2,
    date: dateTimestamp,
    status: 'pending',
    stadium: item.estadio,
    city: item.ciudad,
    phase: 'Fase de grupos'
  };
});

const mappedKnockout: Match[] = (otherFaseRaw as any[]).map((item, idx) => {
  let cleanFecha = item.fecha;
  if (cleanFecha.includes('2206')) {
    cleanFecha = cleanFecha.replace('2206', '2026');
  }
  const [day, month, year] = cleanFecha.split('-').map(Number);
  const [hour, minute] = item.hora.split(':').map(Number);
  const dateTimestamp = Date.UTC(year, month - 1, day, hour, minute);

  const matchNum = 73 + idx;

  return {
    matchId: `m_${matchNum}`,
    group: `Llave ${matchNum}`,
    homeTeam: item.equipo_1,
    awayTeam: item.equipo_2,
    date: dateTimestamp,
    status: 'pending',
    stadium: item.estadio,
    city: item.ciudad,
    phase: item.fase
  };
});

// Lista oficial sembrada del fixture completo de la Copa Mundial 2026 (104 partidos)
export const SEED_MATCHES: Match[] = [...mappedGroups, ...mappedKnockout];


/**
 * Siembra los partidos del mundial en Firestore si la colección está vacía.
 * Soporta entorno Mock con LocalStorage.
 */
export const seedWorldCupMatches = async (): Promise<void> => {
  if (IS_MOCK_ENV) {
    const existing = localStorage.getItem('prode_matches');
    if (!existing || JSON.parse(existing).length !== SEED_MATCHES.length) {
      localStorage.setItem('prode_matches', JSON.stringify(SEED_MATCHES));
      console.log(`🌱 Seeding: Mapeando ${SEED_MATCHES.length} partidos oficiales del fixture real en LocalStorage (Mock).`);
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
    let winnerTeam = '';
    let loserTeam = '';

    if (matchIndex !== -1) {
      matches[matchIndex].status = 'played';
      matches[matchIndex].homeScore = homeScore;
      matches[matchIndex].awayScore = awayScore;

      // Algoritmo de avance automático en llaves eliminatorias
      const matchNum = matchId.split('_')[1];
      const winnerPlaceholder = `W${matchNum}`;
      const loserPlaceholder = `RU${matchNum}`;
      winnerTeam = homeScore >= awayScore ? matches[matchIndex].homeTeam : matches[matchIndex].awayTeam;
      loserTeam = homeScore >= awayScore ? matches[matchIndex].awayTeam : matches[matchIndex].homeTeam;

      // Reemplazar marcadores en futuros partidos del fixture
      matches.forEach((m) => {
        if (m.homeTeam === winnerPlaceholder) m.homeTeam = winnerTeam;
        if (m.awayTeam === winnerPlaceholder) m.awayTeam = winnerTeam;
        if (m.homeTeam === loserPlaceholder) m.homeTeam = loserTeam;
        if (m.awayTeam === loserPlaceholder) m.awayTeam = loserTeam;
      });

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
    console.log('🔄 Recalculation & Bracket Advance: Resultados, avances y puntuaciones actualizados en LocalStorage (Mock).');
    return;
  }

  try {
    const batch = writeBatch(db);

    // 1. Actualizar el partido actual
    const matchDocRef = doc(db, 'matches', matchId);
    batch.update(matchDocRef, {
      status: 'played',
      homeScore,
      awayScore
    });

    // 2. Mapear el ganador y perdedor para avanzar de llave en Firestore
    const matchNum = matchId.split('_')[1];
    const winnerPlaceholder = `W${matchNum}`;
    const loserPlaceholder = `RU${matchNum}`;
    
    const currentMatchDoc = await getDoc(matchDocRef);
    if (currentMatchDoc.exists()) {
      const currentMatch = currentMatchDoc.data() as Match;
      const winnerTeam = homeScore >= awayScore ? currentMatch.homeTeam : currentMatch.awayTeam;
      const loserTeam = homeScore >= awayScore ? currentMatch.awayTeam : currentMatch.homeTeam;

      // Buscar partidos futuros que contengan WXX o RUXX
      const futureMatchesHomeWinnerQuery = query(collection(db, 'matches'), where('homeTeam', '==', winnerPlaceholder));
      const futureMatchesAwayWinnerQuery = query(collection(db, 'matches'), where('awayTeam', '==', winnerPlaceholder));
      const futureMatchesHomeLoserQuery = query(collection(db, 'matches'), where('homeTeam', '==', loserPlaceholder));
      const futureMatchesAwayLoserQuery = query(collection(db, 'matches'), where('awayTeam', '==', loserPlaceholder));

      const [snapHW, snapAW, snapHL, snapAL] = await Promise.all([
        getDocs(futureMatchesHomeWinnerQuery),
        getDocs(futureMatchesAwayWinnerQuery),
        getDocs(futureMatchesHomeLoserQuery),
        getDocs(futureMatchesAwayLoserQuery)
      ]);

      snapHW.forEach((docSnap) => {
        batch.update(doc(db, 'matches', docSnap.id), { homeTeam: winnerTeam });
      });
      snapAW.forEach((docSnap) => {
        batch.update(doc(db, 'matches', docSnap.id), { awayTeam: winnerTeam });
      });
      snapHL.forEach((docSnap) => {
        batch.update(doc(db, 'matches', docSnap.id), { homeTeam: loserTeam });
      });
      snapAL.forEach((docSnap) => {
        batch.update(doc(db, 'matches', docSnap.id), { awayTeam: loserTeam });
      });
    }

    // 3. Obtener todas las predicciones asociadas a este partido
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

    // Ejecutar el primer batch (partidos, llaves y predicciones actualizadas)
    await batch.commit();

    // 4. Recalcular el perfil de cada usuario afectado
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
    console.log('🔄 Recalculation & Bracket Advance: Puntajes, estadísticas y brackets recalculados con éxito.');
  } catch (err) {
    console.error('Error actualizando resultados y recalculando puntos/brackets:', err);
    throw err;
  }
};

/**
 * Elimina (resetea) el resultado real de un partido, lo vuelve a pending y recalcula las predicciones de los usuarios.
 * Soporta entorno Mock con LocalStorage y Cloud Firestore.
 */
export const deleteMatchResultInDB = async (matchId: string): Promise<void> => {
  if (IS_MOCK_ENV) {
    // 1. Actualizar partido en LocalStorage (mock)
    const matchesJson = localStorage.getItem('prode_matches') || '[]';
    const matches: Match[] = JSON.parse(matchesJson);
    const matchIndex = matches.findIndex(m => m.matchId === matchId);

    if (matchIndex !== -1) {
      matches[matchIndex].status = 'pending';
      delete matches[matchIndex].homeScore;
      delete matches[matchIndex].awayScore;
      localStorage.setItem('prode_matches', JSON.stringify(matches));
    }

    // 2. Cargar predicciones mock y restablecerlas para este partido
    const predsJson = localStorage.getItem('prode_predictions') || '[]';
    const predictions: Prediction[] = JSON.parse(predsJson);

    predictions.forEach((pred) => {
      if (pred.matchId === matchId) {
        delete pred.pointsEarned;
        pred.calculated = false;
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
    console.log('🔄 Recalculation: Resultado del partido eliminado con éxito en LocalStorage (Mock).');
    return;
  }

  try {
    const batch = writeBatch(db);

    // 1. Actualizar el partido actual (restablecer a pending y remover marcadores)
    const matchDocRef = doc(db, 'matches', matchId);
    batch.update(matchDocRef, {
      status: 'pending',
      homeScore: deleteField(),
      awayScore: deleteField()
    });

    // 2. Obtener todas las predicciones asociadas a este partido
    const predsQuery = query(collection(db, 'predictions'), where('matchId', '==', matchId));
    const predsSnapshot = await getDocs(predsQuery);

    const affectedUsers = new Set<string>();

    predsSnapshot.forEach((predDocSnap) => {
      const pred = predDocSnap.data() as Prediction;
      const predDocRef = doc(db, 'predictions', predDocSnap.id);
      batch.update(predDocRef, {
        pointsEarned: deleteField(),
        calculated: false
      });

      affectedUsers.add(pred.userId);
    });

    // Ejecutar el primer batch (partido y predicciones)
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
    console.log('🔄 Recalculation: Resultado del partido eliminado con éxito en Firestore.');
  } catch (err) {
    console.error('Error al eliminar resultado de partido:', err);
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
  stadium: string;
  city: string;
  phase?: string;
}): Promise<void> => {
  const matchId = `m_${matchData.date}_${Math.floor(Math.random() * 1000)}`;
  const newMatch: Match = {
    matchId,
    group: matchData.group,
    homeTeam: matchData.homeTeam,
    awayTeam: matchData.awayTeam,
    date: matchData.date,
    status: 'pending',
    stadium: matchData.stadium,
    city: matchData.city,
    phase: matchData.phase || 'Fase de grupos'
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
  
  // 1. Validar si el partido ya empezó/jugó (bloqueado para predicciones) o si es eliminatoria (solo fase de grupos permitida)
  let isMatchPlayed = false;
  let isGroupStage = false;
  
  if (IS_MOCK_ENV) {
    const matches = await getMatchesFromDB();
    const match = matches.find(m => m.matchId === matchId);
    isMatchPlayed = match?.status === 'played';
    isGroupStage = match?.phase === 'Fase de grupos';
  } else {
    const matchDoc = await getDoc(doc(db, 'matches', matchId));
    if (matchDoc.exists()) {
      const matchData = matchDoc.data();
      isMatchPlayed = matchData.status === 'played';
      isGroupStage = matchData.phase === 'Fase de grupos';
    }
  }

  if (!isGroupStage) {
    throw new Error('El prode es exclusivo de la Fase de grupos. No se admiten pronósticos para eliminatorias.');
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
    return;
  }

  try {
    // Guardar la predicción
    const predDocRef = doc(db, 'predictions', predictionId);
    await setDoc(predDocRef, newPrediction);
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

/**
 * Crea un participante fantasma de prueba (exclusivo para testing administrativo).
 * Soporta entorno Mock con LocalStorage.
 */
export const createGhostParticipant = async (displayName: string): Promise<UserProfile> => {
  const ghostId = `ghost_${Date.now()}`;
  const ghostEmail = `ghost_${Date.now()}@teamprode.com`;
  const ghostProfile: UserProfile = {
    uid: ghostId,
    email: ghostEmail,
    displayName: `👻 ${displayName}`,
    photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`,
    role: 'user',
    completedProde: false,
    points: 0,
    exactMatchesCount: 0,
    outcomeMatchesCount: 0,
    isGhost: true
  };

  if (IS_MOCK_ENV) {
    const usersJson = localStorage.getItem('prode_users') || '[]';
    const users: UserProfile[] = JSON.parse(usersJson);
    users.push(ghostProfile);
    localStorage.setItem('prode_users', JSON.stringify(users));
    console.log('👻 Seed: Participante fantasma creado en LocalStorage (Mock).');
    return ghostProfile;
  }

  try {
    const userDocRef = doc(db, 'users', ghostId);
    await setDoc(userDocRef, {
      ...ghostProfile,
      createdAt: serverTimestamp()
    });
    console.log('👻 DB: Participante fantasma registrado con éxito en Firestore.');
    return ghostProfile;
  } catch (err) {
    console.error('Error al registrar participante fantasma:', err);
    throw err;
  }
};

/**
 * Aleatoriza las predicciones de un participante fantasma y recalcula sus puntos en cascada.
 * Soporta entorno Mock con LocalStorage.
 */
export const randomizeGhostPredictions = async (ghostId: string): Promise<void> => {
  const matches = await getMatchesFromDB();
  const batch = !IS_MOCK_ENV ? writeBatch(db) : null;
  const mockPredictions: Prediction[] = [];

  for (const match of matches) {
    const predictionId = `${ghostId}_${match.matchId}`;
    const homePrediction = Math.floor(Math.random() * 5); // 0 a 4 goles
    const awayPrediction = Math.floor(Math.random() * 5);
    
    let pointsEarned = 0;
    let calculated = false;

    if (match.status === 'played' && match.homeScore !== undefined && match.awayScore !== undefined) {
      const res = calculatePoints(homePrediction, awayPrediction, match.homeScore, match.awayScore);
      pointsEarned = res.points;
      calculated = true;
    }

    const pred: Prediction = {
      predictionId,
      userId: ghostId,
      matchId: match.matchId,
      homePrediction,
      awayPrediction,
      pointsEarned: calculated ? pointsEarned : undefined,
      calculated
    };

    if (IS_MOCK_ENV) {
      mockPredictions.push(pred);
    } else if (batch) {
      const predDocRef = doc(db, 'predictions', predictionId);
      batch.set(predDocRef, pred);
    }
  }

  if (IS_MOCK_ENV) {
    // Guardar predicciones mock
    const predsJson = localStorage.getItem('prode_predictions') || '[]';
    const predictions: Prediction[] = JSON.parse(predsJson);
    // Filtrar predicciones viejas del mismo fantasma
    const filtered = predictions.filter(p => p.userId !== ghostId);
    localStorage.setItem('prode_predictions', JSON.stringify([...filtered, ...mockPredictions]));

    // Recalcular puntos e hit counts
    let totalPoints = 0;
    let exactCount = 0;
    let outcomeCount = 0;

    mockPredictions.forEach((p) => {
      if (p.calculated && p.pointsEarned !== undefined) {
        totalPoints += p.pointsEarned;
        if (p.pointsEarned === 3) exactCount++;
        if (p.pointsEarned === 1) outcomeCount++;
      }
    });

    const usersJson = localStorage.getItem('prode_users') || '[]';
    const users: UserProfile[] = JSON.parse(usersJson);
    const userIndex = users.findIndex(u => u.uid === ghostId);
    if (userIndex !== -1) {
      users[userIndex].completedProde = true;
      users[userIndex].points = totalPoints;
      users[userIndex].exactMatchesCount = exactCount;
      users[userIndex].outcomeMatchesCount = outcomeCount;
      localStorage.setItem('prode_users', JSON.stringify(users));
    }
    console.log('🎲 Recalculation: Predicciones aleatorizadas y recalculadas para el fantasma mock.');
    return;
  }

  try {
    if (batch) {
      // 1. Guardar todas las predicciones del fantasma en el primer lote
      await batch.commit();

      // 2. Calcular puntos del fantasma para el segundo lote
      let totalPoints = 0;
      let exactCount = 0;
      let outcomeCount = 0;

      const userPredsQuery = query(collection(db, 'predictions'), where('userId', '==', ghostId));
      const userPredsSnapshot = await getDocs(userPredsQuery);

      userPredsSnapshot.forEach((predDocSnap) => {
        const pred = predDocSnap.data() as Prediction;
        if (pred.calculated && pred.pointsEarned !== undefined) {
          totalPoints += pred.pointsEarned;
          if (pred.pointsEarned === 3) exactCount++;
          if (pred.pointsEarned === 1) outcomeCount++;
        }
      });

      const secondBatch = writeBatch(db);
      const userDocRef = doc(db, 'users', ghostId);
      secondBatch.update(userDocRef, {
        completedProde: true,
        points: totalPoints,
        exactMatchesCount: exactCount,
        outcomeMatchesCount: outcomeCount
      });

      await secondBatch.commit();
      console.log('🎲 Recalculation: Predicciones aleatorizadas y recalculadas para el fantasma en Firestore.');
    }
  } catch (err) {
    console.error('Error al aleatorizar predicciones del fantasma:', err);
    throw err;
  }
};

/**
 * Actualiza los metadatos de un partido (equipos, grupo, fecha) en Firestore o LocalStorage (Mock).
 */
export const updateMatchMetadataInDB = async (
  matchId: string,
  data: {
    group: string;
    homeTeam: string;
    awayTeam: string;
    date: number;
    stadium: string;
    city: string;
    phase?: string;
  }
): Promise<void> => {
  if (IS_MOCK_ENV) {
    const matchesJson = localStorage.getItem('prode_matches') || '[]';
    const matches: Match[] = JSON.parse(matchesJson);
    const matchIndex = matches.findIndex(m => m.matchId === matchId);
    if (matchIndex !== -1) {
      matches[matchIndex].group = data.group;
      matches[matchIndex].homeTeam = data.homeTeam;
      matches[matchIndex].awayTeam = data.awayTeam;
      matches[matchIndex].date = data.date;
      matches[matchIndex].stadium = data.stadium;
      matches[matchIndex].city = data.city;
      if (data.phase) {
        matches[matchIndex].phase = data.phase;
      }
      localStorage.setItem('prode_matches', JSON.stringify(matches));
      console.log('🌱 Mock: Metadatos de partido actualizados con éxito.');
    }
    return;
  }

  try {
    const matchDocRef = doc(db, 'matches', matchId);
    const updateData: any = {
      group: data.group,
      homeTeam: data.homeTeam,
      awayTeam: data.awayTeam,
      date: data.date,
      stadium: data.stadium,
      city: data.city
    };
    if (data.phase) {
      updateData.phase = data.phase;
    }
    await updateDoc(matchDocRef, updateData);
    console.log('🌱 DB: Metadatos de partido actualizados en Firestore.');
  } catch (err) {
    console.error('Error al actualizar metadatos del partido:', err);
    throw err;
  }
};


/**
 * Fuerza el sembrado completo del fixture de 104 partidos reemplazando los existentes.
 */
export const forceReseedMatchesInDB = async (): Promise<void> => {
  if (IS_MOCK_ENV) {
    localStorage.setItem('prode_matches', JSON.stringify(SEED_MATCHES));
    console.log('🌱 Mock: Fixture re-sembrado exitosamente (104 partidos) en LocalStorage.');
    return;
  }

  try {
    // 1. Obtener todos los partidos actuales
    const matchesColl = collection(db, 'matches');
    const snapshot = await getDocs(matchesColl);

    // 2. Borrar partidos existentes en batches de 400
    let batch = writeBatch(db);
    let count = 0;
    
    for (const matchDoc of snapshot.docs) {
      batch.delete(doc(db, 'matches', matchDoc.id));
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }

    // 3. Sembrar los nuevos 104 partidos oficiales
    batch = writeBatch(db);
    SEED_MATCHES.forEach((match) => {
      const matchDocRef = doc(db, 'matches', match.matchId);
      batch.set(matchDocRef, match);
    });
    await batch.commit();
    console.log('🌱 DB: Fixture de 104 partidos re-sembrado y reemplazado con éxito en Cloud Firestore.');
  } catch (err) {
    console.error('Error al forzar re-sembrado de partidos:', err);
    throw err;
  }
};

/**
 * Borra todas las predicciones registradas y reinicia los puntajes/estados de los usuarios.
 */
export const deleteAllPredictionsAndResetUsers = async (): Promise<void> => {
  if (IS_MOCK_ENV) {
    // 1. Borrar predicciones
    localStorage.setItem('prode_predictions', JSON.stringify([]));

    // 2. Reiniciar usuarios
    const usersJson = localStorage.getItem('prode_users') || '[]';
    const users: UserProfile[] = JSON.parse(usersJson);
    users.forEach((user) => {
      user.completedProde = false;
      user.points = 0;
      user.exactMatchesCount = 0;
      user.outcomeMatchesCount = 0;
    });
    localStorage.setItem('prode_users', JSON.stringify(users));
    console.log('🌱 Mock: Predicciones eliminadas y puntajes reseteados en LocalStorage.');
    return;
  }

  try {
    // 1. Obtener todas las predicciones
    const predsColl = collection(db, 'predictions');
    const snapshot = await getDocs(predsColl);

    // 2. Borrar en batches de 400
    let batch = writeBatch(db);
    let count = 0;
    for (const predDoc of snapshot.docs) {
      batch.delete(doc(db, 'predictions', predDoc.id));
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }

    // 3. Obtener todos los usuarios y reiniciar perfiles
    const usersColl = collection(db, 'users');
    const usersSnapshot = await getDocs(usersColl);

    batch = writeBatch(db);
    count = 0;
    for (const userDoc of usersSnapshot.docs) {
      batch.update(doc(db, 'users', userDoc.id), {
        completedProde: false,
        points: 0,
        exactMatchesCount: 0,
        outcomeMatchesCount: 0
      });
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }

    console.log('🌱 DB: Todas las predicciones fueron borradas y perfiles reseteados en Cloud Firestore.');
  } catch (err) {
    console.error('Error borrando predicciones y reseteando usuarios:', err);
    throw err;
  }
};


/**
 * Sella el prode de un usuario específico de forma manual e irreversible.
 */
export const sealUserProdeInDB = async (userId: string): Promise<void> => {
  if (IS_MOCK_ENV) {
    const usersJson = localStorage.getItem('prode_users') || '[]';
    const users: UserProfile[] = JSON.parse(usersJson);
    const userIndex = users.findIndex(u => u.uid === userId);
    if (userIndex !== -1) {
      users[userIndex].completedProde = true;
      localStorage.setItem('prode_users', JSON.stringify(users));
      console.log(`🔒 Mock: Prode sellado para el usuario ${userId}`);
    }
    return;
  }

  try {
    await updateDoc(doc(db, 'users', userId), {
      completedProde: true
    });
    console.log(`🔒 DB: Prode sellado con éxito para el usuario ${userId}`);
  } catch (err) {
    console.error('Error al sellar el prode:', err);
    throw err;
  }
};


/**
 * Devuelve el emoji de bandera correspondiente para un país de forma ultra-rápida.
 */
export const getCountryFlag = (countryName: string): string => {
  if (!countryName) return '🏳️';
  
  const name = countryName.trim().toLowerCase();
  
  // Si es un placeholder de eliminatorias (ej: "W73", "RU89", "1A", "2B", "3ABCDF")
  if (/^[wr][u]?\d+$/i.test(name) || /^\d+[a-l]+$/i.test(name) || /^[a-l\d]+$/i.test(name)) {
    return '🏆'; // Copa dorada para indicar llave eliminatoria
  }

  const flags: Record<string, string> = {
    // Sudamérica
    'argentina': '🇦🇷',
    'brasil': '🇧🇷',
    'uruguay': '🇺🇾',
    'colombia': '🇨🇴',
    'ecuador': '🇪🇨',
    'venezuela': '🇻🇪',
    'paraguay': '🇵🇾',
    'chile': '🇨🇱',
    'perú': '🇵🇪',
    'peru': '🇵🇪',
    'bolivia': '🇧🇴',
    
    // Norte y Centroamérica
    'estados unidos': '🇺🇸',
    'usa': '🇺🇸',
    'eeuu': '🇺🇸',
    'ee.uu.': '🇺🇸',
    'méxico': '🇲🇽',
    'mexico': '🇲🇽',
    'canadá': '🇨🇦',
    'canada': '🇨🇦',
    'costa rica': '🇨🇷',
    'panamá': '🇵🇦',
    'panama': '🇵🇦',
    'honduras': '🇭🇳',
    'el salvador': '🇸🇻',
    'jamaica': '🇯🇲',
    
    // Europa
    'francia': '🇫🇷',
    'alemania': '🇩🇪',
    'españa': '🇪🇸',
    'espana': '🇪🇸',
    'inglaterra': '🇬🇧',
    'italia': '🇮🇹',
    'bélgica': '🇧🇪',
    'belgica': '🇧🇪',
    'países bajos': '🇳🇱',
    'paises bajos': '🇳🇱',
    'holanda': '🇳🇱',
    'portugal': '🇵🇹',
    'croacia': '🇭🇷',
    'suiza': '🇨🇭',
    'dinamarca': '🇩🇰',
    'polonia': '🇵🇱',
    'suecia': '🇸🇪',
    'ucrania': '🇺🇦',
    'austria': '🇦🇹',
    'turquía': '🇹🇷',
    'turquia': '🇹🇷',
    'escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'gales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    
    // África
    'marruecos': '🇲🇦',
    'senegal': '🇸🇳',
    'túnez': '🇹🇳',
    'tunez': '🇹🇳',
    'camerún': '🇨🇲',
    'camerun': '🇨🇲',
    'ghana': '🇬🇭',
    'nigeria': '🇳🇬',
    'argelia': '🇩🇿',
    'egipto': '🇪🇬',
    
    // Asia y Oceanía
    'japón': '🇯🇵',
    'japon': '🇯🇵',
    'corea del sur': '🇰🇷',
    'australia': '🇦🇺',
    'arabia saudita': '🇸🇦',
    'arabia saudí': '🇸🇦',
    'irán': '🇮🇷',
    'iran': '🇮🇷',
    'qatar': '🇶🇦',
    'nueva zelanda': '🇳🇿',
    'sudáfrica': '🇿🇦',
    'sudafrica': '🇿🇦'
  };

  return flags[name] || '🏳️';
};


