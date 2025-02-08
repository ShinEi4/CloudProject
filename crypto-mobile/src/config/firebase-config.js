// Déplacer le fichier dans src/config pour une meilleure organisation
const firebaseConfig = {
  projectId: "cloud3-b97fe",
  apiKey: "AIzaSyCkextXqRXDnjex6ilNgigYFJkLt1wXD6g",
  authDomain: "cloud3-b97fe.firebaseapp.com",
  storageBucket: "cloud3-b97fe.appspot.com",
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