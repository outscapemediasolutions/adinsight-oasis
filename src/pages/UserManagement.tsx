
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getAllUsers, updateUserRole, createNewUser, deleteUser } from "@/services/auth";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { PlusCircle, Trash2, Edit, Crown } from "lucide-react";

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isAdmin: boolean;
  createdAt: any;
}

const UserManagement = () => {
  const { currentUser, userRole, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserDisplayName, setNewUserDisplayName] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers as User[]);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, userEmail: string, newRole: string) => {
    try {
      await updateUserRole(currentUser?.uid || "", userEmail, newRole);
      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail) {
      toast.error("Email is required");
      return;
    }

    try {
      setIsSubmitting(true);
      
      await createNewUser(newUserEmail, newUserRole, newUserDisplayName);
      toast.success("User created successfully");
      
      // Reset form
      setNewUserEmail("");
      setNewUserDisplayName("");
      setNewUserRole("user");
      
      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete || !currentUser) return;

    try {
      await deleteUser(currentUser.uid, userToDelete.id, userToDelete.email);
      toast.success(`User ${userToDelete.displayName || userToDelete.email} deleted successfully`);
      setShowDeleteDialog(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    }
  };

  const getRoleDisplay = (role: string) => {
    if (role === "super_admin") return "Super Admin";
    return role?.charAt(0).toUpperCase() + role?.slice(1) || "User";
  };

  const canEditUser = (user: User) => {
    // Super admins can edit anyone except other super admins
    if (isSuperAdmin) {
      return user.role !== "super_admin" || user.email === currentUser?.email;
    }
    // Regular admins cannot edit super admins or other admins
    return user.role === "user";
  };

  const canDeleteUser = (user: User) => {
    // Only super admins can delete users
    if (!isSuperAdmin) return false;
    // Cannot delete super admin accounts
    return user.role !== "super_admin";
  };

  return (
    <div className="container mx-auto space-y-6">
      {isSuperAdmin && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Super Admin Access</h3>
          </div>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            You have unrestricted access to all user management features including creating admins and managing all users.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* User Creation Form */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Add New User</CardTitle>
            <CardDescription>Create a new user account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (Optional)</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="User Name"
                  value={newUserDisplayName}
                  onChange={(e) => setNewUserDisplayName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newUserRole} onValueChange={setNewUserRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {isSuperAdmin && (
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
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
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium">{user.displayName || user.email.split('@')[0]}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                              {user.role === "super_admin" && (
                                <Crown className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {editingUserId === user.id ? (
                              <Select 
                                defaultValue={user.role} 
                                onValueChange={(value) => {
                                  handleRoleChange(user.id, user.email, value);
                                  setEditingUserId(null);
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  {isSuperAdmin && (
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="capitalize">{getRoleDisplay(user.role)}</span>
                                {user.role === "super_admin" && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full dark:bg-yellow-900 dark:text-yellow-200">
                                    Super
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {canEditUser(user) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setEditingUserId(user.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {canDeleteUser(user) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteClick(user)}
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account for{" "}
              <span className="font-semibold">
                {userToDelete?.displayName || userToDelete?.email}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
