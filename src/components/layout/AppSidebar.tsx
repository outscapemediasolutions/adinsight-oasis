
import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeftCircle, AreaChart, Clock, HelpCircle, LayoutDashboard, Settings, Upload, Users, ShoppingBag } from "lucide-react";

import Navbar from "../Navbar";

const AppSidebar = () => {
  const { currentUser, hasAccess } = useAuth();
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(!useIsMobile());
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (isMobile) {
      setShowSidebar(false);
    } else {
      setShowSidebar(true);
    }
  }, [isMobile]);
  
  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname === `${path}/`;
  };
  
  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      access: "dashboard",
    },
    {
      name: "Upload",
      path: "/upload",
      icon: Upload,
      access: "upload",
    },
    {
      name: "Meta Ad Analytics",
      path: "/analytics",
      icon: AreaChart,
      access: "analytics",
    },
    {
      name: "Shopify Analytics",
      path: "/shopify-analytics",
      icon: ShoppingBag,
      access: "analytics",
    },
    {
      name: "Team",
      path: "/team",
      icon: Users,
      access: "team",
    },
    {
      name: "Settings",
      path: "/settings",
      icon: Settings,
      access: "settings",
    },
    {
      name: "Reports",
      path: "/reports",
      icon: Clock,
      access: "reports",
    },
    {
      name: "User Management",
      path: "/user-management",
      icon: Users,
      access: "userManagement",
    },
  ];
  
  // Render nothing if user is not authenticated
  if (!currentUser) return null;
  
  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-black">
        {showSidebar && (
          <Sidebar className="border-r border-white/10 min-w-[280px]">
            <div className="flex h-16 items-center border-b border-white/10 px-4">
              <Link 
                to="/" 
                className="flex items-center space-x-2 text-xl font-semibold text-adpulse-green"
              >
                <span className="rounded-md bg-adpulse-green/20 p-1">
                  <AreaChart className="h-6 w-6 text-adpulse-green" />
                </span>
                <span>AdPulse</span>
              </Link>
            </div>
            
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navItems
                      .filter(item => hasAccess(item.access))
                      .map((item) => (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton 
                            asChild
                            className={cn(
                              isActivePath(item.path) 
                                ? "bg-adpulse-green/10 text-adpulse-green font-medium"
                                : "hover:bg-white/5 hover:text-white text-white/70"
                            )}
                          >
                            <Link to={item.path} className="flex items-center">
                              <item.icon className="mr-2 h-5 w-5" />
                              <span>{item.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              
              <SidebarGroup>
                <SidebarGroupLabel>Help</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild
                        className="hover:bg-white/5 hover:text-white text-white/70"
                      >
                        <a href="#" className="flex items-center">
                          <HelpCircle className="mr-2 h-5 w-5" />
                          <span>Documentation</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            
            {isMobile && (
              <div className="p-4 border-t border-white/10">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => setShowSidebar(false)}
                >
                  <ArrowLeftCircle className="mr-2 h-4 w-4" />
                  Hide Sidebar
                </Button>
              </div>
            )}
          </Sidebar>
        )}
        
        <div className="flex-1 flex flex-col">
          <div className="sticky top-0 z-30 flex items-center justify-between bg-black/60 backdrop-blur-sm border-b border-white/10 h-16 px-4">
            {!showSidebar && (
              <SidebarTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)}>
                  <span className="sr-only">Open sidebar</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <path d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                </Button>
              </SidebarTrigger>
            )}
            <Navbar className={cn(!showSidebar ? "flex-1" : "")} />
          </div>
          
          <main className="flex-1">
            <div className="p-4">
              {/* App content rendered here */}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppSidebar;
