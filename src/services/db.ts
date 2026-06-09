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
  deleteField,
  deleteDoc
} from 'firebase/firestore';
import { db, IS_MOCK_ENV } from './firebase';
import type { Match, Prediction, UserProfile, Tournament, TournamentParticipant, UserRole } from '../types';
import { calculatePoints, calculatePointsSimple } from './scoringEngine';
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
        const res = calculatePoints(pred.homePrediction ?? 0, pred.awayPrediction ?? 0, homeScore, awayScore);
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
    await recalculateCustomTournamentsForMatch(matchId, homeScore, awayScore, false);
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
      const res = calculatePoints(pred.homePrediction ?? 0, pred.awayPrediction ?? 0, homeScore, awayScore);
      
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
    await recalculateCustomTournamentsForMatch(matchId, homeScore, awayScore, false);
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
    await recalculateCustomTournamentsForMatch(matchId, undefined, undefined, true);
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
    await recalculateCustomTournamentsForMatch(matchId, undefined, undefined, true);
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
 * Borra una predicción individual de la base de datos o LocalStorage.
 */
export const clearUserPrediction = async (
  userId: string,
  matchId: string
): Promise<void> => {
  const predictionId = `${userId}_${matchId}`;
  
  if (IS_MOCK_ENV) {
    const predsJson = localStorage.getItem('prode_predictions') || '[]';
    const predictions: Prediction[] = JSON.parse(predsJson);
    const filtered = predictions.filter(p => p.predictionId !== predictionId);
    localStorage.setItem('prode_predictions', JSON.stringify(filtered));
    return;
  }

  try {
    const predDocRef = doc(db, 'predictions', predictionId);
    await deleteDoc(predDocRef);
  } catch (err) {
    console.error('Error al borrar predicción:', err);
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

/**
 * Aleatoriza las predicciones de TODOS los participantes fantasmas "SOLO PARA LA FASE DE GRUPOS".
 * Soporta entorno Mock con LocalStorage y Cloud Firestore.
 */
export const randomizeAllGhostsGroupStagePredictions = async (): Promise<void> => {
  const users = await getAllParticipantsFromDB();
  const ghosts = users.filter(u => u.isGhost);
  const matches = await getMatchesFromDB();
  const groupStageMatches = matches.filter(m => m.phase === 'Fase de grupos');

  if (IS_MOCK_ENV) {
    const predsJson = localStorage.getItem('prode_predictions') || '[]';
    let predictions: Prediction[] = JSON.parse(predsJson);

    ghosts.forEach((ghost) => {
      // Filtrar predicciones de fase de grupos previas para este fantasma
      predictions = predictions.filter(p => !(p.userId === ghost.uid && groupStageMatches.some(m => m.matchId === p.matchId)));

      groupStageMatches.forEach((match) => {
        const predictionId = `${ghost.uid}_${match.matchId}`;
        const homePrediction = Math.floor(Math.random() * 5); // 0 a 4 goles
        const awayPrediction = Math.floor(Math.random() * 5);

        predictions.push({
          predictionId,
          userId: ghost.uid,
          matchId: match.matchId,
          homePrediction,
          awayPrediction,
          calculated: false
        });
      });
    });

    localStorage.setItem('prode_predictions', JSON.stringify(predictions));

    // Marcar completedProde como true para todos los fantasmas
    const usersJson = localStorage.getItem('prode_users') || '[]';
    const allUsers: UserProfile[] = JSON.parse(usersJson);
    allUsers.forEach((u) => {
      if (u.isGhost) {
        u.completedProde = true;
      }
    });
    localStorage.setItem('prode_users', JSON.stringify(allUsers));
    console.log('🎲 Scenario: Se aleatorizaron las predicciones de la Fase de grupos para TODOS los fantasmas en LocalStorage (Mock).');
    return;
  }

  try {
    // Para producción
    let batch = writeBatch(db);
    let count = 0;

    for (const ghost of ghosts) {
      for (const match of groupStageMatches) {
        const predictionId = `${ghost.uid}_${match.matchId}`;
        const homePrediction = Math.floor(Math.random() * 5);
        const awayPrediction = Math.floor(Math.random() * 5);

        const predDocRef = doc(db, 'predictions', predictionId);
        batch.set(predDocRef, {
          predictionId,
          userId: ghost.uid,
          matchId: match.matchId,
          homePrediction,
          awayPrediction,
          calculated: false
        });

        count++;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      const userDocRef = doc(db, 'users', ghost.uid);
      batch.update(userDocRef, { completedProde: true });
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
    console.log('🎲 Scenario: Se aleatorizaron las predicciones de la Fase de grupos para TODOS los fantasmas en Firestore.');
  } catch (err) {
    console.error('Error al aleatorizar predicciones grupales de fantasmas:', err);
    throw err;
  }
};

/**
 * Aleatoriza las predicciones de TODOS los participantes fantasmas "SOLO PARA LA FASE DE ELIMINATORIAS".
 * Soporta entorno Mock con LocalStorage y Cloud Firestore.
 */
export const randomizeAllGhostsKnockoutStagePredictions = async (): Promise<void> => {
  const users = await getAllParticipantsFromDB();
  const ghosts = users.filter(u => u.isGhost);
  const matches = await getMatchesFromDB();
  const knockoutMatches = matches.filter(m => m.phase !== 'Fase de grupos');

  if (IS_MOCK_ENV) {
    const predsJson = localStorage.getItem('prode_predictions') || '[]';
    let predictions: Prediction[] = JSON.parse(predsJson);

    ghosts.forEach((ghost) => {
      predictions = predictions.filter(p => !(p.userId === ghost.uid && knockoutMatches.some(m => m.matchId === p.matchId)));

      knockoutMatches.forEach((match) => {
        const predictionId = `${ghost.uid}_${match.matchId}`;
        const homePrediction = Math.floor(Math.random() * 5); // 0 a 4 goles
        const awayPrediction = Math.floor(Math.random() * 5);

        predictions.push({
          predictionId,
          userId: ghost.uid,
          matchId: match.matchId,
          homePrediction,
          awayPrediction,
          calculated: false
        });
      });
    });

    localStorage.setItem('prode_predictions', JSON.stringify(predictions));
    console.log('🎲 Scenario: Se aleatorizaron las predicciones de la Fase de Eliminatorias para TODOS los fantasmas en LocalStorage (Mock).');
    return;
  }

  try {
    let batch = writeBatch(db);
    let count = 0;

    for (const ghost of ghosts) {
      for (const match of knockoutMatches) {
        const predictionId = `${ghost.uid}_${match.matchId}`;
        const homePrediction = Math.floor(Math.random() * 5);
        const awayPrediction = Math.floor(Math.random() * 5);

        const predDocRef = doc(db, 'predictions', predictionId);
        batch.set(predDocRef, {
          predictionId,
          userId: ghost.uid,
          matchId: match.matchId,
          homePrediction,
          awayPrediction,
          calculated: false
        });

        count++;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
    }

    if (count > 0) {
      await batch.commit();
    }
    console.log('🎲 Scenario: Se aleatorizaron las predicciones de la Fase de Eliminatorias para TODOS los fantasmas en Firestore.');
  } catch (err) {
    console.error('Error al aleatorizar predicciones de eliminatorias de fantasmas:', err);
    throw err;
  }
};

/**
 * Actualiza el nombre de un participante fantasma.
 * Soporta entorno Mock con LocalStorage y Cloud Firestore.
 */
export const updateGhostNameInDB = async (ghostUid: string, newName: string): Promise<void> => {
  const cleanName = newName.startsWith('👻 ') ? newName : `👻 ${newName}`;
  
  if (IS_MOCK_ENV) {
    const usersJson = localStorage.getItem('prode_users') || '[]';
    const users: UserProfile[] = JSON.parse(usersJson);
    const index = users.findIndex(u => u.uid === ghostUid);
    if (index !== -1) {
      users[index].displayName = cleanName;
      localStorage.setItem('prode_users', JSON.stringify(users));
      console.log(`👻 Mock: Nombre del fantasma actualizado a ${cleanName}`);
    }
    return;
  }

  try {
    const docRef = doc(db, 'users', ghostUid);
    await updateDoc(docRef, {
      displayName: cleanName
    });
    console.log(`👻 DB: Nombre del fantasma actualizado a ${cleanName} en Firestore.`);
  } catch (err) {
    console.error('Error al actualizar nombre de fantasma:', err);
    throw err;
  }
};

/**
 * Elimina un participante fantasma de la base de datos junto con todas sus predicciones.
 * Soporta entorno Mock con LocalStorage y Cloud Firestore.
 */
export const deleteGhostFromDB = async (ghostUid: string): Promise<void> => {
  if (IS_MOCK_ENV) {
    // 1. Remover usuario
    const usersJson = localStorage.getItem('prode_users') || '[]';
    const users: UserProfile[] = JSON.parse(usersJson);
    const updatedUsers = users.filter(u => u.uid !== ghostUid);
    localStorage.setItem('prode_users', JSON.stringify(updatedUsers));

    // 2. Remover predicciones del usuario
    const predsJson = localStorage.getItem('prode_predictions') || '[]';
    const predictions: Prediction[] = JSON.parse(predsJson);
    const updatedPreds = predictions.filter(p => p.userId !== ghostUid);
    localStorage.setItem('prode_predictions', JSON.stringify(updatedPreds));

    console.log(`👻 Mock: Fantasma ${ghostUid} y sus predicciones eliminados.`);
    return;
  }

  try {
    // 1. Obtener todas las predicciones del fantasma
    const predsQuery = query(collection(db, 'predictions'), where('userId', '==', ghostUid));
    const snapshot = await getDocs(predsQuery);

    let batch = writeBatch(db);
    let count = 0;

    snapshot.forEach((predDoc) => {
      batch.delete(doc(db, 'predictions', predDoc.id));
      count++;
      if (count >= 400) {
        batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    });

    // 2. Borrar perfil de usuario
    batch.delete(doc(db, 'users', ghostUid));
    await batch.commit();

    console.log(`👻 DB: Fantasma ${ghostUid} y sus predicciones eliminados de Firestore.`);
  } catch (err) {
    console.error('Error al eliminar fantasma:', err);
    throw err;
  }
};

/**
 * Elimina por completo todas las predicciones de todos los participantes fantasmas, restableciendo sus puntos a 0.
 * Soporta entorno Mock con LocalStorage y Cloud Firestore.
 */
export const clearAllGhostsPredictionsInDB = async (): Promise<void> => {
  const users = await getAllParticipantsFromDB();
  const ghosts = users.filter(u => u.isGhost);
  const ghostUids = ghosts.map(u => u.uid);

  if (IS_MOCK_ENV) {
    const predsJson = localStorage.getItem('prode_predictions') || '[]';
    const predictions: Prediction[] = JSON.parse(predsJson);
    const filteredPreds = predictions.filter(p => !ghostUids.includes(p.userId));
    localStorage.setItem('prode_predictions', JSON.stringify(filteredPreds));

    const usersJson = localStorage.getItem('prode_users') || '[]';
    const allUsers: UserProfile[] = JSON.parse(usersJson);
    allUsers.forEach((u) => {
      if (u.isGhost) {
        u.completedProde = false;
        u.points = 0;
        u.exactMatchesCount = 0;
        u.outcomeMatchesCount = 0;
      }
    });
    localStorage.setItem('prode_users', JSON.stringify(allUsers));
    console.log('🧹 Scenario: Predicciones de todos los fantasmas eliminadas en LocalStorage (Mock).');
    return;
  }

  try {
    let batch = writeBatch(db);
    let count = 0;

    for (const ghostUid of ghostUids) {
      const predsQuery = query(collection(db, 'predictions'), where('userId', '==', ghostUid));
      const snapshot = await getDocs(predsQuery);

      snapshot.forEach((predDoc) => {
        batch.delete(doc(db, 'predictions', predDoc.id));
        count++;
        if (count >= 400) {
          batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      });

      const userDocRef = doc(db, 'users', ghostUid);
      batch.update(userDocRef, {
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
    console.log('🧹 Scenario: Predicciones de todos los fantasmas eliminadas en Firestore.');
  } catch (err) {
    console.error('Error al limpiar predicciones de fantasmas:', err);
    throw err;
  }
};

/**
 * Recalcula las puntuaciones de todos los torneos personalizados para un partido específico.
 */
export const recalculateCustomTournamentsForMatch = async (
  matchId: string,
  homeScore?: number,
  awayScore?: number,
  isDelete: boolean = false
): Promise<void> => {
  if (IS_MOCK_ENV) {
    const tourneysJson = localStorage.getItem('prode_tournaments') || '[]';
    const tourneys: Tournament[] = JSON.parse(tourneysJson);

    const predsJson = localStorage.getItem('prode_tournament_predictions') || '[]';
    const predictions = JSON.parse(predsJson);

    const partsJson = localStorage.getItem('prode_tournament_participants') || '[]';
    const participants = JSON.parse(partsJson);

    tourneys.forEach((t) => {
      const tournamentPreds = predictions.filter((p: any) => p.tournamentId === t.id && p.prediction.matchId === matchId);

      tournamentPreds.forEach((item: any) => {
        const pred = item.prediction;
        if (isDelete) {
          delete pred.pointsEarned;
          pred.calculated = false;
        } else if (homeScore !== undefined && awayScore !== undefined) {
          if (t.modality === 'simple') {
            if (pred.predictionOutcome) {
              const res = calculatePointsSimple(pred.predictionOutcome, homeScore, awayScore);
              pred.pointsEarned = res.points;
              pred.calculated = true;
            }
          } else {
            if (pred.homePrediction !== undefined && pred.awayPrediction !== undefined) {
              const res = calculatePoints(pred.homePrediction, pred.awayPrediction, homeScore, awayScore);
              pred.pointsEarned = res.points;
              pred.calculated = true;
            }
          }
        }
      });

      const tournamentParticipants = participants.filter((p: any) => p.tournamentId === t.id);
      tournamentParticipants.forEach((pItem: any) => {
        const part = pItem.participant;
        const userPreds = predictions
          .filter((p: any) => p.tournamentId === t.id && p.prediction.userId === part.uid)
          .map((p: any) => p.prediction);

        let totalPoints = 0;
        let exactCount = 0;
        let outcomeCount = 0;

        userPreds.forEach((pred: any) => {
          if (pred.calculated && pred.pointsEarned !== undefined) {
            totalPoints += pred.pointsEarned;
            if (t.modality === 'simple') {
              if (pred.pointsEarned === 1) outcomeCount++;
            } else {
              if (pred.pointsEarned === 3) exactCount++;
              if (pred.pointsEarned === 1) outcomeCount++;
            }
          }
        });

        part.points = totalPoints;
        part.exactMatchesCount = exactCount;
        part.outcomeMatchesCount = outcomeCount;
      });
    });

    localStorage.setItem('prode_tournament_predictions', JSON.stringify(predictions));
    localStorage.setItem('prode_tournament_participants', JSON.stringify(participants));
    console.log('🔄 Recalculation: Torneos personalizados actualizados en LocalStorage (Mock).');
    return;
  }

  try {
    const tournamentsSnap = await getDocs(collection(db, 'tournaments'));

    for (const tDoc of tournamentsSnap.docs) {
      const t = tDoc.data() as Tournament;
      const predsColl = collection(db, 'tournaments', t.id, 'predictions');

      const predsQuery = query(predsColl, where('matchId', '==', matchId));
      const predsSnap = await getDocs(predsQuery);

      const affectedUsers = new Set<string>();
      let batch = writeBatch(db);
      let count = 0;

      for (const predDocSnap of predsSnap.docs) {
        const pred = predDocSnap.data() as Prediction;
        affectedUsers.add(pred.userId);

        if (isDelete) {
          batch.update(predDocSnap.ref, {
            pointsEarned: deleteField(),
            calculated: false
          });
        } else if (homeScore !== undefined && awayScore !== undefined) {
          let points = 0;
          if (t.modality === 'simple') {
            if (pred.predictionOutcome) {
              const res = calculatePointsSimple(pred.predictionOutcome, homeScore, awayScore);
              points = res.points;
            }
          } else {
            if (pred.homePrediction !== undefined && pred.awayPrediction !== undefined) {
              const res = calculatePoints(pred.homePrediction, pred.awayPrediction, homeScore, awayScore);
              points = res.points;
            }
          }

          batch.update(predDocSnap.ref, {
            pointsEarned: points,
            calculated: true
          });
        }

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

      if (affectedUsers.size > 0) {
        let secondBatch = writeBatch(db);
        let secondCount = 0;

        for (const userId of affectedUsers) {
          const userPredsQuery = query(predsColl, where('userId', '==', userId));
          const userPredsSnapshot = await getDocs(userPredsQuery);

          let totalPoints = 0;
          let exactCount = 0;
          let outcomeCount = 0;

          userPredsSnapshot.forEach((predDocSnap) => {
            const pred = predDocSnap.data() as Prediction;
            if (pred.calculated && pred.pointsEarned !== undefined) {
              totalPoints += pred.pointsEarned;
              if (t.modality === 'simple') {
                if (pred.pointsEarned === 1) outcomeCount++;
              } else {
                if (pred.pointsEarned === 3) exactCount++;
                if (pred.pointsEarned === 1) outcomeCount++;
              }
            }
          });

          const participantRef = doc(db, 'tournaments', t.id, 'participants', userId);
          secondBatch.update(participantRef, {
            points: totalPoints,
            exactMatchesCount: exactCount,
            outcomeMatchesCount: outcomeCount
          });

          secondCount++;
          if (secondCount >= 400) {
            await secondBatch.commit();
            secondBatch = writeBatch(db);
            secondCount = 0;
          }
        }

        if (secondCount > 0) {
          await secondBatch.commit();
        }
      }
    }
    console.log('🔄 Recalculation: Torneos personalizados recalculados exitosamente en Firestore.');
  } catch (err) {
    console.error('Error al recalcular torneos personalizados:', err);
    throw err;
  }
};

/**
 * Crea un nuevo torneo paralelo
 */
export const createTournamentInDB = async (
  name: string,
  modality: 'exact' | 'simple',
  creator: UserProfile
): Promise<Tournament> => {
  const tournamentId = `t_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const newTournament: Tournament = {
    id: tournamentId,
    name,
    modality,
    refereeId: creator.uid,
    createdAt: Date.now()
  };

  if (IS_MOCK_ENV) {
    const tourneysJson = localStorage.getItem('prode_tournaments') || '[]';
    const tourneys: Tournament[] = JSON.parse(tourneysJson);
    tourneys.push(newTournament);
    localStorage.setItem('prode_tournaments', JSON.stringify(tourneys));

    const participant: TournamentParticipant = {
      uid: creator.uid,
      email: creator.email,
      displayName: creator.displayName,
      photoURL: creator.photoURL,
      points: 0,
      exactMatchesCount: 0,
      outcomeMatchesCount: 0,
      completedProde: false,
      joinedAt: Date.now()
    };
    const partsJson = localStorage.getItem('prode_tournament_participants') || '[]';
    const participants = JSON.parse(partsJson);
    participants.push({ tournamentId, participant });
    localStorage.setItem('prode_tournament_participants', JSON.stringify(participants));

    console.log(`🏆 Mock: Torneo ${name} creado con éxito.`);
    return newTournament;
  }

  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await setDoc(tournamentRef, newTournament);

    const participantRef = doc(db, 'tournaments', tournamentId, 'participants', creator.uid);
    const participant: TournamentParticipant = {
      uid: creator.uid,
      email: creator.email,
      displayName: creator.displayName,
      photoURL: creator.photoURL,
      points: 0,
      exactMatchesCount: 0,
      outcomeMatchesCount: 0,
      completedProde: false,
      joinedAt: Date.now()
    };
    await setDoc(participantRef, participant);

    console.log(`🏆 DB: Torneo ${name} creado con éxito en Firestore.`);
    return newTournament;
  } catch (err) {
    console.error('Error al crear torneo:', err);
    throw err;
  }
};

/**
 * Agrega un correo a la whitelist de un torneo.
 * Si el usuario ya está registrado en la app, lo une inmediatamente como participante.
 */
export const inviteUserToTournamentInDB = async (
  tournamentId: string,
  emailToAdd: string,
  refereeId: string | null = null
): Promise<void> => {
  const emailSanitized = emailToAdd.trim().toLowerCase();

  if (IS_MOCK_ENV) {
    const wlJson = localStorage.getItem('prode_tournament_whitelist') || '[]';
    const wl = JSON.parse(wlJson);
    if (!wl.some((entry: any) => entry.tournamentId === tournamentId && entry.email === emailSanitized)) {
      wl.push({ tournamentId, email: emailSanitized });
      localStorage.setItem('prode_tournament_whitelist', JSON.stringify(wl));
    }

    const usersJson = localStorage.getItem('prode_users') || '[]';
    const users: UserProfile[] = JSON.parse(usersJson);
    const userToJoin = users.find(u => u.email.trim().toLowerCase() === emailSanitized);

    if (userToJoin) {
      const partsJson = localStorage.getItem('prode_tournament_participants') || '[]';
      const participants = JSON.parse(partsJson);
      const isAlreadyParticipant = participants.some((p: any) => p.tournamentId === tournamentId && p.participant.uid === userToJoin.uid);
      
      if (!isAlreadyParticipant) {
        const participant: TournamentParticipant = {
          uid: userToJoin.uid,
          email: userToJoin.email,
          displayName: userToJoin.displayName,
          photoURL: userToJoin.photoURL,
          points: 0,
          exactMatchesCount: 0,
          outcomeMatchesCount: 0,
          completedProde: false,
          joinedAt: Date.now()
        };
        participants.push({ tournamentId, participant });
        localStorage.setItem('prode_tournament_participants', JSON.stringify(participants));
      }
    }
    return;
  }

  try {
    const globalWlRef = doc(db, 'whitelist', emailSanitized);
    const globalWlSnap = await getDoc(globalWlRef);

    const batch = writeBatch(db);

    // 1. Crear documento de whitelist en el torneo
    const wlRef = doc(db, 'tournaments', tournamentId, 'whitelist', emailSanitized);
    batch.set(wlRef, {
      email: emailSanitized,
      invitedAt: Date.now()
    });

    // 2. Auto-crear/set en la whitelist global con rol 'user' si no existe
    if (!globalWlSnap.exists()) {
      batch.set(globalWlRef, {
        email: emailSanitized,
        role: 'user',
        addedBy: refereeId || 'referee',
        createdAt: serverTimestamp(),
        tournamentId: tournamentId
      });
    } else {
      const data = globalWlSnap.data();
      if (!data?.tournamentId) {
        batch.update(globalWlRef, {
          tournamentId: tournamentId
        });
      }
    }

    await batch.commit();

    // 3. Si el usuario ya está registrado, unirlo al torneo inmediatamente
    const usersQuery = query(collection(db, 'users'), where('email', '==', emailSanitized));
    const querySnapshot = await getDocs(usersQuery);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as UserProfile;

      const participantRef = doc(db, 'tournaments', tournamentId, 'participants', userData.uid);
      const participant: TournamentParticipant = {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        points: 0,
        exactMatchesCount: 0,
        outcomeMatchesCount: 0,
        completedProde: false,
        joinedAt: Date.now()
      };
      await setDoc(participantRef, participant);
    }
  } catch (err) {
    console.error('Error al invitar al usuario al torneo:', err);
    throw err;
  }
};

/**
 * Mueve un correo electrónico autorizado de la whitelist de un torneo a otro (o global).
 * También maneja la migración de la participación del usuario si ya está registrado.
 */
export const moveWhitelistEntryInDB = async (
  email: string,
  fromTournamentId: string | null,
  toTournamentId: string | null,
  role: UserRole = 'user'
): Promise<void> => {
  const emailSanitized = email.trim().toLowerCase();

  if (IS_MOCK_ENV) {
    // 1. Quitar de la lista vieja
    if (fromTournamentId) {
      const wlJson = localStorage.getItem('prode_tournament_whitelist') || '[]';
      let wl = JSON.parse(wlJson);
      wl = wl.filter((w: any) => !(w.tournamentId === fromTournamentId && w.email === emailSanitized));
      localStorage.setItem('prode_tournament_whitelist', JSON.stringify(wl));
      
      // Quitar participante mock viejo
      const usersJson = localStorage.getItem('prode_users') || '[]';
      const users: UserProfile[] = JSON.parse(usersJson);
      const userObj = users.find(u => u.email.trim().toLowerCase() === emailSanitized);
      if (userObj) {
        const partsJson = localStorage.getItem('prode_tournament_participants') || '[]';
        let participants = JSON.parse(partsJson);
        participants = participants.filter((p: any) => !(p.tournamentId === fromTournamentId && p.participant.uid === userObj.uid));
        localStorage.setItem('prode_tournament_participants', JSON.stringify(participants));
      }
    }

    // 2. Agregar a la nueva lista
    if (toTournamentId) {
      const wlJson = localStorage.getItem('prode_tournament_whitelist') || '[]';
      const wl = JSON.parse(wlJson);
      if (!wl.some((entry: any) => entry.tournamentId === toTournamentId && entry.email === emailSanitized)) {
        wl.push({ tournamentId: toTournamentId, email: emailSanitized });
        localStorage.setItem('prode_tournament_whitelist', JSON.stringify(wl));
      }

      // Añadir participante mock nuevo si el usuario ya existe
      const usersJson = localStorage.getItem('prode_users') || '[]';
      const users: UserProfile[] = JSON.parse(usersJson);
      const userObj = users.find(u => u.email.trim().toLowerCase() === emailSanitized);
      if (userObj) {
        const partsJson = localStorage.getItem('prode_tournament_participants') || '[]';
        const participants = JSON.parse(partsJson);
        const isAlreadyParticipant = participants.some((p: any) => p.tournamentId === toTournamentId && p.participant.uid === userObj.uid);
        if (!isAlreadyParticipant) {
          const participant: TournamentParticipant = {
            uid: userObj.uid,
            email: userObj.email,
            displayName: userObj.displayName,
            photoURL: userObj.photoURL,
            points: 0,
            exactMatchesCount: 0,
            outcomeMatchesCount: 0,
            completedProde: false,
            joinedAt: Date.now()
          };
          participants.push({ tournamentId: toTournamentId, participant });
          localStorage.setItem('prode_tournament_participants', JSON.stringify(participants));
        }
      }
    } else {
      console.log(`Mock: Email ${emailSanitized} movido a Whitelist Global.`);
    }
    return;
  }

  try {
    const batch = writeBatch(db);

    // 1. Eliminar whitelist vieja (solo si no es la global)
    if (fromTournamentId) {
      const oldWlRef = doc(db, 'tournaments', fromTournamentId, 'whitelist', emailSanitized);
      batch.delete(oldWlRef);
    }

    // 2. Crear whitelist nueva
    if (toTournamentId) {
      const newWlRef = doc(db, 'tournaments', toTournamentId, 'whitelist', emailSanitized);
      batch.set(newWlRef, {
        email: emailSanitized,
        addedBy: 'admin',
        createdAt: serverTimestamp(),
        role: 'user'
      });

      // Asegurar que exista en la whitelist global (con merge para no pisar rol si ya existe)
      const globalWlRef = doc(db, 'whitelist', emailSanitized);
      batch.set(globalWlRef, {
        email: emailSanitized,
        addedBy: 'admin',
        createdAt: serverTimestamp(),
        role: role || 'user',
        tournamentId: toTournamentId
      }, { merge: true });
    } else {
      // Si se mueve de vuelta a la whitelist Global
      const globalWlRef = doc(db, 'whitelist', emailSanitized);
      batch.set(globalWlRef, {
        email: emailSanitized,
        addedBy: 'admin',
        createdAt: serverTimestamp(),
        role: role,
        tournamentId: null
      }, { merge: true });
    }

    // 3. Si el usuario ya está registrado, mover su participante y borrar predicciones viejas
    const usersQuery = query(collection(db, 'users'), where('email', '==', emailSanitized));
    const usersSnap = await getDocs(usersQuery);

    if (!usersSnap.empty) {
      const userData = usersSnap.docs[0].data() as UserProfile;
      const userRef = doc(db, 'users', userData.uid);

      // Actualizar el torneo asignado en el perfil del usuario
      batch.update(userRef, {
        tournamentId: toTournamentId
      });

      // Borrar participante y predicciones del torneo viejo
      if (fromTournamentId) {
        batch.delete(doc(db, 'tournaments', fromTournamentId, 'participants', userData.uid));

        const predsSnap = await getDocs(
          query(collection(db, 'tournaments', fromTournamentId, 'predictions'), where('userId', '==', userData.uid))
        );
        predsSnap.forEach((d) => {
          batch.delete(d.ref);
        });
      }

      // Crear participante en el torneo nuevo
      if (toTournamentId) {
        const participantRef = doc(db, 'tournaments', toTournamentId, 'participants', userData.uid);
        const participant: TournamentParticipant = {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          points: 0,
          exactMatchesCount: 0,
          outcomeMatchesCount: 0,
          completedProde: false,
          joinedAt: Date.now()
        };
        batch.set(participantRef, participant);
      }
    }

    await batch.commit();
    console.log(`🔄 DB: Whitelist movida exitosamente para ${emailSanitized}.`);
  } catch (err) {
    console.error('Error al mover email de whitelist:', err);
    throw err;
  }
};

/**
 * Recupera todos los torneos donde el usuario participa o ha sido invitado.
 * Si ha sido invitado pero no se ha registrado como participante, lo une automáticamente.
 */
export const getTournamentsForUserInDB = async (
  userId: string,
  userEmail: string,
  userRole: string
): Promise<Tournament[]> => {
  const emailSanitized = userEmail.trim().toLowerCase();

  if (IS_MOCK_ENV) {
    const tourneysJson = localStorage.getItem('prode_tournaments') || '[]';
    const tourneys: Tournament[] = JSON.parse(tourneysJson);

    if (userRole === 'admin') {
      return tourneys;
    }

    const partsJson = localStorage.getItem('prode_tournament_participants') || '[]';
    const participants = JSON.parse(partsJson);

    const wlJson = localStorage.getItem('prode_tournament_whitelist') || '[]';
    const wl = JSON.parse(wlJson);

    const userTournaments: Tournament[] = [];

    for (const t of tourneys) {
      const isPart = participants.some((p: any) => p.tournamentId === t.id && p.participant.uid === userId);
      const isWhitelisted = wl.some((w: any) => w.tournamentId === t.id && w.email === emailSanitized);

      if (isPart) {
        userTournaments.push(t);
      } else if (isWhitelisted) {
        const usersJson = localStorage.getItem('prode_users') || '[]';
        const users: UserProfile[] = JSON.parse(usersJson);
        const userProfile = users.find(u => u.uid === userId);
        if (userProfile) {
          const participant: TournamentParticipant = {
            uid: userId,
            email: userProfile.email,
            displayName: userProfile.displayName,
            photoURL: userProfile.photoURL,
            points: 0,
            exactMatchesCount: 0,
            outcomeMatchesCount: 0,
            completedProde: false,
            joinedAt: Date.now()
          };
          participants.push({ tournamentId: t.id, participant });
          localStorage.setItem('prode_tournament_participants', JSON.stringify(participants));
          userTournaments.push(t);
        }
      }
    }

    return userTournaments;
  }

  try {
    // Admin puede listar todos los torneos directamente
    if (userRole === 'admin') {
      const allTournamentsSnap = await getDocs(collection(db, 'tournaments'));
      const userTournaments: Tournament[] = [];
      for (const docSnap of allTournamentsSnap.docs) {
        userTournaments.push(docSnap.data() as Tournament);
      }
      return userTournaments;
    }

    // Para users/referees: NO podemos hacer list de todos los torneos (rules lo bloquean).
    // Estrategia: obtener el tournamentId del perfil del usuario y hacer getDoc individual.
    const userTournaments: Tournament[] = [];
    const checkedIds = new Set<string>();

    // 1. Leer el perfil propio (siempre permitido) para obtener tournamentId
    const userProfileDoc = await getDoc(doc(db, 'users', userId));
    if (userProfileDoc.exists()) {
      const userProfile = userProfileDoc.data() as UserProfile;
      
      if (userProfile.tournamentId) {
        checkedIds.add(userProfile.tournamentId);
        try {
          const tourneyDoc = await getDoc(doc(db, 'tournaments', userProfile.tournamentId));
          if (tourneyDoc.exists()) {
            const t = tourneyDoc.data() as Tournament;
            userTournaments.push(t);

            // Verificar si ya es participante, si no, auto-unirse si está en whitelist
            const partDoc = await getDoc(doc(db, 'tournaments', t.id, 'participants', userId));
            if (!partDoc.exists()) {
              const wlDoc = await getDoc(doc(db, 'tournaments', t.id, 'whitelist', emailSanitized));
              if (wlDoc.exists()) {
                const participant: TournamentParticipant = {
                  uid: userId,
                  email: userProfile.email,
                  displayName: userProfile.displayName,
                  photoURL: userProfile.photoURL,
                  points: 0,
                  exactMatchesCount: 0,
                  outcomeMatchesCount: 0,
                  completedProde: false,
                  joinedAt: Date.now()
                };
                await setDoc(doc(db, 'tournaments', t.id, 'participants', userId), participant);
              }
            }
          }
        } catch (e) {
          console.error(`Error al acceder al torneo ${userProfile.tournamentId}:`, e);
        }
      }
    }

    return userTournaments;
  } catch (err) {
    console.error('Error al recuperar torneos del usuario:', err);
    throw err;
  }
};

/**
 * Obtiene los participantes de un torneo específico
 */
export const getTournamentParticipantsInDB = async (
  tournamentId: string
): Promise<TournamentParticipant[]> => {
  if (IS_MOCK_ENV) {
    const partsJson = localStorage.getItem('prode_tournament_participants') || '[]';
    const participants = JSON.parse(partsJson);
    return participants
      .filter((p: any) => p.tournamentId === tournamentId)
      .map((p: any) => p.participant);
  }

  try {
    const snapshot = await getDocs(collection(db, 'tournaments', tournamentId, 'participants'));
    const list: TournamentParticipant[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as TournamentParticipant);
    });
    return list;
  } catch (err) {
    console.error('Error recuperando participantes del torneo:', err);
    throw err;
  }
};

/**
 * Recupera las predicciones de un usuario para un torneo
 */
export const getTournamentPredictionsInDB = async (
  tournamentId: string,
  userId: string
): Promise<Prediction[]> => {
  if (IS_MOCK_ENV) {
    const predsJson = localStorage.getItem('prode_tournament_predictions') || '[]';
    const predictions = JSON.parse(predsJson);
    return predictions
      .filter((p: any) => p.tournamentId === tournamentId && p.prediction.userId === userId)
      .map((p: any) => p.prediction);
  }

  try {
    const snapshot = await getDocs(
      query(collection(db, 'tournaments', tournamentId, 'predictions'), where('userId', '==', userId))
    );
    const list: Prediction[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Prediction);
    });
    return list;
  } catch (err) {
    console.error('Error al recuperar predicciones de torneo:', err);
    throw err;
  }
};

/**
 * Guarda o actualiza una predicción en un torneo personalizado
 */
export const saveTournamentPredictionInDB = async (
  tournamentId: string,
  userId: string,
  matchId: string,
  prediction: {
    homePrediction?: number;
    awayPrediction?: number;
    predictionOutcome?: 'home' | 'away' | 'draw';
  }
): Promise<void> => {
  const predictionId = `${userId}_${matchId}`;
  
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
    ...prediction,
    calculated: false
  };

  if (IS_MOCK_ENV) {
    const predsJson = localStorage.getItem('prode_tournament_predictions') || '[]';
    const predictions = JSON.parse(predsJson);
    const idx = predictions.findIndex(
      (p: any) => p.tournamentId === tournamentId && p.prediction.predictionId === predictionId
    );
    if (idx !== -1) {
      predictions[idx].prediction = newPrediction;
    } else {
      predictions.push({ tournamentId, prediction: newPrediction });
    }
    localStorage.setItem('prode_tournament_predictions', JSON.stringify(predictions));
    return;
  }

  try {
    const docRef = doc(db, 'tournaments', tournamentId, 'predictions', predictionId);
    await setDoc(docRef, newPrediction);
  } catch (err) {
    console.error('Error al guardar predicción de torneo:', err);
    throw err;
  }
};

/**
 * Sella el prode de un participante de torneo
 */
export const sealTournamentProdeInDB = async (
  tournamentId: string,
  userId: string
): Promise<void> => {
  if (IS_MOCK_ENV) {
    const partsJson = localStorage.getItem('prode_tournament_participants') || '[]';
    const participants = JSON.parse(partsJson);
    const idx = participants.findIndex(
      (p: any) => p.tournamentId === tournamentId && p.participant.uid === userId
    );
    if (idx !== -1) {
      participants[idx].participant.completedProde = true;
      localStorage.setItem('prode_tournament_participants', JSON.stringify(participants));
    }
    return;
  }

  try {
    const docRef = doc(db, 'tournaments', tournamentId, 'participants', userId);
    await updateDoc(docRef, { completedProde: true });
  } catch (err) {
    console.error('Error al sellar prode de torneo:', err);
    throw err;
  }
};

/**
 * Permite cambiar el nombre del torneo (solo Referee o Admin)
 */
export const updateTournamentNameInDB = async (
  tournamentId: string,
  newName: string
): Promise<void> => {
  if (IS_MOCK_ENV) {
    const tourneysJson = localStorage.getItem('prode_tournaments') || '[]';
    const tourneys: Tournament[] = JSON.parse(tourneysJson);
    const idx = tourneys.findIndex(t => t.id === tournamentId);
    if (idx !== -1) {
      tourneys[idx].name = newName;
      localStorage.setItem('prode_tournaments', JSON.stringify(tourneys));
    }
    return;
  }

  try {
    const docRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(docRef, { name: newName });
  } catch (err) {
    console.error('Error al renombrar torneo:', err);
    throw err;
  }
};

/**
 * Permite cambiar el nombre y la modalidad del torneo (solo Referee o Admin).
 * Si la modalidad se cambia de 'exact' a 'simple':
 *   - Convierte todas las predicciones de los usuarios para este torneo a modalidad simple.
 *   - Recalcula los puntos ganados para los partidos ya jugados y los puntos totales de los participantes.
 */
export const updateTournamentInDB = async (
  tournamentId: string,
  newName: string,
  newModality: 'exact' | 'simple'
): Promise<void> => {
  if (IS_MOCK_ENV) {
    const tourneysJson = localStorage.getItem('prode_tournaments') || '[]';
    const tourneys: Tournament[] = JSON.parse(tourneysJson);
    const idx = tourneys.findIndex(t => t.id === tournamentId);
    if (idx === -1) throw new Error('Torneo no encontrado');

    const oldModality = tourneys[idx].modality;
    tourneys[idx].name = newName;

    // Solo se permite de exact -> simple
    if (oldModality === 'exact' && newModality === 'simple') {
      tourneys[idx].modality = 'simple';

      // 1. Convertir predicciones
      const predsJson = localStorage.getItem('prode_tournament_predictions') || '[]';
      const predictions = JSON.parse(predsJson);
      const matchesJson = localStorage.getItem('prode_matches') || '[]';
      const matches: Match[] = JSON.parse(matchesJson);

      predictions.forEach((item: any) => {
        if (item.tournamentId === tournamentId) {
          const pred = item.prediction;
          if (pred.homePrediction !== undefined && pred.awayPrediction !== undefined) {
            const home = pred.homePrediction;
            const away = pred.awayPrediction;
            pred.predictionOutcome = home > away ? 'home' : home < away ? 'away' : 'draw';
            delete pred.homePrediction;
            delete pred.awayPrediction;

            // Recalcular puntos ganados si el partido ya se jugó
            const match = matches.find(m => m.matchId === pred.matchId);
            if (match && match.status === 'played' && match.homeScore !== undefined && match.awayScore !== undefined) {
              const res = calculatePointsSimple(pred.predictionOutcome, match.homeScore, match.awayScore);
              pred.pointsEarned = res.points;
              pred.calculated = true;
            } else {
              delete pred.pointsEarned;
              pred.calculated = false;
            }
          }
        }
      });
      localStorage.setItem('prode_tournament_predictions', JSON.stringify(predictions));

      // 2. Recalcular puntos de los participantes
      const partsJson = localStorage.getItem('prode_tournament_participants') || '[]';
      const participants = JSON.parse(partsJson);

      participants.forEach((pItem: any) => {
        if (pItem.tournamentId === tournamentId) {
          const part = pItem.participant;
          const userPreds = predictions
            .filter((p: any) => p.tournamentId === tournamentId && p.prediction.userId === part.uid)
            .map((p: any) => p.prediction);

          let totalPoints = 0;
          let outcomeCount = 0;

          userPreds.forEach((pred: any) => {
            if (pred.calculated && pred.pointsEarned !== undefined) {
              totalPoints += pred.pointsEarned;
              if (pred.pointsEarned === 1) outcomeCount++;
            }
          });

          part.points = totalPoints;
          part.exactMatchesCount = 0;
          part.outcomeMatchesCount = outcomeCount;
        }
      });
      localStorage.setItem('prode_tournament_participants', JSON.stringify(participants));
    }
    
    localStorage.setItem('prode_tournaments', JSON.stringify(tourneys));
    return;
  }

  try {
    const tourneyRef = doc(db, 'tournaments', tournamentId);
    const tourneySnap = await getDoc(tourneyRef);
    if (!tourneySnap.exists()) throw new Error('Torneo no encontrado');

    const tourneyData = tourneySnap.data() as Tournament;
    const oldModality = tourneyData.modality;

    const updates: any = { name: newName };

    // Si cambia de exact -> simple
    if (oldModality === 'exact' && newModality === 'simple') {
      updates.modality = 'simple';

      // 1. Obtener todos los partidos para saber sus resultados reales actuales
      const matchesColl = collection(db, 'matches');
      const matchesSnap = await getDocs(matchesColl);
      const matchesMap: { [key: string]: Match } = {};
      matchesSnap.forEach((docSnap) => {
        matchesMap[docSnap.id] = docSnap.data() as Match;
      });

      // 2. Obtener todas las predicciones del torneo
      const predsColl = collection(db, 'tournaments', tournamentId, 'predictions');
      const predsSnap = await getDocs(predsColl);

      let batch = writeBatch(db);
      let count = 0;

      for (const predDoc of predsSnap.docs) {
        const pred = predDoc.data() as Prediction;
        if (pred.homePrediction !== undefined && pred.awayPrediction !== undefined) {
          const home = pred.homePrediction;
          const away = pred.awayPrediction;
          const outcome = home > away ? 'home' : home < away ? 'away' : 'draw';

          const predUpdates: any = {
            predictionOutcome: outcome,
            homePrediction: deleteField(),
            awayPrediction: deleteField()
          };

          const match = matchesMap[pred.matchId];
          if (match && match.status === 'played' && match.homeScore !== undefined && match.awayScore !== undefined) {
            const res = calculatePointsSimple(outcome, match.homeScore, match.awayScore);
            predUpdates.pointsEarned = res.points;
            predUpdates.calculated = true;
          } else {
            predUpdates.pointsEarned = deleteField();
            predUpdates.calculated = false;
          }

          batch.update(predDoc.ref, predUpdates);
          count++;

          if (count >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      }
      if (count > 0) {
        await batch.commit();
      }

      // 3. Recalcular la puntuación de cada participante
      const participantsColl = collection(db, 'tournaments', tournamentId, 'participants');
      const participantsSnap = await getDocs(participantsColl);

      batch = writeBatch(db);
      count = 0;

      for (const partDoc of participantsSnap.docs) {
        const userId = partDoc.id;
        
        const userPredsSnap = await getDocs(
          query(collection(db, 'tournaments', tournamentId, 'predictions'), where('userId', '==', userId))
        );

        let totalPoints = 0;
        let outcomeCount = 0;

        userPredsSnap.forEach((upDoc) => {
          const upData = upDoc.data() as Prediction;
          if (upData.calculated && upData.pointsEarned !== undefined) {
            totalPoints += upData.pointsEarned;
            if (upData.pointsEarned === 1) outcomeCount++;
          }
        });

        batch.update(partDoc.ref, {
          points: totalPoints,
          exactMatchesCount: 0,
          outcomeMatchesCount: outcomeCount
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
    }

    await updateDoc(tourneyRef, updates);
  } catch (err) {
    console.error('Error al actualizar torneo:', err);
    throw err;
  }
};

/**
 * Elimina un torneo por completo de la base de datos (con todas sus subcolecciones)
 */
export const deleteTournamentFromDB = async (
  tournamentId: string
): Promise<void> => {
  if (IS_MOCK_ENV) {
    const tourneysJson = localStorage.getItem('prode_tournaments') || '[]';
    const tourneys: Tournament[] = JSON.parse(tourneysJson);
    const updatedTourneys = tourneys.filter(t => t.id !== tournamentId);
    localStorage.setItem('prode_tournaments', JSON.stringify(updatedTourneys));

    const partsJson = localStorage.getItem('prode_tournament_participants') || '[]';
    const participants = JSON.parse(partsJson);
    const updatedParts = participants.filter((p: any) => p.tournamentId !== tournamentId);
    localStorage.setItem('prode_tournament_participants', JSON.stringify(updatedParts));

    const predsJson = localStorage.getItem('prode_tournament_predictions') || '[]';
    const predictions = JSON.parse(predsJson);
    const updatedPreds = predictions.filter((p: any) => p.tournamentId !== tournamentId);
    localStorage.setItem('prode_tournament_predictions', JSON.stringify(updatedPreds));

    const wlJson = localStorage.getItem('prode_tournament_whitelist') || '[]';
    const wl = JSON.parse(wlJson);
    const updatedWl = wl.filter((w: any) => w.tournamentId !== tournamentId);
    localStorage.setItem('prode_tournament_whitelist', JSON.stringify(updatedWl));

    return;
  }

  try {
    const predsSnap = await getDocs(collection(db, 'tournaments', tournamentId, 'predictions'));
    let batch = writeBatch(db);
    let count = 0;
    for (const d of predsSnap.docs) {
      batch.delete(d.ref);
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    
    const partsSnap = await getDocs(collection(db, 'tournaments', tournamentId, 'participants'));
    for (const d of partsSnap.docs) {
      batch.delete(d.ref);
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    const wlSnap = await getDocs(collection(db, 'tournaments', tournamentId, 'whitelist'));
    for (const d of wlSnap.docs) {
      batch.delete(d.ref);
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    batch.delete(doc(db, 'tournaments', tournamentId));
    await batch.commit();
  } catch (err) {
    console.error('Error al borrar torneo de Firestore:', err);
    throw err;
  }
};

/**
 * Remueve a un usuario de un torneo personalizado (desvincula participante, predicciones y whitelist)
 */
export const removeUserFromTournamentInDB = async (
  tournamentId: string,
  userId: string,
  userEmail: string
): Promise<void> => {
  const emailSanitized = userEmail.trim().toLowerCase();

  if (IS_MOCK_ENV) {
    const partsJson = localStorage.getItem('prode_tournament_participants') || '[]';
    const participants = JSON.parse(partsJson);
    const updatedParts = participants.filter(
      (p: any) => !(p.tournamentId === tournamentId && p.participant.uid === userId)
    );
    localStorage.setItem('prode_tournament_participants', JSON.stringify(updatedParts));

    const predsJson = localStorage.getItem('prode_tournament_predictions') || '[]';
    const predictions = JSON.parse(predsJson);
    const updatedPreds = predictions.filter(
      (p: any) => !(p.tournamentId === tournamentId && p.prediction.userId === userId)
    );
    localStorage.setItem('prode_tournament_predictions', JSON.stringify(updatedPreds));

    const wlJson = localStorage.getItem('prode_tournament_whitelist') || '[]';
    const wl = JSON.parse(wlJson);
    const updatedWl = wl.filter(
      (w: any) => !(w.tournamentId === tournamentId && w.email === emailSanitized)
    );
    localStorage.setItem('prode_tournament_whitelist', JSON.stringify(updatedWl));

    return;
  }

  try {
    let batch = writeBatch(db);
    
    batch.delete(doc(db, 'tournaments', tournamentId, 'participants', userId));

    const predsSnap = await getDocs(
      query(collection(db, 'tournaments', tournamentId, 'predictions'), where('userId', '==', userId))
    );
    predsSnap.forEach((d) => {
      batch.delete(d.ref);
    });

    batch.delete(doc(db, 'tournaments', tournamentId, 'whitelist', emailSanitized));

    await batch.commit();
  } catch (err) {
    console.error('Error al quitar usuario del torneo:', err);
    throw err;
  }
};

/**
 * Actualiza el rol de un correo en la whitelist global y, si el usuario ya está registrado,
 * también actualiza su rol en su documento de usuario (/users/{userId}).
 */
export const updateUserRoleInDB = async (
  email: string,
  newRole: UserRole,
  userId: string | null = null
): Promise<void> => {
  const emailSanitized = email.trim().toLowerCase();

  if (IS_MOCK_ENV) {
    const usersJson = localStorage.getItem('prode_users') || '[]';
    const users: UserProfile[] = JSON.parse(usersJson);
    const userObj = users.find(u => u.email.trim().toLowerCase() === emailSanitized);
    if (userObj) {
      userObj.role = newRole;
      localStorage.setItem('prode_users', JSON.stringify(users));
    }
    return;
  }

  try {
    const batch = writeBatch(db);

    // 1. Actualizar o recrear la entrada en la whitelist global
    const wlRef = doc(db, 'whitelist', emailSanitized);
    const wlSnap = await getDoc(wlRef);
    if (wlSnap.exists()) {
      batch.update(wlRef, { role: newRole });
    } else {
      batch.set(wlRef, {
        email: emailSanitized,
        role: newRole,
        addedBy: 'admin',
        createdAt: serverTimestamp()
      });
    }

    // 2. Buscar al usuario de manera case-insensitive
    let matchedUserId: string | null = userId;
    if (!matchedUserId) {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.email && data.email.trim().toLowerCase() === emailSanitized) {
          matchedUserId = docSnap.id;
        }
      });
    }

    if (matchedUserId) {
      const userRef = doc(db, 'users', matchedUserId);
      batch.update(userRef, { role: newRole });
      console.log(`🔑 Actualizando rol en /users/${matchedUserId} a ${newRole} (case-insensitive).`);
    } else {
      console.log(`⚠️ No se encontró usuario registrado en /users para el correo ${emailSanitized}.`);
    }

    await batch.commit();
    console.log(`🔑 Rol actualizado con éxito a ${newRole} para el email ${emailSanitized}.`);
  } catch (err) {
    console.error('Error al actualizar el rol del usuario:', err);
    throw err;
  }
};



