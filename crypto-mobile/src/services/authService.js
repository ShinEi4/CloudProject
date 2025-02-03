import auth from '@react-native-firebase/auth';

export const authService = {
  register: async (userData) => {
    try {
      console.log('Tentative d\'inscription avec Firebase');
      
      // Créer l'utilisateur avec email et mot de passe
      const userCredential = await auth().createUserWithEmailAndPassword(
        userData.email,
        userData.password
      );

      // Mettre à jour le profil avec le nom d'utilisateur
      await userCredential.user.updateProfile({
        displayName: userData.username
      });

      // Envoyer l'email de vérification
      await userCredential.user.sendEmailVerification();

      return {
        user: userCredential.user,
        message: 'Vérifiez votre email pour confirmer votre compte'
      };
    } catch (error) {
      console.error('Erreur Firebase:', error);
      
      // Gérer les erreurs Firebase spécifiques
      switch (error.code) {
        case 'auth/email-already-in-use':
          throw new Error('Cette adresse email est déjà utilisée');
        case 'auth/invalid-email':
          throw new Error('Adresse email invalide');
        case 'auth/operation-not-allowed':
          throw new Error('Opération non autorisée');
        case 'auth/weak-password':
          throw new Error('Le mot de passe est trop faible');
        default:
          throw new Error('Erreur lors de l\'inscription');
      }
    }
  },

  login: async (credentials) => {
    try {
      console.log('Tentative de connexion avec Firebase');
      
      const userCredential = await auth().signInWithEmailAndPassword(
        credentials.email,
        credentials.password
      );

      // Vérifier si l'email est vérifié
      if (!userCredential.user.emailVerified) {
        throw new Error('Veuillez vérifier votre email avant de vous connecter');
      }

      return {
        user: userCredential.user,
        token: await userCredential.user.getIdToken()
      };
    } catch (error) {
      console.error('Erreur Firebase:', error);
      
      switch (error.code) {
        case 'auth/invalid-email':
          throw new Error('Adresse email invalide');
        case 'auth/user-disabled':
          throw new Error('Ce compte a été désactivé');
        case 'auth/user-not-found':
          throw new Error('Aucun compte trouvé avec cette adresse email');
        case 'auth/wrong-password':
          throw new Error('Mot de passe incorrect');
        default:
          throw new Error('Erreur lors de la connexion');
      }
    }
  },

  resetPassword: async (email) => {
    try {
      await auth().sendPasswordResetEmail(email);
      return { message: 'Email de réinitialisation envoyé' };
    } catch (error) {
      console.error('Erreur Firebase:', error);
      throw new Error('Erreur lors de l\'envoi de l\'email de réinitialisation');
    }
  },

  logout: async () => {
    try {
      await auth().signOut();
      return { message: 'Déconnexion réussie' };
    } catch (error) {
      console.error('Erreur Firebase:', error);
      throw new Error('Erreur lors de la déconnexion');
    }
  },

  getCurrentUser: () => {
    return auth().currentUser;
  },

  onAuthStateChanged: (callback) => {
    return auth().onAuthStateChanged(callback);
  }
}; 