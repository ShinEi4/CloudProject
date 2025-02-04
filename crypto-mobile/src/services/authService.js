import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';

// Votre configuration Firebase (à remplacer par vos propres valeurs)
const firebaseConfig = {
  apiKey: "AIzaSyAlYA9BQHhHBTzNpZimww4z3wMZE3SzQH4",
  authDomain: "crypto-mobile.firebaseapp.com",
  projectId: "test-5351e",
  storageBucket: "crypto-mobile.appspot.com",
  messagingSenderId: "votre-messaging-sender-id",
  appId: "crypto-mobile-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export const authService = {
  register: async (userData) => {
    try {
      const { email, password } = userData;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return {
        success: true,
        user: userCredential.user,
        message: 'Inscription réussie'
      };
    } catch (error) {
      console.error('Erreur Firebase:', error);
      let message = 'Erreur lors de l\'inscription';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'Cette adresse email est déjà utilisée';
          break;
        case 'auth/invalid-email':
          message = 'Adresse email invalide';
          break;
        case 'auth/operation-not-allowed':
          message = 'Opération non autorisée';
          break;
        case 'auth/weak-password':
          message = 'Le mot de passe est trop faible';
          break;
      }
      
      throw new Error(message);
    }
  },

  login: async (credentials) => {
    try {
      const { email, password } = credentials;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        success: true,
        user: userCredential.user,
        token: await userCredential.user.getIdToken()
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
  }
}; 