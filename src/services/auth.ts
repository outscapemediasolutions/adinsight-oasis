import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail as firebaseSendResetEmail,
  updateProfile,
  User
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  query,
  where,
  updateDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';

// Define UserRole type as a union of string literals and export it
export type UserRole = "user" | "admin" | "super_admin";

export const signUp = async (email: string, password: string, displayName: string) => {
  try {
    // Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update the user profile with display name
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Set user role - check if it's a super admin email
    const isSuperAdmin = email === "vimalbachani888@gmail.com" || email === "vimal111@gmail.com";
    const role: UserRole = isSuperAdmin ? "super_admin" : "user";

    // Create a user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email,
      displayName: displayName || email.split('@')[0],
      isAdmin: isSuperAdmin,
      role,
      createdAt: serverTimestamp(),
    });

    return user;
  } catch (error) {
    console.error("Error signing up:", error);
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  try {
    await firebaseSendResetEmail(auth, email);
  } catch (error) {
    console.error("Error sending password reset:", error);
    throw error;
  }
};

export const getUserData = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
};

export const checkUserAccess = async (email: string) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // No user found with this email
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking user access:", error);
    throw error;
  }
};

export const updateUserRole = async (userId: string, userEmail: string, newRole: UserRole) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", userEmail));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error("User not found");
    }
    
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    
    // Only allow role changes by super admin or if user is not an admin
    const currentUserDoc = await getDoc(doc(db, "users", userId));
    const currentUserData = currentUserDoc.data();
    
    if (
      !currentUserData || 
      (currentUserData.role !== "super_admin" && userData.role === "admin")
    ) {
      throw new Error("You don't have permission to update this user's role");
    }
    
    // Update user role
    await updateDoc(userDoc.ref, { 
      role: newRole,
      isAdmin: newRole === "admin" || newRole === "super_admin",
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
};

export const checkTeamMembership = async (email: string) => {
  try {
    const teamsRef = collection(db, "teams");
    const q = query(teamsRef, where("members", "array-contains", email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    // Get the admin user of this team
    const teamDoc = snapshot.docs[0];
    const teamData = teamDoc.data();
    
    if (!teamData.adminId) {
      return null;
    }
    
    // Get admin data
    const adminDoc = await getDoc(doc(db, "users", teamData.adminId));
    if (adminDoc.exists()) {
      return {
        ...adminDoc.data(),
        id: adminDoc.id,
        teamId: teamDoc.id,
        teamName: teamData.name
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error checking team membership:", error);
    throw error;
  }
};

export const getTeamMembers = async (adminId: string): Promise<string[]> => {
  try {
    // Find team for this admin
    const teamsRef = collection(db, "teams");
    const q = query(teamsRef, where("adminId", "==", adminId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return [];
    }
    
    // Return team members
    const teamData = snapshot.docs[0].data();
    return teamData.members || [];
  } catch (error) {
    console.error("Error getting team members:", error);
    throw error;
  }
};

export const addTeamMember = async (adminId: string, memberEmail: string) => {
  try {
    // Check if a team already exists for this admin
    const teamsRef = collection(db, "teams");
    const q = query(teamsRef, where("adminId", "==", adminId));
    const snapshot = await getDocs(q);
    
    let teamRef;
    
    if (snapshot.empty) {
      // Create a new team
      teamRef = doc(collection(db, "teams"));
      await setDoc(teamRef, {
        adminId,
        name: "My Team",
        createdAt: serverTimestamp(),
        members: [memberEmail]
      });
    } else {
      // Add member to existing team
      teamRef = snapshot.docs[0].ref;
      const teamData = snapshot.docs[0].data();
      
      // Check if member already exists
      if (teamData.members && teamData.members.includes(memberEmail)) {
        throw new Error("Member already exists in team");
      }
      
      await updateDoc(teamRef, {
        members: [...(teamData.members || []), memberEmail],
        updatedAt: serverTimestamp()
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error adding team member:", error);
    throw error;
  }
};

export const removeTeamMember = async (adminId: string, memberEmail: string) => {
  try {
    // Find team for this admin
    const teamsRef = collection(db, "teams");
    const q = query(teamsRef, where("adminId", "==", adminId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error("No team found for this admin");
    }
    
    // Remove member from team
    const teamRef = snapshot.docs[0].ref;
    const teamData = snapshot.docs[0].data();
    
    if (!teamData.members || !teamData.members.includes(memberEmail)) {
      throw new Error("Member not found in team");
    }
    
    await updateDoc(teamRef, {
      members: teamData.members.filter((email: string) => email !== memberEmail),
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error removing team member:", error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return users;
  } catch (error) {
    console.error("Error getting users:", error);
    throw error;
  }
};

export const createNewUser = async (email: string, role: UserRole, displayName: string = "") => {
  try {
    // Check if user already exists
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      throw new Error("User with this email already exists");
    }
    
    // Create a temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    
    // Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
    const user = userCredential.user;
    
    // Update user profile if display name is provided
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email,
      displayName: displayName || email.split('@')[0],
      isAdmin: role === "admin" || role === "super_admin",
      role,
      createdAt: serverTimestamp(),
    });
    
    // Send password reset email
    await sendPasswordResetEmail(auth, email);
    
    return user;
  } catch (error) {
    console.error("Error creating new user:", error);
    throw error;
  }
};

export const deleteUser = async (adminId: string, userId: string, userEmail: string) => {
  try {
    // Check admin permissions
    const adminDoc = await getDoc(doc(db, "users", adminId));
    if (!adminDoc.exists() || adminDoc.data()?.role !== "super_admin") {
      throw new Error("You don't have permission to delete users");
    }
    
    // Delete user document from Firestore
    await deleteDoc(doc(db, "users", userId));
    
    // Note: Deleting the actual Firebase Auth user requires a server-side function
    // This is just a placeholder for that functionality
    console.log(`User ${userEmail} should be deleted from Firebase Auth via a server function`);
    
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};
