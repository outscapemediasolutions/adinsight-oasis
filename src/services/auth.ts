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
  getDocs,
  deleteDoc
} from "firebase/firestore";
import { auth, db } from "./firebase";

// Sign up a new user
export const signUp = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    await updateProfile(user, { displayName });
    
    // Set role based on email
    const role = email === "vimalbachani888@gmail.com" ? "super_admin" : "user";
    
    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email,
      displayName,
      createdAt: new Date(),
      isAdmin: role === "super_admin" || role === "admin",
      role: role,
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

// Check if user has access to the app
export const checkUserAccess = async (email: string) => {
  try {
    // Super admin always has access
    if (email === "vimalbachani888@gmail.com") {
      return true;
    }
    
    // Check if user exists in any team
    const teamMembershipResult = await checkTeamMembership(email);
    if (teamMembershipResult) {
      return true;
    }
    
    // Check if user has a role in the users collection
    const q = query(collection(db, "users"), where("email", "==", email));
    const snapshot = await getDocs(q);
    
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking user access:", error);
    return false;
  }
};

// Add team member (only admin can do this)
export const addTeamMember = async (adminUid: string, memberEmail: string, role: string = "user") => {
  try {
    const userDoc = await getDoc(doc(db, "users", adminUid));
    const userData = userDoc.data();
    
    if (userDoc.exists() && (userData?.isAdmin || userData?.role === "admin" || userData?.role === "super_admin")) {
      // Add to team array
      await updateDoc(doc(db, "users", adminUid), {
        team: arrayUnion(memberEmail)
      });
      
      // Check if user already exists in users collection
      const q = query(collection(db, "users"), where("email", "==", memberEmail));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Create a new user document with the provided role
        // This is a placeholder - in a real app, you'd invite the user to create an account
        const newUserRef = doc(collection(db, "users"));
        await setDoc(newUserRef, {
          email: memberEmail,
          displayName: memberEmail.split('@')[0],
          createdAt: new Date(),
          isAdmin: role === "admin" || role === "super_admin",
          role: role,
          team: [],
        });
      }
      
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
    const userData = userDoc.data();
    
    if (userDoc.exists() && (userData?.isAdmin || userData?.role === "admin" || userData?.role === "super_admin")) {
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

// Update user role (only super_admin can update to admin role)
export const updateUserRole = async (currentUserUid: string, targetUserEmail: string, newRole: string) => {
  try {
    const currentUserDoc = await getDoc(doc(db, "users", currentUserUid));
    const currentUserData = currentUserDoc.data();
    
    // Only super_admin can promote to admin
    if (currentUserData?.role !== "super_admin" && newRole === "admin") {
      throw new Error("Only super admins can promote users to admin role");
    }
    
    // Find the target user
    const q = query(collection(db, "users"), where("email", "==", targetUserEmail));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const targetUserDoc = snapshot.docs[0];
      
      // Update the role
      await updateDoc(doc(db, "users", targetUserDoc.id), {
        role: newRole,
        isAdmin: newRole === "admin" || newRole === "super_admin"
      });
      
      return true;
    } else {
      throw new Error("User not found");
    }
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
};

// Delete user (only super_admin can delete users)
export const deleteUser = async (currentUserUid: string, userIdToDelete: string, userEmailToDelete: string) => {
  try {
    // Check if current user is super admin
    const currentUserDoc = await getDoc(doc(db, "users", currentUserUid));
    const currentUserData = currentUserDoc.data();
    
    if (!currentUserData || currentUserData.role !== "super_admin") {
      throw new Error("Only super admins can delete users");
    }
    
    // Prevent deletion of super admin account
    if (userEmailToDelete === "vimalbachani888@gmail.com") {
      throw new Error("Cannot delete super admin account");
    }
    
    // Delete the user document
    await deleteDoc(doc(db, "users", userIdToDelete));
    
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
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

// Get all users (only accessible to super_admin)
export const getAllUsers = async () => {
  try {
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
};

// Create new user (for user management)
export const createNewUser = async (email: string, role: string, displayName: string = "") => {
  try {
    // Check if user already exists
    const q = query(collection(db, "users"), where("email", "==", email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Create a new user
      const newUserRef = doc(collection(db, "users"));
      const userData = {
        email,
        displayName: displayName || email.split('@')[0],
        createdAt: new Date(),
        isAdmin: role === "admin" || role === "super_admin",
        role,
        team: [],
      };
      
      await setDoc(newUserRef, userData);
      return { id: newUserRef.id, ...userData };
    } else {
      throw new Error("User already exists");
    }
  } catch (error) {
    console.error("Error creating new user:", error);
    throw error;
  }
};
