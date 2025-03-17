
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBFg2XRovz7SbEmKor-3PHC2jR9OiUbt7M",
  authDomain: "adpulse-analytics-ff853.firebaseapp.com",
  projectId: "adpulse-analytics-ff853",
  storageBucket: "adpulse-analytics-ff853.firebasestorage.app",
  messagingSenderId: "553102131576",
  appId: "1:553102131576:web:dfc4bd9345dc06b149088d",
  measurementId: "G-RR4JN9TM8Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
