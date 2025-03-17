
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  User
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { auth, db } from "./firebase";

// Sign up a new user
export const signUp = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    await updateProfile(user, { displayName });
    
    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email,
      displayName,
      createdAt: new Date(),
      isAdmin: true, // First user is admin
      team: [email], // Add self to team
    });
    
    return user;
  } catch (error) {
    console.error("Error signing up:", error);
    throw error;
  }
};

// Sign in existing user
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
};

// Sign out user
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Reset password
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Error resetting password:", error);
    throw error;
  }
};

// Add team member (only admin can do this)
export const addTeamMember = async (adminUid: string, memberEmail: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", adminUid));
    
    if (userDoc.exists() && userDoc.data().isAdmin) {
      await updateDoc(doc(db, "users", adminUid), {
        team: arrayUnion(memberEmail)
      });
      return true;
    } else {
      throw new Error("Only admins can add team members");
    }
  } catch (error) {
    console.error("Error adding team member:", error);
    throw error;
  }
};

// Remove team member (only admin can do this)
export const removeTeamMember = async (adminUid: string, memberEmail: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", adminUid));
    
    if (userDoc.exists() && userDoc.data().isAdmin) {
      await updateDoc(doc(db, "users", adminUid), {
        team: arrayRemove(memberEmail)
      });
      return true;
    } else {
      throw new Error("Only admins can remove team members");
    }
  } catch (error) {
    console.error("Error removing team member:", error);
    throw error;
  }
};

// Check if user belongs to a team
export const checkTeamMembership = async (email: string) => {
  try {
    const q = query(collection(db, "users"), where("team", "array-contains", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Return the admin user document
      return querySnapshot.docs[0].data();
    }
    return null;
  } catch (error) {
    console.error("Error checking team membership:", error);
    throw error;
  }
};

// Get user data from Firestore
export const getUserData = async (uid: string) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
};

// Get team members
export const getTeamMembers = async (uid: string) => {
  try {
    const userData = await getUserData(uid);
    return userData?.team || [];
  } catch (error) {
    console.error("Error getting team members:", error);
    throw error;
  }
};
