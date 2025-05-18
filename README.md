# QCheckCITE

## Overview

QR-Based Inventory Management System for the College of Information Technology Education.

## Features

- Authentication with Google Sign-In
- Role-based access (Superadmin, Admin, User)
- QR code generation and scanning
- Inventory tracking and management
- Request processing system
- Reporting and analytics
- Mobile-responsive design

## Quick Start

```
npm install
npm run dev
```

## Project Structure

- `/src/components` - UI components
- `/src/context` - React contexts (Auth, Theme)
- `/src/dashboard` - Dashboard views by role
- `/src/hooks` - Custom React hooks
- `/src/utils` - Utility functions

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [GUIDELINES.md](./docs/GUIDELINES.md) for development standards.

## Technologies

- React 19
- Firebase
- Tailwind CSS
- Vite
- ESLint + Prettier
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

## 🧰 Code Quality

The QCheckCITE project follows strict code quality standards to ensure maintainability and readability:

- **Linting & Formatting**: ESLint and Prettier are configured to enforce consistent code style
- **Documentation**: JSDoc comments for components, hooks, and utility functions
- **Pre-commit Hooks**: Husky and lint-staged ensure code quality before commits
- **Component Structure**: Standardized component organization (see `docs/component-structure.md`)
- **Import Organization**: Consistent import ordering (see `docs/importOrganization.md`)

Run these commands to maintain code quality:

```sh
# Format code with Prettier
npm run format

# Lint code and fix issues
npm run lint:fix

# Check code formatting
npm run format:check

# Generate project health report
node scripts/generateHealthReport.js
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
