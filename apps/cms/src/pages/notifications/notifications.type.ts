export interface INotificationItem {
  id: number;
  title: string;
  content: string;
  type: string;
  zaloUserId?: string | null;
  date: string;
  read: boolean;
}

export interface INotificationsProps {}
