import React from 'react';
import type { Role } from '../../utils/permissions';

export interface IPermissionComponentProps {
  children: React.ReactNode;
  initialRole?: Role;
}
