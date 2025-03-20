
# Firestore Rules

```
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // User-specific rules
    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin");
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Ad data rules - allow users to access their own data
    match /adData/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Organization rules
    match /organizations/{orgId} {
      // Allow read access to organization members
      allow read: if request.auth != null && 
                     (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId == orgId);
      
      // Allow write access to organization admins only
      allow write: if request.auth != null && 
                      exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin" &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId == orgId;
      
      // Allow access to campaign data for organization members
      match /campaignData/{document=**} {
        allow read, write: if request.auth != null && 
                              exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
                              get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId == orgId;
      }
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
