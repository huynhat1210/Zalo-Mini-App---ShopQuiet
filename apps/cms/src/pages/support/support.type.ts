export interface IChatRoom {
  zaloUserId: string;
  userName: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface IChatMessage {
  id: string | number;
  sender: 'user' | 'admin';
  text: string;
  createdAt: string;
}

export interface ISupportProps {}
