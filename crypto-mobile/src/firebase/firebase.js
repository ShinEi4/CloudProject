import { initializeApp } from 'firebase/app';
import firebaseConfig from '../config/firebase-config';

// Exporter l'instance unique de Firebase
const app = initializeApp(firebaseConfig);
export default app; 