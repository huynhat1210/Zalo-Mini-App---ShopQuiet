import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, categoryId?: string) {
    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (categoryId) {
      where.categoryId = parseInt(categoryId, 10);
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.product.findUnique({
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
  }

  async findCategories() {
    return this.prisma.category.findMany();
  }

  async create(data: {
    name: string;
    description: string;
    price: number;
    categoryId: number;
    tags?: string;
    images?: string;
  }) {
    return this.prisma.product.create({
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
    return this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.product.delete({
      where: { id },
    });
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
}
