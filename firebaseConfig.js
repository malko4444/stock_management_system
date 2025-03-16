// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth/cordova";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
export const db = getFirestore(app);
export const auth = getAuth(app);

const analytics = getAnalytics(app);