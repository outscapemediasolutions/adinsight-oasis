
# Firestore Rules - Super Simple Version

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Check if user is super admin (UNRESTRICTED ACCESS)
    function isSuperAdmin() {
      return request.auth.token.email == 'vimalbachani888@gmail.com' ||
             request.auth.token.email == 'vimalbachani236@gmail.com';
    }
    
    // Super admins have UNLIMITED access to EVERYTHING
    match /{document=**} {
      allow read, write: if isSuperAdmin();
    }
    
    // For all other users - minimal restrictions
    match /users/{userId} {
      allow read, write: if isAuthenticated();
    }
    
    // General data access for authenticated users
    match /{path=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
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

## What These Rules Do

### **Super Admin Access (vimalbachani888@gmail.com & vimalbachani236@gmail.com)**:
- **COMPLETELY UNRESTRICTED** access to ALL data
- Can read, write, create, update, delete ANYTHING
- No limitations whatsoever

### **All Other Users**:
- Can read and write to most collections
- Very minimal restrictions
- Authenticated users have broad access

### **Security Features**:
- Only requires authentication for access
- Super admins bypass all rules
- Simple and permissive for development

## Why This Works

These rules are extremely permissive and give super admins complete control while allowing other authenticated users to access most data. This is the simplest possible setup that ensures super admins have zero restrictions.

**Note**: These rules are very permissive and suitable for development. For production, you may want to add more specific restrictions based on your app's requirements.
