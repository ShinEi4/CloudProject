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
  apiKey: "AIzaSyBH8d8E09Pp4jPTsg18vDv1blm3ngtMgwU",
  authDomain: "cloud-project-bd903.firebaseapp.com",
  projectId: "cloud-project-bd903",
  storageBucket: "cloud-project-bd903.appspot.com",
  messagingSenderId: "1000000000000",
  appId: "cloud-project-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export const authService = {
  register: async (userData) => {
    throw new Error('L\'inscription n\'est disponible que sur la version web. Veuillez vous rendre sur le site web pour créer un compte.');
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