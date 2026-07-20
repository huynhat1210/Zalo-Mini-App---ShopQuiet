import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RecommendationsService {
  constructor(private prisma: PrismaService) {}

  async getPersonalizedRecommendations(zaloUserId: string, limit = 10) {
    // Get user's purchase history
    const userOrders = await this.prisma.order.findMany({
      where: { zaloUserId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      take: 20,
    });

    const purchasedProductIds = userOrders
      .flatMap((order) => order.items)
      .map((item) => item.productId);

    const purchasedCategories = userOrders
      .flatMap((order) => order.items)
      .map((item) => item.product.categoryId);

    // Get products from same categories that user hasn't purchased
    const categoryRecommendations = await this.prisma.product.findMany({
      where: {
        categoryId: { in: purchasedCategories },
        id: { notIn: purchasedProductIds },
      },
      include: { category: true },
      take: limit,
      orderBy: { soldCount: 'desc' },
    });

    // If not enough category recommendations, get popular products
    let recommendations = categoryRecommendations;
    if (recommendations.length < limit) {
      const popularProducts = await this.prisma.product.findMany({
        where: {
          id: { notIn: [...purchasedProductIds, ...recommendations.map((p) => p.id)] },
        },
        include: { category: true },
        take: limit - recommendations.length,
        orderBy: { soldCount: 'desc' },
      });
      recommendations = [...recommendations, ...popularProducts];
    }

    return recommendations.slice(0, limit);
  }

  async getSimilarProducts(productId: number, limit = 6) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) return [];

    // Get products from same category
    const similarByCategory = await this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: productId },
      },
      include: { category: true },
      take: limit,
      orderBy: { soldCount: 'desc' },
    });

    return similarByCategory;
  }

  async getTrendingProducts(limit = 10) {
    return this.prisma.product.findMany({
      include: { category: true },
      take: limit,
      orderBy: { soldCount: 'desc' },
    });
  }

  async getRecentlyViewedRecommendations(zaloUserId: string, limit = 8) {
    // Get user's recently viewed products (from analytics)
    const recentViews = await this.prisma.analyticsEvent.findMany({
      where: {
        zaloUserId,
        eventType: 'view',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      distinct: ['productId'],
    });

    const viewedProductIds = recentViews
      .map((event) => event.productId)
      .filter(Boolean) as number[];

    if (viewedProductIds.length === 0) {
      return this.getTrendingProducts(limit);
    }

    // Get categories of recently viewed products
    const viewedProducts = await this.prisma.product.findMany({
      where: { id: { in: viewedProductIds } },
      select: { categoryId: true },
    });

    const categoryIds = viewedProducts.map((p) => p.categoryId);

    // Get products from same categories
    const recommendations = await this.prisma.product.findMany({
      where: {
        categoryId: { in: categoryIds },
        id: { notIn: viewedProductIds },
      },
      include: { category: true },
      take: limit,
      orderBy: { soldCount: 'desc' },
    });

    return recommendations;
  }

  async getFrequentlyBoughtTogether(productId: number, limit = 4) {
    // Find orders that contain this product
    const ordersWithProduct = await this.prisma.order.findMany({
      where: {
        items: {
          some: { productId },
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      take: 50,
    });

    // Count frequency of other products in these orders
    const productFrequency = new Map<number, number>();

    ordersWithProduct.forEach((order) => {
      order.items.forEach((item) => {
        if (item.productId !== productId) {
          productFrequency.set(
            item.productId,
            (productFrequency.get(item.productId) || 0) + 1,
          );
        }
      });
    });

    // Get top frequently bought together products
    const sortedProductIds = Array.from(productFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map((entry) => entry[0]);

    if (sortedProductIds.length === 0) {
      return this.getSimilarProducts(productId, limit);
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: sortedProductIds } },
      include: { category: true },
    });

    return products.sort((a, b) => {
      const indexA = sortedProductIds.indexOf(a.id);
      const indexB = sortedProductIds.indexOf(b.id);
      return indexA - indexB;
    });
  }
}
