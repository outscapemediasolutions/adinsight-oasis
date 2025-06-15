
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  User
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, getDocs, query, where, deleteDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

// Super admin emails - these users have unrestricted access
const SUPER_ADMIN_EMAILS = ["vimalbachani888@gmail.com", "vimalbachani236@gmail.com"];

// Check if email is a super admin
export const isSuperAdminEmail = (email: string): boolean => {
  return SUPER_ADMIN_EMAILS.includes(email);
};

// Sign up new user
export const signUp = async (email: string, password: string, displayName: string) => {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    await updateProfile(user, { displayName });
    
    // Determine role based on email (add logic if you want admin support)
    let role: "super_admin" | "admin" | "user" = "user";
    if (isSuperAdminEmail(email)) {
      role = "super_admin";
    }
    // Optionally, set admin by email domain or criteria here if you require admin users

    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email,
      displayName,
      role,
      isAdmin: role === "admin" || role === "super_admin",
      team: [],
      createdAt: new Date(),
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

// Get user data from Firestore
export const getUserData = async (uid: string) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.log("No user data found!");
      return null;
    }
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
};

// Check user access - super admins always have access
export const checkUserAccess = async (email: string) => {
  try {
    if (!email) return false;
    
    // Super admin emails always have access
    if (isSuperAdminEmail(email)) return true;
    
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) return true;
    
    const teamsRef = collection(db, "teams");
    const teamQuery = query(teamsRef, where("members", "array-contains", email));
    const teamSnapshot = await getDocs(teamQuery);
    
    return !teamSnapshot.empty;
  } catch (error) {
    console.error("Error checking user access:", error);
    return false;
  }
};

// Check if user is a team member
export const checkTeamMembership = async (email: string) => {
  try {
    if (!email) return null;
    
    // Check if user is in any team
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("team", "array-contains", email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return null;
    
    // Return the admin user data
    return querySnapshot.docs[0].data();
  } catch (error) {
    console.error("Error checking team membership:", error);
    return null;
  }
};

// Get team members for current user
export const getTeamMembers = async (uid: string) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const userData = docSnap.data();
      return userData.team || [];
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error getting team members:", error);
    throw error;
  }
};

// Add team member
export const addTeamMember = async (uid: string, email: string) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const userData = docSnap.data();
      const team = userData.team || [];
      
      if (!team.includes(email)) {
        team.push(email);
        await updateDoc(docRef, { team });
      }
    }
  } catch (error) {
    console.error("Error adding team member:", error);
    throw error;
  }
};

// Remove team member
export const removeTeamMember = async (uid: string, email: string) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const userData = docSnap.data();
      const team = userData.team || [];
      
      const updatedTeam = team.filter((member: string) => member !== email);
      await updateDoc(docRef, { team: updatedTeam });
    }
  } catch (error) {
    console.error("Error removing team member:", error);
    throw error;
  }
};

// Get all users (admin only)
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    return users;
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
};

// Update user role - super admins can update anyone
export const updateUserRole = async (adminUid: string, userEmail: string, newRole: string) => {
  try {
    // Find the user by email
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", userEmail));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      await updateDoc(userDoc.ref, {
        role: newRole,
        isAdmin: newRole === "admin" || newRole === "super_admin",
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
};

// Create new user (admin function) - super admins can create any role
export const createNewUser = async (email: string, role: string, displayName: string = "") => {
  try {
    // Check if user already exists
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error("User already exists with this email");
    }
    
    // Create a new temporary user record
    const newUser = {
      email,
      displayName: displayName || email.split('@')[0],
      role,
      isAdmin: role === "admin" || role === "super_admin",
      team: [],
      createdAt: new Date(),
    };
    
    // Add to collection with auto-generated ID
    const newUserRef = doc(collection(db, "users"));
    await setDoc(newUserRef, newUser);
    
    return {
      id: newUserRef.id,
      ...newUser,
    };
  } catch (error) {
    console.error("Error creating new user:", error);
    throw error;
  }
};

// Delete user (admin function) - super admins can delete anyone except themselves
export const deleteUser = async (adminUid: string, userId: string, userEmail: string) => {
  try {
    // Prevent super admins from deleting themselves
    if (isSuperAdminEmail(userEmail)) {
      throw new Error("Cannot delete super admin accounts");
    }
    
    // Delete user document
    await deleteDoc(doc(db, "users", userId));
    
    // Remove from any teams
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("team", "array-contains", userEmail));
    const querySnapshot = await getDocs(q);
    
    const batch = querySnapshot.docs.map(async (doc) => {
      const userData = doc.data();
      const updatedTeam = userData.team.filter((email: string) => email !== userEmail);
      await updateDoc(doc.ref, { team: updatedTeam });
    });
    
    await Promise.all(batch);
    
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};
