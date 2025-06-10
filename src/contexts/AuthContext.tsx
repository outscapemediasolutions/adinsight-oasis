
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth } from "../services/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { getUserData, checkTeamMembership, checkUserAccess, isSuperAdminEmail } from "../services/auth";
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
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextInterface>({
  currentUser: null,
  userData: null,
  loading: true,
  adminUser: null,
  userRole: null,
  hasAccess: () => false,
  isSuperAdmin: false,
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Function to check if user has access to a specific section
  const hasAccess = (section: string): boolean => {
    console.log("Checking access for section:", section, "userRole:", userRole, "isSuperAdmin:", isSuperAdmin);
    
    // Super admin has UNLIMITED access to EVERYTHING - no restrictions whatsoever
    if (isSuperAdmin || userRole === "super_admin") {
      console.log("Super admin detected - granting full access");
      return true;
    }

    // Admin has access to everything except User Management
    if (userRole === "admin") {
      const hasAdminAccess = section !== "userManagement";
      console.log("Admin access check:", hasAdminAccess);
      return hasAdminAccess;
    }

    // Regular user only has access to Dashboard and Analytics
    if (userRole === "user") {
      const hasUserAccess = section === "dashboard" || section === "analytics";
      console.log("User access check:", hasUserAccess);
      return hasUserAccess;
    }

    console.log("No role found - denying access");
    return false;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        console.log("Auth state changed:", user?.email);
        setCurrentUser(user);
        
        if (user) {
          // Check if user is one of the super admins FIRST
          const isSuperAdminEmail = user.email && (
            user.email === "vimalbachani888@gmail.com" || 
            user.email === "vimalbachani236@gmail.com"
          );
          
          console.log("Is super admin email:", isSuperAdminEmail, "for email:", user.email);
          setIsSuperAdmin(!!isSuperAdminEmail);
          
          // If super admin, set role immediately and skip all other checks
          if (isSuperAdminEmail) {
            console.log("Setting super admin role");
            setUserRole("super_admin");
            setUserData({
              email: user.email || "",
              displayName: user.displayName || "Super Admin",
              role: "super_admin",
              isAdmin: true,
              team: [],
              createdAt: new Date(),
            } as UserData);
            setAdminUser(null);
            setLoading(false);
            return;
          }
          
          // For non-super-admins, check access and get user data
          const hasUserAccess = await checkUserAccess(user.email || "");
          if (!hasUserAccess) {
            console.log("Access denied for user:", user.email);
            toast.error("Access denied: You are not authorized to use this app");
            await auth.signOut();
            setCurrentUser(null);
            setUserData(null);
            setAdminUser(null);
            setUserRole(null);
            setIsSuperAdmin(false);
            setLoading(false);
            return;
          }
          
          // Get user data from Firestore
          const data = await getUserData(user.uid);
          console.log("User data from Firestore:", data);
          setUserData(data as UserData | null);
          
          // Set user role based on data
          if (data?.role) {
            console.log("Setting role from data:", data.role);
            setUserRole(data.role);
          } else if (data?.isAdmin) {
            console.log("Setting admin role from isAdmin flag");
            setUserRole("admin");
          } else {
            console.log("Setting user role as default");
            setUserRole("user");
          }
          
          // Check if user is a team member (only for regular users)
          if (data && !data.isAdmin && userRole === "user") {
            const adminData = await checkTeamMembership(user.email || "");
            setAdminUser(adminData);
          } else {
            setAdminUser(null);
          }
        } else {
          console.log("No user - clearing all data");
          setUserData(null);
          setAdminUser(null);
          setUserRole(null);
          setIsSuperAdmin(false);
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
    hasAccess,
    isSuperAdmin
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
  const { currentUser, loading, hasAccess, isSuperAdmin, userRole } = useAuth();
  const navigate = useNavigate();
  
  if (loading) return <div className="h-screen flex items-center justify-center text-white bg-[#021627]">Loading...</div>;
  
  if (!currentUser) return <Navigate to="/login" />;
  
  console.log("ProtectedRoute check - requiredAccess:", requiredAccess, "hasAccess result:", hasAccess(requiredAccess), "isSuperAdmin:", isSuperAdmin, "userRole:", userRole);
  
  // Super admins have unrestricted access to everything
  if (isSuperAdmin || userRole === "super_admin") {
    console.log("Super admin - allowing access to all routes");
    return <>{children}</>;
  }
  
  if (!hasAccess(requiredAccess)) {
    console.log("Access denied for section:", requiredAccess);
    toast.error("Access denied: You do not have permission to view this section");
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};
