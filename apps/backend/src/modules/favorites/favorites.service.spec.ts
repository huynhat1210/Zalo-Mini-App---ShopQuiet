import { Test, TestingModule } from '@nestjs/testing';
import { FavoritesService } from './favorites.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let prismaService: jest.Mocked<any>;

  const mockProduct = {
    id: 1,
    name: 'Test Product',
    price: 100,
    description: 'Test description',
    imageUrl: 'test.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFavorite = {
    zaloUserId: '123456',
    productId: 1,
    product: mockProduct,
    createdAt: new Date(),
  };

  const mockFavorites = [
    mockFavorite,
    {
      zaloUserId: '123456',
      productId: 2,
      product: { ...mockProduct, id: 2, name: 'Product 2' },
      createdAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const mockPrismaService = {
      favorite: {
        findMany: jest.fn().mockResolvedValue(mockFavorites),
        upsert: jest.fn().mockResolvedValue(mockFavorite),
        delete: jest.fn().mockResolvedValue(mockFavorite),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue(mockProduct),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all favorite products for a user', async () => {
      const result = await service.findAll('123456');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockProduct);
      expect(prismaService.favorite.findMany).toHaveBeenCalledWith({
        where: { zaloUserId: '123456' },
        include: { product: true },
      });
    });

    it('should return empty array when user has no favorites', async () => {
      (prismaService.favorite.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.findAll('999999');

      expect(result).toEqual([]);
      expect(prismaService.favorite.findMany).toHaveBeenCalledWith({
        where: { zaloUserId: '999999' },
        include: { product: true },
      });
    });
  });

  describe('add', () => {
    it('should add a favorite when product exists', async () => {
      const result = await service.add('123456', 1);

      expect(result).toEqual(mockFavorite);
      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.favorite.upsert).toHaveBeenCalledWith({
        where: {
          zaloUserId_productId: { zaloUserId: '123456', productId: 1 },
        },
        update: {},
        create: { zaloUserId: '123456', productId: 1 },
      });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      (prismaService.product.findUnique as jest.Mock).mockResolvedValueOnce(
        null,
      );

      await expect(service.add('123456', 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update existing favorite if already exists', async () => {
      await service.add('123456', 1);

      expect(prismaService.favorite.upsert).toHaveBeenCalledWith({
        where: {
          zaloUserId_productId: { zaloUserId: '123456', productId: 1 },
        },
        update: {},
        create: { zaloUserId: '123456', productId: 1 },
      });
    });
  });

  describe('remove', () => {
    it('should remove a favorite successfully', async () => {
      const result = await service.remove('123456', 1);

      expect(result).toEqual({ success: true });
      expect(prismaService.favorite.delete).toHaveBeenCalledWith({
        where: {
          zaloUserId_productId: { zaloUserId: '123456', productId: 1 },
        },
      });
    });

    it('should return success even when favorite does not exist', async () => {
      (prismaService.favorite.delete as jest.Mock).mockRejectedValueOnce(
        new Error('Record not found'),
      );

      const result = await service.remove('123456', 999);

      expect(result).toEqual({ success: true });
    });
  });
});
