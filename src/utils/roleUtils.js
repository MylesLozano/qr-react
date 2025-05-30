import { ROLE_HIERARCHY, ACTION_PERMISSIONS } from '../config/roles';

export const hasPermission = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole]?.includes(requiredRole) || false;
};

export const canPerformAction = (userRole, action) => {
  return ACTION_PERMISSIONS[action]?.includes(userRole) || false;
};

export const canGenerateQR = (userRole) => {
  return canPerformAction(userRole, 'generate_qr_codes');
};

export const canScanQR = (userRole) => {
  return canPerformAction(userRole, 'scan_qr_codes');
};

export const canPerformInspection = (userRole) => {
  return canPerformAction(userRole, 'perform_inspection');
};

export const getDashboardPath = (role) => {
  switch (role) {
    case 'superadmin':
      return '/superadmin-dashboard/user-management';
    case 'admin':
      return '/admin-dashboard';
    case 'user':
      return '/user-dashboard';
    default:
      return '/login';
  }
};
