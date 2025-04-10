
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { addTeamMember, removeTeamMember, getTeamMembers } from "@/services/auth";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";

const Team = () => {
  const { currentUser, userRole } = useAuth();
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingMember, setAddingMember] = useState(false);

  // Only allow admin and super_admin to add team members
  const canManageTeam = userRole === "admin" || userRole === "super_admin";

  useEffect(() => {
    if (currentUser) {
      fetchTeamMembers();
    }
  }, [currentUser]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      if (currentUser) {
        const members = await getTeamMembers(currentUser.uid);
        setTeamMembers(members);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMemberEmail) {
      toast.error("Email is required");
      return;
    }

    try {
      setAddingMember(true);
      if (currentUser) {
        await addTeamMember(currentUser.uid, newMemberEmail);
        toast.success("Team member added successfully");
        setNewMemberEmail("");
        fetchTeamMembers();
      }
    } catch (error) {
      console.error("Error adding team member:", error);
      toast.error("Failed to add team member");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (email: string) => {
    try {
      if (currentUser && email !== currentUser.email) {
        await removeTeamMember(currentUser.uid, email);
        toast.success("Team member removed");
        fetchTeamMembers();
      } else if (email === currentUser?.email) {
        toast.error("You cannot remove yourself from the team");
      }
    } catch (error) {
      console.error("Error removing team member:", error);
      toast.error("Failed to remove team member");
    }
  };

  return (
    <div className="container mx-auto space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Team Member Form */}
        {canManageTeam && (
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Add Team Member</CardTitle>
              <CardDescription>
                Grant access to your team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="team@example.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={addingMember}
                >
                  {addingMember ? (
                    <>Adding...</>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Member
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Team Members List */}
        <Card className={canManageTeam ? "md:col-span-2" : "md:col-span-3"}>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              People who have access to your team data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-adpulse-green"></div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      {canManageTeam && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canManageTeam ? 3 : 2} className="text-center">
                          No team members
                        </TableCell>
                      </TableRow>
                    ) : (
                      teamMembers.map((email) => (
                        <TableRow key={email}>
                          <TableCell>{email}</TableCell>
                          <TableCell>
                            {email === currentUser?.email ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                You
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                Member
                              </span>
                            )}
                          </TableCell>
                          {canManageTeam && (
                            <TableCell>
                              {email !== currentUser?.email && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveMember(email)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Team;
