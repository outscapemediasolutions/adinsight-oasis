
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface TeamMember {
  email: string;
  role: 'Admin' | 'User';
  status: 'active' | 'pending';
  dateAdded: string;
}

const Team = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("User");
  
  // Mock team members
  const [members, setMembers] = useState<TeamMember[]>([
    {
      email: "john@example.com",
      role: "Admin",
      status: "active",
      dateAdded: "2023-12-01"
    },
    {
      email: "sarah@example.com",
      role: "User",
      status: "active",
      dateAdded: "2023-12-05"
    },
    {
      email: "mike@example.com",
      role: "User",
      status: "pending",
      dateAdded: "2023-12-10"
    }
  ]);
  
  const handleInvite = () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }
    
    // Check if email is already in the list
    if (members.some(member => member.email === email)) {
      toast.error("This email has already been invited");
      return;
    }
    
    // Add new member
    const newMember: TeamMember = {
      email,
      role: role as 'Admin' | 'User',
      status: 'pending',
      dateAdded: new Date().toISOString().split('T')[0]
    };
    
    setMembers([...members, newMember]);
    setEmail("");
    setRole("User");
    setOpen(false);
    
    toast.success(`Invitation sent to ${email}`);
  };
  
  const handleRemoveMember = (email: string) => {
    setMembers(members.filter(member => member.email !== email));
    toast.success("Team member removed");
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Team Management</h2>
          <p className="text-white/60 mt-1">
            Manage team members and their access to your AdPulse account
          </p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-adpulse-green text-[#021627] hover:bg-adpulse-green/90">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0B2537] border-white/10">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation email to add a new team member
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input 
                  id="email" 
                  placeholder="user@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 bg-[#021627] border-white/20"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role" className="mt-2 bg-[#021627] border-white/20">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B2537] border-white/10">
                    <SelectGroup>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="User">User</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-white/60 mt-2">
                  {role === "Admin" 
                    ? "Admins have full access to all features and settings" 
                    : "Users can view data, but cannot manage team members or settings"}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="bg-transparent border-white/20"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleInvite}
                className="bg-adpulse-green text-[#021627] hover:bg-adpulse-green/90"
              >
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card className="bg-[#0B2537] border-white/10">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date Added</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.email} className="border-b border-white/10">
                    <td className="px-4 py-4 text-sm">{member.email}</td>
                    <td className="px-4 py-4 text-sm">{member.role}</td>
                    <td className="px-4 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                        member.status === "active" 
                          ? "bg-adpulse-green/20 text-adpulse-green"
                          : "bg-yellow-500/20 text-yellow-500"
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">{member.dateAdded}</td>
                    <td className="px-4 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveMember(member.email)}
                        className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p className="mt-6 text-sm text-white/60">
            Team members will receive an email invitation with instructions to join your AdPulse account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Team;
