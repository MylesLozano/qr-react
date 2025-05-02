import { ROLE_HIERARCHY, ACTION_PERMISSIONS } from '../config/roles';

export const hasPermission = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole]?.includes(requiredRole) || false;
};

export const canPerformAction = (userRole, action) => {
  return ACTION_PERMISSIONS[action]?.includes(userRole) || false;
};

export const getDashboardPath = (role) => {
  switch (role) {
    case 'superadmin':
      return '/superadmin-dashboard';
    case 'admin':
      return '/admin-dashboard';
    case 'user':
      return '/user-dashboard';
    default:
      return '/login';
  }
};