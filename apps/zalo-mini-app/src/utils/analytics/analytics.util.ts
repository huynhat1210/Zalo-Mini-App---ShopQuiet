import { apiRequest } from '../api';
import { ITrackEventDto } from './analytics.type';

export const trackAnalyticsEvent = async (
  zaloUserId: string,
  eventType: ITrackEventDto['eventType'],
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
