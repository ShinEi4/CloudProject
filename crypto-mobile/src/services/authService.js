export const authService = {
  register: async (userData) => {
    // Simulation d'une API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'Inscription réussie' });
      }, 1000);
    });
  },

  login: async (credentials) => {
    // Simulation d'une API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, token: 'fake-token-123' });
      }, 1000);
    });
  },

  resetPassword: async (email) => {
    // Simulation d'une API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ message: 'Email de réinitialisation envoyé' });
      }, 1000);
    });
  },

  logout: async () => {
    // Simulation d'une API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ message: 'Déconnexion réussie' });
      }, 1000);
    });
  },

  getCurrentUser: () => {
    // Simulation d'un utilisateur connecté
    return null;
  }
}; 