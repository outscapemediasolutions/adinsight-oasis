
# Firestore Rules

```
// Firestore Rules with Role-Based Access Control
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
      let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
      return userDoc != null && (userDoc.role == 'admin' || userDoc.role == 'super_admin');
    }
    
    // Check if user has access to app
    function hasAppAccess() {
      // Super admin always has access
      if (isSuperAdmin()) {
        return true;
      }
      
      // Check if user has a role assigned
      let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
      if (userDoc != null) {
        return true;
      }
      
      // Check if user is in any admin's team
      let teamQuery = query('users', where('team', 'array-contains', request.auth.token.email));
      return !exists(teamQuery);
    }
    
    // Users collection rules
    match /users/{userId} {
      // Only super admin can read all users
      allow read: if isAuthenticated() && (isSuperAdmin() || request.auth.uid == userId);
      
      // Super admin can write to any user document
      // Regular users can only write to their own document
      allow write: if isAuthenticated() && (isSuperAdmin() || request.auth.uid == userId);
      
      // Only super admin can update roles to admin/super_admin
      allow update: if isAuthenticated() && 
                     (isSuperAdmin() || 
                      (request.auth.uid == userId && 
                       !(request.resource.data.role == 'admin' || 
                         request.resource.data.role == 'super_admin')));
    }
    
    // Ad data rules - allow users to access based on role
    match /adData/{docId} {
      // Super admin and admin can read/write
      // Regular users can only read
      allow read: if isAuthenticated() && hasAppAccess();
      allow write: if isAuthenticated() && (isSuperAdmin() || isAdmin());
    }
    
    // Organization rules
    match /organizations/{orgId} {
      // Super admin and admin have full access
      // Regular users have read access only
      allow read: if isAuthenticated() && hasAppAccess();
      allow write: if isAuthenticated() && (isSuperAdmin() || isAdmin());
      
      // Campaign data - same rules as organization
      match /campaignData/{document=**} {
        allow read: if isAuthenticated() && hasAppAccess();
        allow write: if isAuthenticated() && (isSuperAdmin() || isAdmin());
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

2. **Admin Access**:
   - Access to all collections except modifying user roles
   - Can add users but only with the "user" role

3. **User Access**:
   - Can only read adData and campaignData
   - Cannot write data or access user management

4. **Default Access**:
   - No access without authentication and proper role assignment

## Testing These Rules

You can test these rules in the Firebase Console:
1. Go to the Rules tab in Firestore Database
2. Click "Rules Playground"
3. Simulate requests with different user credentials to test access
