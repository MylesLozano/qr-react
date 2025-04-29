export const hasPermission = (userRole, requiredRole) => {
  const roleHierarchy = {
    'user': ['user'],
    'admin': ['user', 'admin'],
    'superadmin': ['user', 'admin', 'superadmin']
  };
  return roleHierarchy[userRole]?.includes(requiredRole) || false;
};

export const canPerformAction = (userRole, action) => {
  const actionPermissions = {
    'view_inventory': ['user', 'admin', 'superadmin'],
    'edit_inventory': ['admin', 'superadmin'],
    'delete_inventory': ['admin', 'superadmin'],
    'manage_users': ['superadmin'],
    'view_audit_logs': ['superadmin'],
    'generate_reports': ['admin', 'superadmin'],
    'manage_templates': ['admin', 'superadmin'],
    'manage_categories': ['admin', 'superadmin'],
    'manage_requests': ['admin', 'superadmin']
  };
  return actionPermissions[action]?.includes(userRole) || false;
};

export const getRoleHierarchy = () => ({
  'user': ['user'],
  'admin': ['user', 'admin'],
  'superadmin': ['user', 'admin', 'superadmin']
});

export const getActionPermissions = () => ({
  'view_inventory': ['user', 'admin', 'superadmin'],
  'edit_inventory': ['admin', 'superadmin'],
  'delete_inventory': ['admin', 'superadmin'],
  'manage_users': ['superadmin'],
  'view_audit_logs': ['superadmin'],
  'generate_reports': ['admin', 'superadmin'],
  'manage_templates': ['admin', 'superadmin'],
  'manage_categories': ['admin', 'superadmin'],
  'manage_requests': ['admin', 'superadmin']
}); 