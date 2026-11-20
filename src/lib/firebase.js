import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// La configuración web de Firebase es pública por diseño (va dentro de la app);
// lo que protege los datos son las reglas de firestore.rules.
// Se puede sobreescribir con variables VITE_FIREBASE_* en un archivo .env.
const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyAZnk5qeNufOhnvvEyKRB077RKAHcCV5d8',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'stego-cd22b.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'stego-cd22b',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'stego-cd22b.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '862901970284',
  appId: env.VITE_FIREBASE_APP_ID || '1:862901970284:web:b9c2c0da5d3099236dbf49',
};

// VITE_LOCAL=1 fuerza el modo local (localStorage), útil para pruebas sin tocar los datos reales.
export const firebaseConfigured = env.VITE_LOCAL !== '1' && Boolean(config.apiKey && config.projectId);

export const db = firebaseConfigured ? getFirestore(initializeApp(config)) : null;
