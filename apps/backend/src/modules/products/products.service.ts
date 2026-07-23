import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll(
    search?: string,
    categoryId?: string,
    page: number = 1,
    limit: number = 10,
    sort?: string,
  ) {
    const cacheKey = `products_${search || ''}_${categoryId || ''}_${page}_${limit}_${sort || ''}`;
    const cachedData = await this.cacheManager.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      const cleanSearch = search.trim().replace(/^#/, '');
      where.OR = [
        { name: { contains: cleanSearch, mode: 'insensitive' } },
        { description: { contains: cleanSearch, mode: 'insensitive' } },
        { tags: { contains: cleanSearch, mode: 'insensitive' } },
        { category: { name: { contains: cleanSearch, mode: 'insensitive' } } },
      ];
    }

    if (categoryId) {
      where.categoryId = parseInt(categoryId, 10);
    }

    const skip = (page - 1) * limit;

    let orderBy: any = undefined;
    if (sort) {
      const parts = sort.split(':');
      if (parts.length === 2) {
        const order = parts[0] === 'desc' ? 'desc' : 'asc';
        let field = parts[1];
        if (field === 'updated_at') field = 'updatedAt';
        if (field === 'created_at') field = 'createdAt';
        orderBy = { [field]: order };
      }
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          variants: true,
          comments: {
            select: {
              rating: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: orderBy || { id: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    const result = {
      data: products,
      products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      pagination: {
        total,
        page,
        page_size: limit,
        total_pages: Math.ceil(total / limit),
      },
    };

    // Cache for 10 seconds (10000ms)
    await this.cacheManager.set(cacheKey, result, 10000);
    return result;
  }

  async findOne(id: number) {
    const cacheKey = `product_${id}`;
    const cachedData = await this.cacheManager.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
        comments: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    // Cache for 5 minutes - product details change infrequently
    if (product) {
      await this.cacheManager.set(cacheKey, product, 300000);
    }

    return product;
  }

  async findCategories() {
    const cacheKey = 'categories_all';
    const cachedData = await this.cacheManager.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const categories = await this.prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    // Cache for 30 minutes - categories rarely change
    await this.cacheManager.set(cacheKey, categories, 1800000);
    return categories;
  }

  async createCategory(data: { name: string; slug?: string; description?: string; imageUrl?: string }) {
    const slug = data.slug || data.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const category = await this.prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
      },
    });
    await this.invalidateCategoriesCache();
    return category;
  }

  async updateCategory(id: number, data: { name?: string; slug?: string; description?: string; imageUrl?: string }) {
    const category = await this.prisma.category.update({
      where: { id },
      data,
    });
    await this.invalidateCategoriesCache();
    return category;
  }

  async deleteCategory(id: number) {
    const productCount = await this.prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new BadRequestException(`Không thể xóa danh mục đang có ${productCount} sản phẩm.`);
    }
    const category = await this.prisma.category.delete({ where: { id } });
    await this.invalidateCategoriesCache();
    return category;
  }

  async invalidateProductCache(id: number) {
    await this.cacheManager.del(`product_${id}`);
    await this.invalidateProductsListCache();
  }

  async invalidateProductsListCache() {
    // Invalidate all product list caches by pattern
    // Note: cache-manager doesn't support pattern deletion by default
    // In production, consider using Redis keys command or a cache management library
  }

  async invalidateCategoriesCache() {
    await this.cacheManager.del('categories_all');
  }

  async create(data: {
    name: string;
    description: string;
    price: number;
    categoryId: number;
    tags?: string;
    images?: string;
  }) {
    const product = await this.prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        categoryId: data.categoryId,
        tags: data.tags || '',
        images: data.images || '[]',
      },
      include: {
        category: true,
      },
    });

    // Invalidate caches after creation
    await this.invalidateProductsListCache();
    await this.invalidateCategoriesCache();

    return product;
  }

  async update(
    id: number,
    data: {
      name?: string;
      description?: string;
      price?: number;
      categoryId?: number;
      tags?: string;
      images?: string;
    },
  ) {
    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });

    // Invalidate caches after update
    await this.invalidateProductCache(id);

    return product;
  }

  async delete(id: number) {
    const product = await this.prisma.product.delete({
      where: { id },
    });

    // Invalidate caches after deletion
    await this.invalidateProductCache(id);
    await this.invalidateProductsListCache();

    return product;
  }

  async upsertVariant(productId: number, size: string, stock: number) {
    const existing = await this.prisma.productVariant.findFirst({
      where: { productId, size },
    });
    if (existing) {
      return this.prisma.productVariant.update({
        where: { id: existing.id },
        data: { stock },
      });
    }
    return this.prisma.productVariant.create({
      data: { productId, size, stock },
    });
  }

  async updateVariantStock(variantId: number, stock: number) {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock },
    });
  }

  async deleteVariant(variantId: number) {
    return this.prisma.productVariant.delete({
      where: { id: variantId },
    });
  }

  async findFlashSaleProducts(): Promise<any> {
    const allProducts = await this.prisma.product.findMany({
      include: {
        category: true,
        variants: true,
        comments: {
          select: {
            rating: true,
          },
        },
      },
    });

    const flashSaleProducts = allProducts.filter((product) => {
      if (!product.tags) return false;
      const normalizedTag = product.tags.toLowerCase();
      return (
        normalizedTag.includes('flash sale') ||
        normalizedTag.includes('giảm') ||
        normalizedTag.includes('giam')
      );
    });

    // If flash sale count is less than 4, enrich it with standard products as fallback
    if (flashSaleProducts.length < 4 && allProducts.length > 0) {
      const existingIds = new Set(flashSaleProducts.map((p) => p.id));
      const remainingProducts = allProducts.filter(
        (p) => !existingIds.has(p.id),
      );

      const neededCount = Math.min(
        4 - flashSaleProducts.length,
        remainingProducts.length,
      );
      const fallbacksToAdd = remainingProducts.slice(0, neededCount);

      const discountOptions = [
        'Giảm 15%',
        'Giảm 23%',
        'Giảm 30%',
        'Flash Sale (Giảm 10%)',
      ];
      for (let i = 0; i < fallbacksToAdd.length; i++) {
        const randomTag =
          discountOptions[Math.floor(Math.random() * discountOptions.length)];
        await this.prisma.product.update({
          where: { id: fallbacksToAdd[i].id },
          data: { tags: randomTag },
        });
      }
      return this.findFlashSaleProducts();
    }

    const mappedProducts = flashSaleProducts.map((product) => {
      const tag = product.tags || '';
      let discountPercent = 20;

      const percentMatch =
        tag.match(/giảm\s*(\d+)%/i) ||
        tag.match(/giam\s*(\d+)%/i) ||
        tag.match(/(\d+)%/);
      if (percentMatch && percentMatch[1]) {
        discountPercent = parseInt(percentMatch[1], 10);
      }

      const originalPrice = Math.round(
        product.price / (1 - discountPercent / 100),
      );

      return {
        ...product,
        originalPrice,
        discountPercent,
      };
    });

    const endTime = new Date();
    endTime.setHours(23, 59, 59, 999);

    return {
      products: mappedProducts,
      endTime: endTime.toISOString(),
    };
  }
}
