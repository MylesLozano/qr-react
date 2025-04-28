# QCheckCITE - QR-Based Inventory Management System

## 📌 Project Overview

QCheckCITE is a **QR-Based Inventory Management System** designed for the **College of Information Technology Education (CITE)** at JMC. It allows authorized users to track, manage, and audit inventory items efficiently using QR codes.

## 🚀 Features

- **Google Sign-In** (Restricted to `@jmc.edu.ph` emails)
- **QR Code Scanning & Management**
- **Inventory Tracking & Updates**
- **Audit Logging** (Tracks sign-ins, sign-outs, and interactions)
- **Role-Based Access Control** (Superadmin, Admin, User)
- **Role-Aware Navigation Bar**
- **Cloud Firestore Database** Integration

## 🛠️ Tech Stack

- **Frontend:** React (Vite), React Router
- **Backend:** Firebase Authentication, Firestore Database
- **Authentication:** Google Sign-In (Firebase Auth)
- **Hosting:** Firebase Hosting

## 📥 Installation & Setup

### 1️⃣ Clone the Repository

```sh
git clone https://github.com/yourusername/qcheckcite.git
cd qcheckcite
```

### 2️⃣ Install Dependencies

```sh
npm install
```

### 3️⃣ Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Register your web app and copy the Firebase config
4. Replace the placeholder in `firebase.js`:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

### 4️⃣ Run the Project Locally

```sh
npm run dev
```

Then open **http://localhost:5173/** in your browser.

## 🔒 Authentication & User Access

- Only users with `@jmc.edu.ph` emails can sign in.
- Unauthorized users will be denied access.
- All login/logout activities are logged in Firestore.

## 🧑‍💻 Roles & Navigation

Navigation is role-based and handled by the top navbar:

- **User**
  - Inventory (`/inventory`)
  - My Requests (`/user-dashboard/my-requests`)
- **Admin**
  - Inventory (`/inventory`)
  - User Management (`/user-management`)
  - Requests (`/admin-dashboard/requests`)
  - Reports (`/admin-dashboard/reports`)
- **Superadmin**
  - Inventory (`/inventory`)
  - User Management (`/user-management`)
  - Requests (`/admin-dashboard/requests`)
  - Reports (`/admin-dashboard/reports`)
  - Audit Logs (`/superadmin-dashboard/audit-logs`)

## 🔍 Audit Logging

The system logs user interactions in the `auditLogs` collection in Firestore:

```json
{
  "email": "user@jmc.edu.ph",
  "action": "Signed in",
  "timestamp": "2025-02-10T12:00:00Z"
}
```

## 🔐 Firestore Security Rules (Sample)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    match /users/{userId} {
      allow create: if request.auth != null;
      allow read: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId && !(request.resource.data.role in ["admin", "superadmin"]);
      allow read: if getUserRole() == "admin" && resource.data.role != "superadmin";
      allow read, update: if getUserRole() == "superadmin";
      allow update: if getUserRole() == "superadmin" && request.resource.data.role in ["user", "admin", "superadmin"];
    }

    match /auditLogs/{logId} {
      allow read: if getUserRole() == "superadmin";
      allow write: if request.auth != null;
    }

    match /inventory/{docId} {
      allow read: if request.auth != null;
      allow create, update, delete: if getUserRole() in ["admin", "superadmin"];
    }
  }
}
```

## 📤 Deployment (Firebase Hosting)

1. Install Firebase CLI (if not installed)

```sh
npm install -g firebase-tools
```

2. Login to Firebase

```sh
firebase login
```

3. Initialize Firebase Hosting

```sh
firebase init hosting
```

4. Deploy the app

```sh
firebase deploy
```

## 📜 License

This project is for educational purposes under JMC CITE. Unauthorized use is not permitted.

---

🚀 Developed by **QCheckCITE Team**
