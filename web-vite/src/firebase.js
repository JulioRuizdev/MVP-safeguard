import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDd8AZ-o3d7k8ae4BmgOcLUlrUbFoWzCGM",
  authDomain: "safeguard-peru.firebaseapp.com",
  projectId: "safeguard-peru",
  storageBucket: "safeguard-peru.firebasestorage.app",
  messagingSenderId: "818437254412",
  appId: "1:818437254412:web:dbde85925982e56074ad29"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;