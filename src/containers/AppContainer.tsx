import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';
import { Navbar } from '../components/common/Navbar';
import { LoadingModal } from '../components/common/LoadingModal';
import { WhitelistManager } from '../components/admin/WhitelistManager';
import { MatchList } from '../components/prode/MatchList';
import { MatchScoreModal } from '../components/admin/MatchScoreModal';
import { MatchScheduler } from '../components/admin/MatchScheduler';
import { ProdeForm } from '../components/prode/ProdeForm';
import { DashboardStats } from '../components/prode/DashboardStats';
import { ParticipantsTable } from '../components/prode/ParticipantsTable';
import { Leaderboard } from '../components/prode/Leaderboard';
import { TournamentManager } from '../components/prode/TournamentManager';
import { UserProfileEditor } from '../components/profile/UserProfileEditor';
import { MatchResultsManager } from '../components/admin/MatchResultsManager';
import type { WhitelistEntry, Match, Prediction, UserProfile, Tournament, TournamentParticipant, UserRole } from '../types';
import { 
  collection, 
  onSnapshot, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, IS_MOCK_ENV } from '../services/firebase';
import { 
  seedWorldCupMatches, 
  getMatchesFromDB, 
  updateMatchResultInDB, 
  deleteMatchResultInDB,
  addNewMatchToDB,
  updateMatchMetadataInDB,
  getUserPredictions,
  saveUserPrediction,
  clearUserPrediction,
  getAllParticipantsFromDB,
  forceReseedMatchesInDB,
  deleteAllPredictionsAndResetUsers,
  sealUserProdeInDB,
  randomizeGhostPredictions,
  createTournamentInDB,
  inviteUserToTournamentInDB,
  getTournamentsForUserInDB,
  getTournamentParticipantsInDB,
  getTournamentPredictionsInDB,
  saveTournamentPredictionInDB,
  sealTournamentProdeInDB,
  updateTournamentInDB,
  deleteTournamentFromDB,
  removeUserFromTournamentInDB,
  moveWhitelistEntryInDB,
  updateUserRoleInDB
} from '../services/db';

type GuestView = 'login' | 'register' | 'forgot';
type MemberView = 'prode' | 'leaderboard' | 'whitelist' | 'profile' | 'calendar' | 'tournaments';
type AdminSubTab = 'whitelist' | 'scheduler' | 'results' | 'ghosts' | 'scenario' | 'system';

// Mock inicial de correos permitidos para desarrollo local
const INITIAL_MOCK_WHITELIST: WhitelistEntry[] = [
  { email: 'admin@teamprode.com', addedBy: 'system', createdAt: Date.now() - 86400000 },
  { email: 'participante@teamprode.com', addedBy: 'system', createdAt: Date.now() - 3600000 }
];

export const AppContainer: React.FC = () => {
  const { user, loading, error, login, register, logout, resetPassword, updateUserProfile, clearError, reloadUserProfile } = useAuth();
  
  // Ruteador SPA básico y ultra-resiliente
  const [guestView, setGuestView] = useState<GuestView>('login');
  const [memberView, setMemberView] = useState<MemberView>('prode');
  
  // Estado para mostrar más estadísticas dentro del Ranking
  const [showStats, setShowStats] = useState(false);

  // Estados para Torneos Personalizados
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null); // null = global/default
  const [activeTournamentParticipants, setActiveTournamentParticipants] = useState<TournamentParticipant[]>([]);

  // Sub-navegación exclusiva para panel de administración
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('whitelist');

  // Estados específicos para la Whitelist
  const [whitelistEntries, setWhitelistEntries] = useState<WhitelistEntry[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [whitelistLoading, setWhitelistLoading] = useState(false);
  const [whitelistError, setWhitelistError] = useState<string | null>(null);
  const [whitelistSuccess, setWhitelistSuccess] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Estados específicos para los Partidos y Calendario
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [selectedMatchToEdit, setSelectedMatchToEdit] = useState<Match | null>(null);
  const [adminSavingResult, setAdminSavingResult] = useState(false);

  // Estados para agendar nuevos partidos
  const [adminSchedulingLoading, setAdminSchedulingLoading] = useState(false);
  const [adminSchedulingError, setAdminSchedulingError] = useState<string | null>(null);
  const [adminSchedulingSuccess, setAdminSchedulingSuccess] = useState<string | null>(null);

  // Estados para el perfil de usuario (Etapa 6)
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Estados para Mantenimiento de Sistema (Admin)
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [systemSuccess, setSystemSuccess] = useState<string | null>(null);

  // Estados específicos para las Predicciones (Prode)
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([]);
  const [savingPredictionMatchId, setSavingPredictionMatchId] = useState<string | null>(null);

  // Estado para seleccionar torneo en el Ranking (evita consulta automática al entrar a la sección)
  const [rankingTournamentId, setRankingTournamentId] = useState<string | null | 'pending'>('pending');

  // Estado para seleccionar el torneo en la Whitelist del panel de admin
  const [selectedWhitelistTournamentId, setSelectedWhitelistTournamentId] = useState<string | null>(null);


  // Estados específicos para los Participantes
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [selectedParticipantDetail, setSelectedParticipantDetail] = useState<UserProfile | null>(null);
  const [selectedParticipantPreds, setSelectedParticipantPreds] = useState<Prediction[]>([]);

  // Resolver los roles reales de los usuarios registrados para mostrarlos en la whitelist
  const resolvedWhitelistEntries = React.useMemo(() => {
    return whitelistEntries.map(entry => {
      const registeredUser = registeredUsers.find(p => p.email.trim().toLowerCase() === entry.email.trim().toLowerCase());
      return {
        ...entry,
        role: registeredUser ? registeredUser.role : (entry.role || 'user')
      };
    });
  }, [whitelistEntries, registeredUsers]);

  // 1. Auto-sembrar e inicializar partidos al cargar
  useEffect(() => {
    if (!user) return;

    const initializeMatches = async () => {
      setMatchesLoading(true);
      try {
        await seedWorldCupMatches();
        const loadedMatches = await getMatchesFromDB();
        setMatches(loadedMatches);
      } catch (err) {
        console.error('Error inicializando partidos:', err);
        setMatchesError('No se pudieron cargar los partidos del mundial.');
      } finally {
        setMatchesLoading(false);
      }
    };

    // Monitorear errores de carga en logs
    if (matchesError) {
      console.warn('Error detectado al inicializar partidos:', matchesError);
    }

    initializeMatches();
  }, [user, matchesError]);

  // 2. Cargar predicciones del usuario activo y participantes
  const loadPredictionsAndParticipants = async () => {
    if (!user) return;
    try {
      // Cargar lista de torneos del usuario
      const userTourneys = await getTournamentsForUserInDB(user.uid, user.email, user.role);
      setTournaments(userTourneys);

      if (memberView === 'leaderboard' && rankingTournamentId === 'pending') {
        setParticipants([]);
        setPredictions([]);
        setAllPredictions([]);
        setActiveTournamentParticipants([]);
        return;
      }

      const targetTournamentId = memberView === 'leaderboard' ? rankingTournamentId : activeTournamentId;

      if (targetTournamentId && targetTournamentId !== 'pending') {
        // Cargar predicciones del torneo personalizado seleccionado
        const tourneyPreds = await getTournamentPredictionsInDB(targetTournamentId, user.uid);
        setPredictions(tourneyPreds);

        // Cargar participantes del torneo personalizado seleccionado
        const tourneyParts = await getTournamentParticipantsInDB(targetTournamentId);

        // Filtramos a los administradores para que no aparezcan en las listas (el admin es espectador)
        // Solo admin puede leer perfiles de otros usuarios en /users/{uid}
        // Para referee/user usamos heurística por email para filtrar admins
        const partsWithRoles = await Promise.all(
          tourneyParts.map(async (p) => {
            try {
              if (IS_MOCK_ENV) {
                const usersJson = localStorage.getItem('prode_users') || '[]';
                const users: UserProfile[] = JSON.parse(usersJson);
                const found = users.find(u => u.uid === p.uid);
                return { ...p, role: found?.role || 'user' };
              } else if (user.role === 'admin') {
                // Solo admin tiene permisos para leer /users/{uid} de otros
                const userDoc = await getDoc(doc(db, 'users', p.uid));
                if (userDoc.exists()) {
                  return { ...p, role: (userDoc.data() as UserProfile).role };
                }
              }
            } catch (e) {
              console.error('Error al verificar el rol del participante:', e);
            }
            return { ...p, role: 'user' };
          })
        );
        const filteredTourneyParts = partsWithRoles.filter(p => 
          p.role !== 'admin' && 
          p.email.trim().toLowerCase() !== 'admin@teamprode.com' &&
          !p.email.trim().toLowerCase().startsWith('admin@') &&
          !p.displayName.toLowerCase().includes('admin')
        );

        setActiveTournamentParticipants(filteredTourneyParts);

        // Mapear participantes a formato UserProfile para compatibilidad
        const partsMapped: UserProfile[] = filteredTourneyParts.map(p => ({
          uid: p.uid,
          email: p.email,
          displayName: p.displayName,
          photoURL: p.photoURL,
          role: 'user',
          completedProde: p.completedProde,
          points: p.points,
          exactMatchesCount: p.exactMatchesCount,
          outcomeMatchesCount: p.outcomeMatchesCount
        }));
        setParticipants(partsMapped);

        // Cargar todas las predicciones para estadísticas/escenarios de este torneo
        if (IS_MOCK_ENV) {
          const allPredsJson = localStorage.getItem('prode_tournament_predictions') || '[]';
          const allPreds = JSON.parse(allPredsJson)
            .filter((p: any) => p.tournamentId === targetTournamentId)
            .map((p: any) => p.prediction);
          setAllPredictions(allPreds);
        } else {
          const allPredsSnap = await getDocs(collection(db, 'tournaments', targetTournamentId, 'predictions'));
          const allPreds: Prediction[] = [];
          allPredsSnap.forEach((docSnap: any) => {
            allPreds.push(docSnap.data() as Prediction);
          });
          setAllPredictions(allPreds);
        }
      } else {
        // Cargar datos del Torneo Global predeterminado
        const userPreds = await getUserPredictions(user.uid);
        setPredictions(userPreds);

        if (user.role === 'admin') {
          const parts = await getAllParticipantsFromDB();
          const filteredParts = parts.filter(p => 
            !p.isGhost && 
            p.role !== 'admin' && 
            p.email.trim().toLowerCase() !== 'admin@teamprode.com' &&
            !p.email.trim().toLowerCase().startsWith('admin@') &&
            !p.displayName.toLowerCase().includes('admin')
          );
          setParticipants(filteredParts);
          setActiveTournamentParticipants([]);

          if (IS_MOCK_ENV) {
            const allPredsJson = localStorage.getItem('prode_predictions') || '[]';
            setAllPredictions(JSON.parse(allPredsJson));
          } else {
            const allPredsSnap = await getDocs(collection(db, 'predictions'));
            const allPreds: Prediction[] = [];
            allPredsSnap.forEach((docSnap: any) => {
              allPreds.push(docSnap.data() as Prediction);
            });
            setAllPredictions(allPreds);
          }
        } else {
          // Si es un usuario común sin torneo asignado aún (o en carga inicial),
          // solo se ve a sí mismo en los participantes y solo ve sus propias predicciones
          setParticipants([user]);
          setActiveTournamentParticipants([]);
          setAllPredictions(userPreds);
        }
      }
    } catch (err) {
      console.error('Error cargando datos de prode/torneo:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadPredictionsAndParticipants();
    }
  }, [user, memberView, activeTournamentId, rankingTournamentId]);

  // Si el usuario es administrador, redirigirlo del Prode al Calendario si entra a la vista inicial
  useEffect(() => {
    if (user && user.role === 'admin' && memberView === 'prode') {
      setMemberView('calendar');
    }
  }, [user, memberView]);

  // Resolver de forma automática el torneo del usuario normal o árbitro
  useEffect(() => {
    if (user && (user.role === 'user' || user.role === 'referee')) {
      if (tournaments.length > 0) {
        const myTourneyId = tournaments[0].id;
        if (activeTournamentId !== myTourneyId) {
          setActiveTournamentId(myTourneyId);
        }
        if (rankingTournamentId !== myTourneyId) {
          setRankingTournamentId(myTourneyId);
        }
      } else {
        if (activeTournamentId !== null) {
          setActiveTournamentId(null);
        }
        if (rankingTournamentId !== 'no_tournament') {
          setRankingTournamentId('no_tournament');
        }
      }
    }
  }, [user, tournaments, activeTournamentId, rankingTournamentId]);

  // Escuchar a todos los usuarios registrados en tiempo real (solo para el Admin)
  useEffect(() => {
    if (user?.role !== 'admin') return;

    if (IS_MOCK_ENV) {
      const usersJson = localStorage.getItem('prode_users') || '[]';
      setRegisteredUsers(JSON.parse(usersJson));
      return;
    }

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        usersList.push(docSnap.data() as UserProfile);
      });
      setRegisteredUsers(usersList);
    }, (err) => {
      console.error('Error al escuchar colección de usuarios:', err);
    });

    return () => unsubUsers();
  }, [user]);

  // Escuchar a la Whitelist en tiempo real (si es Admin o Referee y no es Mock)
  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'referee') return;

    if (IS_MOCK_ENV) {
      if (selectedWhitelistTournamentId) {
        const mockWLJson = localStorage.getItem('prode_tournament_whitelist') || '[]';
        const entries = JSON.parse(mockWLJson)
          .filter((e: any) => e.tournamentId === selectedWhitelistTournamentId)
          .map((e: any) => ({
            email: e.email,
            addedBy: e.addedBy || 'admin',
            createdAt: e.createdAt || Date.now(),
            role: 'user' as UserRole,
            tournamentId: selectedWhitelistTournamentId
          }));
        setWhitelistEntries(entries);
      } else {
        const mockWLJson = localStorage.getItem('prode_tournament_whitelist') || '[]';
        const customEntries = JSON.parse(mockWLJson).map((e: any) => ({
          email: e.email,
          addedBy: e.addedBy || 'admin',
          createdAt: e.createdAt || Date.now(),
          role: 'user' as UserRole,
          tournamentId: e.tournamentId
        }));
        const globalEntries = INITIAL_MOCK_WHITELIST.map(e => ({
          ...e,
          tournamentId: null
        }));
        setWhitelistEntries([...globalEntries, ...customEntries]);
      }
      setWhitelistLoading(false);
      return;
    }

    setWhitelistLoading(true);

    if (user.role === 'referee') {
      const myOwnedTournament = tournaments.find(t => t.id === activeTournamentId && t.refereeId === user.uid);
      if (!activeTournamentId || !myOwnedTournament) {
        setWhitelistEntries([]);
        setWhitelistLoading(false);
        return;
      }
      const ref = collection(db, 'tournaments', activeTournamentId, 'whitelist');
      const q = query(ref, orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const entries: WhitelistEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          entries.push({
            email: docSnap.id,
            addedBy: data.addedBy || 'admin',
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
            role: data.role || 'user',
            tournamentId: activeTournamentId
          });
        });
        setWhitelistEntries(entries);
        setWhitelistLoading(false);
      }, (err) => {
        console.error('Error cargando whitelist del torneo:', err);
        setWhitelistError('Error de permisos al leer la Whitelist.');
        setWhitelistLoading(false);
      });
      return () => unsubscribe();
    }


    if (selectedWhitelistTournamentId) {
      const ref = collection(db, 'tournaments', selectedWhitelistTournamentId, 'whitelist');
      const q = query(ref, orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const entries: WhitelistEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          entries.push({
            email: docSnap.id,
            addedBy: data.addedBy || 'admin',
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
            role: data.role || 'user',
            tournamentId: selectedWhitelistTournamentId
          });
        });
        setWhitelistEntries(entries);
        setWhitelistLoading(false);
      }, (err) => {
        console.error('Error cargando whitelist del torneo:', err);
        setWhitelistError('Error de permisos al leer la Whitelist.');
        setWhitelistLoading(false);
      });
      return () => unsubscribe();
    } else {
      const unsubscribes: (() => void)[] = [];
      const allEntriesMap: { [key: string]: WhitelistEntry } = {};

      const updateState = () => {
        const sortedEntries = Object.values(allEntriesMap).sort((a, b) => b.createdAt - a.createdAt);
        setWhitelistEntries(sortedEntries);
        setWhitelistLoading(false);
      };

      const globalRef = collection(db, 'whitelist');
      const globalQ = query(globalRef, orderBy('createdAt', 'desc'));
      const unsubGlobal = onSnapshot(globalQ, (snapshot) => {
        Object.keys(allEntriesMap).forEach(key => {
          if (allEntriesMap[key].tournamentId === null) {
            delete allEntriesMap[key];
          }
        });
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const email = docSnap.id;
          allEntriesMap[`global_${email}`] = {
            email: email,
            addedBy: data.addedBy || 'admin',
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
            role: data.role || 'user',
            tournamentId: data.tournamentId || null
          };
        });
        updateState();
      }, (err) => {
        console.error('Error cargando whitelist global:', err);
        setWhitelistError('Error de permisos al leer la Whitelist.');
        setWhitelistLoading(false);
      });
      unsubscribes.push(unsubGlobal);

      tournaments.forEach((t) => {
        const tRef = collection(db, 'tournaments', t.id, 'whitelist');
        const tQ = query(tRef, orderBy('createdAt', 'desc'));
        const unsubT = onSnapshot(tQ, (snapshot) => {
          Object.keys(allEntriesMap).forEach(key => {
            if (allEntriesMap[key].tournamentId === t.id) {
              delete allEntriesMap[key];
            }
          });
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const email = docSnap.id;
            allEntriesMap[`${t.id}_${email}`] = {
              email: email,
              addedBy: data.addedBy || 'admin',
              createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
              role: data.role || 'user',
              tournamentId: t.id
            };
          });
          updateState();
        }, (err) => {
          console.error(`Error cargando whitelist del torneo ${t.id}:`, err);
        });
        unsubscribes.push(unsubT);
      });

      return () => {
        unsubscribes.forEach(unsub => unsub());
      };
    }
  }, [user, selectedWhitelistTournamentId, tournaments]);

  // Limpiar alertas globales al cambiar de pantalla
  const handleNavigateGuest = (view: GuestView) => {
    clearError();
    setGuestView(view);
  };

  const handleNavigateMember = (view: MemberView) => {
    setWhitelistError(null);
    setWhitelistSuccess(null);
    setMatchesError(null);
    setAdminSchedulingError(null);
    setAdminSchedulingSuccess(null);
    setProfileError(null);
    setProfileSuccess(null);
    setSelectedParticipantDetail(null);
    setSelectedParticipantPreds([]);
    
    // Si entramos a leaderboard, ponemos la selección en pending para admin, o su respectivo torneo para usuarios normales y árbitros
    if (view === 'leaderboard') {
      if (user && (user.role === 'user' || user.role === 'referee')) {
        setRankingTournamentId(tournaments.length > 0 ? tournaments[0].id : 'no_tournament');
      } else {
        setRankingTournamentId('pending');
      }
    }
    
    setMemberView(view);
  };

  // Acción: Agregar Email a la Whitelist
  const handleAddEmail = async (emailToAdd: string, role: UserRole = 'user', tournamentId: string | null = null) => {
    setWhitelistLoading(true);
    setWhitelistError(null);
    setWhitelistSuccess(null);

    const emailSanitized = emailToAdd.trim().toLowerCase();

    if (IS_MOCK_ENV) {
      if (tournamentId) {
        const mockWLJson = localStorage.getItem('prode_tournament_whitelist') || '[]';
        const wl = JSON.parse(mockWLJson);
        if (wl.some((e: any) => e.email === emailSanitized && e.tournamentId === tournamentId)) {
          setWhitelistError('Este correo electrónico ya está en la whitelist de este torneo.');
          setWhitelistLoading(false);
          return;
        }
        wl.push({
          email: emailSanitized,
          tournamentId: tournamentId,
          addedBy: user?.displayName || 'Admin',
          createdAt: Date.now()
        });
        localStorage.setItem('prode_tournament_whitelist', JSON.stringify(wl));
        setWhitelistSuccess(`¡Correo ${emailSanitized} autorizado para el torneo exitosamente (Mock)!`);
        
        // Actualizar estado local
        const newMockEntry: WhitelistEntry = {
          email: emailSanitized,
          addedBy: user?.displayName || 'Admin',
          createdAt: Date.now(),
          role: 'user',
          tournamentId: tournamentId
        };
        setWhitelistEntries([newMockEntry, ...whitelistEntries]);
      } else {
        if (whitelistEntries.some(e => e.email === emailSanitized && e.tournamentId === null)) {
          setWhitelistError('Este correo electrónico ya está en la whitelist global.');
          setWhitelistLoading(false);
          return;
        }
        const newMockEntry: WhitelistEntry = {
          email: emailSanitized,
          addedBy: user?.displayName || 'Admin',
          createdAt: Date.now(),
          role: role,
          tournamentId: null
        };
        setWhitelistEntries([newMockEntry, ...whitelistEntries]);
        setWhitelistSuccess(`¡Correo ${emailSanitized} autorizado como ${role} exitosamente (Mock)!`);
      }
      setWhitelistLoading(false);
      return;
    }

    try {
      if (tournamentId) {
        const batch = writeBatch(db);
        const tourneyWlRef = doc(db, 'tournaments', tournamentId, 'whitelist', emailSanitized);
        batch.set(tourneyWlRef, {
          email: emailSanitized,
          addedBy: user?.uid || 'admin',
          createdAt: serverTimestamp()
        });

        const globalWlRef = doc(db, 'whitelist', emailSanitized);
        const globalWlSnap = await getDoc(globalWlRef);
        if (!globalWlSnap.exists()) {
          batch.set(globalWlRef, {
            email: emailSanitized,
            role: 'user',
            addedBy: user?.uid || 'admin',
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
      } else {
        const docRef = doc(db, 'whitelist', emailSanitized);
        await setDoc(docRef, {
          email: emailSanitized,
          addedBy: user?.uid || 'admin',
          createdAt: serverTimestamp(),
          role: role,
          tournamentId: null
        });
      }
      setWhitelistSuccess(`¡Correo ${emailSanitized} autorizado exitosamente!`);
    } catch (err: any) {
      console.error(err);
      setWhitelistError('No se pudo agregar el correo. Verifica las reglas de Firestore.');
    } finally {
      setWhitelistLoading(false);
    }
  };

  // Acción: Mover Email de Whitelist a otro Torneo o Global
  const handleMoveWhitelistEmail = async (
    email: string,
    fromTournamentId: string | null,
    toTournamentId: string | null
  ) => {
    setWhitelistLoading(true);
    setWhitelistError(null);
    setWhitelistSuccess(null);

    const emailSanitized = email.trim().toLowerCase();

    try {
      await moveWhitelistEntryInDB(emailSanitized, fromTournamentId, toTournamentId, 'user');
      const fromName = fromTournamentId 
        ? (tournaments.find(t => t.id === fromTournamentId)?.name || 'Torneo') 
        : 'Global';
      const toName = toTournamentId 
        ? (tournaments.find(t => t.id === toTournamentId)?.name || 'Torneo') 
        : 'Global';

      // En entorno mock, debemos actualizar manualmente el estado local
      if (IS_MOCK_ENV) {
        if (selectedWhitelistTournamentId) {
          setWhitelistEntries(prev => prev.filter(e => e.email !== emailSanitized));
        } else {
          setWhitelistEntries(prev => prev.map(e => e.email === emailSanitized ? { ...e, tournamentId: toTournamentId } : e));
        }
      }

      setWhitelistSuccess(`¡Correo ${emailSanitized} movido con éxito de "${fromName}" a "${toName}"!`);
    } catch (err) {
      console.error(err);
      setWhitelistError('No se pudo mover el correo en la whitelist. Verifica tus permisos.');
    } finally {
      setWhitelistLoading(false);
    }
  };

  // Acción: Actualizar Rol de un Correo/Usuario en la Whitelist y Base de Datos
  const handleUpdateUserRole = async (email: string, newRole: UserRole) => {
    setWhitelistLoading(true);
    setWhitelistError(null);
    setWhitelistSuccess(null);

    const emailSanitized = email.trim().toLowerCase();
    const matchedUser = participants.find(p => p.email.trim().toLowerCase() === emailSanitized);
    const userId = matchedUser ? matchedUser.uid : null;

    try {
      await updateUserRoleInDB(emailSanitized, newRole, userId);
      
      if (IS_MOCK_ENV) {
        setWhitelistEntries(prev => prev.map(e => e.email === emailSanitized ? { ...e, role: newRole } : e));
      }
      
      if (user && user.email.trim().toLowerCase() === emailSanitized) {
        window.location.reload();
      }

      setWhitelistSuccess(`¡Rol actualizado con éxito a ${newRole} para ${emailSanitized}!`);
    } catch (err) {
      console.error(err);
      setWhitelistError('No se pudo actualizar el rol del usuario.');
    } finally {
      setWhitelistLoading(false);
    }
  };

  // Acción: Remover Email de la Whitelist
  const handleRemoveEmail = async (emailToRemove: string, tournamentId: string | null = null) => {
    setWhitelistLoading(true);
    setWhitelistError(null);
    setWhitelistSuccess(null);

    if (IS_MOCK_ENV) {
      if (tournamentId) {
        const mockWLJson = localStorage.getItem('prode_tournament_whitelist') || '[]';
        const wl = JSON.parse(mockWLJson);
        const updatedWl = wl.filter((w: any) => !(w.tournamentId === tournamentId && w.email === emailToRemove));
        localStorage.setItem('prode_tournament_whitelist', JSON.stringify(updatedWl));
        setWhitelistSuccess(`¡Autorización para ${emailToRemove} removida del torneo (Mock)!`);
      } else {
        setWhitelistEntries(whitelistEntries.filter(e => e.email !== emailToRemove));
        setWhitelistSuccess(`¡Autorización para ${emailToRemove} removida (Mock)!`);
      }
      setWhitelistLoading(false);
      return;
    }

    try {
      if (tournamentId) {
        await deleteDoc(doc(db, 'tournaments', tournamentId, 'whitelist', emailToRemove));
        setWhitelistSuccess(`¡Autorización para ${emailToRemove} removida del torneo exitosamente!`);
      } else {
        await deleteDoc(doc(db, 'whitelist', emailToRemove));
        setWhitelistSuccess(`¡Autorización para ${emailToRemove} removida exitosamente!`);
      }
    } catch (err) {
      console.error(err);
      setWhitelistError('No se pudo quitar la autorización. Verifica tus privilegios.');
    } finally {
      setWhitelistLoading(false);
    }
  };

  // Acción Admin: Cargar / Editar un resultado real
  const handleSaveMatchResult = async (matchId: string, homeScore: number, awayScore: number) => {
    setAdminSavingResult(true);
    try {
      await updateMatchResultInDB(matchId, homeScore, awayScore);
      
      // Recargar partidos y recálculos de la DB
      const updatedMatches = await getMatchesFromDB();
      setMatches(updatedMatches);
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error('Error guardando resultado de partido:', err);
      throw err;
    } finally {
      setAdminSavingResult(false);
    }
  };

  // Acción Admin: Eliminar / Resetear un resultado real
  const handleDeleteMatchResult = async (matchId: string) => {
    setAdminSavingResult(true);
    try {
      await deleteMatchResultInDB(matchId);
      
      // Recargar partidos y recálculos de la DB
      const updatedMatches = await getMatchesFromDB();
      setMatches(updatedMatches);
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error('Error eliminando resultado de partido:', err);
      throw err;
    } finally {
      setAdminSavingResult(false);
    }
  };

  // Acción Admin: Agendar nuevo partido en el calendario
  const handleScheduleMatch = async (matchData: {
    group: string;
    homeTeam: string;
    awayTeam: string;
    date: number;
    stadium: string;
    city: string;
    phase?: string;
  }) => {
    setAdminSchedulingLoading(true);
    setAdminSchedulingError(null);
    setAdminSchedulingSuccess(null);
    try {
      await addNewMatchToDB(matchData);
      setAdminSchedulingSuccess(`¡Partido ${matchData.homeTeam} vs ${matchData.awayTeam} agendado y registrado con éxito!`);
      
      // Recargar partidos de la DB
      const updatedMatches = await getMatchesFromDB();
      setMatches(updatedMatches);
    } catch (err) {
      console.error('Error al agendar partido:', err);
      setAdminSchedulingError('No se pudo agendar el partido. Comprobá las reglas de Firestore.');
    } finally {
      setAdminSchedulingLoading(false);
    }
  };

  // Acción Admin: Modificar metadatos de un partido
  const handleUpdateMatchMetadata = async (
    matchId: string,
    matchData: {
      group: string;
      homeTeam: string;
      awayTeam: string;
      date: number;
      stadium: string;
      city: string;
      phase?: string;
    }
  ) => {
    setAdminSchedulingLoading(true);
    setAdminSchedulingError(null);
    setAdminSchedulingSuccess(null);
    try {
      await updateMatchMetadataInDB(matchId, matchData);
      setAdminSchedulingSuccess(`¡Partido actualizado con éxito!`);
      
      // Recargar partidos de la DB
      const updatedMatches = await getMatchesFromDB();
      setMatches(updatedMatches);
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error('Error al actualizar metadatos de partido:', err);
      setAdminSchedulingError('No se pudieron guardar los cambios del partido.');
      throw err;
    } finally {
      setAdminSchedulingLoading(false);
    }
  };

  // Acción Admin: Forzar re-sembrado completo
  const handleForceReseedMatches = async () => {
    if (!window.confirm('¿Estás seguro de que querés reemplazar TODOS los partidos de la base de datos por el fixture limpio oficial de 104 partidos? Esto pisará los resultados actuales cargados.')) {
      return;
    }
    setSystemLoading(true);
    setSystemError(null);
    setSystemSuccess(null);
    try {
      await forceReseedMatchesInDB();
      setSystemSuccess('¡Fixture oficial de 104 partidos re-sembrado y reemplazado con éxito!');
      // Recargar partidos
      const loaded = await getMatchesFromDB();
      setMatches(loaded);
    } catch (err) {
      console.error(err);
      setSystemError('No se pudo re-sembrar el fixture. Revisa las reglas de Firestore.');
    } finally {
      setSystemLoading(false);
    }
  };

  // Acción Admin: Borrar predicciones y resetear perfiles
  const handleDeleteAllPredictions = async () => {
    if (!window.confirm('🚨 ADVERTENCIA CRÍTICA: ¿Estás seguro de que querés BORRAR TODAS las predicciones de todos los usuarios y resetear sus puntajes a 0? Esta acción es irreversible.')) {
      return;
    }
    setSystemLoading(true);
    setSystemError(null);
    setSystemSuccess(null);
    try {
      await deleteAllPredictionsAndResetUsers();
      setSystemSuccess('¡Todas las predicciones fueron borradas y los puntajes de los usuarios reiniciados a 0!');
      // Recargar predicciones
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error(err);
      setSystemError('No se pudieron borrar las predicciones de la base de datos.');
    } finally {
      setSystemLoading(false);
    }
  };

  // Acción: Sellar el prode del usuario logueado
  const handleSealProde = async () => {
    if (!user) return;
    try {
      if (activeTournamentId) {
        await sealTournamentProdeInDB(activeTournamentId, user.uid);
      } else {
        await sealUserProdeInDB(user.uid);
        if (reloadUserProfile) {
          await reloadUserProfile();
        }
      }
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error('Error al sellar el prode:', err);
    }
  };

  // Acción Admin: Aleatorizar predicciones de un fantasma
  const handleRandomizeGhostPredictions = async (ghostUid: string) => {
    try {
      await randomizeGhostPredictions(ghostUid);
      await loadPredictionsAndParticipants();
      
      // Recargar el detalle en pantalla para que el admin vea los goles cargados al instante
      const updatedPreds = await getUserPredictions(ghostUid);
      setSelectedParticipantPreds(updatedPreds);
      
      const parts = await getAllParticipantsFromDB();
      const updatedGhost = parts.find(u => u.uid === ghostUid);
      if (updatedGhost) {
        setSelectedParticipantDetail(updatedGhost);
      }
    } catch (err) {
      console.error('Error al aleatorizar predicciones:', err);
      alert('Error al generar goles del fantasma.');
    }
  };

  // Acción Usuario: Guardado automático de predicciones
  const handleSavePrediction = async (matchId: string, homePrediction: number, awayPrediction: number) => {
    if (!user) return;
    setSavingPredictionMatchId(matchId);
    try {
      if (activeTournamentId) {
        await saveTournamentPredictionInDB(activeTournamentId, user.uid, matchId, { homePrediction, awayPrediction });
      } else {
        await saveUserPrediction(user.uid, matchId, homePrediction, awayPrediction);
      }
      
      // Actualizar estado local inmediato
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error('Error guardando predicción:', err);
      alert('Hubo un error al guardar tu predicción. Reintentá.');
    } finally {
      setSavingPredictionMatchId(null);
    }
  };

  // Acción Usuario: Guardado de predicción simple (ganador/empate)
  const handleSaveSimplePrediction = async (matchId: string, outcome: 'home' | 'away' | 'draw') => {
    if (!user || !activeTournamentId) return;
    setSavingPredictionMatchId(matchId);
    try {
      await saveTournamentPredictionInDB(activeTournamentId, user.uid, matchId, { predictionOutcome: outcome });
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error('Error guardando predicción simple:', err);
      alert('Hubo un error al guardar tu predicción. Reintentá.');
    } finally {
      setSavingPredictionMatchId(null);
    }
  };

  // Acción Usuario: Borrar una predicción
  const handleClearPrediction = async (matchId: string) => {
    if (!user) return;
    setSavingPredictionMatchId(matchId);
    try {
      if (activeTournamentId) {
        if (IS_MOCK_ENV) {
          const predsJson = localStorage.getItem('prode_tournament_predictions') || '[]';
          const predictions = JSON.parse(predsJson);
          const filtered = predictions.filter(
            (p: any) => !(p.tournamentId === activeTournamentId && p.prediction.predictionId === `${user.uid}_${matchId}`)
          );
          localStorage.setItem('prode_tournament_predictions', JSON.stringify(filtered));
        } else {
          await deleteDoc(doc(db, 'tournaments', activeTournamentId, 'predictions', `${user.uid}_${matchId}`));
        }
      } else {
        await clearUserPrediction(user.uid, matchId);
      }
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error('Error borrando predicción:', err);
      alert('Hubo un error al borrar tu predicción.');
    } finally {
      setSavingPredictionMatchId(null);
    }
  };

  // Acciones de Torneos Personalizados
  const handleCreateTournament = async (name: string, modality: 'exact' | 'simple') => {
    if (!user) return;
    try {
      const newT = await createTournamentInDB(name, modality, user);
      setActiveTournamentId(newT.id);
      setMemberView('prode');
    } catch (err) {
      console.error('Error al crear torneo:', err);
      alert('No se pudo crear el torneo.');
    }
  };

  const handleInviteUser = async (email: string) => {
    if (!activeTournamentId || !user) return;
    setInviteLoading(true);
    try {
      await inviteUserToTournamentInDB(activeTournamentId, email, user.uid);
      alert(`Usuario con correo ${email} invitado y agregado a la whitelist global exitosamente.`);
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error('Error al invitar usuario:', err);
      alert('No se pudo invitar al usuario.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string, email: string) => {
    if (!activeTournamentId) return;
    try {
      await removeUserFromTournamentInDB(activeTournamentId, userId, email);
      alert('Usuario removido del torneo.');
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error('Error al remover usuario:', err);
      alert('No se pudo remover al usuario.');
    }
  };

  const handleUpdateTournament = async (newName: string, newModality?: 'exact' | 'simple') => {
    if (!activeTournamentId) return;
    try {
      const activeT = tournaments.find(t => t.id === activeTournamentId);
      const targetModality = newModality || activeT?.modality || 'exact';

      await updateTournamentInDB(activeTournamentId, newName, targetModality);
      alert('Torneo actualizado con éxito.');
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error('Error al actualizar torneo:', err);
      alert('No se pudo actualizar el torneo.');
    }
  };

  const handleDeleteTournament = async () => {
    if (!activeTournamentId) return;
    try {
      await deleteTournamentFromDB(activeTournamentId);
      setActiveTournamentId(null);
      alert('Torneo eliminado con éxito.');
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error('Error al eliminar torneo:', err);
      alert('No se pudo eliminar el torneo.');
    }
  };

  // Acción Usuario: Actualizar Perfil de Participante (Etapa 6)
  const handleUpdateProfile = async (displayName: string, photoURL: string) => {
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      await updateUserProfile(displayName, photoURL);
      setProfileSuccess('¡Tu perfil de participante se actualizó con éxito!');
      await loadPredictionsAndParticipants();
    } catch (err: any) {
      console.error('Error al actualizar perfil:', err);
      setProfileError(err.message || 'Ocurrió un error al actualizar los datos.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Acción Usuario: Solicitar restablecimiento de contraseña
  const handleTriggerPasswordReset = async () => {
    if (!user) return;
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      await resetPassword(user.email);
      setProfileSuccess(`Te enviamos un correo electrónico a ${user.email} para restablecer tu clave.`);
    } catch (err: any) {
      console.error('Error al enviar correo de restablecimiento:', err);
      setProfileError(err.message || 'No se pudo enviar el correo de restablecimiento.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Acción Social: Cargar detalle de predicciones de otro usuario
  const handleSelectParticipant = async (selectedUser: UserProfile) => {
    setSelectedParticipantDetail(selectedUser);
    try {
      const preds = await getUserPredictions(selectedUser.uid);
      setSelectedParticipantPreds(preds);
    } catch (err) {
      console.error('Error al cargar predicciones de participante:', err);
    }
  };

  // 1. Pantalla de Carga Shimmer Premium
  if (loading) {
    return <LoadingModal isOpen={loading} message="Cargando tu Estadio..." />;
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

  const isAdmin = user.role === 'admin';

  // 3. Ruteador para Miembros (Autenticados)
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)' }}>
      <LoadingModal isOpen={inviteLoading} message="Invitando participante..." />
      <Navbar 
        user={user} 
        activePage={memberView}
        onNavigate={(page) => handleNavigateMember(page as MemberView)}
        onLogout={logout}
        activeTournamentName={activeTournamentId ? (tournaments.find(t => t.id === activeTournamentId)?.name || '') : 'Prode Mundial 2026 (Global)'}
        activeTournamentPoints={activeTournamentId ? (activeTournamentParticipants.find(p => p.uid === user.uid)?.points || 0) : user.points}
      />

      <main style={{ 
        flex: 1, 
        padding: '40px 20px',
        margin: '0 auto',
        width: '100%',
        maxWidth: memberView === 'leaderboard' || memberView === 'calendar' || memberView === 'tournaments' || (memberView === 'whitelist' && adminSubTab === 'scenario') ? '100%' : '1200px',
        transition: 'max-width 0.3s ease-in-out'
      }}>
        {memberView === 'prode' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Header y Sub-Navegación del Game Hub */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
                  {activeTournamentId ? `Game Hub - ${tournaments.find(t => t.id === activeTournamentId)?.name}` : 'Game Hub Mundialista 2026'}
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  Completá tus pronósticos {activeTournamentId && tournaments.find(t => t.id === activeTournamentId)?.modality === 'simple' ? '(Modalidad Simple)' : '(Marcador Exacto)'}.
                </p>
              </div>
            </div>

            {/* Renderizado de Sub-pestañas */}
            <div className="hide-scrollbar" style={{ height: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingRight: '5px' }}>
              {matchesLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px' }}></div>
                  ))}
                </div>
              ) : (
                <ProdeForm 
                  matches={matches}
                  predictions={predictions}
                  onSavePrediction={handleSavePrediction}
                  onClearPrediction={handleClearPrediction}
                  savingMatchId={savingPredictionMatchId}
                  user={user}
                  onSealProde={handleSealProde}
                  tournamentModality={activeTournamentId ? (tournaments.find(t => t.id === activeTournamentId)?.modality || 'exact') : 'exact'}
                  onSaveSimplePrediction={handleSaveSimplePrediction}
                  isTournamentParticipantCompleted={activeTournamentId ? (activeTournamentParticipants.find(p => p.uid === user.uid)?.completedProde || false) : undefined}
                />
              )}
            </div>
          </div>
        )}
        {memberView === 'tournaments' && (user.role === 'admin' || user.role === 'referee') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <TournamentManager
              user={user}
              tournaments={tournaments}
              activeTournament={activeTournamentId ? (tournaments.find(t => t.id === activeTournamentId) || null) : null}
              onSelectTournament={setActiveTournamentId}
              onCreateTournament={handleCreateTournament}
              onInviteUser={handleInviteUser}
              onRemoveUser={handleRemoveUser}
              onUpdateTournament={handleUpdateTournament}
              onDeleteTournament={handleDeleteTournament}
              participants={activeTournamentParticipants}
            />
          </div>
        )}
        {memberView === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <MatchList 
              matches={matches} 
              isAdmin={isAdmin}
              onEditMatch={(match) => setSelectedMatchToEdit(match)}
            />
          </div>
        )}

        {memberView === 'leaderboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {rankingTournamentId === 'no_tournament' ? (
              <div className="glass-panel" style={{ padding: '35px', textAlign: 'center', maxWidth: '600px', margin: '40px auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <span style={{ fontSize: '3rem' }}>⚠️</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Sin Torneo Asignado
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
                  Actualmente no estás participando en ningún torneo privado. Solicitale al árbitro de tu torneo que te autorice en su Whitelist.
                </p>
              </div>
            ) : rankingTournamentId === 'pending' ? (
              <div className="glass-panel" style={{ padding: '35px', textAlign: 'center', maxWidth: '600px', margin: '40px auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <span style={{ fontSize: '3rem' }}>📊</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Seleccionar Ranking de Torneo
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
                  Elegí el torneo del cual querés visualizar la tabla de posiciones (ranking) y estadísticas de participantes.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <button
                    onClick={() => setRankingTournamentId(null)}
                    className="btn btn-primary"
                    style={{ padding: '12px', fontWeight: 700 }}
                  >
                    🌍 Ver Ranking Global (Mundial 2026)
                  </button>
                  {tournaments.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setRankingTournamentId(t.id)}
                      className="btn"
                      style={{ padding: '12px', backgroundColor: 'var(--bg-overlay)', color: 'var(--text-main)', border: '1px solid var(--border-light)', fontWeight: 600 }}
                    >
                      🏆 Ver Ranking - {t.name} ({t.modality === 'simple' ? 'Modalidad Simple' : 'Marcador Exacto'})
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {user.role !== 'user' && user.role !== 'referee' && (
                      <button 
                        onClick={() => setRankingTournamentId('pending')} 
                        className="btn btn-secondary" 
                        style={{ padding: '8px 12px', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        ⬅️ Cambiar Torneo
                      </button>
                    )}
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
                      {rankingTournamentId ? `Ranking - ${tournaments.find(t => t.id === rankingTournamentId)?.name}` : 'Ranking Global'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className="btn"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      borderRadius: '6px',
                      backgroundColor: showStats ? 'var(--border-light)' : 'transparent',
                      color: showStats ? 'var(--accent-gold)' : 'var(--text-muted)',
                      border: '1px solid',
                      borderColor: showStats ? 'var(--border-active)' : 'transparent',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                  >
                    {showStats ? 'Ocultar Estadísticas' : '📊 Más estadísticas'}
                  </button>
                </div>

                {showStats ? (
                  <DashboardStats 
                    users={participants} 
                    matches={matches}
                    predictions={allPredictions}
                  />
                ) : (
                  <>
                    <Leaderboard 
                      users={participants}
                      onSelectUser={handleSelectParticipant}
                      isAdmin={isAdmin}
                    />

                    {/* Panel flotante de detalle si seleccionan un usuario */}
                    {selectedParticipantDetail && (
                      <div style={{ width: '100%', margin: '0 auto' }}>
                        <ParticipantsTable 
                          users={participants}
                          onSelectUser={handleSelectParticipant}
                          selectedUser={selectedParticipantDetail}
                          selectedUserPredictions={selectedParticipantPreds}
                          matches={matches}
                          onClosePredictionsPanel={() => {
                            setSelectedParticipantDetail(null);
                            setSelectedParticipantPreds([]);
                          }}
                          isAdmin={isAdmin}
                          onRandomizeGhost={handleRandomizeGhostPredictions}
                        />
                      </div>
                    )}

                    {/* Panel de administración simplificado para Árbitros */}
                    {user.role === 'referee' && activeTournamentId && (
                      <div className="glass-panel" style={{ marginTop: '40px', padding: '30px' }}>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          🛡️ Panel del Árbitro - {tournaments.find(t => t.id === activeTournamentId)?.name || 'Mi Torneo'}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '25px', lineHeight: 1.5 }}>
                          Como árbitro de este torneo privado, podés invitar nuevos participantes por correo (se autorizarán en la whitelist global de forma automática como 'user') y moderar a los integrantes.
                        </p>

                        {/* Formulario de Invitación */}
                        <form 
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const input = form.elements.namedItem('inviteEmail') as HTMLInputElement;
                            const email = input.value.trim().toLowerCase();
                            if (email) {
                              await handleInviteUser(email);
                              form.reset();
                            }
                          }} 
                          style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '35px' }}
                        >
                          <div className="form-group" style={{ flex: 1, minWidth: '250px', marginBottom: 0 }}>
                            <label className="form-label" style={{ marginBottom: '8px', display: 'block', fontWeight: 600 }}>Invitar Nuevo Participante</label>
                            <input 
                              type="email" 
                              name="inviteEmail"
                              className="form-input" 
                              placeholder="correo@ejemplo.com"
                              required
                              style={{ width: '100%', height: '42px', padding: '0 10px', backgroundColor: 'var(--bg-overlay)', color: 'var(--text-main)', border: '1px solid var(--border-light)', borderRadius: '6px' }}
                            />
                          </div>
                          <button 
                            type="submit" 
                            className="btn btn-primary" 
                            style={{ height: '42px', padding: '0 25px', fontWeight: 700 }}
                          >
                            ➕ Autorizar e Invitar
                          </button>
                        </form>

                        {/* Lista de Participantes Activos */}
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '15px' }}>
                          Integrantes del Torneo ({activeTournamentParticipants.length})
                        </h4>
                        {activeTournamentParticipants.length === 0 ? (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '25px' }}>
                            No hay participantes registrados en este torneo todavía.
                          </p>
                        ) : (
                          <div style={{ overflowX: 'auto', marginBottom: '35px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                              <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
                                  <th style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Participante</th>
                                  <th style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Correo</th>
                                  <th style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Puntos</th>
                                  <th style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeTournamentParticipants.map((part) => (
                                  <tr key={part.uid} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '12px 8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <img src={part.photoURL} alt={part.displayName} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid var(--border-light)' }} />
                                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{part.displayName}</span>
                                    </td>
                                    <td style={{ padding: '12px 8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{part.email}</td>
                                    <td style={{ padding: '12px 8px', fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-gold)' }}>{part.points} pts</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                      {part.uid !== user.uid && (
                                        <button 
                                          onClick={() => {
                                            if (confirm(`¿Seguro que querés remover a ${part.displayName} del torneo?`)) {
                                              handleRemoveUser(part.uid, part.email);
                                            }
                                          }}
                                          className="btn btn-danger"
                                          style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                                        >
                                          Remover del Torneo
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Lista de Invitaciones Pendientes */}
                        {(() => {
                          const pendingInvites = whitelistEntries.filter(entry => 
                            entry.tournamentId === activeTournamentId && 
                            !activeTournamentParticipants.some(p => p.email.trim().toLowerCase() === entry.email.trim().toLowerCase())
                          );

                          if (pendingInvites.length > 0) {
                            return (
                              <>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '15px', marginTop: '25px' }}>
                                  Invitaciones Pendientes ({pendingInvites.length})
                                </h4>
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
                                        <th style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Correo Autorizado</th>
                                        <th style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Fecha de Invitación</th>
                                        <th style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>Acciones</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pendingInvites.map((invite) => (
                                        <tr key={invite.email} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                          <td style={{ padding: '12px 8px', fontWeight: 500, fontSize: '0.9rem' }}>{invite.email}</td>
                                          <td style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {new Date(invite.createdAt).toLocaleDateString()}
                                          </td>
                                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                            <button 
                                              onClick={() => {
                                                if (confirm(`¿Seguro que querés cancelar la invitación de ${invite.email}?`)) {
                                                  handleRemoveUser('', invite.email);
                                                }
                                              }}
                                              className="btn btn-danger"
                                              style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                                            >
                                              Cancelar Invitación
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </>

                )}
              </>
            )}
          </div>
        )}

        {memberView === 'whitelist' && isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Sub-Navegación Admin */}
            <div className="glass-panel" style={{ padding: '10px 20px', display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setAdminSubTab('whitelist')}
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  borderRadius: '6px',
                  backgroundColor: adminSubTab === 'whitelist' ? 'var(--border-light)' : 'transparent',
                  color: adminSubTab === 'whitelist' ? 'var(--accent-gold)' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: adminSubTab === 'whitelist' ? 'var(--border-active)' : 'transparent',
                  fontWeight: 600
                }}
              >
                Gestionar Whitelist
              </button>
              <button
                onClick={() => setAdminSubTab('scheduler')}
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  borderRadius: '6px',
                  backgroundColor: adminSubTab === 'scheduler' ? 'var(--border-light)' : 'transparent',
                  color: adminSubTab === 'scheduler' ? 'var(--accent-gold)' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: adminSubTab === 'scheduler' ? 'var(--border-active)' : 'transparent',
                  fontWeight: 600
                }}
              >
                Agendar Partidos
              </button>
              <button
                onClick={() => setAdminSubTab('results')}
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  borderRadius: '6px',
                  backgroundColor: adminSubTab === 'results' ? 'var(--border-light)' : 'transparent',
                  color: adminSubTab === 'results' ? 'var(--accent-gold)' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: adminSubTab === 'results' ? 'var(--border-active)' : 'transparent',
                  fontWeight: 600
                }}
              >
                ⚽ Cargar Resultados
              </button>
              <button
                onClick={() => setAdminSubTab('ghosts')}
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  borderRadius: '6px',
                  backgroundColor: adminSubTab === 'ghosts' ? 'var(--border-light)' : 'transparent',
                  color: adminSubTab === 'ghosts' ? 'var(--accent-gold)' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: adminSubTab === 'ghosts' ? 'var(--border-active)' : 'transparent',
                  fontWeight: 600
                }}
              >
                Participantes Fantasmas
              </button>
              <button
                onClick={() => setAdminSubTab('system')}
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  borderRadius: '6px',
                  backgroundColor: adminSubTab === 'system' ? 'var(--border-light)' : 'transparent',
                  color: adminSubTab === 'system' ? 'var(--accent-gold)' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: adminSubTab === 'system' ? 'var(--border-active)' : 'transparent',
                  fontWeight: 600
                }}
              >
                ⚙️ Mantenimiento
              </button>
              <button
                onClick={() => setAdminSubTab('scenario')}
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  borderRadius: '6px',
                  backgroundColor: adminSubTab === 'scenario' ? 'var(--border-light)' : 'transparent',
                  color: adminSubTab === 'scenario' ? 'var(--accent-gold)' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: adminSubTab === 'scenario' ? 'var(--border-active)' : 'transparent',
                  fontWeight: 600
                }}
              >
                🔮 Modo Escenario
              </button>
            </div>

            {/* Renderizado Condicional de Sub-vistas Admin */}
            {adminSubTab === 'whitelist' && (
              <WhitelistManager 
                entries={resolvedWhitelistEntries}
                onAddEmail={handleAddEmail}
                onRemoveEmail={handleRemoveEmail}
                onMoveEmail={handleMoveWhitelistEmail}
                onUpdateRole={handleUpdateUserRole}
                loading={whitelistLoading}
                error={whitelistError}
                successMessage={whitelistSuccess}
                tournaments={tournaments}
                selectedTournamentId={selectedWhitelistTournamentId}
                onTournamentChange={(id) => setSelectedWhitelistTournamentId(id)}
              />
            )}
            {adminSubTab === 'ghosts' && (
              <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
                <h3 style={{ color: 'var(--text-muted)' }}>👥 Participantes Fantasmas (Deshabilitado)</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '10px' }}>
                  Esta funcionalidad está deshabilitada temporalmente mientras se adapta al sistema de múltiples torneos paralelos.
                </p>
              </div>
            )}
            {adminSubTab === 'scheduler' && (
              <MatchScheduler 
                matches={matches}
                onScheduleMatch={handleScheduleMatch}
                onUpdateMatchMetadata={handleUpdateMatchMetadata}
                loading={adminSchedulingLoading}
                error={adminSchedulingError}
                successMessage={adminSchedulingSuccess}
              />
            )}
            {adminSubTab === 'results' && (
              <MatchResultsManager 
                matches={matches}
                onSaveResult={handleSaveMatchResult}
                loading={adminSavingResult}
              />
            )}
            {adminSubTab === 'scenario' && (
              <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
                <h3 style={{ color: 'var(--text-muted)' }}>🔮 Modo Escenario (Deshabilitado)</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '10px' }}>
                  Esta funcionalidad está deshabilitada temporalmente mientras se adapta al sistema de múltiples torneos paralelos.
                </p>
              </div>
            )}
            {adminSubTab === 'system' && (
              <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
                  ⚙️ Panel de Mantenimiento de Datos (Exclusivo Admin)
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px', lineHeight: 1.5 }}>
                  Herramientas avanzadas para la gestión e inicialización del prode. Úsalas con extrema precaución ya que impactan directamente sobre todos los participantes reales.
                </p>

                {systemError && (
                  <div style={{ 
                    backgroundColor: 'RGBA(239, 68, 68, 0.1)', 
                    border: '1px solid var(--accent-error)', 
                    color: 'var(--text-main)', 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    fontSize: '0.9rem'
                  }}>
                    ⚠️ {systemError}
                  </div>
                )}

                {systemSuccess && (
                  <div style={{ 
                    backgroundColor: 'RGBA(16, 185, 129, 0.1)', 
                    border: '1px solid var(--accent-green)', 
                    color: 'var(--text-main)', 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    fontSize: '0.9rem'
                  }}>
                    ✅ {systemSuccess}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginTop: '10px' }}>
                  {/* Opción 1: Re-sembrar Fixture */}
                  <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: 'var(--bg-overlay)' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      🌱 Inicializar / Re-sembrar Fixture
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, flex: 1 }}>
                      Borra el calendario existente en la base de datos y vuelve a sembrar los **104 partidos limpios** del fixture oficial (Fase de grupos + Llaves eliminatorias).
                    </p>
                    <button
                      onClick={handleForceReseedMatches}
                      className="btn"
                      style={{
                        height: '45px',
                        backgroundColor: 'RGBA(212, 163, 89, 0.1)',
                        border: '1px solid var(--accent-gold)',
                        color: 'var(--accent-gold)',
                        fontWeight: 700,
                        borderRadius: '6px'
                      }}
                      disabled={systemLoading}
                    >
                      {systemLoading ? 'Procesando...' : 'Re-sembrar 104 Partidos'}
                    </button>
                  </div>

                  {/* Opción 2: Vaciar Predicciones */}
                  <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: 'var(--bg-overlay)' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--accent-error)' }}>
                      🗑️ Vaciar Todas las Predicciones
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, flex: 1 }}>
                      Elimina por completo todas las predicciones cargadas en el sistema por todos los usuarios. Restablece sus estados a pendiente (`completedProde = false`) y los puntajes y aciertos a `0`.
                    </p>
                    <button
                      onClick={handleDeleteAllPredictions}
                      className="btn btn-primary"
                      style={{
                        height: '45px',
                        backgroundColor: 'var(--accent-error)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 700,
                        borderRadius: '6px'
                      }}
                      disabled={systemLoading}
                    >
                      {systemLoading ? 'Procesando...' : 'Borrar Predicciones de Usuarios'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {memberView === 'profile' && (
          <UserProfileEditor 
            user={user}
            onUpdateProfile={handleUpdateProfile}
            onTriggerPasswordReset={handleTriggerPasswordReset}
            loading={profileLoading}
            error={profileError}
            successMessage={profileSuccess}
          />
        )}
      </main>

      {/* Modal flotante de Carga de Resultado */}
      {selectedMatchToEdit && (
        <MatchScoreModal 
          match={selectedMatchToEdit}
          onClose={() => setSelectedMatchToEdit(null)}
          onSaveResult={handleSaveMatchResult}
          onDeleteResult={handleDeleteMatchResult}
          loading={adminSavingResult}
        />
      )}
    </div>
  );
};
