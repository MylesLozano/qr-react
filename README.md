# QCheckCITE - QR-Based Inventory Management System

## 📌 Project Overview

QCheckCITE is a **QR-Based Inventory Management System** designed specifically for the **College of Information Technology Education (CITE)** at JMC. It allows authorized users to track, manage, and audit inventory items efficiently using QR codes.

## 🚀 Features

- **Google Sign-In** (Restricted to `@jmc.edu.ph` emails)
- **QR Code Scanning & Management**
- **Inventory Tracking & Updates**
- **Audit Logging** (Tracks sign-ins, sign-outs, and interactions)
- **Role-Based Access Control** (Admins & Users)
- **Cloud Firestore Database** Integration

## 🛠️ Tech Stack

- **Frontend:** React (Vite), React Router
- **Backend:** Firebase Authentication, Firestore Database
- **Authentication:** Google Sign-In (Firebase Auth)
- **Hosting:** Firebase Hosting (Optional)

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

## 🔍 Audit Logging

The system logs user interactions in the `audit_logs` collection in Firestore:

```json
{
  "email": "user@jmc.edu.ph",
  "action": "Signed in",
  "timestamp": "2025-02-10T12:00:00Z"
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
