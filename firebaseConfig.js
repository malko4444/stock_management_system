// Firebase bootstrap (web SDK)
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD0W0cfaLl4Zp74F-Rk_ZwuZxKGWtLNuS0",
  authDomain: "stockmanagementsystem-18709.firebaseapp.com",
  projectId: "stockmanagementsystem-18709",
  storageBucket: "stockmanagementsystem-18709.firebasestorage.app",
  messagingSenderId: "1041616305997",
  appId: "1:1041616305997:web:734cacec60dbf8c8f10104",
  measurementId: "G-70H86G8Q8N",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
