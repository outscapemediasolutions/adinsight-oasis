
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, FileUp, Home, LogOut, Settings, Users, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/services/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userRole, hasAccess } = useAuth();
  const isMobile = useIsMobile();
  
  // Define all possible menu items
  const allMenuItems = [
    { icon: Home, label: "Dashboard", path: "/", access: "dashboard" },
    { icon: FileUp, label: "Data Upload", path: "/upload", access: "upload" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", access: "analytics" },
    { icon: Users, label: "Team", path: "/team", access: "team" },
    { icon: UserCog, label: "User Management", path: "/user-management", access: "userManagement" },
    { icon: Settings, label: "Settings", path: "/settings", access: "settings" },
  ];
  
  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => {
    // Super admin can see everything
    if (userRole === "super_admin") return true;
    
    // Admin can see everything except User Management
    if (userRole === "admin") {
      return item.access !== "userManagement";
    }
    
    // Regular users can only see Dashboard and Analytics
    return hasAccess(item.access);
  });
  
  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/dashboard") return true;
    return location.pathname === path;
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out");
    }
  };
  
  if (!currentUser) return null;
  
  return (
    <div className="w-[240px] h-full bg-[#021120] border-r border-white/10 flex flex-col">
      <div className="p-6">
        <h1 className="text-adpulse-green text-2xl font-bold">AdPulse</h1>
      </div>
      
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg gap-3 text-sm group transition-colors",
                  isActive(item.path)
                    ? "bg-adpulse-green/10 text-adpulse-green" 
                    : "text-white/70 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive(item.path) ? "text-adpulse-green" : "text-white/70 group-hover:text-white"
                )} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-3 mt-auto">
        <div className="border-t border-white/10 pt-4 pb-2">
          <div className="px-3 py-2">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-adpulse-green/20 text-adpulse-green flex items-center justify-center">
                {currentUser?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium truncate max-w-[160px]">
                  {currentUser?.email?.split('@')[0] || "User"}
                </p>
                <p className="text-xs text-white/60 truncate max-w-[160px]">
                  {currentUser?.email || ""}
                </p>
                {userRole && (
                  <p className="text-xs text-adpulse-green truncate max-w-[160px] capitalize">
                    {userRole.replace('_', ' ')}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex items-center px-3 py-2.5 rounded-lg w-full text-white/70 hover:text-white hover:bg-white/5 text-sm gap-3 mt-2"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppSidebar;
