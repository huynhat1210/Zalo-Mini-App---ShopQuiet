import { apiRequest } from './api';

export const trackAnalyticsEvent = async (
  zaloUserId: string,
  eventType: 'view' | 'click' | 'add_to_cart' | 'purchase' | 'search' | 'filter' | 'share',
  productId?: number,
  categoryId?: number,
  metadata?: Record<string, any>
) => {
  if (!zaloUserId) return;
  try {
    await apiRequest('/analytics/track', 'POST', {
      zaloUserId,
      eventType,
      productId,
      categoryId,
      metadata: metadata || {}
    });
  } catch (e) {
    console.error('[Analytics] Failed to track event:', e);
  }
};
