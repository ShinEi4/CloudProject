import app from '../firebase/firebase';
import { 
  initializeAuth,
  getReactNativePersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebaseConfig from '../config/firebase-config';

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const authService = {
  register: async (userData) => {
    throw new Error('L\'inscription n\'est disponible que sur la version web. Veuillez vous rendre sur le site web pour créer un compte.');
  },

  login: async (credentials) => {
    try {
      const { email, password } = credentials;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      
      // Sauvegarder le token dans AsyncStorage
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userEmail', email);
      
      return {
        success: true,
        user: userCredential.user,
        token: token
      };
    } catch (error) {
      console.error('Erreur Firebase:', error);
      let message = 'Erreur lors de la connexion';
      
      switch (error.code) {
        case 'auth/invalid-email':
          message = 'Adresse email invalide';
          break;
        case 'auth/user-disabled':
          message = 'Ce compte a été désactivé';
          break;
        case 'auth/user-not-found':
          message = 'Aucun compte trouvé avec cette adresse email';
          break;
        case 'auth/wrong-password':
          message = 'Mot de passe incorrect';
          break;
      }
      
      throw new Error(message);
    }
  },

  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { 
        success: true,
        message: 'Email de réinitialisation envoyé' 
      };
    } catch (error) {
      console.error('Erreur Firebase:', error);
      throw new Error('Erreur lors de l\'envoi de l\'email de réinitialisation');
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
      // Supprimer les données de session
      await AsyncStorage.multiRemove(['userToken', 'userEmail']);
      return { 
        success: true,
        message: 'Déconnexion réussie' 
      };
    } catch (error) {
      console.error('Erreur Firebase:', error);
      throw new Error('Erreur lors de la déconnexion');
    }
  },

  getCurrentUser: () => {
    return auth.currentUser;
  },

  onAuthStateChanged: (callback) => {
    return auth.onAuthStateChanged(callback);
  },

  checkSession: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const user = auth.currentUser;
      
      if (token && user) {
        return {
          isAuthenticated: true,
          user: user
        };
      }
      return { isAuthenticated: false };
    } catch (error) {
      console.error('Erreur lors de la vérification de session:', error);
      return { isAuthenticated: false };
    }
  }
}; 