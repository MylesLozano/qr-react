import { ROLE_HIERARCHY, ACTION_PERMISSIONS } from '../config/roles';

export const hasPermission = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole]?.includes(requiredRole) || false;
};

export const canPerformAction = (userRole, action) => {
  // If userRole is undefined or null, return false
  if (!userRole) {
    console.warn(`Role check failed: No user role provided for ${action} check`);
    return false;
  }
  return ACTION_PERMISSIONS[action]?.includes(userRole) || false;
};

export const canGenerateQR = (userRole) => {
  return canPerformAction(userRole, 'generate_qr_codes');
};

export const canScanQR = (userRole) => {
  const hasPermission = canPerformAction(userRole, 'scan_qr_codes');
  return hasPermission;
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
