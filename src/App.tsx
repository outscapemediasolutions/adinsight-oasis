
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, ProtectedRoute } from "./contexts/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Upload from "./pages/Upload";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";
import { useEffect } from "react";

const queryClient = new QueryClient();

// Set dark mode by default and add Poppins font
const setInitialTheme = () => {
  document.documentElement.classList.add("dark");
  
  // Add Poppins font
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';
  document.head.appendChild(link);
  
  // Apply font to whole document
  document.body.classList.add('font-poppins');
};

const App = () => {
  useEffect(() => {
    setInitialTheme();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              <Route path="/" element={<AppLayout />}>
                <Route index element={
                  <ProtectedRoute requiredAccess="dashboard">
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="dashboard" element={
                  <ProtectedRoute requiredAccess="dashboard">
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="upload" element={
                  <ProtectedRoute requiredAccess="upload">
                    <Upload />
                  </ProtectedRoute>
                } />
                <Route path="analytics" element={
                  <ProtectedRoute requiredAccess="analytics">
                    <Analytics />
                  </ProtectedRoute>
                } />
                <Route path="team" element={
                  <ProtectedRoute requiredAccess="team">
                    <Team />
                  </ProtectedRoute>
                } />
                <Route path="settings" element={
                  <ProtectedRoute requiredAccess="settings">
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="reports" element={
                  <ProtectedRoute requiredAccess="reports">
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="user-management" element={
                  <ProtectedRoute requiredAccess="userManagement">
                    <UserManagement />
                  </ProtectedRoute>
                } />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
