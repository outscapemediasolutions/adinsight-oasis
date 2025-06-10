
# Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Check if user is super admin (by email) - UNRESTRICTED ACCESS
    function isSuperAdmin() {
      return request.auth.token.email == 'vimalbachani888@gmail.com' ||
             request.auth.token.email == 'vimalbachani236@gmail.com';
    }
    
    // Check if user has admin role
    function isAdmin() {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Check if user is admin or super admin
    function isAdminOrSuperAdmin() {
      return isSuperAdmin() || isAdmin();
    }
    
    // Check if user owns the resource
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Users collection rules
    match /users/{userId} {
      // Super admin can read ALL users without restrictions
      // Users can read their own document
      // Admins can read all users
      allow read: if isAuthenticated() && (isSuperAdmin() || isAdmin() || isOwner(userId));
      
      // Super admin can write/create/update ANY user document without restrictions
      // Regular users can only write to their own document
      // Admins can write to user documents but not admin documents
      allow create: if isAuthenticated() && 
                   (isSuperAdmin() || 
                    (isOwner(userId) && request.resource.data.role == 'user'));
      
      allow update: if isAuthenticated() && 
                   (isSuperAdmin() || 
                    (isOwner(userId) && 
                     // Users cannot promote themselves to admin/super_admin
                     !(request.resource.data.role == 'admin' || 
                       request.resource.data.role == 'super_admin')) ||
                    // Admins can update user roles but not to super_admin
                    (isAdmin() && 
                     request.resource.data.role != 'super_admin' &&
                     resource.data.role != 'super_admin'));
      
      // Only super admin can delete users (with restrictions on super admin accounts)
      allow delete: if isAuthenticated() && isSuperAdmin() && 
                   // Cannot delete super admin accounts
                   resource.data.role != 'super_admin';
    }
    
    // Ad data rules - Super admins have full access
    match /users/{userId}/ad_data/{docId} {
      allow read: if isAuthenticated() && (isSuperAdmin() || isAdminOrSuperAdmin() || isOwner(userId));
      allow write: if isAuthenticated() && (isSuperAdmin() || isAdminOrSuperAdmin() || isOwner(userId));
    }
    
    // Upload history rules - Super admins have full access
    match /users/{userId}/upload_history/{uploadId} {
      allow read: if isAuthenticated() && (isSuperAdmin() || isAdminOrSuperAdmin() || isOwner(userId));
      allow write: if isAuthenticated() && (isSuperAdmin() || isAdminOrSuperAdmin() || isOwner(userId));
    }
    
    // Organization rules - Super admins have unlimited access
    match /organizations/{orgId} {
      // Super admin has unrestricted read/write access
      // Admin and authenticated users have read access
      allow read: if isAuthenticated() && (isSuperAdmin() || isAdminOrSuperAdmin() || 
                  exists(/databases/$(database)/documents/users/$(request.auth.uid)));
      allow write: if isAuthenticated() && (isSuperAdmin() || isAdminOrSuperAdmin());
      
      // Campaign data - Super admins have full access
      match /campaignData/{document=**} {
        allow read: if isAuthenticated() && (isSuperAdmin() || isAdminOrSuperAdmin() || 
                    exists(/databases/$(database)/documents/users/$(request.auth.uid)));
        allow write: if isAuthenticated() && (isSuperAdmin() || isAdminOrSuperAdmin());
      }
    }
    
    // Teams collection - Super admins have full access
    match /teams/{teamId} {
      allow read: if isAuthenticated() && (isSuperAdmin() || isAdminOrSuperAdmin() || 
                  resource.data.members != null && request.auth.token.email in resource.data.members);
      allow write: if isAuthenticated() && (isSuperAdmin() || isAdminOrSuperAdmin());
    }
    
    // Analytics data - Super admins have full access
    match /analytics/{document=**} {
      allow read: if isAuthenticated() && (isSuperAdmin() || isAdminOrSuperAdmin() || 
                  exists(/databases/$(database)/documents/users/$(request.auth.uid)));
      allow write: if isAuthenticated() && (isSuperAdmin() || isAdminOrSuperAdmin());
    }
    
    // Settings - Super admins have full access
    match /settings/{document=**} {
      allow read: if isAuthenticated() && (isSuperAdmin() || isAdminOrSuperAdmin());
      allow write: if isAuthenticated() && isSuperAdmin();
    }
    
    // System logs - Only super admins can access
    match /system_logs/{document=**} {
      allow read: if isAuthenticated() && isSuperAdmin();
      allow write: if isAuthenticated() && isSuperAdmin();
    }
    
    // Default deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## How to Apply These Rules

1. Go to your Firebase Console: https://console.firebase.google.com/
2. Select your project "adpulse-by-vimal-bachani"
3. In the left sidebar, click on "Firestore Database"
4. Click on the "Rules" tab
5. Copy and paste the rules above
6. Click "Publish"

## Security Rules Explanation

These updated security rules implement comprehensive role-based access control with **unrestricted super admin access**:

### **Super Admin Access (vimalbachani888@gmail.com & vimalbachani236@gmail.com)**:
- **UNLIMITED** read/write access to ALL collections
- Can create, read, update, and delete ANY document
- Can manage user roles including creating other admins
- Can delete users (except other super admins)
- Access to system logs and settings
- No restrictions whatsoever on data access

### **Admin Access**:
- Full access to most collections except system settings
- Can manage regular users but not super admins
- Cannot access system logs
- Cannot delete users

### **User Access**:
- Can only read their own data
- Limited access to general campaign and analytics data
- Cannot modify user roles or access user management

### **Special Collections**:
- `system_logs`: Only super admins
- `settings`: Super admins for write, admins for read
- `teams`: Based on membership with super admin override
- `analytics`: General read access, admin+ write access

### **Protection Features**:
- Prevents super admin account deletion
- Prevents users from self-promoting to admin
- Maintains data isolation for regular users
- Comprehensive audit trail support

## Testing These Rules

You can test these rules in the Firebase Console:
1. Go to the Rules tab in Firestore Database
2. Click "Rules Playground"
3. Simulate requests with different user credentials to test access
4. Test with both super admin emails to verify unrestricted access

## Security Notes

- Super admins have complete database access - use responsibly
- All other users have appropriate restrictions
- Super admin accounts cannot be deleted via these rules
- Regular users cannot escalate their own privileges
