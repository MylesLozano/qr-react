# QCheckCITE - QR-Based Inventory Management System

## 📌 Project Overview

QCheckCITE is a **QR-Based Inventory Management System** designed for the **College of Information Technology Education (CITE)** at JMC. It streamlines inventory tracking, request management, and reporting through QR code integration and role-based access control.

## 🚀 Features

### Authentication & Security
- **Secure Google Sign-In** (Restricted to `@jmc.edu.ph` emails)
- **Role-Based Access Control** (Superadmin, Admin, User)
- **Comprehensive Audit Logging**

### Inventory Management
- **Advanced Search & Filtering**
  - Search by name, category, lab
  - Filter by condition, date range
  - Search history tracking
- **Bulk Operations**
  - CSV import/export
  - Batch QR code generation
- **Category Management**
  - Group items by category
  - Track quantities and conditions
- **QR Code Integration**
  - Generate unique QR codes
  - Scan and identify items
  - Track item history

### Request System
- **User Requests**
  - Submit item requests
  - Track request status
  - View request history
- **Admin Management**
  - Approve/reject requests
  - Monitor request patterns
  - Generate request reports

### Reporting & Analytics
- **Custom Report Templates**
- **Export Options** (PDF, CSV)
- **Inventory Statistics**
- **Usage Analytics**

## 🛠️ Tech Stack

- **Frontend:**
  - React 18 (Vite)
  - React Router v6
  - TailwindCSS
  - React-Toastify
- **Backend:**
  - Firebase Authentication
  - Cloud Firestore
  - Firebase Hosting
- **Libraries:**
  - QR Scanner/Generator
  - PapaParse (CSV handling)
  - React-Window (virtualization)

## 🧑‍💻 Role-Based Access

### User
- View inventory items
- Submit and track requests
- Scan QR codes
- Search inventory

### Admin
- Manage inventory (CRUD operations)
- Generate QR codes
- Handle user requests
- Generate reports
- Manage categories

### Superadmin
- All Admin privileges
- User management
- View audit logs
- System configuration

## 📥 Installation

1. **Clone & Install**
```sh
git clone [repository-url]
cd qcheckcite
npm install
```

2. **Environment Setup**
Create a `.env` file:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3. **Run Development Server**
```sh
npm run dev
```

## 📤 Deployment

1. **Build the Project**
```sh
npm run build
```

2. **Deploy to Firebase**
```sh
firebase deploy
```

## 🔒 Security

- **Authentication:** Restricted to @jmc.edu.ph domain
- **Authorization:** Role-based access control
- **Data Protection:** Firestore security rules
- **Audit Trail:** Comprehensive activity logging

## 📜 License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited. All rights reserved by JMC CITE.

---

🚀 Developed by **QCheckCITE Team** | © 2025 JMC CITE
