// Déplacer le fichier dans src/config pour une meilleure organisation
const firebaseConfig = {
  projectId: "cloud2-8c401",
  apiKey: "AIzaSyCo11ccxP6CToAAnXtJtJriRAOJdZCeRqI",
  authDomain: "cloud2-8c401.firebaseapp.com",
  storageBucket: "cloud2-8c401.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456",
  measurementId: "G-ABCDEF1234"
};

// Pour l'application mobile
export const mobileConfig = firebaseConfig;

// Pour l'application web (.NET)
export const webConfig = {
  projectId: firebaseConfig.projectId,
  apiKey: firebaseConfig.apiKey,
  firestoreUrl: `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`
};

export default firebaseConfig; 