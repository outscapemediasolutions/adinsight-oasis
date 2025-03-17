
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth } from "../services/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { getUserData, checkTeamMembership } from "../services/auth";
import { toast } from "sonner";

// Define user data interface
interface UserData {
  email: string;
  displayName: string;
  isAdmin: boolean;
  team: string[];
  createdAt: Date;
}

// Define context interface
interface AuthContextInterface {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  adminUser: any | null; // Admin user data if current user is a team member
}

const AuthContext = createContext<AuthContextInterface>({
  currentUser: null,
  userData: null,
  loading: true,
  adminUser: null,
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);
        
        if (user) {
          // Get user data from Firestore
          const data = await getUserData(user.uid);
          setUserData(data as UserData | null);
          
          // Check if user is a team member
          if (data && !data.isAdmin) {
            const adminData = await checkTeamMembership(user.email || "");
            setAdminUser(adminData);
          } else {
            setAdminUser(null);
          }
        } else {
          setUserData(null);
          setAdminUser(null);
        }
      } catch (error) {
        console.error("Error in auth state change:", error);
        toast.error("Authentication error. Please try again.");
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    adminUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
