import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

// Fix comparison to use string comparison rather than literal types comparison
// This will resolve the TypeScript error TS2367

// Other auth service functions would be here...
// This is just a partial file to fix the specific error.
// We need to modify how role comparisons are made, using string equality checks:

export const checkUserRole = (role: string, requiredRole: string): boolean => {
  // Compare roles using string equality, not literal type checks
  return role === requiredRole;
};

export const hasRequiredRole = (userRole: string): boolean => {
  // Use string comparison rather than literal type comparison
  return userRole === "admin" || userRole === "super_admin";
};

// The rest of the file would stay intact
