import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

type FirebaseConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasConfig = Object.values(firebaseConfig).some(Boolean);

let app: FirebaseApp | null = null;

const ensureApp = () => {
  if (!hasConfig) return null;
  if (!app) {
    app = initializeApp(firebaseConfig as Required<FirebaseConfig>);
  }
  return app;
};

export const getFirebaseAuth = (): Auth | null => {
  const next = ensureApp();
  if (!next) return null;
  return getAuth(next);
};

export const getFirebaseDb = (): Firestore | null => {
  const next = ensureApp();
  if (!next) return null;
  return getFirestore(next);
};

export const isFirebaseReady = () => hasConfig;
