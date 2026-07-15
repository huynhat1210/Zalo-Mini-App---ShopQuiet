// Permission types and roles for CMS

export type Permission = 
  | 'view_dashboard'
  | 'view_products'
  | 'edit_products'
  | 'delete_products'
  | 'view_orders'
  | 'edit_orders'
  | 'delete_orders'
  | 'view_vouchers'
  | 'edit_vouchers'
  | 'delete_vouchers'
  | 'view_banners'
  | 'edit_banners'
  | 'delete_banners'
  | 'view_users'
  | 'edit_users'
  | 'delete_users'
  | 'view_database'
  | 'edit_database'
  | 'delete_database'
  | 'view_analytics'
  | 'export_data'
  | 'import_data'
  | 'manage_permissions';

export type Role = 'admin' | 'editor' | 'viewer';

export interface RolePermissions {
  role: Role;
  permissions: Permission[];
  description: string;
}

export const roleDefinitions: Record<Role, RolePermissions> = {
  admin: {
    role: 'admin',
    description: 'Quản trị viên - Toàn quyền truy cập',
    permissions: [
      'view_dashboard',
      'view_products', 'edit_products', 'delete_products',
      'view_orders', 'edit_orders', 'delete_orders',
      'view_vouchers', 'edit_vouchers', 'delete_vouchers',
      'view_banners', 'edit_banners', 'delete_banners',
      'view_users', 'edit_users', 'delete_users',
      'view_database', 'edit_database', 'delete_database',
      'view_analytics',
      'export_data', 'import_data',
      'manage_permissions'
    ]
  },
  editor: {
    role: 'editor',
    description: 'Biên tập viên - Có thể xem và chỉnh sửa nhưng không xóa',
    permissions: [
      'view_dashboard',
      'view_products', 'edit_products',
      'view_orders', 'edit_orders',
      'view_vouchers', 'edit_vouchers',
      'view_banners', 'edit_banners',
      'view_users',
      'view_database', 'edit_database',
      'view_analytics',
      'export_data'
    ]
  },
  viewer: {
    role: 'viewer',
    description: 'Người xem - Chỉ được xem',
    permissions: [
      'view_dashboard',
      'view_products',
      'view_orders',
      'view_vouchers',
      'view_banners',
      'view_users',
      'view_database',
      'view_analytics',
      'export_data'
    ]
  }
};

export const permissionLabels: Record<Permission, string> = {
  view_dashboard: 'Xem Dashboard',
  view_products: 'Xem Sản phẩm',
  edit_products: 'Chỉnh sửa Sản phẩm',
  delete_products: 'Xóa Sản phẩm',
  view_orders: 'Xem Đơn hàng',
  edit_orders: 'Chỉnh sửa Đơn hàng',
  delete_orders: 'Xóa Đơn hàng',
  view_vouchers: 'Xem Voucher',
  edit_vouchers: 'Chỉnh sửa Voucher',
  delete_vouchers: 'Xóa Voucher',
  view_banners: 'Xem Banner',
  edit_banners: 'Chỉnh sửa Banner',
  delete_banners: 'Xóa Banner',
  view_users: 'Xem Người dùng',
  edit_users: 'Chỉnh sửa Người dùng',
  delete_users: 'Xóa Người dùng',
  view_database: 'Xem Database',
  edit_database: 'Chỉnh sửa Database',
  delete_database: 'Xóa Database',
  view_analytics: 'Xem Analytics',
  export_data: 'Xuất dữ liệu',
  import_data: 'Nhập dữ liệu',
  manage_permissions: 'Quản lý quyền'
};

export const permissionGroups: Record<string, Permission[]> = {
  dashboard: ['view_dashboard'],
  products: ['view_products', 'edit_products', 'delete_products'],
  orders: ['view_orders', 'edit_orders', 'delete_orders'],
  vouchers: ['view_vouchers', 'edit_vouchers', 'delete_vouchers'],
  banners: ['view_banners', 'edit_banners', 'delete_banners'],
  users: ['view_users', 'edit_users', 'delete_users'],
  database: ['view_database', 'edit_database', 'delete_database'],
  analytics: ['view_analytics'],
  data: ['export_data', 'import_data'],
  admin: ['manage_permissions']
};

export const hasPermission = (userRole: Role, permission: Permission): boolean => {
  return roleDefinitions[userRole]?.permissions.includes(permission) || false;
};

export const hasAnyPermission = (userRole: Role, permissions: Permission[]): boolean => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

export const hasAllPermissions = (userRole: Role, permissions: Permission[]): boolean => {
  return permissions.every(permission => hasPermission(userRole, permission));
};
