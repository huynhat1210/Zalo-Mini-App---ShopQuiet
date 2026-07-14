import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Role, Permission } from '../utils/permissions';
import { hasPermission, hasAnyPermission, hasAllPermissions, roleDefinitions } from '../utils/permissions';

interface PermissionContextType {
  userRole: Role;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  canEdit: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  canView: (resource: string) => boolean;
  setRole: (role: Role) => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
};

interface PermissionProviderProps {
  children: ReactNode;
  initialRole?: Role;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children, initialRole = 'admin' }) => {
  const [userRole, setUserRole] = React.useState<Role>(initialRole);

  const setRole = (role: Role) => {
    setUserRole(role);
    // Store in localStorage for persistence
    localStorage.setItem('cms_user_role', role);
  };

  // Load role from localStorage on mount
  React.useEffect(() => {
    const storedRole = localStorage.getItem('cms_user_role') as Role;
    if (storedRole && roleDefinitions[storedRole]) {
      setUserRole(storedRole);
    }
  }, []);

  const canEdit = (resource: string): boolean => {
    const editPermission = `edit_${resource}` as Permission;
    return hasPermission(userRole, editPermission);
  };

  const canDelete = (resource: string): boolean => {
    const deletePermission = `delete_${resource}` as Permission;
    return hasPermission(userRole, deletePermission);
  };

  const canView = (resource: string): boolean => {
    const viewPermission = `view_${resource}` as Permission;
    return hasPermission(userRole, viewPermission);
  };

  return (
    <PermissionContext.Provider
      value={{
        userRole,
        hasPermission: (permission: Permission) => hasPermission(userRole, permission),
        hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
        hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(userRole, permissions),
        canEdit,
        canDelete,
        canView,
        setRole
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

// Permission Gate Component
interface PermissionGateProps {
  permission: Permission | Permission[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ 
  permission, 
  requireAll = false, 
  fallback = null, 
  children 
}) => {
  const { hasAnyPermission, hasAllPermissions } = usePermissions();
  
  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = requireAll 
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};
