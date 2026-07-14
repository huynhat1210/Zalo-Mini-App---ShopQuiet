import { Test, TestingModule } from '@nestjs/testing';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';

describe('FavoritesController', () => {
  let controller: FavoritesController;
  let favoritesService: jest.Mocked<FavoritesService>;

  const mockProduct = {
    id: 1,
    name: 'Test Product',
    price: 100,
  };

  const mockProducts = [mockProduct, { id: 2, name: 'Product 2', price: 200 }];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoritesController],
      providers: [
        {
          provide: FavoritesService,
          useValue: {
            findAll: jest.fn().mockResolvedValue(mockProducts),
            add: jest.fn().mockResolvedValue({ success: true }),
            remove: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<FavoritesController>(FavoritesController);
    favoritesService = module.get(FavoritesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFavorites', () => {
    it('should return all favorites for a user', async () => {
      const result = await controller.getFavorites('123456');

      expect(result).toEqual(mockProducts);
      expect(favoritesService.findAll).toHaveBeenCalledWith('123456');
    });

    it('should throw BadRequestException when zaloUserId is missing', async () => {
      await expect(controller.getFavorites(undefined as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getFavorites(undefined as any)).rejects.toThrow(
        'x-zalo-user-id header is required',
      );
    });
  });

  describe('addFavorite', () => {
    it('should add a favorite for a user', async () => {
      const addFavoriteDto = { productId: 1 };
      const result = await controller.addFavorite('123456', addFavoriteDto);

      expect(result).toEqual({ success: true });
      expect(favoritesService.add).toHaveBeenCalledWith('123456', 1);
    });

    it('should throw BadRequestException when zaloUserId is missing', async () => {
      const addFavoriteDto = { productId: 1 };

      await expect(controller.addFavorite(undefined as any, addFavoriteDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeFavorite', () => {
    it('should remove a favorite for a user', async () => {
      const result = await controller.removeFavorite('123456', 1);

      expect(result).toEqual({ success: true });
      expect(favoritesService.remove).toHaveBeenCalledWith('123456', 1);
    });

    it('should throw BadRequestException when zaloUserId is missing', async () => {
     await expect(controller.removeFavorite(undefined as any, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
