
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA8VM7lI4odx1F7xI8kequvxkaMKlHVfME",
  authDomain: "adpulse-by-vimal-bachani.firebaseapp.com",
  projectId: "adpulse-by-vimal-bachani",
  storageBucket: "adpulse-by-vimal-bachani.firebasestorage.app",
  messagingSenderId: "808573211217",
  appId: "1:808573211217:web:e0c5ec3a30f1ce6f9c1e70",
  measurementId: "G-QGPCSNSREZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
