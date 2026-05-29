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
import { ScenarioSimulator } from '../components/prode/ScenarioSimulator';
import { DashboardStats } from '../components/prode/DashboardStats';
import { ParticipantsTable } from '../components/prode/ParticipantsTable';
import { Leaderboard } from '../components/prode/Leaderboard';
import { GhostCreator } from '../components/admin/GhostCreator';
import { UserProfileEditor } from '../components/profile/UserProfileEditor';
import { MatchResultsManager } from '../components/admin/MatchResultsManager';
import type { WhitelistEntry, Match, Prediction, UserProfile } from '../types';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs
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
  getAllParticipantsFromDB,
  createGhostParticipant,
  forceReseedMatchesInDB,
  deleteAllPredictionsAndResetUsers,
  sealUserProdeInDB,
  randomizeAllGhostsGroupStagePredictions,
  updateGhostNameInDB,
  deleteGhostFromDB,
  clearAllGhostsPredictionsInDB
} from '../services/db';

type GuestView = 'login' | 'register' | 'forgot';
type MemberView = 'prode' | 'leaderboard' | 'whitelist' | 'profile';
type ProdeSubTab = 'fill' | 'calendar' | 'stats' | 'participants';
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
  
  // Sub-navegación dentro de "Mi Prode"
  const [prodeSubTab, setProdeSubTab] = useState<ProdeSubTab>('stats');

  // Sub-navegación exclusiva para panel de administración
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('whitelist');

  // Estados específicos para la Whitelist
  const [whitelistEntries, setWhitelistEntries] = useState<WhitelistEntry[]>([]);
  const [whitelistLoading, setWhitelistLoading] = useState(false);
  const [whitelistError, setWhitelistError] = useState<string | null>(null);
  const [whitelistSuccess, setWhitelistSuccess] = useState<string | null>(null);

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

  // Estados para crear participantes fantasmas
  const [adminGhostLoading, setAdminGhostLoading] = useState(false);
  const [adminGhostError, setAdminGhostError] = useState<string | null>(null);
  const [adminGhostSuccess, setAdminGhostSuccess] = useState<string | null>(null);
  const [loadingGhostRandomization, setLoadingGhostRandomization] = useState(false);

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
  const [savedPredictionMatchId, setSavedPredictionMatchId] = useState<string | null>(null);

  // Estados específicos para los Participantes
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [selectedParticipantDetail, setSelectedParticipantDetail] = useState<UserProfile | null>(null);
  const [selectedParticipantPreds, setSelectedParticipantPreds] = useState<Prediction[]>([]);

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
      // Cargar predicciones del usuario logueado
      const userPreds = await getUserPredictions(user.uid);
      setPredictions(userPreds);

      // Cargar listado de participantes
      const parts = await getAllParticipantsFromDB();
      setParticipants(parts);

      // Cargar TODAS las predicciones del torneo (necesario para el Modo Escenario)
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
    } catch (err) {
      console.error('Error cargando predicciones:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadPredictionsAndParticipants();
    }
  }, [user, memberView, prodeSubTab]);

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
    setMatchesError(null);
    setAdminSchedulingError(null);
    setAdminSchedulingSuccess(null);
    setAdminGhostError(null);
    setAdminGhostSuccess(null);
    setProfileError(null);
    setProfileSuccess(null);
    setSelectedParticipantDetail(null);
    setSelectedParticipantPreds([]);
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
      await sealUserProdeInDB(user.uid);
      if (reloadUserProfile) {
        await reloadUserProfile();
      }
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error('Error al sellar el prode:', err);
    }
  };

  // Acción Admin: Crear un participante fantasma de prueba
  const handleCreateGhost = async (name: string) => {
    setAdminGhostLoading(true);
    setAdminGhostError(null);
    setAdminGhostSuccess(null);
    try {
      const newGhost = await createGhostParticipant(name);
      setAdminGhostSuccess(`¡Participante fantasma "${newGhost.displayName}" creado con éxito!`);
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error('Error al crear fantasma:', err);
      setAdminGhostError('No se pudo registrar el participante fantasma.');
    } finally {
      setAdminGhostLoading(false);
    }
  };

  // Acción Admin: Aleatorizar predicciones de un fantasma
  const handleRandomizeGhostPredictions = async (ghostUid: string) => {
    setLoadingGhostRandomization(true);
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
    } finally {
      setLoadingGhostRandomization(false);
    }
  };

  // Acción Admin: Modificar nombre de fantasma
  const handleUpdateGhostName = async (ghostUid: string, newName: string) => {
    setAdminGhostLoading(true);
    setAdminGhostError(null);
    setAdminGhostSuccess(null);
    try {
      await updateGhostNameInDB(ghostUid, newName);
      setAdminGhostSuccess('¡Nombre del participante fantasma actualizado!');
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error(err);
      setAdminGhostError('No se pudo actualizar el nombre.');
      throw err;
    } finally {
      setAdminGhostLoading(false);
    }
  };

  // Acción Admin: Eliminar participante fantasma
  const handleDeleteGhost = async (ghostUid: string) => {
    setAdminGhostLoading(true);
    setAdminGhostError(null);
    setAdminGhostSuccess(null);
    try {
      await deleteGhostFromDB(ghostUid);
      setAdminGhostSuccess('¡Participante fantasma eliminado con éxito!');
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error(err);
      setAdminGhostError('No se pudo eliminar el participante fantasma.');
      throw err;
    } finally {
      setAdminGhostLoading(false);
    }
  };

  // Acción Admin: Aleatorizar predicciones de TODOS los fantasmas "SOLO FASE DE GRUPOS"
  const handleRandomizeAllGhostsGroupStage = async () => {
    setLoadingGhostRandomization(true);
    try {
      await randomizeAllGhostsGroupStagePredictions();
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error(err);
      alert('Error al aleatorizar predicciones de fase de grupos de fantasmas.');
    } finally {
      setLoadingGhostRandomization(false);
    }
  };

  // Acción Admin: Limpiar predicciones de TODOS los fantasmas
  const handleClearGhostsPredictions = async () => {
    setLoadingGhostRandomization(true);
    setAdminGhostError(null);
    setAdminGhostSuccess(null);
    try {
      await clearAllGhostsPredictionsInDB();
      setAdminGhostSuccess('¡Todas las predicciones de participantes fantasmas fueron eliminadas!');
      await loadPredictionsAndParticipants();
    } catch (err) {
      console.error(err);
      setAdminGhostError('Error al limpiar las predicciones de los fantasmas.');
    } finally {
      setLoadingGhostRandomization(false);
    }
  };

  // Acción Usuario: Guardado automático de predicciones
  const handleSavePrediction = async (matchId: string, homePrediction: number, awayPrediction: number) => {
    if (!user) return;
    setSavingPredictionMatchId(matchId);
    setSavedPredictionMatchId(null);
    try {
      await saveUserPrediction(user.uid, matchId, homePrediction, awayPrediction);
      
      // Actualizar estado local inmediato
      setSavedPredictionMatchId(matchId);
      await loadPredictionsAndParticipants();
      
      // Borrar mensaje de guardado tras 2.5s
      setTimeout(() => {
        setSavedPredictionMatchId((curr) => curr === matchId ? null : curr);
      }, 2500);
    } catch (err) {
      console.error('Error guardando predicción:', err);
      alert('Hubo un error al guardar tu predicción. Reintentá.');
    } finally {
      setSavingPredictionMatchId(null);
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
      <Navbar 
        user={user} 
        activePage={memberView}
        onNavigate={(page) => handleNavigateMember(page as MemberView)}
        onLogout={logout}
      />

      <main className="container" style={{ flex: 1, padding: '40px 20px' }}>
        {memberView === 'prode' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Header y Sub-Navegación del Game Hub */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
                  Game Hub Mundialista 2026
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  Completá tus pronósticos, revisá partidos, analizá participantes y jugá con el Modo Escenario.
                </p>
              </div>

              {/* Selector de Sub-pestañas */}
              <div className="glass-panel" style={{ padding: '6px', display: 'flex', gap: '5px' }}>
                <button
                  onClick={() => setProdeSubTab('fill')}
                  className="btn"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    backgroundColor: prodeSubTab === 'fill' ? 'var(--border-light)' : 'transparent',
                    color: prodeSubTab === 'fill' ? 'var(--accent-gold)' : 'var(--text-muted)',
                    fontWeight: 600
                  }}
                >
                  📝 Llenar Prode
                </button>
                <button
                  onClick={() => setProdeSubTab('calendar')}
                  className="btn"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    backgroundColor: prodeSubTab === 'calendar' ? 'var(--border-light)' : 'transparent',
                    color: prodeSubTab === 'calendar' ? 'var(--accent-gold)' : 'var(--text-muted)',
                    fontWeight: 600
                  }}
                >
                  📅 Calendario
                </button>
                <button
                  onClick={() => setProdeSubTab('stats')}
                  className="btn"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    backgroundColor: prodeSubTab === 'stats' ? 'var(--border-light)' : 'transparent',
                    color: prodeSubTab === 'stats' ? 'var(--accent-gold)' : 'var(--text-muted)',
                    fontWeight: 600
                  }}
                >
                  📊 Estadísticas
                </button>
                <button
                  onClick={() => setProdeSubTab('participants')}
                  className="btn"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    backgroundColor: prodeSubTab === 'participants' ? 'var(--border-light)' : 'transparent',
                    color: prodeSubTab === 'participants' ? 'var(--accent-gold)' : 'var(--text-muted)',
                    fontWeight: 600
                  }}
                >
                  👥 Participantes
                </button>
              </div>
            </div>

            {/* Renderizado de Sub-pestañas */}
            {matchesLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px' }}></div>
                ))}
              </div>
            ) : (
              <>
                {prodeSubTab === 'fill' && (
                  <ProdeForm 
                    matches={matches}
                    predictions={predictions}
                    onSavePrediction={handleSavePrediction}
                    savingMatchId={savingPredictionMatchId}
                    savedMatchId={savedPredictionMatchId}
                    user={user}
                    onSealProde={handleSealProde}
                  />
                )}
                {prodeSubTab === 'calendar' && (
                  <MatchList 
                    matches={matches} 
                    isAdmin={isAdmin}
                    onEditMatch={(match) => setSelectedMatchToEdit(match)}
                  />

                )}
                {prodeSubTab === 'stats' && (
                  <DashboardStats 
                    users={participants} 
                    matches={matches}
                    predictions={allPredictions}
                  />
                )}
                {prodeSubTab === 'participants' && (
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
                    loadingGhost={loadingGhostRandomization}
                  />
                )}
              </>
            )}
          </div>
        )}

        {memberView === 'leaderboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <Leaderboard 
              users={participants}
              onSelectUser={handleSelectParticipant}
              isAdmin={isAdmin}
            />

            {/* Panel flotante de detalle si seleccionan un usuario */}
            {selectedParticipantDetail && (
              <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
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
                  loadingGhost={loadingGhostRandomization}
                />
              </div>
            )}
          </div>
        )}

        {memberView === 'whitelist' && isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Sub-Navegación Admin */}
            <div className="glass-panel" style={{ padding: '10px 20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
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
                entries={whitelistEntries}
                onAddEmail={handleAddEmail}
                onRemoveEmail={handleRemoveEmail}
                loading={whitelistLoading}
                error={whitelistError}
                successMessage={whitelistSuccess}
              />
            )}
            {adminSubTab === 'ghosts' && (
              <GhostCreator 
                ghosts={participants.filter(u => u.isGhost)}
                onCreateGhost={handleCreateGhost}
                onEditGhost={handleUpdateGhostName}
                onDeleteGhost={handleDeleteGhost}
                onClearGhostsPredictions={handleClearGhostsPredictions}
                loading={adminGhostLoading}
                error={adminGhostError}
                successMessage={adminGhostSuccess}
              />
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
              <ScenarioSimulator 
                matches={matches}
                allPredictions={allPredictions}
                users={participants}
                onRandomizeAllGhosts={handleRandomizeAllGhostsGroupStage}
              />
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
