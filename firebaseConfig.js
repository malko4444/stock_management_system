import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD0W0cfaLl4Zp74F-Rk_ZwuZxKGWtLNuS0",
  authDomain: "stockmanagementsystem-18709.firebaseapp.com",
  projectId: "stockmanagementsystem-18709",
  storageBucket: "stockmanagementsystem-18709.firebasestorage.app",
  messagingSenderId: "1041616305997",
  appId: "1:1041616305997:web:734cacec60dbf8c8f10104",
  measurementId: "G-70H86G8Q8N"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});
export const auth = getAuth(app);

const analytics = getAnalytics(app);