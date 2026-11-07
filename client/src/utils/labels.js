export const ACTIVITY_LABELS = {
  LOGIN: 'Login',
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  ISSUE: 'Issued',
  PRODUCTION_ENTRY: 'Production entry',
  PRODUCTION_UPDATE: 'Production updated',
  PRODUCTION_DELETE: 'Production deleted',
  EXPORT: 'Exported',
};

export const activityLabel = (action) => ACTIVITY_LABELS[action] || action;

export const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  operator: 'Operator',
  viewer: 'Viewer',
};
