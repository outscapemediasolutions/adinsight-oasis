
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { currentUser } = useAuth();
  const [orgName, setOrgName] = useState("My Organization");
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSaveChanges = () => {
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Settings saved successfully");
    }, 1000);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-white/60 mt-1">
          Manage your account settings and preferences
        </p>
      </div>
      
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="bg-[#021627]/50 mb-4">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="mt-0">
          <Card className="bg-[#0B2537] border-white/10">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Update your organization details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="organization">Organization Name</Label>
                <Input 
                  id="organization" 
                  value={orgName} 
                  onChange={(e) => setOrgName(e.target.value)}
                  className="bg-[#021627] border-white/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  value={currentUser?.email || ""} 
                  disabled
                  className="bg-[#021627] border-white/20 opacity-70"
                />
                <p className="text-xs text-white/60">
                  This is the primary email address for your account
                </p>
              </div>
              
              <Button 
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="bg-adpulse-green text-[#021627] hover:bg-adpulse-green/90"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-0">
          <Card className="bg-[#0B2537] border-white/10">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input 
                  id="current-password" 
                  type="password" 
                  placeholder="••••••••"
                  className="bg-[#021627] border-white/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  placeholder="••••••••"
                  className="bg-[#021627] border-white/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  placeholder="••••••••"
                  className="bg-[#021627] border-white/20"
                />
              </div>
              
              <Button className="bg-adpulse-green text-[#021627] hover:bg-adpulse-green/90">
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-0">
          <Card className="bg-[#0B2537] border-white/10">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-medium">Email Notifications</h4>
                    <p className="text-xs text-white/60">Receive email notifications about account activity</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-medium">Performance Alerts</h4>
                    <p className="text-xs text-white/60">Get notified when campaign performance changes significantly</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-medium">Team Activity</h4>
                    <p className="text-xs text-white/60">Receive notifications about team member actions</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-medium">Product Updates</h4>
                    <p className="text-xs text-white/60">Stay informed about new features and improvements</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              
              <Button className="mt-6 bg-adpulse-green text-[#021627] hover:bg-adpulse-green/90">
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="integrations" className="mt-0">
          <Card className="bg-[#0B2537] border-white/10">
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Connect AdPulse with other platforms and services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-white/10 rounded-lg bg-[#021627]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 16.84 5.44 20.87 10 21.8V15H8V12H10V9.5C10 7.57 11.57 6 13.5 6H16V9H14C13.45 9 13 9.45 13 10V12H16V15H13V21.95C18.05 21.45 22 17.19 22 12Z" fill="#3b5998"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium">Facebook</h4>
                        <p className="text-xs text-white/60">Connect to your Facebook Ads account</p>
                      </div>
                    </div>
                    <Button variant="outline" className="bg-transparent border-white/20">Connect</Button>
                  </div>
                </div>
                
                <div className="p-4 border border-white/10 rounded-lg bg-[#021627]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" rx="4" fill="#34A853" fillOpacity="0.1"/>
                          <path d="M20.5 12C20.5 7.85786 17.1421 4.5 13 4.5C8.85786 4.5 5.5 7.85786 5.5 12C5.5 16.1421 8.85786 19.5 13 19.5C17.1421 19.5 20.5 16.1421 20.5 12Z" stroke="#34A853"/>
                          <path d="M13 8V12H17" stroke="#34A853" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium">Google Analytics</h4>
                        <p className="text-xs text-white/60">Import data from Google Analytics</p>
                      </div>
                    </div>
                    <Button variant="outline" className="bg-transparent border-white/20">Connect</Button>
                  </div>
                </div>
                
                <div className="p-4 border border-white/10 rounded-lg bg-[#021627]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mr-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20.24 12.24C20.24 6.24 15.36 2.4 12 2.4C5.76 2.4 3.84 6.64 3.84 9.6C3.84 14.4 8.16 16.32 9.84 16.32C9.84 15.2 8.16 13.2 8.16 9.6C8.16 6.24 10.08 4.96 12 4.96C14.4 4.96 15.84 7.2 15.84 9.6C15.84 13.44 12.24 17.76 12 21.6" stroke="#9333EA" strokeWidth="1.5"/>
                          <path d="M9 20.4H15" stroke="#9333EA" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium">Shopify</h4>
                        <p className="text-xs text-white/60">Connect your Shopify store</p>
                      </div>
                    </div>
                    <Button variant="outline" className="bg-transparent border-white/20">Connect</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
