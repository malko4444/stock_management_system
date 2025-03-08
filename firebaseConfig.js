// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCl1iglbzoPtA40BoiaIsQYqqSZwAA8orE",
  authDomain: "advertising-app-5f9ab.firebaseapp.com",
  projectId: "advertising-app-5f9ab",
  storageBucket: "advertising-app-5f9ab.firebasestorage.app",
  messagingSenderId: "491483842090",
  appId: "1:491483842090:web:afcaa9612e697318702553",
  measurementId: "G-K5X2DXRQWQ"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const analytics = getAnalytics(app);