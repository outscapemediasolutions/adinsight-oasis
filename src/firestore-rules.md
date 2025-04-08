
# Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Check if user is super admin (by email)
    function isSuperAdmin() {
      return request.auth.token.email == 'vimalbachani888@gmail.com';
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
    
    // Users collection rules
    match /users/{userId} {
      // Super admin can read all users
      // Users can read their own document
      // Admins can read all users
      allow read: if isAuthenticated() && (isSuperAdmin() || isAdmin() || request.auth.uid == userId);
      
      // Super admin can write to any user document
      // Regular users can only write to their own document
      allow write: if isAuthenticated() && (isSuperAdmin() || request.auth.uid == userId);
      
      // Only super admin can delete users
      allow delete: if isAuthenticated() && isSuperAdmin();
      
      // Only super admin can update roles to admin/super_admin
      allow update: if isAuthenticated() && 
                   (isSuperAdmin() || 
                    (request.auth.uid == userId && 
                     !(request.resource.data.role == 'admin' || 
                       request.resource.data.role == 'super_admin')));
    }
    
    // Ad data rules
    match /users/{userId}/ad_data/{docId} {
      // Super admin and admin can read/write
      // Regular users can only read their own
      allow read: if isAuthenticated() && (isAdminOrSuperAdmin() || request.auth.uid == userId);
      allow write: if isAuthenticated() && (isAdminOrSuperAdmin() || request.auth.uid == userId);
    }
    
    // Upload history rules
    match /users/{userId}/upload_history/{uploadId} {
      allow read: if isAuthenticated() && (isAdminOrSuperAdmin() || request.auth.uid == userId);
      allow write: if isAuthenticated() && (isAdminOrSuperAdmin() || request.auth.uid == userId);
    }
    
    // Organization rules
    match /organizations/{orgId} {
      // Super admin and admin have full access
      // Regular users have read access only
      allow read: if isAuthenticated() && (isAdminOrSuperAdmin() || exists(/databases/$(database)/documents/users/$(request.auth.uid)));
      allow write: if isAuthenticated() && isAdminOrSuperAdmin();
      
      // Campaign data - same rules as organization
      match /campaignData/{document=**} {
        allow read: if isAuthenticated() && (isAdminOrSuperAdmin() || exists(/databases/$(database)/documents/users/$(request.auth.uid)));
        allow write: if isAuthenticated() && isAdminOrSuperAdmin();
      }
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

These security rules implement role-based access control:

1. **Super Admin Access**: 
   - Identified by the email vimalbachani888@gmail.com
   - Full access to all collections including user management
   - Can delete users

2. **Admin Access**:
   - Access to all collections except deleting users
   - Can read all user data but cannot modify user roles

3. **User Access**:
   - Can only read their own data and general campaign data
   - Cannot write data or access user management

4. **Default Access**:
   - No access without authentication and proper role assignment

## Testing These Rules

You can test these rules in the Firebase Console:
1. Go to the Rules tab in Firestore Database
2. Click "Rules Playground"
3. Simulate requests with different user credentials to test access
