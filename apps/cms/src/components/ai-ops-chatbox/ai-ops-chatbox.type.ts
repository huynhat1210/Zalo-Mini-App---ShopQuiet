export interface AiOpsAlert {
  id: string;
  type: 'LOW_STOCK' | 'STALE_ORDER' | 'RETURN_REQUEST' | 'DEMAND_SURGE' | 'VIP_MILESTONE';
  title: string;
  message: string;
  time: string;
  severity: 'high' | 'medium' | 'info';
  actionType: 'RESTOCK_ITEM' | 'VIEW_ORDERS' | 'VIEW_RETURNS' | 'FLASH_SALE' | 'GIFT_VIP_VOUCHER';
  actionPayload: any;
  isRead: boolean;
  isResolved?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'BOT' | 'USER';
  text: string;
  time: string;
  alertData?: AiOpsAlert;
}

export interface IAiOpsChatboxProps {}
