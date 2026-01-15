import { initializeApp, getApp, getApps } from "firebase/app";
import {
  initializeAuth,
  // @ts-ignore
  getReactNativePersistence,
  getAuth,
} from "firebase/auth";
// MUDANÇA 1: Importamos 'initializeFirestore' em vez de apenas 'getFirestore'
import { initializeFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// AQUI ESTÁ A MUDANÇA: Lemos do .env em vez de texto fixo
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: any;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

// MUDANÇA 2: Forçamos o 'Long Polling' para evitar travamentos no Android
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export { auth, db };
