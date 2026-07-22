export interface ITrackEventDto {
  zaloUserId: string;
  eventType: 'view' | 'click' | 'add_to_cart' | 'purchase' | 'search' | 'filter' | 'share';
  productId?: number;
  categoryId?: number;
  metadata?: Record<string, any>;
}
