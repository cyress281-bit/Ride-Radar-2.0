export const USER_ROLES = ['user', 'admin'];
export const ADMIN_ACCESS_ROLES = ['admin'];

export function canAccessAdmin(user) {
  return !!user && ADMIN_ACCESS_ROLES.includes(user.role);
}