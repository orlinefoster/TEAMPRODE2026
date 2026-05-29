import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, IS_MOCK_ENV } from '../services/firebase';
import type { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL: string) => Promise<void>;
  clearError: () => void;
  reloadUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Datos mock para desarrollo local rápido
const MOCK_USER: UserProfile = {
  uid: 'mock-uid-123',
  email: 'admin@teamprode.com',
  displayName: 'Admin Prode 2026',
  photoURL: 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin',
  role: 'admin',
  completedProde: true,
  points: 45,
  exactMatchesCount: 12,
  outcomeMatchesCount: 9
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  useEffect(() => {
    if (IS_MOCK_ENV) {
      // En entorno Mock, iniciamos sesión automáticamente con un usuario admin local
      console.log('💡 Auth: Cargando perfil mock de administrador.');
      
      // Asegurarse de que el usuario administrador de prueba esté guardado en prode_users
      const usersJson = localStorage.getItem('prode_users') || '[]';
      const usersList: UserProfile[] = JSON.parse(usersJson);
      let localAdmin = usersList.find(u => u.uid === MOCK_USER.uid);
      if (!localAdmin) {
        usersList.push(MOCK_USER);
        localStorage.setItem('prode_users', JSON.stringify(usersList));
        localAdmin = MOCK_USER;
      }

      setUser(localAdmin);
      setFirebaseUser({
        uid: localAdmin.uid,
        email: localAdmin.email,
        displayName: localAdmin.displayName,
        photoURL: localAdmin.photoURL,
      } as FirebaseUser);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        setLoading(true);
        try {
          // Obtener perfil del usuario desde Firestore
          const userDocRef = doc(db, 'users', fUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
          } else {
            console.warn('El perfil de usuario no existe en Firestore, reintentando crear...');
            // Fallback en caso de inconsistencia
            const newProfile: UserProfile = {
              uid: fUser.uid,
              email: fUser.email || '',
              displayName: fUser.displayName || 'Participante',
              photoURL: fUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${fUser.uid}`,
              role: 'user',
              completedProde: false,
              points: 0,
              exactMatchesCount: 0,
              outcomeMatchesCount: 0
            };
            await setDoc(userDocRef, newProfile);
            setUser(newProfile);
          }
        } catch (err: any) {
          console.error('Error cargando datos de usuario:', err);
          setError('Error al recuperar datos del perfil.');
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Login clásico
  const login = async (email: string, pass: string) => {
    if (IS_MOCK_ENV) {
      const usersJson = localStorage.getItem('prode_users') || '[]';
      const usersList: UserProfile[] = JSON.parse(usersJson);
      const matchedUser = usersList.find(u => u.email === email);

      if (matchedUser && pass === 'password') {
        setUser(matchedUser);
        setFirebaseUser({
          uid: matchedUser.uid,
          email: matchedUser.email,
          displayName: matchedUser.displayName,
          photoURL: matchedUser.photoURL
        } as FirebaseUser);
        setError(null);
      } else if (email === MOCK_USER.email && pass === 'password') {
        setUser(MOCK_USER);
        setError(null);
      } else {
        throw new Error('Credenciales mock incorrectas. Usa admin@teamprode.com y password');
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error(err);
      setError(translateError(err.code || err.message));
      setLoading(false);
      throw err;
    }
  };

  // Registro con Validación de Whitelist Obligatoria
  const register = async (email: string, pass: string, name: string) => {
    if (IS_MOCK_ENV) {
      const mockNewUser: UserProfile = {
        uid: `uid-${Date.now()}`,
        email,
        displayName: name,
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
        role: 'user',
        completedProde: false,
        points: 0,
        exactMatchesCount: 0,
        outcomeMatchesCount: 0
      };
      
      const usersJson = localStorage.getItem('prode_users') || '[]';
      const usersList = JSON.parse(usersJson);
      usersList.push(mockNewUser);
      localStorage.setItem('prode_users', JSON.stringify(usersList));

      setUser(mockNewUser);
      setFirebaseUser({
        uid: mockNewUser.uid,
        email: mockNewUser.email,
        displayName: mockNewUser.displayName,
        photoURL: mockNewUser.photoURL
      } as FirebaseUser);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const sanitizedEmail = email.trim().toLowerCase();

    try {
      // 1. Validar contra la Whitelist en Firestore antes de crear la cuenta
      const whitelistDocRef = doc(db, 'whitelist', sanitizedEmail);
      const whitelistDoc = await getDoc(whitelistDocRef);

      if (!whitelistDoc.exists()) {
        const customError = 'Este correo electrónico no está autorizado para registrarse en la plataforma privada.';
        setError(customError);
        throw new Error(customError);
      }

      // Obtener el rol pre-asignado si existe (por defecto 'user')
      const whitelistData = whitelistDoc.data();
      const assignedRole: UserRole = whitelistData?.role || 'user';

      // 2. Crear el usuario en Firebase Authentication
      const credential = await createUserWithEmailAndPassword(auth, sanitizedEmail, pass);
      const photoURL = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;

      // 3. Actualizar perfil nativo de Firebase
      await updateProfile(credential.user, {
        displayName: name,
        photoURL: photoURL
      });

      // 4. Crear el perfil correspondiente en Firestore
      const newProfile: UserProfile = {
        uid: credential.user.uid,
        email: sanitizedEmail,
        displayName: name,
        photoURL: photoURL,
        role: assignedRole,
        completedProde: false,
        points: 0,
        exactMatchesCount: 0,
        outcomeMatchesCount: 0
      };

      await setDoc(doc(db, 'users', credential.user.uid), {
        ...newProfile,
        createdAt: serverTimestamp()
      });

      setUser(newProfile);
    } catch (err: any) {
      console.error(err);
      if (!error) {
        setError(translateError(err.code || err.message));
      }
      setLoading(false);
      throw err;
    }
  };

  // Cierre de sesión
  const logout = async () => {
    if (IS_MOCK_ENV) {
      setUser(null);
      setFirebaseUser(null);
      return;
    }
    await signOut(auth);
  };

  // Recuperar contraseña
  const resetPassword = async (email: string) => {
    if (IS_MOCK_ENV) {
      console.log(`Mock: Email de restablecimiento enviado a ${email}`);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      console.error(err);
      setError(translateError(err.code || err.message));
      throw err;
    }
  };

  // Actualizar perfil de usuario
  const updateUserProfile = async (displayName: string, photoURL: string) => {
    if (IS_MOCK_ENV) {
      if (!user) return;
      const updatedUser: UserProfile = {
        ...user,
        displayName,
        photoURL
      };

      setUser(updatedUser);
      if (firebaseUser) {
        setFirebaseUser({
          ...firebaseUser,
          displayName,
          photoURL
        } as FirebaseUser);
      }

      // Actualizar en localStorage
      const usersJson = localStorage.getItem('prode_users') || '[]';
      const usersList: UserProfile[] = JSON.parse(usersJson);
      const userIndex = usersList.findIndex(u => u.uid === user.uid);
      if (userIndex !== -1) {
        usersList[userIndex].displayName = displayName;
        usersList[userIndex].photoURL = photoURL;
        localStorage.setItem('prode_users', JSON.stringify(usersList));
      }
      console.log('👤 Profile: Perfil de participante mock actualizado en LocalStorage.');
      return;
    }

    if (!user || !firebaseUser) {
      throw new Error('No hay sesión de usuario activa para actualizar.');
    }

    setLoading(true);
    setError(null);
    try {
      let finalPhotoURL = photoURL;

      // Si la foto es un Data URL de base64 (imagen cargada localmente), la subimos a Storage
      if (photoURL.startsWith('data:image/')) {
        const storageRef = ref(storage, `users/${user.uid}/avatar.jpg`);
        await uploadString(storageRef, photoURL, 'data_url');
        finalPhotoURL = await getDownloadURL(storageRef);
      }

      // 1. Actualizar perfil nativo de Firebase Auth
      await updateProfile(firebaseUser, {
        displayName,
        photoURL: finalPhotoURL
      });

      // 2. Actualizar documento en Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName,
        photoURL: finalPhotoURL
      });

      // 3. Actualizar estados locales
      const updatedProfile: UserProfile = {
        ...user,
        displayName,
        photoURL: finalPhotoURL
      };
      setUser(updatedProfile);
      setFirebaseUser({
        ...firebaseUser,
        displayName,
        photoURL: finalPhotoURL
      } as FirebaseUser);

      console.log('👤 DB: Perfil y avatar actualizados con éxito en Firebase.');
    } catch (err: any) {
      console.error('Error al actualizar perfil de usuario:', err);
      setError(translateError(err.code || err.message));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Recargar perfil de usuario desde Firestore / LocalStorage
  const reloadUserProfile = async () => {
    if (firebaseUser) {
      if (IS_MOCK_ENV) {
        const usersJson = localStorage.getItem('prode_users') || '[]';
        const usersList: UserProfile[] = JSON.parse(usersJson);
        const localUser = usersList.find(u => u.uid === firebaseUser.uid);
        if (localUser) setUser(localUser);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserProfile);
        }
      } catch (err) {
        console.error('Error recargando perfil:', err);
      }
    }
  };

  // Helper para traducción de errores Firebase Auth a Español
  const translateError = (code: string): string => {
    switch (code) {
      case 'auth/invalid-email':
        return 'El formato del correo electrónico no es válido.';
      case 'auth/user-disabled':
        return 'Esta cuenta de usuario ha sido inhabilitada.';
      case 'auth/user-not-found':
        return 'No existe ningún usuario registrado con este correo.';
      case 'auth/wrong-password':
        return 'La contraseña es incorrecta.';
      case 'auth/email-already-in-use':
        return 'Este correo electrónico ya está registrado en la plataforma.';
      case 'auth/weak-password':
        return 'La contraseña debe tener un mínimo de 6 caracteres.';
      case 'auth/network-request-failed':
        return 'Error de red. Verifica tu conexión a internet.';
      case 'auth/invalid-credential':
        return 'Credenciales inválidas o expiradas.';
      default:
        return 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      error,
      isAdmin,
      login,
      register,
      logout,
      resetPassword,
      updateUserProfile,
      clearError,
      reloadUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};
