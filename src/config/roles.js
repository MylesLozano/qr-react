export const ROLE_HIERARCHY = {
  user: ['user'],
  admin: ['user', 'admin'],
  superadmin: ['user', 'admin', 'superadmin'],
};

export const ACTION_PERMISSIONS = {
  view_inventory: ['user', 'admin', 'superadmin'],
  edit_inventory: ['admin', 'superadmin'],
  delete_inventory: ['admin', 'superadmin'],
  manage_users: ['superadmin'],
  view_audit_logs: ['superadmin'],
  generate_reports: ['admin', 'superadmin'],
  manage_templates: ['admin', 'superadmin'],
  view_templates: ['admin', 'superadmin'],
  manage_categories: ['admin', 'superadmin'],
  manage_requests: ['admin', 'superadmin'],
  view_requests: ['user', 'admin', 'superadmin'],
};
