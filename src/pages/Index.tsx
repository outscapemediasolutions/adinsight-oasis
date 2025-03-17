
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/services/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Dashboard from "@/components/dashboard/Dashboard";

const Index = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">AdPulse Analytics</h1>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-sm text-muted-foreground">
            Welcome, {userData?.displayName || currentUser?.email}
          </span>
          <Button size="sm" onClick={handleSignOut}>Sign Out</Button>
        </div>
      </div>
      
      <Dashboard />
    </div>
  );
};

export default Index;
