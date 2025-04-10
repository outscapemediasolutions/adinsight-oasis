import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Gauge,
  LayoutDashboard,
  LineChart,
  Settings,
  ShoppingBag,
  Upload,
  Users,
  ChevronRight,
  BarChart,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  onNavigation?: () => void;
}

const AppSidebar = ({ className, onNavigation, ...props }: SidebarProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [showAnalyticsSub, setShowAnalyticsSub] = useState(false);

  // Determine if any sub-item is active
  useEffect(() => {
    if (location.pathname === "/analytics" || location.pathname === "/shopify-analytics") {
      setShowAnalyticsSub(true);
    }
  }, [location.pathname]);
  
  const handleSubNavigation = () => {
    if (onNavigation && isMobile) {
      onNavigation();
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className={cn("pb-12", className)} {...props}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight text-white">
            Main Menu
          </h2>
          <div className="space-y-1">
            <Link to="/dashboard" onClick={onNavigation}>
              <Button
                variant={isActive("/dashboard") ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start",
                  isActive("/dashboard")
                    ? "bg-adpulse-green/90 text-foreground hover:bg-adpulse-green"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/upload" onClick={onNavigation}>
              <Button
                variant={isActive("/upload") ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start",
                  isActive("/upload")
                    ? "bg-adpulse-green/90 text-foreground hover:bg-adpulse-green"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <Upload className="mr-2 h-4 w-4" />
                Data Upload
              </Button>
            </Link>
            
            {/* Analytics Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-between",
                  (isActive("/analytics") || isActive("/shopify-analytics"))
                    ? "text-white"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
                onClick={() => setShowAnalyticsSub(!showAnalyticsSub)}
              >
                <div className="flex items-center">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                </div>
                <ChevronRight 
                  className={cn(
                    "h-4 w-4 transition-transform", 
                    showAnalyticsSub ? "rotate-90" : ""
                  )} 
                />
              </Button>
              
              {showAnalyticsSub && (
                <div className="pl-6 space-y-1 mt-1">
                  <Link to="/analytics" onClick={handleSubNavigation}>
                    <Button
                      variant={isActive("/analytics") ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-start",
                        isActive("/analytics")
                          ? "bg-adpulse-green/90 text-foreground hover:bg-adpulse-green"
                          : "text-white/80 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <LineChart className="mr-2 h-4 w-4" />
                      Meta Ad Analytics
                    </Button>
                  </Link>
                  <Link to="/shopify-analytics" onClick={handleSubNavigation}>
                    <Button
                      variant={isActive("/shopify-analytics") ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-start",
                        isActive("/shopify-analytics")
                          ? "bg-adpulse-green/90 text-foreground hover:bg-adpulse-green"
                          : "text-white/80 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Shopify Analytics
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            
            <Link to="/reports" onClick={onNavigation}>
              <Button
                variant={isActive("/reports") ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start",
                  isActive("/reports")
                    ? "bg-adpulse-green/90 text-foreground hover:bg-adpulse-green"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <BarChart className="mr-2 h-4 w-4" />
                Reports
              </Button>
            </Link>
          </div>
        </div>
        <Separator className="mx-4 bg-white/10" />
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight text-white">
            Administration
          </h2>
          <div className="space-y-1">
            <Link to="/team" onClick={onNavigation}>
              <Button
                variant={isActive("/team") ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start",
                  isActive("/team")
                    ? "bg-adpulse-green/90 text-foreground hover:bg-adpulse-green"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <Users className="mr-2 h-4 w-4" />
                Team
              </Button>
            </Link>
            <Link to="/user-management" onClick={onNavigation}>
              <Button
                variant={isActive("/user-management") ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start",
                  isActive("/user-management")
                    ? "bg-adpulse-green/90 text-foreground hover:bg-adpulse-green"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <Users className="mr-2 h-4 w-4" />
                User Management
              </Button>
            </Link>
            <Link to="/settings" onClick={onNavigation}>
              <Button
                variant={isActive("/settings") ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start",
                  isActive("/settings")
                    ? "bg-adpulse-green/90 text-foreground hover:bg-adpulse-green"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSidebar;
