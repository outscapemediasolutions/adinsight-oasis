
import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/services/auth";
import { toast } from "sonner";
import AppSidebar from "./AppSidebar";
import { Calendar, Download, Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface AppLayoutProps {
  children?: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });
  
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
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
  
  // Get current page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") return "Dashboard";
    if (path === "/upload") return "Data Upload";
    if (path === "/analytics") return "Analytics";
    if (path === "/team") return "Team Management";
    if (path === "/settings") return "Settings";
    if (path === "/reports") return "Custom Reports";
    return "AdPulse Analytics";
  };
  
  // Optional date range for header, could be dynamic in the future
  const dateRange = "Feb 18, 2025 - Mar 20, 2025";
  
  return (
    <div className="flex h-screen w-full bg-[#021627] text-white">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/10">
          <h1 className="text-2xl font-semibold">{getPageTitle()}</h1>
          
          <div className="flex items-center gap-3">
            {(location.pathname === "/" || location.pathname === "/dashboard" || location.pathname === "/reports") && (
              <Button variant="outline" size="sm" className="text-xs bg-transparent border-white/20 hover:bg-white/10">
                <Calendar className="mr-2 h-3.5 w-3.5" />
                {dateRange}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="rounded-full text-white/80 hover:text-white"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-adpulse-green/20 text-adpulse-green border border-adpulse-green/30">
                    <User className="h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#0B2537] border-white/10">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{userData?.displayName || 'User'}</span>
                    <span className="text-xs text-white/60">{currentUser?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-white/5 focus:bg-white/5" 
                  onClick={() => navigate("/settings")}
                >
                  Account settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-white/5 focus:bg-white/5" 
                  onClick={handleSignOut}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
