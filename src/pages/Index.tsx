
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/services/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
      <h1 className="text-3xl font-bold mb-6">AdPulse Analytics Dashboard</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Welcome, {userData?.displayName || currentUser?.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You are logged in as: {currentUser?.email}</p>
          <Button className="mt-4" onClick={handleSignOut}>Sign Out</Button>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The complete analytics dashboard is under development.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
