import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface TrackEventDto {
  zaloUserId: string;
  eventType: 'view' | 'click' | 'add_to_cart' | 'purchase' | 'search' | 'filter' | 'share';
  productId?: number;
  categoryId?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async trackEvent(dto: TrackEventDto) {
    return this.prisma.analyticsEvent.create({
      data: {
        zaloUserId: dto.zaloUserId,
        eventType: dto.eventType,
        productId: dto.productId,
        categoryId: dto.categoryId,
        metadata: dto.metadata || {},
      },
    });
  }

  async getConversionFunnel(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [views, addToCarts, purchases, searches] = await Promise.all([
      this.prisma.analyticsEvent.count({
        where: { ...where, eventType: 'view' },
      }),
      this.prisma.analyticsEvent.count({
        where: { ...where, eventType: 'add_to_cart' },
      }),
      this.prisma.analyticsEvent.count({
        where: { ...where, eventType: 'purchase' },
      }),
      this.prisma.analyticsEvent.count({
        where: { ...where, eventType: 'search' },
      }),
    ]);

    const viewToCartRate = views > 0 ? ((addToCarts / views) * 100).toFixed(2) : 0;
    const cartToPurchaseRate = addToCarts > 0 ? ((purchases / addToCarts) * 100).toFixed(2) : 0;
    const viewToPurchaseRate = views > 0 ? ((purchases / views) * 100).toFixed(2) : 0;

    return {
      views,
      addToCarts,
      purchases,
      searches,
      conversionRates: {
        viewToCart: `${viewToCartRate}%`,
        cartToPurchase: `${cartToPurchaseRate}%`,
        viewToPurchase: `${viewToPurchaseRate}%`,
      },
    };
  }

  async getTopProducts(limit = 10, startDate?: Date, endDate?: Date) {
    const where: any = { eventType: 'view' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const productViews = await this.prisma.analyticsEvent.groupBy({
      by: ['productId'],
      where,
      _count: {
        productId: true,
      },
      orderBy: {
        _count: {
          productId: 'desc',
        },
      },
      take: limit,
    });

    const productIds = productViews.map((p) => p.productId).filter(Boolean);

    if (productIds.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds as number[] } },
    });

    return productViews.map((pv) => {
      const product = products.find((p) => p.id === pv.productId);
      return {
        productId: pv.productId,
        productName: product?.name || 'Unknown',
        views: pv._count.productId,
        price: product?.price || 0,
      };
    });
  }

  async getUserBehavior(zaloUserId: string, limit = 50) {
    return this.prisma.analyticsEvent.findMany({
      where: { zaloUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        product: true,
      },
    });
  }

  async getDailyStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const events = await this.prisma.analyticsEvent.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        eventType: true,
        createdAt: true,
      },
    });

    const dailyStats: Record<string, any> = {};

    events.forEach((event) => {
      const date = event.createdAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          views: 0,
          addToCarts: 0,
          purchases: 0,
          searches: 0,
        };
      }

      switch (event.eventType) {
        case 'view':
          dailyStats[date].views++;
          break;
        case 'add_to_cart':
          dailyStats[date].addToCarts++;
          break;
        case 'purchase':
          dailyStats[date].purchases++;
          break;
        case 'search':
          dailyStats[date].searches++;
          break;
      }
    });

    return Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));
  }
}
