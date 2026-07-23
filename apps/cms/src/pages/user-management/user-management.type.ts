export interface IUser {
  id: number;
  zaloUserId: string;
  name: string;
  avatar: string;
  phone?: string;
  totalSpent: number;
  membershipTier: string;
  createdAt: string;
}

export interface IUserManagementProps {}
