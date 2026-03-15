// web/src/firebase.js
// ⚠️ Pega aquí las credenciales de tu proyecto Firebase
// Firebase Console → Configuración del proyecto → Tu app web → SDK setup

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "safeguard-peru.firebaseapp.com",
  projectId: "safeguard-peru",
  storageBucket: "safeguard-peru.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
