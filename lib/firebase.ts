import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAcYsNqiD3mdowWngvqZhXIyGSIvqpzny8",
  authDomain: "asclick-6faf9.firebaseapp.com",
  projectId: "asclick-6faf9",
  storageBucket: "asclick-6faf9.firebasestorage.app",
  messagingSenderId: "501315978480",
  appId: "1:501315978480:web:58aa1bfab5e71bbc66ae35",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);