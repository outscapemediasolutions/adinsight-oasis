
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth } from "../services/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { getUserData, checkTeamMembership, checkUserAccess } from "../services/auth";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";

// Define user data interface with role
interface UserData {
  email: string;
  displayName: string;
  isAdmin: boolean;
  role: "super_admin" | "admin" | "user";
  team: string[];
  createdAt: Date;
}

// Define context interface
interface AuthContextInterface {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  adminUser: any | null; // Admin user data if current user is a team member
  userRole: "super_admin" | "admin" | "user" | null;
  hasAccess: (section: string) => boolean;
}

const AuthContext = createContext<AuthContextInterface>({
  currentUser: null,
  userData: null,
  loading: true,
  adminUser: null,
  userRole: null,
  hasAccess: () => false,
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<"super_admin" | "admin" | "user" | null>(null);

  // Function to check if user has access to a specific section
  const hasAccess = (section: string): boolean => {
    if (!userRole) return false;

    // Super admin has access to everything
    if (userRole === "super_admin") return true;

    // Admin has access to everything except User Management
    if (userRole === "admin") {
      return section !== "userManagement";
    }

    // Regular user only has access to Dashboard and Analytics
    if (userRole === "user") {
      return section === "dashboard" || section === "analytics";
    }

    return false;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);
        
        if (user) {
          // Check if user is the super admin
          const isSuperAdmin = user.email === "vimalbachani888@gmail.com";
          
          // Get user data from Firestore
          const data = await getUserData(user.uid);
          setUserData(data as UserData | null);
          
          // Check if user has access
          if (!isSuperAdmin) {
            const hasAccess = await checkUserAccess(user.email || "");
            if (!hasAccess) {
              toast.error("Access denied: You are not authorized to use this app");
              await auth.signOut();
              setCurrentUser(null);
              setUserData(null);
              setAdminUser(null);
              setUserRole(null);
              setLoading(false);
              return;
            }
          }
          
          // Set user role
          if (isSuperAdmin) {
            setUserRole("super_admin");
          } else if (data?.role) {
            setUserRole(data.role);
          } else if (data?.isAdmin) {
            setUserRole("admin");
          } else {
            setUserRole("user");
          }
          
          // Check if user is a team member
          if (data && !data.isAdmin && userRole === "user") {
            const adminData = await checkTeamMembership(user.email || "");
            setAdminUser(adminData);
          } else {
            setAdminUser(null);
          }
        } else {
          setUserData(null);
          setAdminUser(null);
          setUserRole(null);
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
    userRole,
    hasAccess
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Protected route component with role-based access
export const ProtectedRoute = ({ 
  children, 
  requiredAccess 
}: { 
  children: React.ReactNode, 
  requiredAccess: string 
}) => {
  const { currentUser, loading, hasAccess } = useAuth();
  const navigate = useNavigate();
  
  if (loading) return <div className="h-screen flex items-center justify-center text-white bg-[#021627]">Loading...</div>;
  
  if (!currentUser) return <Navigate to="/login" />;
  
  if (!hasAccess(requiredAccess)) {
    toast.error("Access denied: You do not have permission to view this section");
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};
